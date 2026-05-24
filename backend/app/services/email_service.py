"""
Email Service - Placeholder for email functionality
"""
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending notifications."""
    
    @staticmethod
    def send_email(to, subject, body, html_body=None):
        """Send email (placeholder implementation)."""
        logger.info(f"Email would be sent to: {to}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body: {body}")
        print(f"\n{'='*60}")
        print(f"EMAIL NOTIFICATION (Development Mode)")
        print(f"To: {to}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        print(f"{'='*60}\n")
        return True
    
    @staticmethod
    def send_password_reset_email(email, reset_token):
        """Send password reset email."""
        subject = "Password Reset Request - ICAN Voting System"
        body = f"""
        Hello,
        
        You requested a password reset for your ICAN Voting System account.
        
        Click the link below to reset your password:
        http://localhost:3000/reset-password/{reset_token}
        
        If you did not request this, please ignore this email.
        
        This link will expire in 1 hour.
        
        Best regards,
        ICAN Voting System Team
        """
        return EmailService.send_email(email, subject, body)
    
    @staticmethod
    def send_otp_email(email, otp_code):
        """Send OTP verification email."""
        subject = "OTP Verification - ICAN Voting System"
        body = f"""
        Hello,
        
        Your OTP code for ICAN Voting System is: {otp_code}
        
        This code will expire in 10 minutes.
        
        If you did not request this, please ignore this email.
        
        Best regards,
        ICAN Voting System Team
        """
        return EmailService.send_email(email, subject, body)
    
    @staticmethod
    def send_welcome_email(email, full_name):
        """Send welcome email."""
        subject = "Welcome to ICAN Voting System"
        body = f"""
        Hello {full_name},
        
        Welcome to the ICAN Voting System!
        
        Your account has been successfully created. You can now participate in elections.
        
        Best regards,
        ICAN Voting System Team
        """
        return EmailService.send_email(email, subject, body)