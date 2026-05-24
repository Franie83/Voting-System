"""
Position Model - For managing election positions/offices
"""
import uuid
from datetime import datetime
from app import db


class Position(db.Model):
    """Position model for election offices/roles."""
    __tablename__ = 'positions'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Basic info
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Election relationship
    election_id = db.Column(db.String(36), db.ForeignKey('elections.id'), nullable=False)
    
    # Order and limits
    display_order = db.Column(db.Integer, default=0)
    max_candidates = db.Column(db.Integer, default=10)
    max_winners = db.Column(db.Integer, default=1)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    candidates = db.relationship('Candidate', backref='position', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert position to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'election_id': self.election_id,
            'display_order': self.display_order,
            'max_candidates': self.max_candidates,
            'max_winners': self.max_winners,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'candidates_count': len(self.candidates) if self.candidates else 0
        }
    
    def __repr__(self):
        return f'<Position {self.title}>'