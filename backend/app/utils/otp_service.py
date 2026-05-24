# backend/app/utils/otp_service.py
"""
OTP Service - Generate, store, and verify OTP codes via SMS
"""
import random
import re
from datetime import datetime, timedelta
from flask import current_app
import requests
import logging

logger = logging.getLogger(__name__)

# In-memory OTP storage (use Redis in production)
otp_storage = {}


def generate_otp():
    """Generate a 6-digit OTP code"""
    return f"{random.randint(100000, 999999)}"


def validate_phone_number(phone):
    """Validate Nigerian phone number format"""
    # Remove any spaces or special characters
    phone = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Check if it's a valid Nigerian number
    # Patterns: 08012345678, 0801 234 5678, +2348012345678, 2348012345678
    patterns = [
        r'^0[789][01]\d{8}$',  # 08012345678, 08123456789, 09012345678
        r'^\+234[789][01]\d{8}$',  # +2348012345678
        r'^234[789][01]\d{8}$',  # 2348012345678
    ]
    
    for pattern in patterns:
        if re.match(pattern, phone):
            # Normalize to international format
            if phone.startswith('0'):
                phone = '+234' + phone[1:]
            elif phone.startswith('234') and not phone.startswith('+'):
                phone = '+' + phone
            return phone
    
    return None


def store_otp(phone, otp, expiry_minutes=10):
    """Store OTP in memory with expiry"""
    normalized_phone = validate_phone_number(phone)
    if not normalized_phone:
        return False
    
    otp_storage[normalized_phone] = {
        'otp': otp,
        'expires_at': datetime.utcnow() + timedelta(minutes=expiry_minutes),
        'attempts': 0,
        'created_at': datetime.utcnow()
    }
    return True


def verify_otp(phone, otp):
    """Verify OTP code"""
    normalized_phone = validate_phone_number(phone)
    if not normalized_phone:
        return False
    
    stored = otp_storage.get(normalized_phone)
    
    if not stored:
        return False
    
    # Check expiry
    if datetime.utcnow() > stored['expires_at']:
        # Remove expired OTP
        del otp_storage[normalized_phone]
        return False
    
    # Check attempts (max 5 attempts)
    if stored['attempts'] >= 5:
        del otp_storage[normalized_phone]
        return False
    
    # Increment attempts
    stored['attempts'] += 1
    
    # Verify OTP
    if stored['otp'] == otp:
        # Remove used OTP
        del otp_storage[normalized_phone]
        return True
    
    return False


def send_sms(phone, message):
    """
    Send SMS using Africa's Talking or Termii (Nigeria-focused)
    You'll need to configure your SMS provider
    """
    normalized_phone = validate_phone_number(phone)
    if not normalized_phone:
        logger.error(f"Invalid phone number: {phone}")
        return False
    
    # Option 1: Termii (Popular in Nigeria)
    termii_api_key = current_app.config.get('TERMII_API_KEY')
    termii_sender_id = current_app.config.get('TERMII_SENDER_ID', 'ICAN-Vote')
    
    if termii_api_key:
        try:
            response = requests.post(
                'https://api.termii.com/api/sms/send',
                json={
                    'to': normalized_phone,
                    'from': termii_sender_id,
                    'sms': message,
                    'type': 'plain',
                    'channel': 'generic',
                    'api_key': termii_api_key
                },
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"SMS sent to {normalized_phone}")
                return True
            else:
                logger.error(f"Termii SMS failed: {response.text}")
        except Exception as e:
            logger.error(f"Termii SMS error: {str(e)}")
    
    # Option 2: Africa's Talking
    at_api_key = current_app.config.get('AFRICASTALKING_API_KEY')
    at_username = current_app.config.get('AFRICASTALKING_USERNAME')
    
    if at_api_key and at_username:
        try:
            response = requests.post(
                'https://api.africastalking.com/version1/messaging',
                headers={
                    'ApiKey': at_api_key,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                data={
                    'username': at_username,
                    'to': normalized_phone,
                    'message': message,
                    'from': current_app.config.get('AFRICASTALKING_SENDER_ID', 'ICAN-VOTE')
                },
                timeout=10
            )
            
            if response.status_code == 201:
                logger.info(f"SMS sent to {normalized_phone} via Africa's Talking")
                return True
            else:
                logger.error(f"Africa's Talking SMS failed: {response.text}")
        except Exception as e:
            logger.error(f"Africa's Talking SMS error: {str(e)}")
    
    # Development mode - print to console
    if current_app.config.get('DEBUG', False):
        print(f"\n{'='*60}")
        print(f"📱 SMS (Development Mode)")
        print(f"{'='*60}")
        print(f"To: {normalized_phone}")
        print(f"Message: {message}")
        print(f"{'='*60}\n")
        return True
    
    logger.error(f"No SMS provider configured for {normalized_phone}")
    return False


def generate_and_send_otp(phone, name=None):
    """Generate OTP and send via SMS"""
    # Validate phone number
    normalized_phone = validate_phone_number(phone)
    if not normalized_phone:
        logger.error(f"Invalid phone number format: {phone}")
        return False, "Invalid phone number format"
    
    # Generate OTP
    otp = generate_otp()
    
    # Store OTP
    store_otp(normalized_phone, otp)
    
    # Create SMS message
    message = f"""ICAN Voting System Verification

Your OTP code is: {otp}

This code will expire in 10 minutes.

Do not share this code with anyone.

ICAN Elections"""
    
    # Send SMS
    if send_sms(normalized_phone, message):
        return True, "OTP sent successfully"
    else:
        return False, "Failed to send OTP. Please check your phone number."


def generate_and_send_login_otp(phone, name=None):
    """Generate OTP for login verification"""
    normalized_phone = validate_phone_number(phone)
    if not normalized_phone:
        return False, "Invalid phone number format"
    
    otp = generate_otp()
    store_otp(normalized_phone, otp)
    
    message = f"""ICAN Voting System Login

Your login verification code is: {otp}

Valid for 10 minutes.

If you didn't request this, ignore this message.

ICAN Elections"""
    
    if send_sms(normalized_phone, message):
        return True, "Login OTP sent"
    else:
        return False, "Failed to send OTP"


def clear_expired_otps():
    """Clear expired OTPs (call from a background task)"""
    now = datetime.utcnow()
    expired = [
        phone for phone, data in otp_storage.items()
        if now > data['expires_at']
    ]
    for phone in expired:
        del otp_storage[phone]
    return len(expired)


def get_otp_status(phone):
    """Check OTP status for a phone number"""
    normalized_phone = validate_phone_number(phone)
    if not normalized_phone:
        return None
    
    stored = otp_storage.get(normalized_phone)
    if not stored:
        return None
    
    return {
        'exists': True,
        'expires_at': stored['expires_at'].isoformat(),
        'attempts': stored['attempts'],
        'time_left_seconds': max(0, (stored['expires_at'] - datetime.utcnow()).total_seconds())
    }