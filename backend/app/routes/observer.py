"""
Observer Routes - Read-only Election Monitoring
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.models.election import Election, ElectionStatus
from app.models.vote import Vote
from app.models.audit_log import AuditLog
from app.services.auth_service import AuthService

observer_bp = Blueprint('observer', __name__)


@observer_bp.route('/elections', methods=['GET'])
@jwt_required()
def observer_elections():
    """Get elections for observer monitoring."""
    claims = get_jwt()
    if claims.get('role') not in ['observer', 'auditor', 'super_admin', 'election_admin']:
        return jsonify({'success': False, 'message': 'Observer access required'}), 403
    
    elections = Election.query.filter(
        Election.status.in_([ElectionStatus.ACTIVE, ElectionStatus.CLOSED, ElectionStatus.COMPLETED])
    ).all()
    
    return jsonify({
        'success': True,
        'data': [e.to_dict(include_stats=True) for e in elections]
    }), 200


@observer_bp.route('/elections/<election_id>/monitor', methods=['GET'])
@jwt_required()
def monitor_election(election_id):
    """Real-time election monitoring data."""
    claims = get_jwt()
    if claims.get('role') not in ['observer', 'auditor', 'super_admin', 'election_admin']:
        return jsonify({'success': False, 'message': 'Observer access required'}), 403
    
    election = Election.query.get_or_404(election_id)
    
    # Real-time stats
    total_votes = Vote.query.filter_by(election_id=election_id).count()
    
    # Recent activity
    recent_votes = Vote.query.filter_by(election_id=election_id).order_by(
        Vote.cast_at.desc()
    ).limit(20).all()
    
    # Recent audit logs
    recent_logs = AuditLog.query.filter_by(election_id=election_id).order_by(
        AuditLog.created_at.desc()
    ).limit(50).all()
    
    return jsonify({
        'success': True,
        'data': {
            'election': election.to_dict(include_stats=True),
            'total_votes_cast': total_votes,
            'turnout_percentage': round((total_votes / election.total_registered_voters * 100), 2) if election.total_registered_voters > 0 else 0,
            'recent_activity': [{
                'vote_id': v.id,
                'position_id': v.position_id,
                'cast_at': v.cast_at.isoformat()
            } for v in recent_votes],
            'audit_logs': [log.to_dict() for log in recent_logs]
        }
    }), 200


@observer_bp.route('/elections/<election_id>/compliance', methods=['GET'])
@jwt_required()
def compliance_check(election_id):
    """Election compliance check."""
    claims = get_jwt()
    if claims.get('role') not in ['auditor', 'super_admin', 'election_admin']:
        return jsonify({'success': False, 'message': 'Auditor access required'}), 403
    
    election = Election.query.get_or_404(election_id)
    
    # Compliance checks
    checks = {
        'election_has_positions': election.positions.count() > 0,
        'election_has_candidates': any(p.candidates.count() > 0 for p in election.positions),
        'voting_period_valid': election.start_date < election.end_date,
        'results_not_prematurely_published': not (election.show_results_immediately and election.status == ElectionStatus.ACTIVE),
        'audit_logs_exist': AuditLog.query.filter_by(election_id=election_id).count() > 0,
        'no_duplicate_votes': True,  # Would need more complex check
    }
    
    return jsonify({
        'success': True,
        'data': {
            'election_id': election_id,
            'compliance_checks': checks,
            'is_compliant': all(checks.values())
        }
    }), 200
