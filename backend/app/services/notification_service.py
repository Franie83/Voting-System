"""
Notification Service - Multi-channel Communication
"""
from datetime import datetime
from flask import current_app
from app import db, mail
from app.models.notification import Notification, NotificationChannel, NotificationType, NotificationStatus
from app.models.audit_log import AuditAction
from app.services.auth_service import AuthService
from flask_mail import Message


class NotificationService:
    """Multi-channel notification service."""
    
    @classmethod
    def create_notification(cls, user_id, notification_type, channel, title, message,
                           election_id=None, entity_type=None, entity_id=None, extra_metadata=None):
        """Create a notification record."""
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            channel=channel,
            title=title,
            message=message,
            related_election_id=election_id,
            related_entity_type=entity_type,
            related_entity_id=entity_id,
            extra_metadata=extra_metadata or {}
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    
    @classmethod
    def send_email_notification(cls, notification):
        """Send email notification."""
        try:
            from app.models.user import User
            user = User.query.get(notification.user_id)
            if not user or not user.email:
                return False
            
            msg = Message(
                subject=notification.title,
                recipients=[user.email],
                body=notification.message,
                html=cls._format_email_html(notification, user)
            )
            mail.send(msg)
            
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.utcnow()
            db.session.commit()
            return True
        except Exception as e:
            current_app.logger.error("Email notification failed: " + str(e))
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            db.session.commit()
            return False
    
    @classmethod
    def send_sms_notification(cls, notification):
        """Send SMS notification."""
        try:
            from twilio.rest import Client
            from app.models.user import User
            
            user = User.query.get(notification.user_id)
            if not user or not user.phone:
                return False
            
            account_sid = current_app.config.get('TWILIO_ACCOUNT_SID')
            auth_token = current_app.config.get('TWILIO_AUTH_TOKEN')
            from_number = current_app.config.get('TWILIO_PHONE_NUMBER')
            
            if not all([account_sid, auth_token, from_number]):
                return False
            
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=notification.title + ": " + notification.message[:140],
                from_=from_number,
                to=user.phone
            )
            
            notification.status = NotificationStatus.SENT
            notification.sent_at = datetime.utcnow()
            db.session.commit()
            return True
        except Exception as e:
            current_app.logger.error("SMS notification failed: " + str(e))
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            db.session.commit()
            return False
    
    @classmethod
    def send_notification(cls, user_id, notification_type, channels, title, message,
                         election_id=None, entity_type=None, entity_id=None, extra_metadata=None):
        """Send notification through multiple channels."""
        results = []
        
        for channel in channels:
            notification = cls.create_notification(
                user_id, notification_type, channel, title, message,
                election_id, entity_type, entity_id, extra_metadata
            )
            
            if channel == NotificationChannel.EMAIL:
                success = cls.send_email_notification(notification)
            elif channel == NotificationChannel.SMS:
                success = cls.send_sms_notification(notification)
            else:
                success = True  # IN_APP and PUSH handled separately
            
            results.append({'channel': channel.value, 'success': success})
        
        return results
    
    @classmethod
    def notify_election_announcement(cls, election, users):
        """Notify users about new election."""
        title = "New Election: " + election.title
        message = "A new election has been announced. Voting starts on " + election.start_date.strftime('%B %d, %Y at %I:%M %p') + ". Please log in to view candidates and cast your vote."
        
        for user in users:
            cls.send_notification(
                user.id,
                NotificationType.ELECTION_ANNOUNCEMENT,
                [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
                title,
                message,
                election_id=election.id
            )
    
    @classmethod
    def notify_voting_reminder(cls, election, users):
        """Send voting reminder."""
        title = "Reminder: " + election.title + " is Open"
        message = "This is a reminder that " + election.title + " is currently open for voting. Voting closes on " + election.end_date.strftime('%B %d, %Y at %I:%M %p') + ". Please log in to cast your vote."
        
        for user in users:
            cls.send_notification(
                user.id,
                NotificationType.VOTING_REMINDER,
                [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
                title,
                message,
                election_id=election.id
            )
    
    @classmethod
    def notify_vote_confirmation(cls, user, election, receipt_code):
        """Send vote confirmation."""
        title = "Vote Confirmed - " + election.title
        message = "Your vote for " + election.title + " has been successfully recorded. Your receipt code is: " + receipt_code + ". Please keep this code for your records."
        
        cls.send_notification(
            user.id,
            NotificationType.VOTE_CONFIRMATION,
            [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            title,
            message,
            election_id=election.id,
            extra_metadata={'receipt_code': receipt_code}
        )
    
    @classmethod
    def notify_results_published(cls, election, users):
        """Notify users that results are published."""
        title = "Results Published - " + election.title
        message = "The results for " + election.title + " have been published. Please log in to view the results."
        
        for user in users:
            cls.send_notification(
                user.id,
                NotificationType.RESULT_PUBLISHED,
                [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
                title,
                message,
                election_id=election.id
            )
    
    @classmethod
    def _format_email_html(cls, notification, user):
        """Format email as HTML."""
        # Fixed: Changed '' to ''' for multi-line string
        return '''<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #1a365d; color: white; padding: 20px; text-align: center;">
        <h2>ICAN Electronic Voting System</h2>
    </div>
    <div style="padding: 30px; background: #f7fafc;">
        <h3 style="color: #1a365d;">''' + notification.title + '''</h3>
        <p>Dear <strong>''' + user.full_name + '''</strong>,</p>
        <p>''' + notification.message + '''</p>
    </div>
    <div style="background: #1a365d; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p>ICAN Election Committee | elections@ican.org.ng</p>
        <p>This is an automated message. Please do not reply.</p>
    </div>
</div>'''