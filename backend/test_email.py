from app import create_app, mail
from flask_mail import Message

app = create_app()

with app.app_context():
    try:
        msg = Message(
            subject="ICAN Voting System - Test Email",
            recipients=["bevbaruese@gmail.com"],
            body="This is a test email from your ICAN Voting System.\n\nIf you receive this, email is configured correctly!\n\nYou can now receive OTP codes for login."
        )
        mail.send(msg)
        print("✅ Test email sent successfully to bevbaruese@gmail.com!")
        print("   Check your inbox (or spam folder)")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")