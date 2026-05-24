"""
Audit Log Model - Immutable Chain of Custody
"""
import uuid
import hashlib
from datetime import datetime
from enum import Enum
from app import db


class AuditAction(Enum):
    # Authentication
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET = "password_reset"
    TWO_FACTOR_ENABLED = "two_factor_enabled"
    TWO_FACTOR_DISABLED = "two_factor_disabled"
    OTP_SENT = "otp_sent"
    OTP_FAILED = "otp_failed"
    OTP_VERIFIED = "otp_verified"
    LOGIN = "login"
    
    # User Management
    USER_REGISTERED = "user_registered"
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_SUSPENDED = "user_suspended"
    USER_ACTIVATED = "user_activated"
    USER_DELETED = "user_deleted"
    USER_APPROVED = "user_approved"
    ROLE_CHANGED = "role_changed"
    BULK_USER_CREATED = "bulk_user_created"
    BULK_USER_IMPORTED = "bulk_user_imported"
    
    # Election Management
    ELECTION_CREATED = "election_created"
    ELECTION_UPDATED = "election_updated"
    ELECTION_STARTED = "election_started"
    ELECTION_PAUSED = "election_paused"
    ELECTION_CLOSED = "election_closed"
    ELECTION_CANCELLED = "election_cancelled"
    
    # Candidate Management
    CANDIDATE_REGISTERED = "candidate_registered"
    CANDIDATE_NOMINATED = "candidate_nominated"
    CANDIDATE_APPROVED = "candidate_approved"
    CANDIDATE_REJECTED = "candidate_rejected"
    CANDIDATE_DISQUALIFIED = "candidate_disqualified"
    CANDIDATE_WITHDRAWN = "candidate_withdrawn"
    
    # Voting
    VOTE_CAST = "vote_cast"
    VOTE_VERIFIED = "vote_verified"
    BALLOT_ACCESSED = "ballot_accessed"
    VOTES_RESET = "votes_reset"
    VOTE_RECEIPT_GENERATED = "vote_receipt_generated"  # ADD THIS LINE
    
    # Results
    RESULT_VIEWED = "result_viewed"
    RESULT_PUBLISHED = "result_published"
    
    # System
    SYSTEM_CONFIG_CHANGED = "system_config_changed"
    EXPORT_DATA = "export_data"
    IMPORT_DATA = "import_data"
    ACCOUNT_LOCKED = "account_locked"
    
    # Notifications
    NOTIFICATION_SENT = "notification_sent"
    BROADCAST_SENT = "broadcast_sent"


class AuditLog(db.Model):
    """Immutable Audit Log with Hash Chain."""
    __tablename__ = 'audit_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Actor
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True, index=True)
    user_email = db.Column(db.String(120), nullable=True)  # Denormalized for context
    
    # Action
    action = db.Column(db.Enum(AuditAction), nullable=False, index=True)
    action_description = db.Column(db.Text, nullable=True)
    
    # Target
    target_type = db.Column(db.String(50), nullable=True)  # election, user, candidate, etc.
    target_id = db.Column(db.String(36), nullable=True, index=True)
    target_name = db.Column(db.String(200), nullable=True)  # Denormalized for context
    
    # Context
    election_id = db.Column(db.String(36), db.ForeignKey('elections.id'), nullable=True, index=True)
    ip_address_hash = db.Column(db.String(256), nullable=True)  # Hashed IP for privacy
    device_info = db.Column(db.String(256), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    
    # Details
    changes = db.Column(db.JSON, default=dict)  # What changed (before/after)
    extra_metadata = db.Column(db.JSON, default=dict)  # Additional context
    
    # Hash chain (immutability)
    previous_hash = db.Column(db.String(256), nullable=True)
    current_hash = db.Column(db.String(256), unique=True, nullable=False)
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def compute_hash(self):
        """Compute SHA256 hash of the log entry."""
        data = (
            f"{self.id}:{self.user_id}:{self.action.value}:{self.action_description}:"
            f"{self.target_type}:{self.target_id}:{self.election_id}:"
            f"{self.ip_address_hash}:{self.device_info}:{self.previous_hash}:"
            f"{self.created_at.isoformat() if self.created_at else ''}"
        )
        return hashlib.sha256(data.encode()).hexdigest()
    
    def verify_chain(self):
        """Verify the hash chain integrity."""
        computed = self.compute_hash()
        return computed == self.current_hash
    
    def to_dict(self):
        """Serialize audit log to dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'action': self.action.value,
            'action_description': self.action_description,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'target_name': self.target_name,
            'election_id': self.election_id,
            'changes': self.changes,
            'extra_metadata': self.extra_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'hash_verified': self.verify_chain(),
        }
    
    @classmethod
    def create_log(cls, user_id, action, description=None, target_type=None, 
                   target_id=None, target_name=None, election_id=None, 
                   changes=None, extra_metadata=None, user_email=None, 
                   ip_address_hash=None, device_info=None, user_agent=None):
        """Helper method to create an audit log entry."""
        # Get last log for hash chain
        last_log = cls.query.order_by(cls.created_at.desc()).first()
        previous_hash = last_log.current_hash if last_log else None
        
        audit = cls(
            user_id=user_id,
            user_email=user_email,
            action=action,
            action_description=description,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            election_id=election_id,
            changes=changes or {},
            extra_metadata=extra_metadata or {},
            ip_address_hash=ip_address_hash,
            device_info=device_info,
            user_agent=user_agent,
            previous_hash=previous_hash
        )
        audit.current_hash = audit.compute_hash()
        
        db.session.add(audit)
        db.session.commit()
        return audit
    
    def __repr__(self):
        return f'<AuditLog {self.action.value} by {self.user_id} at {self.created_at}>'