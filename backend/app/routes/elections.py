"""
Election Routes - CRUD and Management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from app import db
from app.models.election import Election, ElectionType, ElectionStatus, VotingRule
from app.models.position import Position
from app.models.user import User, UserRole
from app.models.vote import Vote
from app.models.audit_log import AuditAction
from app.services.auth_service import AuthService
from app.services.notification_service import NotificationService

elections_bp = Blueprint('elections', __name__)


def check_and_update_election_statuses():
    """Check all elections and update status based on dates."""
    try:
        now = datetime.utcnow()
        updated_count = 0
        
        # Find elections that should be active (start_date <= now <= end_date)
        elections_to_activate = Election.query.filter(
            Election.status == ElectionStatus.SCHEDULED,
            Election.start_date <= now,
            Election.end_date >= now
        ).all()
        
        for election in elections_to_activate:
            old_status = election.status.value
            election.status = ElectionStatus.ACTIVE
            updated_count += 1
            print(f"Auto-activated election: {election.title} (was {old_status})")
            
            # Create audit log for auto-activation
            AuthService.create_audit_log(
                user_id=None,
                action=AuditAction.ELECTION_STARTED,
                description=f"Election automatically started: {election.title}",
                election_id=election.id
            )
        
        # Find elections that have ended (end_date < now) and are still active or scheduled
        elections_to_complete = Election.query.filter(
            Election.status.in_([ElectionStatus.ACTIVE, ElectionStatus.SCHEDULED]),
            Election.end_date < now
        ).all()
        
        for election in elections_to_complete:
            old_status = election.status.value
            election.status = ElectionStatus.COMPLETED
            updated_count += 1
            print(f"Auto-completed election: {election.title} (was {old_status})")
            
            # Create audit log for auto-completion
            AuthService.create_audit_log(
                user_id=None,
                action=AuditAction.ELECTION_CLOSED,
                description=f"Election automatically completed: {election.title}",
                election_id=election.id
            )
        
        if updated_count > 0:
            db.session.commit()
            print(f"Updated {updated_count} election statuses")
            
    except Exception as e:
        print(f"Error checking election statuses: {str(e)}")
        db.session.rollback()


def admin_required():
    """Decorator to check admin access."""
    def decorator(fn):
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get('role') not in ['super_admin', 'election_admin']:
                return jsonify({'success': False, 'message': 'Admin access required'}), 403
            return fn(*args, **kwargs)
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator


@elections_bp.route('/', methods=['GET'])
@jwt_required(optional=True)
def list_elections():
    """List all elections with filtering."""
    try:
        # Check and update election statuses before listing
        check_and_update_election_statuses()
        
        status = request.args.get('status')
        election_type = request.args.get('type')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = Election.query

        if status:
            try:
                status_upper = status.upper()
                query = query.filter_by(status=ElectionStatus[status_upper])
            except (KeyError, ValueError):
                pass

        if election_type:
            try:
                type_upper = election_type.upper()
                query = query.filter_by(election_type=ElectionType[type_upper])
            except (KeyError, ValueError):
                pass

        # For non-admins, only show active/scheduled elections
        current_user = get_jwt_identity()
        if not current_user:
            query = query.filter(Election.status.in_([ElectionStatus.ACTIVE, ElectionStatus.SCHEDULED]))

        pagination = query.order_by(Election.start_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        # Safe conversion to dict
        elections_data = []
        for e in pagination.items:
            try:
                elections_data.append({
                    'id': e.id,
                    'title': e.title,
                    'description': e.description,
                    'election_type': e.election_type.value if e.election_type else None,
                    'status': e.status.value if e.status else None,
                    'start_date': e.start_date.isoformat() if e.start_date else None,
                    'end_date': e.end_date.isoformat() if e.end_date else None,
                    'created_at': e.created_at.isoformat() if e.created_at else None,
                })
            except Exception as e:
                print(f"Error converting election {e.id}: {str(e)}")
                continue

        return jsonify({
            'success': True,
            'data': elections_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        print(f"Error in list_elections: {str(e)}")
        return jsonify({
            'success': True,
            'data': [],
            'pagination': {
                'page': 1,
                'per_page': 20,
                'total': 0,
                'pages': 0
            }
        }), 200


@elections_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics for regular users."""
    try:
        # Update statuses first
        check_and_update_election_statuses()
        
        current_user_id = get_jwt_identity()
        
        # Election stats
        active_elections = Election.query.filter_by(status=ElectionStatus.ACTIVE).count()
        upcoming_elections = Election.query.filter_by(status=ElectionStatus.SCHEDULED).count()
        completed_elections = Election.query.filter_by(status=ElectionStatus.COMPLETED).count()
        
        # User's voting stats
        user_votes = Vote.query.filter_by(voter_id=current_user_id).count() if current_user_id else 0
        
        return jsonify({
            'success': True,
            'data': {
                'active_elections': active_elections,
                'upcoming_elections': upcoming_elections,
                'completed_elections': completed_elections,
                'total_votes': user_votes,
                'unread_notifications': 0
            }
        }), 200
    except Exception as e:
        print(f"Error fetching dashboard stats: {str(e)}")
        return jsonify({
            'success': True,
            'data': {
                'active_elections': 0,
                'upcoming_elections': 0,
                'completed_elections': 0,
                'total_votes': 0,
                'unread_notifications': 0
            }
        }), 200


