"""
ICAN Voting System - Models Package
"""
# Import db from app (to make it available from models)
from app import db

# Import all models
from app.models.user import User, UserStatus, UserRole, District
from app.models.election import Election, ElectionType, ElectionStatus, VotingRule
from app.models.position import Position
from app.models.candidate import Candidate, CandidateStatus
from app.models.vote import Vote, VoteReceipt
from app.models.audit_log import AuditLog, AuditAction
from app.models.notification import Notification, NotificationChannel, NotificationType, NotificationStatus
from app.models.association_member import AssociationMember, PaymentStatus
from app.models.system_config import SystemConfig  # Add this line

# Define __all__ for explicit exports
__all__ = [
    'db',  # Add db to exports
    'User', 'UserStatus', 'UserRole', 'District',
    'Election', 'ElectionType', 'ElectionStatus', 'VotingRule',
    'Position',
    'Candidate', 'CandidateStatus',
    'Vote', 'VoteReceipt',
    'AuditLog', 'AuditAction',
    'Notification', 'NotificationChannel', 'NotificationType', 'NotificationStatus',
    'AssociationMember', 'PaymentStatus',
    'SystemConfig',  # Add this line
]