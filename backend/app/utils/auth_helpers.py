# backend/app/utils/auth_helpers.py
"""
Authentication Helpers - Token generation, OTP, and hashing utilities
"""
import jwt
import secrets
import hashlib
import datetime
from flask import current_app


def generate_reset_token(user_id):
    """
    Generate a password reset token
    
    Args:
        user_id: User ID to encode in token
    
    Returns:
        JWT token string valid for 24 hours
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'type': 'reset',
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def verify_reset_token(token):
    """
    Verify reset token and return user_id
    
    Args:
        token: JWT token to verify
    
    Returns:
        user_id if valid, None if invalid or expired
    """
    try:
        data = jwt.decode(
            token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256']
        )
        
        # Check if it's a reset token
        if data.get('type') != 'reset':
            return None
        
        return data.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def generate_verification_token(email):
    """
    Generate email verification token
    
    Args:
        email: Email address to verify
    
    Returns:
        JWT token string valid for 48 hours
    """
    payload = {
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=48),
        'type': 'verify',
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def verify_verification_token(token):
    """
    Verify email verification token
    
    Args:
        token: JWT token to verify
    
    Returns:
        email if valid, None if invalid or expired
    """
    try:
        data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        if data.get('type') != 'verify':
            return None
        return data.get('email')
    except:
        return None


def generate_otp():
    """
    Generate a 6-digit OTP (One-Time Password)
    
    Returns:
        6-digit OTP as string (e.g., '123456')
    """
    return str(secrets.randbelow(900000) + 100000).zfill(6)


def hash_ip_address(ip_address):
    """
    Hash IP address for privacy compliance (GDPR)
    
    Args:
        ip_address: IP address string (e.g., '192.168.1.1')
    
    Returns:
        SHA-256 hash of IP address or None if input is None
    """
    if not ip_address:
        return None
    return hashlib.sha256(ip_address.encode()).hexdigest()


def generate_session_token(user_id):
    """
    Generate a session token for login
    
    Args:
        user_id: User ID to encode
    
    Returns:
        JWT token string valid for 24 hours
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'type': 'session',
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def generate_refresh_token(user_id):
    """
    Generate a refresh token for obtaining new session tokens
    
    Args:
        user_id: User ID to encode
    
    Returns:
        JWT token string valid for 7 days
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'type': 'refresh',
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def verify_refresh_token(token):
    """
    Verify refresh token and return user_id
    
    Args:
        token: JWT token to verify
    
    Returns:
        user_id if valid, None if invalid or expired
    """
    try:
        data = jwt.decode(
            token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256']
        )
        
        if data.get('type') != 'refresh':
            return None
        
        return data.get('user_id')
    except:
        return None


def mask_email(email):
    """
    Mask email for privacy display
    Example: 'john.doe@example.com' -> 'j***n@e***e.com'
    
    Args:
        email: Email address to mask
    
    Returns:
        Masked email string
    """
    if not email or '@' not in email:
        return email
    
    local_part, domain = email.split('@')
    domain_parts = domain.split('.')
    
    # Mask local part
    if len(local_part) <= 2:
        masked_local = '*' * len(local_part)
    else:
        masked_local = local_part[0] + '*' * (len(local_part) - 2) + local_part[-1]
    
    # Mask domain
    if len(domain_parts[0]) <= 2:
        masked_domain = '*' * len(domain_parts[0])
    else:
        masked_domain = domain_parts[0][0] + '*' * (len(domain_parts[0]) - 2) + domain_parts[0][-1]
    
    return f"{masked_local}@{masked_domain}.{domain_parts[1]}"


def validate_password_strength(password):
    """
    Validate password strength
    
    Args:
        password: Password string to validate
    
    Returns:
        Tuple: (is_valid, list_of_issues)
    """
    issues = []
    
    if len(password) < 8:
        issues.append('Password must be at least 8 characters long')
    
    if not any(c.isupper() for c in password):
        issues.append('Password must contain at least one uppercase letter')
    
    if not any(c.islower() for c in password):
        issues.append('Password must contain at least one lowercase letter')
    
    if not any(c.isdigit() for c in password):
        issues.append('Password must contain at least one number')
    
    if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?`~' for c in password):
        issues.append('Password must contain at least one special character')
    
    return (len(issues) == 0, issues)