@elections_bp.route('/test', methods=['GET'])
def test_elections():
    """Test endpoint to check if elections blueprint is working."""
    return jsonify({'success': True, 'message': 'Elections blueprint is working'}), 200


@elections_bp.route('/<election_id>', methods=['GET'])
@jwt_required(optional=True)
def get_election(election_id):
    """Get election details."""
    try:
        # Update statuses before getting election
        check_and_update_election_statuses()
        
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404

        data = {
            'id': election.id,
            'title': election.title,
            'description': election.description,
            'election_type': election.election_type.value if election.election_type else None,
            'status': election.status.value if election.status else None,
            'start_date': election.start_date.isoformat() if election.start_date else None,
            'end_date': election.end_date.isoformat() if election.end_date else None,
            'timezone': election.timezone,
            'voting_rule': election.voting_rule.value if election.voting_rule else None,
            'max_choices': election.max_choices,
            'allow_abstain': election.allow_abstain,
            'show_results_immediately': election.show_results_immediately,
            'created_at': election.created_at.isoformat() if election.created_at else None,
        }
        
        # Add positions if they exist
        if hasattr(election, 'positions') and election.positions:
            data['positions'] = []
            for pos in election.positions:
                data['positions'].append({
                    'id': pos.id,
                    'title': pos.title,
                    'description': pos.description,
                    'max_winners': pos.max_winners,
                    'display_order': pos.display_order
                })

        return jsonify({'success': True, 'data': data}), 200
        
    except Exception as e:
        print(f"Error in get_election: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@elections_bp.route('/', methods=['POST'])
@admin_required()
def create_election():
    """Create new election (Admin only)."""
    data = request.get_json()
    user_id = get_jwt_identity()

    required_fields = ['title', 'election_type', 'start_date', 'end_date']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'success': False, 'message': f'{field} is required'}), 400

    try:
        # Convert string to enum with uppercase
        election_type_str = data['election_type'].upper()
        voting_rule_str = data.get('voting_rule', 'single_choice').upper()
        
        # Parse dates
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        
        # Determine initial status based on dates
        now = datetime.utcnow()
        if now >= start_date and now <= end_date:
            initial_status = ElectionStatus.ACTIVE
        elif now > end_date:
            initial_status = ElectionStatus.COMPLETED
        else:
            initial_status = ElectionStatus.SCHEDULED
        
        election = Election(
            title=data['title'],
            description=data.get('description'),
            election_type=ElectionType[election_type_str],
            start_date=start_date,
            end_date=end_date,
            timezone=data.get('timezone', 'Africa/Lagos'),
            status=initial_status,
            eligible_districts=data.get('eligible_districts', []),
            eligible_chapters=data.get('eligible_chapters', []),
            voting_rule=VotingRule[voting_rule_str],
            max_choices=data.get('max_choices', 1),
            allow_abstain=data.get('allow_abstain', True),
            show_results_immediately=data.get('show_results_immediately', False),
            auto_start=data.get('auto_start', False),
            auto_close=data.get('auto_close', True),
            created_by=user_id
        )

        db.session.add(election)
        db.session.commit()

        # Add positions if provided
        if 'positions' in data and data['positions']:
            for idx, pos_data in enumerate(data['positions']):
                position = Position(
                    election_id=election.id,
                    title=pos_data.get('name') or pos_data.get('title'),
                    description=pos_data.get('description'),
                    max_winners=pos_data.get('max_winners', 1),
                    display_order=pos_data.get('sort_order', idx)
                )
                db.session.add(position)
            db.session.commit()

        # Audit log
        AuthService.create_audit_log(
            user_id=user_id,
            action=AuditAction.ELECTION_CREATED,
            description=f"Election created: {election.title}",
            election_id=election.id
        )

        return jsonify({
            'success': True,
            'message': 'Election created successfully',
            'data': {
                'id': election.id,
                'title': election.title,
                'description': election.description,
                'election_type': election.election_type.value,
                'status': election.status.value,
                'start_date': election.start_date.isoformat(),
                'end_date': election.end_date.isoformat()
            }
        }), 201

    except KeyError as e:
        return jsonify({'success': False, 'message': f'Invalid value for {str(e)}. Use NATIONAL, STATE, DISTRICT, CHAPTER, or COMMITTEE'}), 400
    except ValueError as e:
        return jsonify({'success': False, 'message': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Error creating election: {str(e)}")
        return jsonify({'success': False, 'message': f'Error creating election: {str(e)}'}), 500


@elections_bp.route('/<election_id>', methods=['PUT'])
@admin_required()
def update_election(election_id):
    """Update election (Admin only)."""
    election = Election.query.get_or_404(election_id)
    data = request.get_json()
    user_id = get_jwt_identity()

    # Prevent modification of completed/cancelled elections
    if election.status in [ElectionStatus.COMPLETED, ElectionStatus.CANCELLED]:
        return jsonify({
            'success': False,
            'message': f'Cannot modify {election.status.value} election'
        }), 403

    updatable_fields = ['title', 'description', 'start_date', 'end_date', 'timezone',
                       'eligible_districts', 'eligible_chapters', 'voting_rule',
                       'max_choices', 'allow_abstain', 'show_results_immediately',
                       'auto_start', 'auto_close']

    try:
        for field in updatable_fields:
            if field in data:
                if field in ['start_date', 'end_date']:
                    setattr(election, field, datetime.fromisoformat(data[field].replace('Z', '+00:00')))
                elif field == 'voting_rule':
                    setattr(election, field, VotingRule[data[field].upper()])
                else:
                    setattr(election, field, data[field])

        # Re-evaluate status based on new dates
        now = datetime.utcnow()
        if election.status != ElectionStatus.COMPLETED and election.status != ElectionStatus.CANCELLED:
            if now >= election.start_date and now <= election.end_date:
                election.status = ElectionStatus.ACTIVE
            elif now > election.end_date:
                election.status = ElectionStatus.COMPLETED
            elif election.status == ElectionStatus.ACTIVE and now < election.start_date:
                election.status = ElectionStatus.SCHEDULED

        db.session.commit()

        AuthService.create_audit_log(
            user_id=user_id,
            action=AuditAction.ELECTION_UPDATED,
            description=f"Election updated: {election.title}",
            election_id=election.id
        )

        return jsonify({
            'success': True,
            'message': 'Election updated successfully',
            'data': election.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error updating election: {str(e)}'}), 500


@elections_bp.route('/<election_id>/start', methods=['POST'])
@admin_required()
def start_election(election_id):
    """Start an election manually."""
    election = Election.query.get_or_404(election_id)
    user_id = get_jwt_identity()

    if election.status != ElectionStatus.SCHEDULED:
        return jsonify({'success': False, 'message': 'Election must be scheduled to start'}), 400

    election.status = ElectionStatus.ACTIVE
    db.session.commit()

    AuthService.create_audit_log(
        user_id=user_id,
        action=AuditAction.ELECTION_STARTED,
        description=f"Election started: {election.title}",
        election_id=election.id
    )

    return jsonify({
        'success': True,
        'message': 'Election started successfully',
        'data': election.to_dict()
    }), 200


@elections_bp.route('/<election_id>/close', methods=['POST'])
@admin_required()
def close_election(election_id):
    """Close an election manually."""
    election = Election.query.get_or_404(election_id)
    user_id = get_jwt_identity()

    if election.status != ElectionStatus.ACTIVE:
        return jsonify({'success': False, 'message': 'Election must be active to close'}), 400

    election.status = ElectionStatus.COMPLETED
    db.session.commit()

    AuthService.create_audit_log(
        user_id=user_id,
        action=AuditAction.ELECTION_CLOSED,
        description=f"Election closed: {election.title}",
        election_id=election.id
    )

    return jsonify({
        'success': True,
        'message': 'Election closed successfully',
        'data': election.to_dict()
    }), 200


@elections_bp.route('/<election_id>/positions', methods=['POST'])
@admin_required()
def add_position(election_id):
    """Add position to election."""
    election = Election.query.get_or_404(election_id)
    data = request.get_json()
    user_id = get_jwt_identity()

    if not data.get('name') and not data.get('title'):
        return jsonify({'success': False, 'message': 'Position name/title is required'}), 400

    position = Position(
        election_id=election_id,
        title=data.get('title') or data.get('name'),
        description=data.get('description'),
        max_winners=data.get('max_winners', 1),
        display_order=data.get('sort_order', 0)
    )

    db.session.add(position)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Position added successfully',
        'data': position.to_dict()
    }), 201


@elections_bp.route('/<election_id>/positions/<position_id>', methods=['DELETE'])
@admin_required()
def remove_position(election_id, position_id):
    """Remove position from election."""
    election = Election.query.get_or_404(election_id)
    position = Position.query.get_or_404(position_id)

    if position.election_id != election_id:
        return jsonify({'success': False, 'message': 'Position does not belong to this election'}), 400

    db.session.delete(position)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Position removed successfully'}), 200


@elections_bp.route('/<election_id>/results', methods=['GET'])
@jwt_required()
def get_election_results(election_id):
    """Get election results."""
    # Update status before showing results
    check_and_update_election_statuses()
    
    election = Election.query.get_or_404(election_id)
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    
    # Check if results can be shown
    can_view_results = (
        election.status == ElectionStatus.COMPLETED or 
        election.show_results_immediately or
        claims.get('role') in ['super_admin', 'election_admin', 'auditor', 'observer']
    )
    
    if not can_view_results:
        return jsonify({'success': False, 'message': 'Results are not available yet'}), 403
    
    # Calculate results
    from app.models.candidate import Candidate
    from app.models.vote import Vote
    
    results = {}
    for position in election.positions:
        candidates = Candidate.query.filter_by(election_id=election_id, position_id=position.id).all()
        position_results = []
        
        for candidate in candidates:
            vote_count = Vote.query.filter_by(candidate_id=candidate.id).count()
            position_results.append({
                'candidate_id': candidate.id,
                'candidate_name': candidate.user.full_name if candidate.user else candidate.name,
                'party': candidate.party_affiliation,
                'votes': vote_count
            })
        
        # Sort by votes descending
        position_results.sort(key=lambda x: x['votes'], reverse=True)
        results[position.title] = position_results
    
    return jsonify({
        'success': True,
        'data': {
            'election_id': election.id,
            'title': election.title,
            'status': election.status.value,
            'results': results,
            'total_votes': Vote.query.filter_by(election_id=election_id).count()
        }
    }), 200