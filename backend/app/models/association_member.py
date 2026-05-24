"""
Association Member Model - For pre-registration validation
"""
import uuid
from datetime import datetime
from enum import Enum
from app import db


class PaymentStatus(Enum):
    PAID = "paid"
    PENDING = "pending"
    FAILED = "failed"
    REFUNDED = "refunded"


class AssociationMember(db.Model):
    """Association members eligible to register for voting."""
    __tablename__ = 'association_members'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    association_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    district = db.Column(db.String(50), nullable=False)
    chapter = db.Column(db.String(100), nullable=True)
    
    # Payment tracking
    payment_status = db.Column(db.Enum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    payment_reference = db.Column(db.String(100), nullable=True)
    payment_date = db.Column(db.DateTime, nullable=True)
    amount_paid = db.Column(db.Numeric(10, 2), default=0.00)
    
    # Registration tracking
    has_registered = db.Column(db.Boolean, default=False)
    registered_at = db.Column(db.DateTime, nullable=True)
    registered_user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    registered_user = db.relationship('User', backref='association_member_record', foreign_keys=[registered_user_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'association_id': self.association_id,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'district': self.district,
            'chapter': self.chapter,
            'payment_status': self.payment_status.value if self.payment_status else None,
            'has_registered': self.has_registered,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<AssociationMember {self.association_id}>'