"""
Voting Service - Secure Vote Casting and Receipt Generation
"""
import uuid
import hashlib
import qrcode
import io
import base64
from datetime import datetime
from flask import current_app
from app import db
from app.models.vote import Vote, VoteReceipt
from app.models.election import Election, ElectionStatus
from app.models.candidate import Candidate, CandidateStatus
from app.models.position import Position  # FIXED: Import from correct module
from app.models.user import User
from app.models.audit_log import AuditAction
from app.services.auth_service import AuthService


class VotingService:
    """Secure voting service with encryption and audit trail."""
    
    @classmethod
    def validate_voting_eligibility(cls, user, election_id, position_id):
        """Validate if user can vote in specific election and position."""
        from app.models.user import UserStatus
        
        # Check user status
        if user.status != UserStatus.ACTIVE:
            return False, "Your account is not active. Please contact support."
        
        # Check election exists and is active
        election = Election.query.get(election_id)
        if not election:
            return False, "Election not found."
        
        if election.status != ElectionStatus.ACTIVE:
            return False, "Election is not currently active."
        
        # Check if within voting period
        now = datetime.utcnow()
        if now < election.start_date:
            return False, "Voting has not started yet."
        if now > election.end_date:
            return False, "Voting has ended."
        
        # Check if already voted for this position
        existing_vote = Vote.query.filter_by(
            election_id=election_id,
            position_id=position_id,
            voter_id=user.id
        ).first()
        
        if existing_vote:
            return False, "You have already voted for this position."
        
        # Check candidate is approved
        candidate = Candidate.query.filter_by(
            election_id=election_id,
            position_id=position_id,
            status=CandidateStatus.APPROVED
        ).first()
        
        if not candidate:
            return False, "No approved candidates found for this position."
        
        return True, "Eligible to vote"
    
    @classmethod
    def cast_vote(cls, user, election_id, position_id, candidate_id, device_info=None):
        """Cast a secure encrypted vote."""
        # Validate eligibility
        valid, message = cls.validate_voting_eligibility(user, election_id, position_id)
        if not valid:
            return None, message
        
        # Generate voter hash
        voter_hash = Vote.generate_vote_hash(user.id, election_id, position_id, candidate_id, datetime.now())
        
        # Create vote record
        vote = Vote(
            id=str(uuid.uuid4()),
            election_id=election_id,
            position_id=position_id,
            candidate_id=candidate_id,
            voter_id=user.id,
            vote_hash=voter_hash,
            ip_address_hash=AuthService.hash_ip_address(device_info.get('ip', 'unknown') if device_info else 'unknown'),
            device_fingerprint=device_info.get('fingerprint', '') if device_info else '',
            created_at=datetime.now()
        )
        
        db.session.add(vote)
        
        # Generate receipt
        receipt = cls.generate_vote_receipt(vote)
        
        # Audit log
        AuthService.create_audit_log(
            user_id=user.id,
            action=AuditAction.VOTE_CAST,
            description=f"Vote cast for position {position_id}",
            election_id=election_id,
            target_type='vote',
            target_id=vote.id
        )
        
        db.session.commit()
        
        return {
            'vote_id': vote.id,
            'receipt': receipt.to_dict(),
            'timestamp': vote.created_at.isoformat()
        }, "Vote cast successfully"
    
    @classmethod
    def generate_vote_receipt(cls, vote):
        """Generate digital vote receipt with QR code."""
        # Generate unique receipt code
        receipt_code = Vote.generate_receipt_code(vote.id, vote.voter_id, datetime.now())
        
        # Generate verification hash
        verification_hash = Vote.generate_vote_hash(
            vote.voter_id, vote.election_id, vote.position_id, vote.candidate_id, datetime.now()
        )
        
        # Generate QR code
        qr_data = {
            'receipt': receipt_code,
            'election': vote.election_id,
            'timestamp': datetime.now().isoformat(),
            'verify': verification_hash[:16]
        }
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(str(qr_data))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        receipt = VoteReceipt(
            id=str(uuid.uuid4()),
            vote_id=vote.id,
            receipt_code=receipt_code,
            verification_hash=verification_hash,
            created_at=datetime.now()
        )
        
        db.session.add(receipt)
        
        # Audit log
        AuthService.create_audit_log(
            user_id=vote.voter_id,
            action=AuditAction.VOTE_RECEIPT_GENERATED,
            election_id=vote.election_id,
            target_type='receipt',
            target_id=receipt.id
        )
        
        return receipt
    
    @classmethod
    def verify_receipt(cls, receipt_code):
        """Verify a vote receipt."""
        receipt = VoteReceipt.query.filter_by(receipt_code=receipt_code).first()
        if not receipt:
            return None, "Invalid receipt code"
        
        vote = Vote.query.get(receipt.vote_id)
        if not vote:
            return None, "Vote record not found"
        
        return {
            'valid': True,
            'receipt_code': receipt.receipt_code,
            'election_id': vote.election_id,
            'position_id': vote.position_id,
            'cast_at': vote.created_at.isoformat(),
            'verification_hash': receipt.verification_hash[:16] + "..."
        }, "Receipt verified successfully"
    
    @classmethod
    def get_election_results(cls, election_id, include_details=False):
        """Get election results with vote counts for each position."""
        from app.models.position import Position
        
        election = Election.query.get(election_id)
        if not election:
            return [], "Election not found"
        
        # Get all positions for this election
        positions = Position.query.filter_by(election_id=election_id).all()
        
        results = []
        for position in positions:
            # Get all approved candidates for this position
            candidates = Candidate.query.filter_by(
                election_id=election_id,
                position_id=position.id,
                status=CandidateStatus.APPROVED
            ).all()
            
            position_results = []
            for candidate in candidates:
                vote_count = Vote.query.filter_by(
                    election_id=election_id,
                    position_id=position.id,
                    candidate_id=candidate.id
                ).count()
                
                user = User.query.get(candidate.user_id)
                position_results.append({
                    'candidate_id': candidate.id,
                    'candidate_name': user.full_name if user else 'Unknown',
                    'party': candidate.party or '',
                    'manifesto': candidate.manifesto,
                    'photo_url': candidate.photo_url,
                    'votes': vote_count
                })
            
            # Sort by votes descending
            position_results.sort(key=lambda x: x['votes'], reverse=True)
            
            results.append({
                'position_id': position.id,
                'position_name': position.title,
                'candidates': position_results,
                'total_votes': sum(c['votes'] for c in position_results),
                'winner': position_results[0] if position_results else None
            })
        
        return results, "Results retrieved successfully"