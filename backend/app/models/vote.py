"""
Vote Model - Secure Vote Recording and Receipt Management
"""
import uuid
import hashlib
from datetime import datetime
from enum import Enum
from app import db


class VoteType(Enum):
    SINGLE = "single"
    MULTIPLE = "multiple"
    RANKED = "ranked"
    YES_NO = "yes_no"


class Vote(db.Model):
    """Vote Model - Secure and Anonymous Vote Recording."""
    __tablename__ = 'votes'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # References
    election_id = db.Column(db.String(36), db.ForeignKey('elections.id'), nullable=False, index=True)
    position_id = db.Column(db.String(36), db.ForeignKey('positions.id'), nullable=False, index=True)
    voter_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    candidate_id = db.Column(db.String(36), db.ForeignKey('candidates.id'), nullable=False, index=True)
    
    # Vote data (for ranked/multiple choice)
    rank = db.Column(db.Integer, nullable=True)  # For ranked voting
    is_abstain = db.Column(db.Boolean, default=False)
    
    # Security and verification
    vote_hash = db.Column(db.String(256), nullable=False, unique=True)
    encryption_nonce = db.Column(db.String(64), nullable=True)
    
    # Metadata
    ip_address_hash = db.Column(db.String(256), nullable=True)  # Hashed IP for privacy
    device_fingerprint = db.Column(db.String(256), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    @staticmethod
    def generate_vote_hash(voter_id, election_id, position_id, candidate_id, timestamp):
        """Generate unique vote hash for verification."""
        data = f"{voter_id}:{election_id}:{position_id}:{candidate_id}:{timestamp}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    @staticmethod
    def generate_receipt_code(vote_id, voter_id, timestamp):
        """Generate unique receipt code."""
        data = f"{vote_id}:{voter_id}:{timestamp}"
        return hashlib.sha256(data.encode()).hexdigest()[:16].upper()
    
    def to_dict(self, include_receipt=False):
        """Serialize vote to dictionary (without sensitive data)."""
        data = {
            'id': self.id,
            'election_id': self.election_id,
            'position_id': self.position_id,
            'candidate_id': self.candidate_id,
            'rank': self.rank,
            'is_abstain': self.is_abstain,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        return data
    
    def get_public_data(self):
        """Get public vote data (for result display)."""
        return {
            'candidate_id': self.candidate_id,
            'position_id': self.position_id,
            'rank': self.rank,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
    
    def __repr__(self):
        return f'<Vote {self.id}: Election {self.election_id}>'


class VoteReceipt(db.Model):
    """Vote receipt model for verification."""
    __tablename__ = 'vote_receipts'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    vote_id = db.Column(db.String(36), db.ForeignKey('votes.id'), unique=True, nullable=False)
    receipt_code = db.Column(db.String(100), unique=True, nullable=False, index=True)
    verification_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship back to Vote
    vote = db.relationship('Vote', backref='receipt', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'vote_id': self.vote_id,
            'receipt_code': self.receipt_code,
            'verification_hash': self.verification_hash[:16] + '...',
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<VoteReceipt {self.receipt_code}>'