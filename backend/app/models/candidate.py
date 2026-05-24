"""
Candidate Model - Nomination and Profile Management
"""
import uuid
from datetime import datetime
from enum import Enum
from app import db


class CandidateStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISQUALIFIED = "disqualified"
    WITHDRAWN = "withdrawn"


class Candidate(db.Model):
    """Candidate Model for election positions."""
    __tablename__ = 'candidates'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Relationships
    position_id = db.Column(db.String(36), db.ForeignKey('positions.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    election_id = db.Column(db.String(36), db.ForeignKey('elections.id'), nullable=False)

    # Profile Information
    manifesto = db.Column(db.Text, nullable=True)
    biography = db.Column(db.Text, nullable=True)
    photo_url = db.Column(db.String(500), nullable=True)
    certificates_url = db.Column(db.JSON, default=list)  # List of certificate URLs
    campaign_video_url = db.Column(db.String(500), nullable=True)

    # Contact (can override user contact)
    contact_email = db.Column(db.String(120), nullable=True)
    contact_phone = db.Column(db.String(20), nullable=True)

    # Status
    status = db.Column(db.Enum(CandidateStatus), default=CandidateStatus.PENDING)

    # Approval workflow
    nominated_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    approved_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    # Vote count (denormalized for performance)
    vote_count = db.Column(db.Integer, default=0)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    votes = db.relationship('Vote', backref='candidate', lazy='dynamic')

    def is_approved(self):
        """Check if candidate is approved."""
        return self.status == CandidateStatus.APPROVED

    def get_full_profile(self):
        """Get complete candidate profile with user info."""
        from app.models.user import User
        user = User.query.get(self.user_id)
        return {
            'id': self.id,
            'position_id': self.position_id,
            'election_id': self.election_id,
            'full_name': user.full_name if user else None,
            'membership_number': user.membership_number if user else None,
            'district': user.district.value if user and user.district else None,
            'photo_url': self.photo_url or user.photo_url if user else None,
            'manifesto': self.manifesto,
            'biography': self.biography or user.bio,
            'contact_email': self.contact_email or user.email if user else None,
            'contact_phone': self.contact_phone or user.phone if user else None,
            'certificates': self.certificates_url,
            'campaign_video': self.campaign_video_url,
            'status': self.status.value,
            'vote_count': self.vote_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def to_dict(self):
        """Serialize candidate to dictionary."""
        return {
            'id': self.id,
            'position_id': self.position_id,
            'user_id': self.user_id,
            'election_id': self.election_id,
            'manifesto': self.manifesto,
            'biography': self.biography,
            'photo_url': self.photo_url,
            'status': self.status.value,
            'vote_count': self.vote_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Candidate {self.id}: {self.status.value}>'
