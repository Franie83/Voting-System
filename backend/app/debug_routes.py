# backend/app/debug_routes.py
from flask import Blueprint, jsonify
from app.models import User

debug_bp = Blueprint('debug', __name__, url_prefix='/api/debug')

@debug_bp.route('/users', methods=['GET'])
def debug_users():
    """List all users (debug only)"""
    try:
        users = User.query.all()
        safe_users = []
        for user in users:
            safe_users.append({
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'membership_number': user.membership_number,
                'is_verified': user.is_verified,
                'is_active': user.is_active
            })
        
        return jsonify({
            'success': True,
            'count': len(safe_users),
            'users': safe_users
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@debug_bp.route('/check-user/<email>', methods=['GET'])
def check_user(email):
    """Check if a specific user exists"""
    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({
            'exists': True,
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active
        })
    return jsonify({'exists': False, 'email': email})

@debug_bp.route('/create-admin', methods=['POST'])
def create_admin():
    """Create admin user if not exists"""
    from werkzeug.security import generate_password_hash
    
    admin_email = 'admin@ican.org.ng'
    admin_password = 'Admin123!'
    
    existing = User.query.filter_by(email=admin_email).first()
    if existing:
        return jsonify({'message': 'Admin already exists', 'user_id': existing.id})
    
    admin = User(
        email=admin_email,
        password_hash=generate_password_hash(admin_password),
        full_name='System Administrator',
        membership_number='ADMIN001',
        role='super_admin',
        is_verified=True,
        is_active=True
    )
    
    db.session.add(admin)
    db.session.commit()
    
    return jsonify({
        'message': 'Admin created successfully',
        'email': admin_email,
        'password': admin_password
    })