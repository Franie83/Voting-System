"""
User Model - ICAN Members, Admins, and Election Officials
"""
import uuid
from datetime import datetime
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from app import db


class UserStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class UserRole(Enum):
    MEMBER = "member"
    SUPER_ADMIN = "super_admin"
    ELECTION_ADMIN = "election_admin"
    AUDITOR = "auditor"
    OBSERVER = "observer"
    TECH_SUPPORT = "tech_support"


class District(Enum):
    LAGOS = "lagos"
    ABUJA = "abuja"
    PORT_HARCOURT = "port_harcourt"
    KANO = "kano"
    IBADAN = "ibadan"
    ENUGU = "enugu"
    BENIN = "benin"
    KADUNA = "kaduna"
    JOS = "jos"
    SOKOTO = "sokoto"
    CALABAR = "calabar"
    MAIDUGURI = "maiduguri"
    YOLA = "yola"
    OWERRI = "owerri"
    AKURE = "akure"
    ILORIN = "ilorin"
    MAKURDI = "makurdi"
    MINNA = "minna"
    UYO = "uyo"
    ASABA = "asaba"


class User(db.Model):
    """ICAN Member and System User Model."""
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    membership_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=False, index=True)  # Added index for faster lookups
    district = db.Column(db.Enum(District), nullable=False)
    chapter = db.Column(db.String(100), nullable=True)

    # Authentication
    password_hash = db.Column(db.String(256), nullable=False)

    # Status & Role
    status = db.Column(db.Enum(UserStatus), default=UserStatus.PENDING, nullable=False)
    role = db.Column(db.Enum(UserRole), default=UserRole.MEMBER, nullable=False)

    # Security - Email & Phone Verification
    email_verified = db.Column(db.Boolean, default=False)
    email_verified_at = db.Column(db.DateTime, nullable=True)
    
    phone_verified = db.Column(db.Boolean, default=False)  # ← Already exists, good!
    phone_verified_at = db.Column(db.DateTime, nullable=True)  # ← ADD THIS FIELD
    
    two_factor_enabled = db.Column(db.Boolean, default=False)
    two_factor_secret = db.Column(db.String(32), nullable=True)

    # Device & Session tracking
    last_login_at = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(45), nullable=True)
    last_login_device = db.Column(db.String(500), nullable=True)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    # Password Reset tracking
    reset_token = db.Column(db.String(500), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)

    # Profile
    photo_url = db.Column(db.String(500), nullable=True)
    bio = db.Column(db.Text, nullable=True)

    # Approval tracking (for pending users)
    approved_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.String(500), nullable=True)
    rejected_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    votes = db.relationship('Vote', backref='voter', lazy='dynamic', foreign_keys='Vote.voter_id')
    candidate_profiles = db.relationship('Candidate', backref='user', lazy='dynamic', foreign_keys='Candidate.user_id')
    audit_logs = db.relationship('AuditLog', backref='user', lazy='dynamic')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic')
    
    # Self-referential relationships for approvals
    approver = db.relationship('User', foreign_keys=[approved_by], remote_side='User.id')
    rejecter = db.relationship('User', foreign_keys=[rejected_by], remote_side='User.id')

    def set_password(self, password):
        """Hash and set password."""
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256:600000')

    def check_password(self, password):
        """Verify password."""
        return check_password_hash(self.password_hash, password)

    def is_active(self):
        """Check if user is active."""
        return self.status == UserStatus.ACTIVE

    def is_locked(self):
        """Check if account is locked."""
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def can_vote(self):
        """Check if user is eligible to vote."""
        return self.status == UserStatus.ACTIVE and self.role == UserRole.MEMBER

    def is_admin(self):
        """Check if user has admin privileges."""
        return self.role in [UserRole.SUPER_ADMIN, UserRole.ELECTION_ADMIN]

    def is_super_admin(self):
        """Check if user is super admin."""
        return self.role == UserRole.SUPER_ADMIN

    def is_observer(self):
        """Check if user is an observer."""
        return self.role == UserRole.OBSERVER

    def is_auditor(self):
        """Check if user is an auditor."""
        return self.role == UserRole.AUDITOR

    def is_phone_fully_verified(self):
        """Check if phone is verified."""
        return self.phone_verified is True

    def mark_phone_verified(self):
        """Mark phone as verified with timestamp."""
        self.phone_verified = True
        self.phone_verified_at = datetime.utcnow()

    def mark_email_verified(self):
        """Mark email as verified with timestamp."""
        self.email_verified = True
        self.email_verified_at = datetime.utcnow()

    def record_failed_login(self):
        """Increment failed login attempts and lock if needed."""
        self.failed_login_attempts += 1
        
        # Lock account after 5 failed attempts for 15 minutes
        if self.failed_login_attempts >= 5:
            self.locked_until = datetime.utcnow() + timedelta(minutes=15)

    def reset_failed_attempts(self):
        """Reset failed login attempts and unlock account."""
        self.failed_login_attempts = 0
        self.locked_until = None

    def to_dict(self, include_sensitive=False):
        """Serialize user to dictionary."""
        data = {
            'id': self.id,
            'membership_number': self.membership_number,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'district': self.district.value if self.district else None,
            'chapter': self.chapter,
            'status': self.status.value,
            'role': self.role.value,
            'email_verified': self.email_verified,
            'phone_verified': self.phone_verified,
            'two_factor_enabled': self.two_factor_enabled,
            'photo_url': self.photo_url,
            'bio': self.bio,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
        }
        
        if include_sensitive:
            data['failed_login_attempts'] = self.failed_login_attempts
            data['locked_until'] = self.locked_until.isoformat() if self.locked_until else None
            data['email_verified_at'] = self.email_verified_at.isoformat() if self.email_verified_at else None
            data['phone_verified_at'] = self.phone_verified_at.isoformat() if self.phone_verified_at else None
            
        return data

    def __repr__(self):
        return f'<User {self.membership_number}: {self.full_name}>'


# Add timedelta import at top
from datetime import timedelta