from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.election import Election, ElectionStatus
from app.models.candidate import Candidate, CandidateStatus
from app.models.position import Position
from app.models.vote import Vote
from app.models.user import User
from datetime import datetime

results_bp = Blueprint('results', __name__, url_prefix='/api/results')


@results_bp.route('/elections/<election_id>', methods=['GET'])
@jwt_required()
def get_results(election_id):
    """Get election results for a specific election."""
    try:
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        # Get all positions for this election
        positions = Position.query.filter_by(election_id=election_id).all()
        
        results_data = []
        total_votes = 0
        
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
                    'manifesto': candidate.manifesto or '',
                    'photo_url': candidate.photo_url,
                    'votes': vote_count
                })
                total_votes += vote_count
            
            # Sort by votes descending
            position_results.sort(key=lambda x: x['votes'], reverse=True)
            
            results_data.append({
                'position_id': position.id,
                'position_name': position.title,
                'candidates': position_results,
                'total_votes': sum(c['votes'] for c in position_results),
                'winner': position_results[0] if position_results else None
            })
        
        return jsonify({
            'success': True,
            'data': {
                'election': {
                    'id': election.id,
                    'title': election.title,
                    'description': election.description,
                    'status': election.status.value if hasattr(election.status, 'value') else str(election.status),
                    'start_date': election.start_date.isoformat() if election.start_date else None,
                    'end_date': election.end_date.isoformat() if election.end_date else None
                },
                'results': results_data,
                'total_votes': total_votes
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting results: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@results_bp.route('/elections', methods=['GET'])
@jwt_required()
def list_results():
    """List all elections with results."""
    try:
        # Get completed elections (or active that show results)
        elections = Election.query.filter(
            Election.status == ElectionStatus.COMPLETED
        ).order_by(Election.end_date.desc()).all()
        
        elections_data = []
        for election in elections:
            # Count total votes for this election
            total_votes = Vote.query.filter_by(election_id=election.id).count()
            
            elections_data.append({
                'id': election.id,
                'title': election.title,
                'description': election.description,
                'status': election.status.value if hasattr(election.status, 'value') else str(election.status),
                'end_date': election.end_date.isoformat() if election.end_date else None,
                'total_votes': total_votes
            })
        
        return jsonify({
            'success': True,
            'data': elections_data
        }), 200
        
    except Exception as e:
        print(f"Error listing results: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@results_bp.route('/elections/<election_id>/positions/<position_id>', methods=['GET'])
@jwt_required()
def get_position_results(election_id, position_id):
    """Get results for a specific position in an election."""
    try:
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        position = Position.query.get(position_id)
        if not position:
            return jsonify({'success': False, 'message': 'Position not found'}), 404
        
        # Get all approved candidates for this position
        candidates = Candidate.query.filter_by(
            election_id=election_id,
            position_id=position_id,
            status=CandidateStatus.APPROVED
        ).all()
        
        results = []
        for candidate in candidates:
            vote_count = Vote.query.filter_by(
                election_id=election_id,
                position_id=position_id,
                candidate_id=candidate.id
            ).count()
            
            user = User.query.get(candidate.user_id)
            results.append({
                'candidate_id': candidate.id,
                'candidate_name': user.full_name if user else 'Unknown',
                'manifesto': candidate.manifesto or '',
                'photo_url': candidate.photo_url,
                'votes': vote_count
            })
        
        # Calculate percentages
        total_votes = sum(r['votes'] for r in results)
        for r in results:
            r['percentage'] = round((r['votes'] / total_votes * 100), 2) if total_votes > 0 else 0
        
        # Sort by votes descending
        results.sort(key=lambda x: x['votes'], reverse=True)
        
        # Add winner flag
        if results:
            results[0]['is_winner'] = True
        
        return jsonify({
            'success': True,
            'data': {
                'position': {
                    'id': position.id,
                    'title': position.title,
                    'description': position.description
                },
                'results': results,
                'total_votes': total_votes,
                'winner': results[0] if results else None
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting position results: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500