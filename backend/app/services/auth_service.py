"""
Authentication Service - OTP, JWT, Device Fingerprinting
"""
import random
import string
import hashlib
from datetime import datetime, timedelta
from flask import current_app, request
from app import db, mail
from app.models.user import User, UserStatus, UserRole
from app.models.audit_log import AuditLog, AuditAction
from flask_mail import Message


class AuthService:
    """Authentication and authorization service."""
    
    OTP_EXPIRY_MINUTES = 10
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    
    @staticmethod
    def generate_otp(length=6):
        """Generate random numeric OTP."""
        return ''.join(random.choices(string.digits, k=length))
    
    @staticmethod
    def generate_device_fingerprint():
        """Generate device fingerprint from request headers."""
        user_agent = request.headers.get('User-Agent', '')
        accept_lang = request.headers.get('Accept-Language', '')
        accept_encoding = request.headers.get('Accept-Encoding', '')
        fingerprint_data = user_agent + ":" + accept_lang + ":" + accept_encoding
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()
    
    @staticmethod
    def hash_ip_address(ip):
        """Hash IP address for privacy."""
        return hashlib.sha256((ip + ":ican_salt").encode()).hexdigest()
    
    @classmethod
    def send_otp_email(cls, user, otp):
        """Send OTP via email."""
        try:
            body_text = "Dear " + user.full_name + ",\n\nYour verification code for ICAN Electronic Voting System is: " + otp + "\n\nThis code will expire in " + str(cls.OTP_EXPIRY_MINUTES) + " minutes.\n\nIf you did not request this code, please ignore this email or contact support immediately.\n\nBest regards,\nICAN Election Committee"
            
            html_body = '''<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #1a365d; color: white; padding: 20px; text-align: center;">
        <h2>ICAN Electronic Voting System</h2>
    </div>
    <div style="padding: 30px; background: #f7fafc;">
        <p>Dear <strong>''' + user.full_name + '''</strong>,</p>
        <p>Your verification code is:</p>
        <div style="background: #e2e8f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #1a365d; letter-spacing: 8px; font-size: 36px; margin: 0;">''' + otp + '''</h1>
        </div>
        <p>This code will expire in <strong>''' + str(cls.OTP_EXPIRY_MINUTES) + ''' minutes</strong>.</p>
        <p style="color: #e53e3e; font-size: 14px;">If you did not request this code, please ignore this email or contact support immediately.</p>
    </div>
    <div style="background: #1a365d; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p>ICAN Election Committee | elections@ican.org.ng</p>
    </div>
</div>'''
            
            msg = Message(
                subject='ICAN Election - Your Verification Code',
                recipients=[user.email],
                body=body_text,
                html=html_body
            )
            mail.send(msg)
            return True
        except Exception as e:
            current_app.logger.error("Failed to send OTP email: " + str(e))
            return False
    
    @classmethod
    def send_otp_sms(cls, user, otp):
        """Send OTP via SMS using Twilio."""
        try:
            from twilio.rest import Client
            account_sid = current_app.config.get('TWILIO_ACCOUNT_SID')
            auth_token = current_app.config.get('TWILIO_AUTH_TOKEN')
            from_number = current_app.config.get('TWILIO_PHONE_NUMBER')
            
            if not all([account_sid, auth_token, from_number]):
                current_app.logger.warning("Twilio credentials not configured")
                return False
            
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body='ICAN Election: Your verification code is ' + otp + '. Valid for ' + str(cls.OTP_EXPIRY_MINUTES) + ' mins. Do not share this code.',
                from_=from_number,
                to=user.phone
            )
            return message.sid is not None
        except Exception as e:
            current_app.logger.error("Failed to send OTP SMS: " + str(e))
            return False
    
    @classmethod
    def create_audit_log(cls, user_id, action, description=None, election_id=None, 
                         target_type=None, target_id=None):
        """Create immutable audit log entry."""
        ip = request.remote_addr or 'unknown'
        user_agent = request.headers.get('User-Agent', '')
        device_info = cls.generate_device_fingerprint()
        
        # Get last log for hash chain
        last_log = AuditLog.query.order_by(AuditLog.created_at.desc()).first()
        previous_hash = last_log.current_hash if last_log else None
        
        audit = AuditLog(
            user_id=user_id,
            action=action,
            action_description=description,
            election_id=election_id,
            target_type=target_type,
            target_id=target_id,
            ip_address_hash=cls.hash_ip_address(ip),
            device_info=device_info,
            user_agent=user_agent,
            previous_hash=previous_hash
        )
        audit.current_hash = audit.compute_hash()
        
        db.session.add(audit)
        db.session.commit()
        return audit
    
    @classmethod
    def check_account_lock(cls, user):
        """Check if account is locked due to failed attempts."""
        if user.locked_until and user.locked_until > datetime.utcnow():
            remaining = (user.locked_until - datetime.utcnow()).seconds // 60
            return True, remaining
        
        if user.locked_until and user.locked_until <= datetime.utcnow():
            user.failed_login_attempts = 0
            user.locked_until = None
            db.session.commit()
        
        return False, 0
    
    @classmethod
    def record_failed_login(cls, user):
        """Record failed login attempt."""
        user.failed_login_attempts += 1
        
        if user.failed_login_attempts >= cls.MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=cls.LOCKOUT_DURATION_MINUTES)
            cls.create_audit_log(
                user_id=user.id,
                action=AuditAction.ACCOUNT_LOCKED,
                description="Account locked after " + str(cls.MAX_LOGIN_ATTEMPTS) + " failed attempts"
            )
        
        db.session.commit()
    
    @classmethod
    def reset_failed_attempts(cls, user):
        """Reset failed login attempts on successful login."""
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = cls.hash_ip_address(request.remote_addr or 'unknown')
        user.last_login_device = cls.generate_device_fingerprint()
        db.session.commit()