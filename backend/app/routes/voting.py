from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.vote import Vote, VoteReceipt
from app.models.election import Election, ElectionStatus
from app.models.candidate import Candidate, CandidateStatus
from app.models.user import User, UserStatus
from app.models.position import Position
from datetime import datetime
import uuid

# Create blueprint - MUST be named 'voting_bp' to match __init__.py
voting_bp = Blueprint('voting', __name__)

@voting_bp.route('/elections/active', methods=['GET'])
@jwt_required()
def get_active_elections():
    """Get all active elections for voting"""
    try:
        now = datetime.now()
        current_user_id = get_jwt_identity()
        
        elections = Election.query.filter(
            Election.status == ElectionStatus.ACTIVE,
            Election.start_date <= now,
            Election.end_date >= now
        ).all()
        
        elections_data = []
        for election in elections:
            positions_count = Position.query.filter_by(election_id=election.id).count()
            has_voted = Vote.query.filter_by(
                election_id=election.id,
                voter_id=current_user_id
            ).first() is not None
            
            if election.election_type:
                if hasattr(election.election_type, 'value'):
                    election_type_str = election.election_type.value
                else:
                    election_type_str = str(election.election_type)
            else:
                election_type_str = 'NATIONAL'
            
            if election.status:
                if hasattr(election.status, 'value'):
                    status_str = election.status.value
                else:
                    status_str = str(election.status)
            else:
                status_str = 'ACTIVE'
            
            elections_data.append({
                'id': str(election.id),
                'title': str(election.title),
                'description': str(election.description) if election.description else '',
                'election_type': election_type_str,
                'start_date': election.start_date.isoformat() if election.start_date else None,
                'end_date': election.end_date.isoformat() if election.end_date else None,
                'positions_count': positions_count,
                'has_voted': has_voted,
                'status': status_str,
                'time_remaining': {
                    'days': (election.end_date - now).days if election.end_date else 0,
                    'hours': ((election.end_date - now).seconds // 3600) if election.end_date else 0
                }
            })
        
        return jsonify({
            'success': True,
            'data': elections_data,
            'count': len(elections_data)
        }), 200
        
    except Exception as e:
        print(f"Error fetching active elections: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@voting_bp.route('/elections/<election_id>/candidates', methods=['GET'])
@jwt_required()
def get_election_candidates(election_id):
    """Get all approved candidates for an election"""
    try:
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        candidates = Candidate.query.filter_by(
            election_id=election_id,
            status=CandidateStatus.APPROVED
        ).all()
        
        positions_with_candidates = {}
        
        for candidate in candidates:
            user = User.query.get(candidate.user_id)
            position = Position.query.get(candidate.position_id)
            position_title = position.title if position else 'Unknown Position'
            
            if position_title not in positions_with_candidates:
                positions_with_candidates[position_title] = {
                    'position_id': str(candidate.position_id),
                    'position_name': position_title,
                    'candidates': []
                }
            
            positions_with_candidates[position_title]['candidates'].append({
                'id': str(candidate.id),
                'election_id': str(candidate.election_id),
                'position_id': str(candidate.position_id),
                'user_id': str(candidate.user_id),
                'user': {
                    'full_name': user.full_name if user else 'Unknown',
                    'email': user.email if user else '',
                    'membership_number': user.membership_number if user else ''
                },
                'manifesto': candidate.manifesto or '',
                'photo_url': candidate.photo_url,
                'status': candidate.status.value if hasattr(candidate.status, 'value') else str(candidate.status)
            })
        
        return jsonify({
            'success': True,
            'data': {
                'election': {
                    'id': str(election.id),
                    'title': election.title,
                    'description': election.description or '',
                    'start_date': election.start_date.isoformat() if election.start_date else None,
                    'end_date': election.end_date.isoformat() if election.end_date else None
                },
                'positions': list(positions_with_candidates.values()),
                'total_positions': len(positions_with_candidates),
                'total_candidates': len(candidates)
            }
        }), 200
        
    except Exception as e:
        print(f"Error fetching candidates: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@voting_bp.route('/cast', methods=['POST'])
@jwt_required()
def cast_votes():
    """Cast votes for an election"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        votes = data.get('votes', [])
        
        print("\n" + "="*60)
        print("CAST VOTES ENDPOINT HIT")
        print(f"User ID: {current_user_id}")
        print(f"Number of votes: {len(votes)}")
        print("="*60 + "\n")
        
        if not votes:
            return jsonify({'success': False, 'message': 'No votes provided'}), 400
        
        user = User.query.get(current_user_id)
        if not user or user.status != UserStatus.ACTIVE:
            return jsonify({'success': False, 'message': 'User is not active'}), 403
        
        election_id = votes[0].get('election_id')
        
        existing_vote = Vote.query.filter_by(
            election_id=election_id,
            voter_id=current_user_id
        ).first()
        
        if existing_vote:
            return jsonify({'success': False, 'message': 'You have already voted in this election'}), 400
        
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        if election.status != ElectionStatus.ACTIVE:
            return jsonify({'success': False, 'message': 'Election is not active'}), 400
        
        now = datetime.now()
        if now < election.start_date:
            return jsonify({'success': False, 'message': 'Voting has not started yet'}), 400
        if now > election.end_date:
            return jsonify({'success': False, 'message': 'Voting has ended'}), 400
        
        votes_created = []
        receipts = []
        
        for vote_data in votes:
            candidate_id = vote_data.get('candidate_id')
            position_id = vote_data.get('position_id')
            
            candidate = Candidate.query.filter_by(
                id=candidate_id,
                election_id=election_id,
                status=CandidateStatus.APPROVED
            ).first()
            
            if not candidate:
                return jsonify({
                    'success': False,
                    'message': f'Invalid candidate for position {position_id}'
                }), 400
            
            existing_position_vote = Vote.query.filter_by(
                election_id=election_id,
                voter_id=current_user_id,
                position_id=position_id
            ).first()
            
            if existing_position_vote:
                return jsonify({
                    'success': False,
                    'message': f'Already voted for position {position_id}'
                }), 400
            
            vote_hash = Vote.generate_vote_hash(
                current_user_id, election_id, position_id, candidate_id, datetime.now()
            )
            
            vote = Vote(
                id=str(uuid.uuid4()),
                election_id=election_id,
                candidate_id=candidate_id,
                voter_id=current_user_id,
                position_id=position_id,
                vote_hash=vote_hash,
                created_at=datetime.now()
            )
            db.session.add(vote)
            db.session.flush()
            
            # Generate receipt for this vote
            receipt_code = Vote.generate_receipt_code(vote.id, current_user_id, datetime.now())
            verification_hash = Vote.generate_vote_hash(
                current_user_id, election_id, position_id, candidate_id, datetime.now()
            )
            
            receipt = VoteReceipt(
                id=str(uuid.uuid4()),
                vote_id=vote.id,
                receipt_code=receipt_code,
                verification_hash=verification_hash,
                created_at=datetime.now()
            )
            db.session.add(receipt)
            receipts.append(receipt)
            votes_created.append(vote)
            
            print(f"  ✅ Vote created with receipt: {receipt_code}")
        
        db.session.commit()
        
        # Get position and candidate names for receipts
        receipt_data = []
        for r in receipts:
            pos = Position.query.get(r.vote.position_id)
            cand = Candidate.query.get(r.vote.candidate_id)
            cand_user = User.query.get(cand.user_id) if cand else None
            receipt_data.append({
                'receipt_code': r.receipt_code,
                'verification_hash': r.verification_hash[:16] + '...',
                'position_title': pos.title if pos else 'Unknown',
                'candidate_name': cand_user.full_name if cand_user else 'Unknown',
                'vote_id': r.vote_id
            })
        
        return jsonify({
            'success': True,
            'message': f'Successfully cast {len(votes_created)} votes',
            'data': {
                'votes_cast': len(votes_created),
                'election': election.title,
                'election_id': election_id,
                'receipts': receipt_data,
                'voting_reference': str(uuid.uuid4())[:8].upper()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error casting votes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@voting_bp.route('/receipt/<receipt_code>', methods=['GET'])
@jwt_required()
def get_receipt(receipt_code):
    """Get vote receipt details"""
    try:
        current_user_id = get_jwt_identity()
        
        receipt = VoteReceipt.query.filter_by(receipt_code=receipt_code).first()
        if not receipt:
            return jsonify({'success': False, 'message': 'Receipt not found'}), 404
        
        vote = receipt.vote
        if not vote:
            return jsonify({'success': False, 'message': 'Vote not found'}), 404
        
        # Check if user owns this vote or is admin
        if vote.voter_id != current_user_id:
            user = User.query.get(current_user_id)
            if user.role not in [UserRole.SUPER_ADMIN, UserRole.ELECTION_ADMIN]:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        candidate = Candidate.query.get(vote.candidate_id)
        position = Position.query.get(vote.position_id)
        election = Election.query.get(vote.election_id)
        candidate_user = User.query.get(candidate.user_id) if candidate else None
        
        return jsonify({
            'success': True,
            'data': {
                'receipt_code': receipt.receipt_code,
                'verification_hash': receipt.verification_hash,
                'vote': {
                    'id': vote.id,
                    'created_at': vote.created_at.isoformat() if vote.created_at else None
                },
                'election': {
                    'id': election.id,
                    'title': election.title
                } if election else None,
                'position': {
                    'id': position.id,
                    'title': position.title
                } if position else None,
                'candidate': {
                    'id': candidate.id,
                    'name': candidate_user.full_name if candidate_user else 'Unknown'
                } if candidate else None,
                'qr_data': f"VOTE:{vote.id}:{receipt.receipt_code}"
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting receipt: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@voting_bp.route('/verify/<receipt_code>', methods=['GET'])
def verify_receipt(receipt_code):
    """Public endpoint to verify a vote receipt (no authentication required)"""
    try:
        receipt = VoteReceipt.query.filter_by(receipt_code=receipt_code).first()
        if not receipt:
            return jsonify({'success': False, 'message': 'Invalid receipt code'}), 404
        
        vote = receipt.vote
        if not vote:
            return jsonify({'success': False, 'message': 'Vote not found'}), 404
        
        candidate = Candidate.query.get(vote.candidate_id)
        position = Position.query.get(vote.position_id)
        election = Election.query.get(vote.election_id)
        candidate_user = User.query.get(candidate.user_id) if candidate else None
        
        return jsonify({
            'success': True,
            'data': {
                'receipt_code': receipt.receipt_code,
                'verified': True,
                'vote': {
                    'created_at': vote.created_at.isoformat() if vote.created_at else None
                },
                'election': {
                    'title': election.title
                } if election else None,
                'position': {
                    'title': position.title
                } if position else None,
                'candidate': {
                    'name': candidate_user.full_name if candidate_user else 'Unknown'
                } if candidate else None
            }
        }), 200
        
    except Exception as e:
        print(f"Error verifying receipt: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@voting_bp.route('/my-receipts', methods=['GET'])
@jwt_required()
def get_my_receipts():
    """Get all receipts for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all votes by this user
        votes = Vote.query.filter_by(voter_id=current_user_id).all()
        
        receipts_data = []
        for vote in votes:
            receipt = VoteReceipt.query.filter_by(vote_id=vote.id).first()
            if receipt:
                election = Election.query.get(vote.election_id)
                receipts_data.append({
                    'receipt_code': receipt.receipt_code,
                    'election_title': election.title if election else 'Unknown',
                    'voted_at': vote.created_at.isoformat() if vote.created_at else None,
                    'verification_url': f"/verify/{receipt.receipt_code}"
                })
        
        return jsonify({
            'success': True,
            'data': receipts_data,
            'count': len(receipts_data)
        }), 200
        
    except Exception as e:
        print(f"Error getting my receipts: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@voting_bp.route('/check', methods=['GET'])
@jwt_required()
def check_vote_status():
    """Check if user has voted in active elections"""
    try:
        current_user_id = get_jwt_identity()
        
        active_elections = Election.query.filter_by(status=ElectionStatus.ACTIVE).all()
        
        has_voted = False
        voted_elections = []
        
        for election in active_elections:
            vote = Vote.query.filter_by(
                election_id=election.id,
                voter_id=current_user_id
            ).first()
            if vote:
                has_voted = True
                voted_elections.append({
                    'election_id': str(election.id),
                    'election_title': election.title,
                    'voted_at': vote.created_at.isoformat() if vote.created_at else None
                })
        
        return jsonify({
            'success': True,
            'hasVoted': has_voted,
            'voted_elections': voted_elections
        }), 200
        
    except Exception as e:
        print(f"Error checking vote status: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500