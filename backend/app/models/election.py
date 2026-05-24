"""
Election Model - Multi-level Election Architecture
"""
import uuid
from datetime import datetime
from enum import Enum
from app import db


class ElectionType(Enum):
    NATIONAL = "national"
    STATE = "state"
    DISTRICT = "district"
    CHAPTER = "chapter"
    COMMITTEE = "committee"


class ElectionStatus(Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class VotingRule(Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    RANKED = "ranked"
    YES_NO = "yes_no"


class Election(db.Model):
    """Election Model supporting multi-level architecture."""
    __tablename__ = 'elections'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=True)
    election_type = db.Column(db.Enum(ElectionType), nullable=False)

    # Scheduling
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    timezone = db.Column(db.String(50), default='Africa/Lagos')

    # Status
    status = db.Column(db.Enum(ElectionStatus), default=ElectionStatus.DRAFT)

    # Eligibility
    eligible_districts = db.Column(db.JSON, default=list)
    eligible_chapters = db.Column(db.JSON, default=list)
    eligible_roles = db.Column(db.JSON, default=list)

    # Configuration
    voting_rule = db.Column(db.Enum(VotingRule), default=VotingRule.SINGLE_CHOICE)
    max_choices = db.Column(db.Integer, default=1)
    allow_abstain = db.Column(db.Boolean, default=True)
    show_results_immediately = db.Column(db.Boolean, default=False)
    results_publish_date = db.Column(db.DateTime, nullable=True)

    # Auto-management
    auto_start = db.Column(db.Boolean, default=False)
    auto_close = db.Column(db.Boolean, default=True)

    # Results
    total_registered_voters = db.Column(db.Integer, default=0)
    total_accredited_voters = db.Column(db.Integer, default=0)
    total_votes_cast = db.Column(db.Integer, default=0)
    invalid_votes = db.Column(db.Integer, default=0)

    # Metadata
    created_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    published_at = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    positions = db.relationship('Position', backref='election', lazy='dynamic', cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='election', lazy='dynamic')
    audit_logs = db.relationship('AuditLog', backref='election', lazy='dynamic')

    def is_active(self):
        now = datetime.utcnow()
        return (self.status == ElectionStatus.ACTIVE and 
                self.start_date <= now <= self.end_date)

    def is_upcoming(self):
        return self.start_date > datetime.utcnow()

    def is_ended(self):
        return datetime.utcnow() > self.end_date

    def can_user_vote(self, user):
        if not self.is_active():
            return False
        if user.status.value != 'active':
            return False
        if self.eligible_districts and user.district.value not in self.eligible_districts:
            return False
        if self.eligible_chapters and user.chapter not in self.eligible_chapters:
            return False
        return True

    def time_remaining(self):
        if self.is_active():
            return self.end_date - datetime.utcnow()
        return None

    def to_dict(self, include_stats=False):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'election_type': self.election_type.value,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'timezone': self.timezone,
            'status': self.status.value,
            'voting_rule': self.voting_rule.value,
            'max_choices': self.max_choices,
            'allow_abstain': self.allow_abstain,
            'show_results_immediately': self.show_results_immediately,
            'auto_start': self.auto_start,
            'auto_close': self.auto_close,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_stats:
            data['statistics'] = {
                'total_registered_voters': self.total_registered_voters,
                'total_accredited_voters': self.total_accredited_voters,
                'total_votes_cast': self.total_votes_cast,
                'invalid_votes': self.invalid_votes,
                'turnout_percentage': round(
                    (self.total_votes_cast / self.total_registered_voters * 100), 2
                ) if self.total_registered_voters > 0 else 0
            }
        return data

    def __repr__(self):
        return f'<Election {self.title}: {self.status.value}>'