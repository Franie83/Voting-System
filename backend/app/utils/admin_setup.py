"""
Admin Setup Utility - Creates super admin on first run
"""
from app import db
from app.models.user import User, UserRole, UserStatus, District
import uuid
import os
from datetime import datetime

def create_super_admin_if_not_exists():
    """Create super admin user on first application run."""
    
    # Check if any super admin exists
    super_admin = User.query.filter_by(role=UserRole.SUPER_ADMIN).first()
    
    if super_admin:
        print("✅ Super admin already exists")
        return super_admin
    
    # Generate secure random password
    import secrets
    import string
    
    # Create a secure temporary password
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    
    # Create super admin
    admin = User(
        id=str(uuid.uuid4()),
        membership_number="SUPERADMIN001",
        full_name="System Administrator",
        email="admin@ican.gov.ng",
        phone="+2348000000000",
        district=District.ABUJA,
        chapter="National",
        status=UserStatus.ACTIVE,
        role=UserRole.SUPER_ADMIN,
        email_verified=True,
        phone_verified=True,
        created_at=datetime.utcnow()
    )
    admin.set_password(temp_password)
    
    db.session.add(admin)
    db.session.commit()
    
    # Write password to a secure file (first run only)
    password_file = os.path.join(os.path.dirname(__file__), '../../..', 'admin_credentials.txt')
    with open(password_file, 'w') as f:
        f.write(f"SUPER ADMIN CREDENTIALS - SAVE THIS IMMEDIATELY\n")
        f.write(f"="*50 + "\n")
        f.write(f"Email: admin@ican.gov.ng\n")
        f.write(f"Temporary Password: {temp_password}\n")
        f.write(f"="*50 + "\n")
        f.write(f"Please change this password after first login!\n")
    
    print(f"\n{'='*60}")
    print("✅ SUPER ADMIN CREATED!")
    print(f"   Email: admin@ican.gov.ng")
    print(f"   Temporary Password: {temp_password}")
    print(f"   Credentials saved to: admin_credentials.txt")
    print(f"{'='*60}\n")
    
    return admin