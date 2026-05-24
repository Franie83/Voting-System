#!/usr/bin/env python3
"""
Seed association members for testing
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import create_app, db
from app.models.association_member import AssociationMember, PaymentStatus
import uuid
from datetime import datetime

app = create_app()
with app.app_context():
    # Sample association members
    members = [
        {
            'association_id': 'ICAN2024001',
            'full_name': 'John Doe',
            'email': 'john.doe@example.com',
            'phone': '+2348012345678',
            'district': 'lagos',
            'chapter': 'Lagos Main',
            'payment_status': PaymentStatus.PAID,
            'payment_reference': 'PAY_ICAN_001',
            'payment_date': datetime.utcnow(),
            'amount_paid': 50000.00
        },
        {
            'association_id': 'ICAN2024002',
            'full_name': 'Jane Smith',
            'email': 'jane.smith@example.com',
            'phone': '+2348023456789',
            'district': 'abuja',
            'chapter': 'Abuja Central',
            'payment_status': PaymentStatus.PAID,
            'payment_reference': 'PAY_ICAN_002',
            'payment_date': datetime.utcnow(),
            'amount_paid': 50000.00
        },
        {
            'association_id': 'ICAN2024003',
            'full_name': 'Michael Johnson',
            'email': 'michael.johnson@example.com',
            'phone': '+2348034567890',
            'district': 'lagos',
            'chapter': 'Lagos Ikeja',
            'payment_status': PaymentStatus.PENDING,
            'payment_reference': None,
            'payment_date': None,
            'amount_paid': 0.00
        }
    ]
    
    for member_data in members:
        existing = AssociationMember.query.filter_by(association_id=member_data['association_id']).first()
        if not existing:
            member = AssociationMember(
                id=str(uuid.uuid4()),
                **member_data
            )
            db.session.add(member)
            print(f"✅ Added member: {member_data['association_id']}")
    
    db.session.commit()
    print("\n🎉 Association members seeded successfully!")
    print("\n📝 Test credentials:")
    print("   Valid (Paid): ICAN2024001 or ICAN2024002")
    print("   Invalid (Pending): ICAN2024003")