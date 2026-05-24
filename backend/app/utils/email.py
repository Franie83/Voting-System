# backend/app/utils/email.py
"""
Email utilities for sending notifications (OTP, password reset, approvals)
"""
from flask_mail import Message
from flask import current_app, render_template_string
from app import mail
import logging

logger = logging.getLogger(__name__)


def send_email(to_email, subject, template, context=None):
    """
    Send email using Flask-Mail
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        template: Template name or HTML string
        context: Dictionary of variables for template
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if context is None:
        context = {}
    
    # HTML email templates
    html_templates = {
        'otp_verification': f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1a365d; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f7fafc; }}
                .otp-code {{ font-size: 32px; font-weight: bold; text-align: center; padding: 20px; 
                           letter-spacing: 5px; background-color: #edf2f7; border-radius: 10px; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #718096; }}
                .button {{ display: inline-block; padding: 10px 20px; background-color: #1a365d; 
                          color: white; text-decoration: none; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>ICAN Voting System</h2>
                </div>
                <div class="content">
                    <p>Hello {context.get('name', 'User')},</p>
                    <p>Your OTP verification code is:</p>
                    <div class="otp-code">{context.get('otp', '000000')}</div>
                    <p>This code will expire in <strong>{context.get('expiry_minutes', 10)} minutes</strong>.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>Institute of Chartered Accountants of Nigeria</p>
                    <p>&copy; 2024 ICAN. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """,
        
        'password_reset': f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1a365d; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f7fafc; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #1a365d; 
                          color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #718096; }}
                .warning {{ background-color: #fef5e7; padding: 15px; border-left: 4px solid #e67e22; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Password Reset Request</h2>
                </div>
                <div class="content">
                    <p>Hello {context.get('name', 'User')},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <div style="text-align: center;">
                        <a href="{context.get('reset_link', '#')}" class="button">Reset Password</a>
                    </div>
                    <p>Or copy this link: <br><small>{context.get('reset_link', '#')}</small></p>
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>This link will expire in <strong>{context.get('expiry_hours', 24)} hours</strong></li>
                            <li>If you didn't request this, please ignore this email</li>
                            <li>Your password will remain unchanged if you don't click the link</li>
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>Institute of Chartered Accountants of Nigeria</p>
                    <p>&copy; 2024 ICAN. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """,
        
        'account_approved': f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #27ae60; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f7fafc; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #27ae60; 
                          color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #718096; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Account Approved!</h2>
                </div>
                <div class="content">
                    <p>Dear {context.get('name', 'User')},</p>
                    <p>Your account has been <strong>approved</strong> by the administrator.</p>
                    <p>You can now access the ICAN Voting System and participate in elections.</p>
                    <div style="text-align: center;">
                        <a href="{context.get('login_link', 'http://localhost:3000/login')}" class="button">Login to Your Account</a>
                    </div>
                    <p><strong>Next Steps:</strong></p>
                    <ul>
                        <li>Login with your registered email and password</li>
                        <li>Complete your profile information</li>
                        <li>Verify your phone number for 2FA</li>
                        <li>View and participate in active elections</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Institute of Chartered Accountants of Nigeria</p>
                    <p>Need help? Contact: elections@ican.org.ng</p>
                </div>
            </div>
        </body>
        </html>
        """,
        
        'account_rejected': f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #e74c3c; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f7fafc; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #718096; }}
                .contact {{ background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Registration Update</h2>
                </div>
                <div class="content">
                    <p>Dear {context.get('name', 'User')},</p>
                    <p>After reviewing your registration, we regret to inform you that your account could not be approved at this time.</p>
                    <p><strong>Reason:</strong> {context.get('reason', 'Not specified')}</p>
                    <div class="contact">
                        <p><strong>Need clarification?</strong></p>
                        <p>Please contact our support team at <a href="mailto:{context.get('support_email', 'elections@ican.org.ng')}">{context.get('support_email', 'elections@ican.org.ng')}</a></p>
                    </div>
                    <p>You may reapply after addressing the issues mentioned above.</p>
                </div>
                <div class="footer">
                    <p>Institute of Chartered Accountants of Nigeria</p>
                    <p>&copy; 2024 ICAN. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """,
        
        'password_changed': f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3498db; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f7fafc; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #718096; }}
                .alert {{ background-color: #fef5e7; padding: 15px; border-left: 4px solid #e67e22; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>🔐 Password Changed</h2>
                </div>
                <div class="content">
                    <p>Hello {context.get('name', 'User')},</p>
                    <p>Your password was successfully changed on <strong>{context.get('time', '')}</strong>.</p>
                    <div class="alert">
                        <strong>⚠️ Didn't make this change?</strong>
                        <p>If you did not change your password, please contact support immediately to secure your account.</p>
                    </div>
                    <p><strong>Security Tips:</strong></p>
                    <ul>
                        <li>Never share your password with anyone</li>
                        <li>Use a unique password for your ICAN account</li>
                        <li>Enable two-factor authentication for extra security</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Institute of Chartered Accountants of Nigeria</p>
                    <p>Questions? Contact: security@ican.org.ng</p>
                </div>
            </div>
        </body>
        </html>
        """,
        
        'welcome': f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1a365d; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f7fafc; }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #718096; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Welcome to ICAN Voting System</h2>
                </div>
                <div class="content">
                    <p>Dear {context.get('name', 'User')},</p>
                    <p>Thank you for registering with the ICAN Electronic Voting System.</p>
                    <p>Your registration is currently <strong>pending approval</strong>. You will receive another email once your account is activated.</p>
                    <p><strong>What happens next?</strong></p>
                    <ul>
                        <li>An administrator will review your registration</li>
                        <li>You'll receive an approval email within 24-48 hours</li>
                        <li>Once approved, you can login and participate in elections</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Institute of Chartered Accountants of Nigeria</p>
                    <p>&copy; 2024 ICAN. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    }
    
    # Get template HTML
    html_content = html_templates.get(template)
    
    if not html_content:
        # Fallback template
        html_content = f"""
        <html>
        <body>
            <h2>{subject}</h2>
            <p>Hello {context.get('name', 'User')},</p>
            <p>{context.get('message', 'Please check your account.')}</p>
            <hr>
            <p>ICAN Voting System</p>
        </body>
        </html>
        """
    
    try:
        msg = Message(
            subject=f"[ICAN Voting] {subject}",
            recipients=[to_email],
            html=html_content,
            sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@ican.org.ng')
        )
        
        mail.send(msg)
        logger.info(f"Email sent successfully to {to_email}: {subject}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        
        # In development, print the email content to console
        if current_app.config.get('DEBUG', False):
            print(f"\n{'='*60}")
            print(f"📧 EMAIL (Development Mode)")
            print(f"{'='*60}")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(f"{'='*60}")
            print(f"Content:\n{html_content}")
            print(f"{'='*60}\n")
        
        return False


def send_otp_email(email, otp, name=None):
    """
    Send OTP verification email
    
    Args:
        email: Recipient email address
        otp: 6-digit OTP code
        name: User's name (optional)
    
    Returns:
        bool: True if sent successfully
    """
    return send_email(
        to_email=email,
        subject="Your OTP Verification Code",
        template="otp_verification",
        context={
            'name': name or 'User',
            'otp': otp,
            'expiry_minutes': 10
        }
    )


def send_password_reset_email(email, reset_link, name=None):
    """
    Send password reset email
    
    Args:
        email: Recipient email address
        reset_link: Password reset URL
        name: User's name (optional)
    
    Returns:
        bool: True if sent successfully
    """
    return send_email(
        to_email=email,
        subject="Password Reset Request",
        template="password_reset",
        context={
            'name': name or 'User',
            'reset_link': reset_link,
            'expiry_hours': 24
        }
    )


def send_account_approved_email(email, name=None):
    """
    Send account approval notification
    
    Args:
        email: Recipient email address
        name: User's name (optional)
    
    Returns:
        bool: True if sent successfully
    """
    return send_email(
        to_email=email,
        subject="Account Approved!",
        template="account_approved",
        context={
            'name': name or 'User',
            'login_link': 'http://localhost:3000/login'
        }
    )


def send_account_rejected_email(email, reason, name=None):
    """
    Send account rejection notification
    
    Args:
        email: Recipient email address
        reason: Rejection reason
        name: User's name (optional)
    
    Returns:
        bool: True if sent successfully
    """
    return send_email(
        to_email=email,
        subject="Registration Update",
        template="account_rejected",
        context={
            'name': name or 'User',
            'reason': reason,
            'support_email': 'elections@ican.org.ng'
        }
    )


def send_password_changed_email(email, name=None):
    """
    Send password change confirmation
    
    Args:
        email: Recipient email address
        name: User's name (optional)
    
    Returns:
        bool: True if sent successfully
    """
    from datetime import datetime
    return send_email(
        to_email=email,
        subject="Password Changed Successfully",
        template="password_changed",
        context={
            'name': name or 'User',
            'time': datetime.now().strftime("%B %d, %Y at %I:%M %p")
        }
    )


def send_welcome_email(email, name=None):
    """
    Send welcome email after registration
    
    Args:
        email: Recipient email address
        name: User's name (optional)
    
    Returns:
        bool: True if sent successfully
    """
    return send_email(
        to_email=email,
        subject="Welcome to ICAN Voting System",
        template="welcome",
        context={
            'name': name or 'User'
        }
    )