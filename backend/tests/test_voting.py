import pytest
from datetime import datetime, timedelta
from app.models.election import Election, ElectionType, ElectionStatus, VotingRule, Position
from app.models.candidate import Candidate, CandidateStatus
from app.models.vote import Vote

def test_cast_vote_success(client, member_user, app):
    with app.app_context():
        # Create election
        election = Election(
            title='Test Election',
            election_type=ElectionType.NATIONAL,
            start_date=datetime.utcnow() - timedelta(hours=1),
            end_date=datetime.utcnow() + timedelta(hours=1),
            status=ElectionStatus.ACTIVE,
            voting_rule=VotingRule.SINGLE_CHOICE,
            created_by=member_user.id
        )
        db.session.add(election)
        db.session.commit()

        # Create position
        position = Position(
            election_id=election.id,
            position_name='President',
            sort_order=1
        )
        db.session.add(position)
        db.session.commit()

        # Create candidate
        candidate = Candidate(
            election_id=election.id,
            position_id=position.id,
            user_id=member_user.id,
            status=CandidateStatus.APPROVED
        )
        db.session.add(candidate)
        db.session.commit()

        # Login to get token
        login_response = client.post('/api/auth/login', json={
            'membership_number': 'MEM001',
            'password': 'MemberPass123!'
        })

        # This would need OTP verification in real scenario
        # For testing, we'd mock the OTP verification

        # Test vote casting
        # Note: Full integration test would require JWT token
