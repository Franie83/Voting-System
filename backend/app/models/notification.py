"""
Notification Model - Multi-channel Communication
"""
import uuid
from datetime import datetime
from enum import Enum
from app import db


class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class NotificationType(Enum):
    ELECTION_ANNOUNCEMENT = "election_announcement"
    VOTING_REMINDER = "voting_reminder"
    OTP_DELIVERY = "otp_delivery"
    VOTE_CONFIRMATION = "vote_confirmation"
    ELECTION_CLOSING = "election_closing"
    RESULT_PUBLISHED = "result_published"
    ACCOUNT_ACTIVITY = "account_activity"
    SECURITY_ALERT = "security_alert"
    CANDIDATE_APPROVAL = "candidate_approval"
    SYSTEM_MAINTENANCE = "system_maintenance"


class NotificationStatus(Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"


class Notification(db.Model):
    """Notification model for all communication channels."""
    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Recipient
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)

    # Content
    notification_type = db.Column(db.Enum(NotificationType), nullable=False)
    channel = db.Column(db.Enum(NotificationChannel), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)

    # Status
    status = db.Column(db.Enum(NotificationStatus), default=NotificationStatus.PENDING)

    # Delivery tracking
    sent_at = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    read_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    # Related entity
    related_election_id = db.Column(db.String(36), db.ForeignKey('elections.id'), nullable=True)
    related_entity_type = db.Column(db.String(50), nullable=True)
    related_entity_id = db.Column(db.String(36), nullable=True)

    # Metadata (renamed from 'metadata' to avoid SQLAlchemy reserved word conflict)
    extra_metadata = db.Column(db.JSON, default=dict)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'notification_type': self.notification_type.value,
            'channel': self.channel.value,
            'title': self.title,
            'message': self.message,
            'status': self.status.value,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Notification {self.notification_type.value}: {self.status.value}>'