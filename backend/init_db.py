#!/usr/bin/env python
"""
Initialize Database - Create all tables and seed initial data
Run: python init_db.py
"""
import sys
import os
import uuid
from datetime import datetime, timedelta

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import (
    User, UserStatus, UserRole, District,
    Election, ElectionType, ElectionStatus, VotingRule,
    Position, Candidate, CandidateStatus,
    Vote, VoteReceipt, AuditLog, AuditAction,
    Notification, NotificationChannel, NotificationType, NotificationStatus
)


def init_database():
    """Create all database tables and seed initial data"""
    app = create_app('development')
    
    with app.app_context():
        print("=" * 60)
        print("🗳️  ICAN Voting System - Database Initialization")
        print("=" * 60)
        
        # Create all tables
        print("\n📊 Creating database tables...")
        db.create_all()
        print("✅ Tables created successfully!")
        
        # Check if super admin exists
        print("\n👤 Checking for super admin...")
        admin = User.query.filter_by(role=UserRole.SUPER_ADMIN).first()
        
        if not admin:
            print("Creating super admin user...")
            admin = User(
                id=str(uuid.uuid4()),
                membership_number="ADMIN001",
                full_name="System Administrator",
                email="admin@ican.org.ng",
                phone="+2348012345678",
                district=District.LAGOS,
                status=UserStatus.ACTIVE,
                role=UserRole.SUPER_ADMIN,
                email_verified=True,
                phone_verified=True,
                phone_verified_at=datetime.utcnow(),
                email_verified_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            admin.set_password("Admin123!")
            db.session.add(admin)
            db.session.commit()
            print("✅ Super admin created!")
            print("   📧 Email: admin@ican.org.ng")
            print("   🔑 Password: Admin123!")
        else:
            print(f"✅ Super admin already exists: {admin.email}")
        
        # Create test observer user (optional)
        print("\n👁️ Checking for test observer...")
        observer = User.query.filter_by(role=UserRole.OBSERVER).first()
        if not observer:
            print("Creating test observer user...")
            observer = User(
                id=str(uuid.uuid4()),
                membership_number="OBSERVER001",
                full_name="Election Observer",
                email="observer@ican.org.ng",
                phone="+2348123456789",
                district=District.ABUJA,
                status=UserStatus.ACTIVE,
                role=UserRole.OBSERVER,
                email_verified=True,
                phone_verified=True,
                phone_verified_at=datetime.utcnow(),
                email_verified_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            observer.set_password("Observer123!")
            db.session.add(observer)
            db.session.commit()
            print("✅ Test observer created!")
            print("   📧 Email: observer@ican.org.ng")
            print("   🔑 Password: Observer123!")
        else:
            print(f"✅ Observer already exists: {observer.email}")
        
        # Create test member user
        print("\n👤 Checking for test member...")
        member = User.query.filter_by(membership_number="MEMBER001").first()
        if not member:
            print("Creating test member user...")
            member = User(
                id=str(uuid.uuid4()),
                membership_number="MEMBER001",
                full_name="Test Member",
                email="member@ican.org.ng",
                phone="+2349012345678",
                district=District.LAGOS,
                status=UserStatus.ACTIVE,
                role=UserRole.MEMBER,
                email_verified=True,
                phone_verified=True,
                phone_verified_at=datetime.utcnow(),
                email_verified_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            member.set_password("Member123!")
            db.session.add(member)
            db.session.commit()
            print("✅ Test member created!")
            print("   📧 Email: member@ican.org.ng")
            print("   🔑 Password: Member123!")
        else:
            print(f"✅ Member already exists: {member.email}")
        
        print("\n" + "=" * 60)
        print("✅ Database initialization complete!")
        print("=" * 60)
        
        # Print summary
        print("\n📈 Database Summary:")
        print(f"   👤 Users: {User.query.count()}")
        print(f"   📋 Elections: {Election.query.count()}")
        print(f"   📍 Positions: {Position.query.count()}")
        print(f"   👥 Candidates: {Candidate.query.count()}")
        print(f"   🗳️ Votes: {Vote.query.count()}")
        print(f"   📝 Audit Logs: {AuditLog.query.count()}")
        
        return True


if __name__ == "__main__":
    try:
        init_database()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)