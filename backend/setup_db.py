import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variable before importing app
os.environ['DATABASE_URL'] = 'sqlite:///ican_voting.db'

from app import create_app, db
from app.models.user import User, UserRole, UserStatus, District
from werkzeug.security import generate_password_hash
import uuid

print("=" * 50)
print("Setting up database...")
print("=" * 50)

app = create_app()

with app.app_context():
    # Create all tables
    db.create_all()
    print("✅ Database tables created!")
    
    # Create admin user
    admin = User.query.filter_by(email='admin@ican.org.ng').first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            membership_number='ADMIN001',
            full_name='System Administrator',
            email='admin@ican.org.ng',
            phone='08000000000',
            district=District.LAGOS,
            chapter='Headquarters',
            password_hash=generate_password_hash('Admin123!'),
            status=UserStatus.ACTIVE,
            role=UserRole.SUPER_ADMIN,
            email_verified=True,
            phone_verified=True
        )
        db.session.add(admin)
        db.session.commit()
        print("\n" + "=" * 50)
        print("✅ ADMIN USER CREATED!")
        print("=" * 50)
        print("   Email: admin@ican.org.ng")
        print("   Password: Admin123!")
        print("=" * 50 + "\n")
    else:
        print("⚠️ Admin user already exists!")
    
    # Show users
    users = User.query.all()
    print(f"Total users in database: {len(users)}")
    for u in users:
        print(f"  - {u.email} ({u.role.value})")

print("\n✅ Database setup complete!")
print("You can now run: flask run")