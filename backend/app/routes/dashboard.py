# backend/app/routes/dashboard.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Election, Vote, Notification
from app import db
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics for regular users"""
    current_user_id = get_jwt_identity()
    
    try:
        # Get real data from database
        now = datetime.utcnow()
        
        total_elections = Election.query.count()
        active_elections = Election.query.filter(
            Election.status == 'active',
            Election.start_date <= now,
            Election.end_date >= now
        ).count()
        
        upcoming_elections = Election.query.filter(
            Election.status == 'scheduled',
            Election.start_date > now
        ).count()
        
        votes_cast = Vote.query.filter_by(voter_id=current_user_id).count()
        
        unread_notifications = Notification.query.filter_by(
            user_id=current_user_id,
            is_read=False
        ).count()
        
        return jsonify({
            'success': True,
            'data': {
                'total_elections': total_elections,
                'active_elections': active_elections,
                'upcoming_elections': upcoming_elections,
                'votes_cast': votes_cast,
                'unread_notifications': unread_notifications
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@dashboard_bp.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """Get recent user activity"""
    current_user_id = get_jwt_identity()
    
    try:
        # Get recent votes
        recent_votes = Vote.query.filter_by(
            voter_id=current_user_id
        ).order_by(Vote.created_at.desc()).limit(5).all()
        
        activities = []
        for vote in recent_votes:
            election = Election.query.get(vote.election_id)
            if election:
                activities.append({
                    'type': 'vote_cast',
                    'description': f'Voted in {election.title}',
                    'timestamp': vote.created_at.isoformat() if vote.created_at else None,
                    'election_id': election.id
                })
        
        return jsonify({
            'success': True,
            'data': activities
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500