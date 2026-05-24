# backend/app/middleware/auth.py
from functools import wraps
from flask import request, jsonify
import jwt
from flask import current_app
from app.models import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is missing'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            
            # Decode token
            data = jwt.decode(
                token, 
                current_app.config['SECRET_KEY'], 
                algorithms=['HS256']
            )
            
            # Get current user
            current_user = User.query.get(data.get('user_id'))
            
            if not current_user:
                return jsonify({'success': False, 'error': 'User not found'}), 401
            
            # Check if user is active
            if current_user.status != 'active':
                return jsonify({'success': False, 'error': 'Account is not active'}), 401
            
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


def role_required(allowed_roles):
    """Decorator to check if user has required role"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # The current_user should be passed as first argument
            current_user = kwargs.get('current_user')
            if not current_user and args and hasattr(args[0], 'role'):
                current_user = args[0]
            
            if not current_user:
                return jsonify({'success': False, 'error': 'User not authenticated'}), 401
            
            if current_user.role not in allowed_roles and current_user.role != 'super_admin':
                return jsonify({
                    'success': False, 
                    'error': f'Role required: {", ".join(allowed_roles)}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator