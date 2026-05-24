"""
Notification Routes - User Notifications
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.notification import Notification, NotificationStatus
from app.services.notification_service import NotificationService

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def list_notifications():
    """List user notifications."""
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
    query = Notification.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=NotificationStatus(status))
    
    pagination = query.order_by(Notification.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'success': True,
        'data': [n.to_dict() for n in pagination.items],
        'unread_count': Notification.query.filter_by(
            user_id=user_id, status=NotificationStatus.SENT
        ).count(),
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages
        }
    }), 200


@notifications_bp.route('/<notification_id>/read', methods=['POST'])
@jwt_required()
def mark_as_read(notification_id):
    """Mark notification as read."""
    user_id = get_jwt_identity()
    notification = Notification.query.filter_by(
        id=notification_id, user_id=user_id
    ).first_or_404()
    
    notification.status = NotificationStatus.READ
    notification.read_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Notification marked as read'}), 200


@notifications_bp.route('/send', methods=['POST'])
@jwt_required()
def send_notification():
    """Send notification (Admin only)."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    data = request.get_json()
    user_ids = data.get('user_ids', [])
    channels = data.get('channels', ['email'])
    title = data.get('title')
    message = data.get('message')
    notification_type = data.get('type', 'system_maintenance')
    
    if not all([title, message]):
        return jsonify({'success': False, 'message': 'Title and message are required'}), 400
    
    results = []
    for user_id in user_ids:
        result = NotificationService.send_notification(
            user_id=user_id,
            notification_type=NotificationType(notification_type),
            channels=[NotificationChannel(c) for c in channels],
            title=title,
            message=message
        )
        results.append({'user_id': user_id, 'result': result})
    
    return jsonify({
        'success': True,
        'message': 'Notifications sent',
        'data': results
    }), 200
