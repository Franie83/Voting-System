"""
ICAN Voting System - Routes Package
"""
from app.routes.auth import auth_bp
from app.routes.elections import elections_bp
from app.routes.candidates import candidates_bp
from app.routes.voting import voting_bp
from app.routes.results import results_bp
from app.routes.admin import admin_bp
from app.routes.audit import audit_bp
from app.routes.analytics import analytics_bp
from app.routes.notifications import notifications_bp
from app.routes.observer import observer_bp

__all__ = [
    'auth_bp', 'elections_bp', 'candidates_bp', 'voting_bp',
    'results_bp', 'admin_bp', 'audit_bp', 'analytics_bp',
    'notifications_bp', 'observer_bp'
]
