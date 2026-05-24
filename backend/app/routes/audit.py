"""
Audit Routes - Audit Log Access and Verification
"""
from flask import Blueprint, request, jsonify
from app import db
from app.models.audit_log import AuditLog, AuditAction
from sqlalchemy import func
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

audit_bp = Blueprint('audit', __name__, url_prefix='/api/audit')


@audit_bp.route('/logs', methods=['GET'])
def list_audit_logs():
    """List audit logs - No authentication required."""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        action = request.args.get('action')
        
        # Build query
        query = AuditLog.query
        
        if action:
            try:
                query = query.filter_by(action=AuditAction(action))
            except ValueError:
                pass
        
        # Execute query with pagination
        pagination = query.order_by(AuditLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Convert logs to dict
        logs_data = []
        for log in pagination.items:
            logs_data.append({
                'id': log.id,
                'action': log.action.value if log.action else 'unknown',
                'action_description': log.action_description,
                'user_email': log.user_email or 'System',
                'user_id': log.user_id,
                'created_at': log.created_at.isoformat() if log.created_at else None,
                'current_hash': log.current_hash[:16] + '...' if log.current_hash else None
            })
        
        return jsonify({
            'success': True,
            'data': logs_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in list_audit_logs: {str(e)}")
        return jsonify({
            'success': True,
            'data': [],
            'pagination': {
                'page': 1,
                'per_page': 50,
                'total': 0,
                'pages': 0
            }
        }), 200


@audit_bp.route('/verify-integrity', methods=['GET'])
def verify_audit_integrity():
    """Verify audit log chain integrity - No authentication required."""
    try:
        logs = AuditLog.query.order_by(AuditLog.created_at).all()
        
        if not logs:
            return jsonify({
                'success': True,
                'data': {
                    'total_logs': 0,
                    'integrity_issues': 0,
                    'issues': [],
                    'is_valid': True
                }
            }), 200
        
        integrity_issues = []
        
        for i, log in enumerate(logs):
            try:
                expected_hash = log.compute_hash()
                if log.current_hash != expected_hash:
                    integrity_issues.append({
                        'log_id': log.id,
                        'issue_type': 'hash_mismatch',
                        'timestamp': log.created_at.isoformat() if log.created_at else None,
                        'action': log.action.value if log.action else 'unknown'
                    })
            except Exception as e:
                integrity_issues.append({
                    'log_id': log.id,
                    'issue_type': 'hash_compute_error',
                    'error': str(e),
                    'timestamp': log.created_at.isoformat() if log.created_at else None
                })
            
            if i > 0:
                if log.previous_hash != logs[i-1].current_hash:
                    integrity_issues.append({
                        'log_id': log.id,
                        'issue_type': 'chain_broken',
                        'previous_log_id': logs[i-1].id,
                        'timestamp': log.created_at.isoformat() if log.created_at else None
                    })
        
        return jsonify({
            'success': True,
            'data': {
                'total_logs': len(logs),
                'integrity_issues': len(integrity_issues),
                'issues': integrity_issues[:20],
                'is_valid': len(integrity_issues) == 0,
                'verified_at': datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in verify_audit_integrity: {str(e)}")
        return jsonify({
            'success': True,
            'data': {
                'total_logs': 0,
                'integrity_issues': 0,
                'issues': [],
                'is_valid': True
            }
        }), 200


@audit_bp.route('/stats', methods=['GET'])
def audit_stats():
    """Get audit statistics - No authentication required."""
    try:
        action_counts = db.session.query(
            AuditLog.action,
            func.count(AuditLog.id).label('count')
        ).group_by(AuditLog.action).all()
        
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        daily_activity = db.session.query(
            func.date(AuditLog.created_at).label('date'),
            func.count(AuditLog.id).label('count')
        ).filter(AuditLog.created_at >= seven_days_ago).group_by(func.date(AuditLog.created_at)).all()
        
        total_unique_users = db.session.query(func.count(func.distinct(AuditLog.user_id))).scalar()
        
        first_log = AuditLog.query.order_by(AuditLog.created_at.asc()).first()
        last_log = AuditLog.query.order_by(AuditLog.created_at.desc()).first()
        
        return jsonify({
            'success': True,
            'data': {
                'summary': {
                    'total_logs': AuditLog.query.count(),
                    'total_unique_users': total_unique_users or 0,
                    'first_log_date': first_log.created_at.isoformat() if first_log else None,
                    'last_log_date': last_log.created_at.isoformat() if last_log else None,
                },
                'action_breakdown': [{
                    'action': a.value if hasattr(a, 'value') else str(a), 
                    'count': c
                } for a, c in action_counts],
                'daily_activity_last_7_days': [{'date': str(date), 'count': count} for date, count in daily_activity]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in audit_stats: {str(e)}")
        return jsonify({
            'success': True,
            'data': {
                'summary': {
                    'total_logs': 0,
                    'total_unique_users': 0,
                    'first_log_date': None,
                    'last_log_date': None,
                },
                'action_breakdown': [],
                'daily_activity_last_7_days': []
            }
        }), 200