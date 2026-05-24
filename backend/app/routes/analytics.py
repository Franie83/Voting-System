"""
Analytics Routes - Real-time Election Monitoring
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models.election import Election, ElectionStatus
from app.models.vote import Vote
from app.models.user import User, District, UserStatus
from sqlalchemy import func, extract
from datetime import datetime, timedelta

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/elections/<election_id>/realtime', methods=['GET'])
@jwt_required()
def realtime_analytics(election_id):
    """Get real-time election analytics."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin', 'auditor', 'observer']:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    election = Election.query.get_or_404(election_id)
    
    # Voter turnout
    total_votes = Vote.query.filter_by(election_id=election_id).count()
    turnout_percentage = round((total_votes / election.total_registered_voters * 100), 2) if election.total_registered_voters > 0 else 0
    
    # Votes by position
    position_stats = db.session.query(
        Vote.position_id,
        func.count(Vote.id)
    ).filter_by(election_id=election_id).group_by(Vote.position_id).all()
    
    # Votes by hour (last 24 hours)
    now = datetime.utcnow()
    hourly_stats = []
    for i in range(24):
        hour_start = now - timedelta(hours=i+1)
        hour_end = now - timedelta(hours=i)
        count = Vote.query.filter(
            Vote.election_id == election_id,
            Vote.created_at >= hour_start,
            Vote.created_at < hour_end
        ).count()
        hourly_stats.append({
            'hour': hour_start.strftime('%H:00'),
            'votes': count
        })
    
    # Geographic distribution
    geo_stats = db.session.query(
        User.district,
        func.count(Vote.id)
    ).join(Vote, Vote.voter_id == User.id).filter(
        Vote.election_id == election_id
    ).group_by(User.district).all()
    
    return jsonify({
        'success': True,
        'data': {
            'election_id': election_id,
            'status': election.status.value,
            'total_votes': total_votes,
            'registered_voters': election.total_registered_voters,
            'turnout_percentage': turnout_percentage,
            'time_remaining': str(election.time_remaining()) if election.time_remaining() else None,
            'position_stats': [{'position_id': str(p), 'votes': c} for p, c in position_stats],
            'hourly_stats': hourly_stats,
            'geographic_distribution': [{'district': d.value if d else None, 'votes': c} for d, c in geo_stats]
        }
    }), 200


@analytics_bp.route('/elections/<election_id>/participation', methods=['GET'])
@jwt_required()
def participation_analytics(election_id):
    """Get detailed participation analytics."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin', 'auditor', 'observer']:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    election = Election.query.get_or_404(election_id)
    
    # District-wise participation
    district_stats = []
    for district in District:
        eligible = User.query.filter_by(district=district, status=UserStatus.ACTIVE).count()
        voted = Vote.query.join(User, User.id == Vote.voter_id).filter(
            Vote.election_id == election_id,
            User.district == district
        ).count()
        district_stats.append({
            'district': district.value,
            'eligible': eligible,
            'voted': voted,
            'percentage': round((voted / eligible * 100), 2) if eligible > 0 else 0
        })
    
    return jsonify({
        'success': True,
        'data': {
            'district_participation': district_stats,
            'overall_turnout': round((election.total_votes_cast / election.total_registered_voters * 100), 2) if election.total_registered_voters > 0 else 0
        }
    }), 200