"""
Admin Routes - User and System Management
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models.user import User, UserStatus, UserRole, District
from app.models.election import Election, ElectionStatus, ElectionType
from app.models.candidate import Candidate, CandidateStatus
from app.models.position import Position
from app.models.vote import Vote, VoteReceipt
from app.models.audit_log import AuditLog, AuditAction
from app.services.auth_service import AuthService
from datetime import datetime
import csv
import io
import uuid
import os
import base64
import logging
from werkzeug.utils import secure_filename

# Add logger
logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

# ==================== DECORATORS FIRST ====================
def super_admin_required():
    """Check super admin access."""
    def decorator(fn):
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get('role') != 'super_admin':
                return jsonify({'success': False, 'message': 'Super admin access required'}), 403
            return fn(*args, **kwargs)
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator

def admin_required(allowed_roles=['super_admin', 'election_admin']):
    """Check admin access with allowed roles."""
    def decorator(fn):
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role', '').lower()
            allowed = [role.lower() for role in allowed_roles]
            if user_role not in allowed:
                return jsonify({'success': False, 'message': f'Admin access required. Allowed roles: {allowed_roles}'}), 403
            return fn(*args, **kwargs)
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator

# ==================== ICON UPLOAD CONFIGURATION ====================
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@admin_bp.route('/upload-icon', methods=['POST'])
@super_admin_required()
def upload_app_icon():
    """Upload application icon/favicon (Super Admin only)."""
    try:
        if 'icon' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
        
        file = request.files['icon']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'message': f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        original_filename = secure_filename(file.filename)
        extension = original_filename.rsplit('.', 1)[1].lower()
        
        import time
        timestamp = int(time.time())
        new_filename = f"app_icon_{timestamp}.{extension}"
        
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        file_path = os.path.join(UPLOAD_FOLDER, new_filename)
        file.save(file_path)
        
        icon_paths = {
            'favicon': f'/static/uploads/{new_filename}',
            'icon_192': f'/static/uploads/{new_filename}',
            'icon_512': f'/static/uploads/{new_filename}'
        }
        
        # Try to store in database
        try:
            from app.models.system_config import SystemConfig
            
            config = SystemConfig.query.filter_by(key='app_icon').first()
            if not config:
                config = SystemConfig(key='app_icon', value=icon_paths['favicon'])
                db.session.add(config)
            else:
                config.value = icon_paths['favicon']
            
            config_full = SystemConfig.query.filter_by(key='app_icon_full').first()
            if not config_full:
                config_full = SystemConfig(key='app_icon_full', value=file_path)
                db.session.add(config_full)
            else:
                config_full.value = file_path
            
            db.session.commit()
        except Exception as db_error:
            print(f"Could not save to system_config: {db_error}")
        
        return jsonify({
            'success': True,
            'message': 'Application icon uploaded successfully',
            'data': {
                'filename': new_filename,
                'url': icon_paths['favicon'],
                'original_name': original_filename
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error uploading icon: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_bp.route('/system-icon', methods=['GET'])
def get_system_icon():
    """Get current system icon URL."""
    try:
        try:
            from app.models.system_config import SystemConfig
            config = SystemConfig.query.filter_by(key='app_icon').first()
            icon_url = config.value if config else '/vite.svg'
        except:
            icon_url = '/vite.svg'
        
        return jsonify({
            'success': True,
            'data': {
                'icon_url': icon_url
            }
        }), 200
    except Exception as e:
        return jsonify({'success': True, 'data': {'icon_url': '/vite.svg'}}), 200

# ==================== END ICON UPLOAD ENDPOINTS ====================

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """List all users (Admin only)."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin', 'tech_support']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    role = request.args.get('role')
    district = request.args.get('district')
    
    query = User.query
    if status:
        query = query.filter_by(status=UserStatus(status))
    if role:
        query = query.filter_by(role=UserRole(role))
    if district:
        query = query.filter_by(district=District(district))
    
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'success': True,
        'data': [u.to_dict() for u in pagination.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages
        }
    }), 200


@admin_bp.route('/users/all', methods=['GET'])
@jwt_required()
def get_all_users():
    """Get all users without pagination (for frontend)."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    users = User.query.all()
    return jsonify({
        'success': True,
        'data': [u.to_dict() for u in users],
        'users': [u.to_dict() for u in users]
    }), 200


@admin_bp.route('/users/create', methods=['POST'])
@super_admin_required()
def create_user():
    """Create a new user (Super Admin only)."""
    data = request.get_json()
    
    required_fields = ['full_name', 'email', 'phone', 'district', 'role', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'success': False, 'message': f'{field} is required'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'message': 'Email already registered'}), 409
    
    if data.get('membership_number') and User.query.filter_by(membership_number=data['membership_number']).first():
        return jsonify({'success': False, 'message': 'Membership number already exists'}), 409
    
    try:
        district = District(data['district'].lower())
        role = UserRole(data['role'].lower())
    except ValueError as e:
        return jsonify({'success': False, 'message': f'Invalid value: {str(e)}'}), 400
    
    user = User(
        membership_number=data.get('membership_number', f"USER{User.query.count() + 1:04d}"),
        full_name=data['full_name'],
        email=data['email'],
        phone=data['phone'],
        district=district,
        chapter=data.get('chapter'),
        status=UserStatus.ACTIVE,
        role=role,
        email_verified=True,
        phone_verified=True
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    admin_id = get_jwt_identity()
    AuthService.create_audit_log(
        user_id=admin_id,
        action=AuditAction.USER_CREATED,
        description=f"User {user.email} created with role {role.value}",
        target_type='user',
        target_id=user.id
    )
    
    return jsonify({
        'success': True,
        'message': 'User created successfully',
        'data': user.to_dict()
    }), 201


@admin_bp.route('/users/bulk-upload', methods=['POST'])
@super_admin_required()
def bulk_upload_users():
    """Bulk upload users from CSV file."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'success': False, 'message': 'Please upload a CSV file'}), 400
    
    admin_id = get_jwt_identity()
    
    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        created_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_input, start=2):
            try:
                if not row.get('email'):
                    continue
                
                if User.query.filter_by(email=row['email']).first():
                    errors.append(f"Row {row_num}: Email {row['email']} already exists")
                    continue
                
                if row.get('membership_number') and User.query.filter_by(membership_number=row['membership_number']).first():
                    errors.append(f"Row {row_num}: Membership number {row['membership_number']} already exists")
                    continue
                
                try:
                    district = District(row['district'].lower())
                    role = UserRole(row['role'].lower())
                except ValueError as e:
                    errors.append(f"Row {row_num}: Invalid district or role - {str(e)}")
                    continue
                
                membership_number = row.get('membership_number', f"BULK{created_count + 1:04d}")
                password = row.get('password', 'Default123!')
                
                user = User(
                    membership_number=membership_number,
                    full_name=row['full_name'],
                    email=row['email'],
                    phone=row['phone'],
                    district=district,
                    status=UserStatus.ACTIVE,
                    role=role,
                    email_verified=True,
                    phone_verified=True
                )
                user.set_password(password)
                
                db.session.add(user)
                created_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        db.session.commit()
        
        if created_count > 0:
            try:
                AuthService.create_audit_log(
                    user_id=admin_id,
                    action=AuditAction.USER_CREATED,
                    description=f"Bulk upload created {created_count} users",
                    target_type='bulk_upload',
                    extra_metadata={'created_count': created_count, 'errors': errors}
                )
            except Exception as audit_error:
                print(f"Audit log error: {audit_error}")
        
        return jsonify({
            'success': True,
            'message': f'Successfully created {created_count} users',
            'created': created_count,
            'errors': errors
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error processing file: {str(e)}'}), 500


@admin_bp.route('/users/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get user details."""
    claims = get_jwt()
    current_user_id = get_jwt_identity()
    
    if claims.get('role') not in ['super_admin', 'election_admin', 'tech_support'] and current_user_id != user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    user = User.query.get_or_404(user_id)
    return jsonify({'success': True, 'data': user.to_dict(include_sensitive=True)}), 200


@admin_bp.route('/users/<user_id>/status', methods=['PUT', 'PATCH'])
@jwt_required()
def update_user_status(user_id):
    """Update user status (Super Admin only)."""
    claims = get_jwt()
    
    if claims.get('role') != 'super_admin':
        return jsonify({'success': False, 'message': 'Super admin access required'}), 403
    
    admin_id = get_jwt_identity()
    data = request.get_json()
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'success': False, 'message': 'Status is required'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    if user.id == admin_id:
        return jsonify({'success': False, 'message': 'Cannot change your own status'}), 400
    
    valid_statuses = ['active', 'suspended', 'pending', 'inactive']
    if new_status not in valid_statuses:
        return jsonify({'success': False, 'message': f'Invalid status. Must be one of: {valid_statuses}'}), 400
    
    old_status = user.status.value
    user.status = UserStatus(new_status)
    db.session.commit()
    
    AuthService.create_audit_log(
        user_id=admin_id,
        action=AuditAction.USER_UPDATED,
        description=f"User status changed from {old_status} to {new_status}",
        target_type='user',
        target_id=user_id
    )
    
    return jsonify({
        'success': True,
        'message': f'Status updated from {old_status} to {new_status}'
    }), 200


@admin_bp.route('/users/<user_id>/role', methods=['PUT'])
@super_admin_required()
def update_user_role(user_id):
    """Update user role (Super Admin only)."""
    admin_id = get_jwt_identity()
    data = request.get_json()
    new_role = data.get('role')
    
    if not new_role:
        return jsonify({'success': False, 'message': 'Role is required'}), 400
    
    user = User.query.get_or_404(user_id)
    old_role = user.role.value
    
    if user.id == admin_id and old_role == 'super_admin' and new_role != 'super_admin':
        return jsonify({'success': False, 'message': 'Cannot demote yourself from Super Admin'}), 400
    
    user.role = UserRole(new_role)
    db.session.commit()
    
    AuthService.create_audit_log(
        user_id=admin_id,
        action=AuditAction.USER_UPDATED,
        description=f"User role changed from {old_role} to {new_role}",
        target_type='user',
        target_id=user_id
    )
    
    return jsonify({
        'success': True,
        'message': 'User role updated',
        'data': user.to_dict()
    }), 200


@admin_bp.route('/users/<user_id>/approve', methods=['POST'])
@jwt_required()
def approve_user(user_id):
    """Approve a pending user (Admin only)."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    admin_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    
    if user.status != UserStatus.PENDING:
        return jsonify({'success': False, 'message': 'User is not pending approval'}), 400
    
    user.status = UserStatus.ACTIVE
    user.approved_by = admin_id
    user.approved_at = datetime.utcnow()
    db.session.commit()
    
    AuthService.create_audit_log(
        user_id=admin_id,
        action=AuditAction.USER_APPROVED,
        description=f"User {user.email} approved",
        target_type='user',
        target_id=user_id
    )
    
    return jsonify({
        'success': True,
        'message': 'User approved successfully',
        'data': user.to_dict()
    }), 200


@admin_bp.route('/users/<user_id>/suspend', methods=['POST'])
@jwt_required()
def suspend_user(user_id):
    """Suspend a user (Admin only)."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    admin_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    
    if user.id == admin_id:
        return jsonify({'success': False, 'message': 'Cannot suspend yourself'}), 400
    
    user.status = UserStatus.SUSPENDED
    db.session.commit()
    
    AuthService.create_audit_log(
        user_id=admin_id,
        action=AuditAction.USER_SUSPENDED,
        description=f"User {user.email} suspended",
        target_type='user',
        target_id=user_id
    )
    
    return jsonify({'success': True, 'message': 'User suspended successfully'}), 200


@admin_bp.route('/users/<user_id>/activate', methods=['POST'])
@jwt_required()
def activate_user(user_id):
    """Activate a suspended user (Admin only)."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    admin_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    
    user.status = UserStatus.ACTIVE
    db.session.commit()
    
    AuthService.create_audit_log(
        user_id=admin_id,
        action=AuditAction.USER_ACTIVATED,
        description=f"User {user.email} activated",
        target_type='user',
        target_id=user_id
    )
    
    return jsonify({'success': True, 'message': 'User activated successfully'}), 200


@admin_bp.route('/candidates/<candidate_id>/vote-count', methods=['GET'])
@jwt_required()
def get_candidate_vote_count(candidate_id):
    """Get vote count for a specific candidate."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        from app.models.vote import Vote
        
        vote_count = Vote.query.filter_by(candidate_id=candidate_id).count()
        
        return jsonify({
            'success': True,
            'data': {
                'candidate_id': candidate_id,
                'vote_count': vote_count
            }
        }), 200
    except Exception as e:
        print(f"Error getting candidate vote count: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@super_admin_required()
def delete_user(user_id):
    """Delete a user with cascade handling (Super Admin only)."""
    try:
        admin_id = get_jwt_identity()
        
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if str(user.id) == str(admin_id):
            return jsonify({'success': False, 'message': 'Cannot delete your own account'}), 400
        
        if user.role == UserRole.SUPER_ADMIN:
            return jsonify({'success': False, 'message': 'Cannot delete another Super Admin'}), 400
        
        user_email = user.email
        
        # First, delete all candidates associated with this user
        candidates = Candidate.query.filter_by(user_id=user_id).all()
        candidate_count = len(candidates)
        for candidate in candidates:
            # Delete votes for this candidate first
            Vote.query.filter_by(candidate_id=candidate.id).delete()
            # Then delete the candidate
            db.session.delete(candidate)
        
        # For votes cast by this user (as voter)
        votes = Vote.query.filter_by(voter_id=user_id).all()
        for vote in votes:
            db.session.delete(vote)
        
        # Update elections where user is creator
        Election.query.filter_by(created_by=user_id).update({'created_by': None})
        
        # Delete audit logs for this user
        AuditLog.query.filter_by(user_id=user_id).delete()
        
        # Finally delete the user
        db.session.delete(user)
        db.session.commit()
        
        # Create audit log without extra_metadata
        AuthService.create_audit_log(
            user_id=admin_id,
            action=AuditAction.USER_DELETED,
            description=f"User {user_email} deleted (had {candidate_count} candidates)",
            target_type='user',
            target_id=user_id
        )
        
        return jsonify({
            'success': True, 
            'message': f'User {user_email} deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error deleting user: {str(e)}'}), 500


@admin_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def admin_dashboard_stats():
    """Get admin dashboard statistics."""
    claims = get_jwt()
    if claims.get('role') not in ['super_admin', 'election_admin', 'auditor', 'observer']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    total_eligible_voters = User.query.filter_by(status=UserStatus.ACTIVE).count()
    total_votes_cast = Vote.query.count()
    voter_turnout = round((total_votes_cast / total_eligible_voters * 100), 2) if total_eligible_voters > 0 else 0
    
    stats = {
        'users': {
            'total': User.query.count(),
            'active': User.query.filter_by(status=UserStatus.ACTIVE).count(),
            'pending': User.query.filter_by(status=UserStatus.PENDING).count(),
            'suspended': User.query.filter_by(status=UserStatus.SUSPENDED).count(),
        },
        'elections': {
            'total': Election.query.count(),
            'active': Election.query.filter_by(status=ElectionStatus.ACTIVE).count(),
            'scheduled': Election.query.filter_by(status=ElectionStatus.SCHEDULED).count(),
            'completed': Election.query.filter_by(status=ElectionStatus.COMPLETED).count(),
            'cancelled': Election.query.filter_by(status=ElectionStatus.CANCELLED).count() if hasattr(ElectionStatus, 'CANCELLED') else 0,
        },
        'candidates': {
            'total': Candidate.query.count(),
            'pending': Candidate.query.filter_by(status=CandidateStatus.PENDING).count(),
            'approved': Candidate.query.filter_by(status=CandidateStatus.APPROVED).count(),
            'rejected': Candidate.query.filter_by(status=CandidateStatus.REJECTED).count() if hasattr(CandidateStatus, 'REJECTED') else 0,
        },
        'votes': {
            'total': total_votes_cast,
            'turnout': voter_turnout
        }
    }
    
    return jsonify({'success': True, 'data': stats}), 200


@admin_bp.route('/activities/recent', methods=['GET'])
@jwt_required()
def get_recent_activities():
    """Get recent activities for dashboard."""
    try:
        recent_logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()
        
        activities = []
        for log in recent_logs:
            activities.append({
                'id': log.id,
                'description': log.action_description or f"{log.action.value} performed",
                'user_email': log.user_email or 'System',
                'action': log.action.value,
                'created_at': log.created_at.isoformat() if log.created_at else None
            })
        
        return jsonify({'success': True, 'data': activities}), 200
    except Exception as e:
        return jsonify({'success': True, 'data': []}), 200


@admin_bp.route('/elections/recent', methods=['GET'])
@jwt_required()
def get_recent_elections():
    """Get recent elections for dashboard."""
    try:
        recent_elections = Election.query.order_by(Election.created_at.desc()).limit(5).all()
        
        elections_data = []
        for election in recent_elections:
            elections_data.append({
                'id': election.id,
                'title': election.title,
                'status': election.status.value if election.status else 'unknown',
                'start_date': election.start_date.isoformat() if election.start_date else None,
                'end_date': election.end_date.isoformat() if election.end_date else None,
                'created_at': election.created_at.isoformat() if election.created_at else None
            })
        
        return jsonify({'success': True, 'data': elections_data}), 200
    except Exception as e:
        return jsonify({'success': True, 'data': []}), 200


# ==================== Positions Management Endpoints ====================

@admin_bp.route('/positions', methods=['GET'])
@jwt_required()
def get_positions():
    """Get all positions for dropdown."""
    try:
        claims = get_jwt()
        user_role = claims.get('role', '').lower()
        
        if user_role not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        from sqlalchemy import text
        
        result = db.session.execute(text("""
            SELECT DISTINCT title FROM positions WHERE title IS NOT NULL AND title != ''
            ORDER BY title
        """))
        
        positions = []
        for row in result:
            if row[0]:
                positions.append({'id': row[0], 'title': row[0]})
        
        if not positions:
            default_positions = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Public Relations Officer']
            positions = [{'id': p, 'title': p} for p in default_positions]
        
        return jsonify({
            'success': True,
            'data': positions
        }), 200
        
    except Exception as e:
        print(f"Error fetching positions: {str(e)}")
        default_positions = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Public Relations Officer']
        return jsonify({
            'success': True,
            'data': [{'id': p, 'title': p} for p in default_positions]
        }), 200


@admin_bp.route('/association-members/bulk-upload', methods=['POST'])
@super_admin_required()
def bulk_upload_association_members():
    """Bulk upload association members from CSV file."""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({'success': False, 'message': 'Please upload a CSV file'}), 400
        
        admin_id = get_jwt_identity()
        
        from app.models.association_member import AssociationMember, PaymentStatus
        
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        created_count = 0
        updated_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_input, start=2):
            try:
                if not row.get('association_id'):
                    continue
                
                association_id = row['association_id'].strip().upper()
                existing = AssociationMember.query.filter_by(association_id=association_id).first()
                
                payment_status = row.get('payment_status', 'pending').upper()
                if payment_status not in ['PAID', 'PENDING', 'FAILED', 'REFUNDED']:
                    errors.append(f"Row {row_num}: Invalid payment status '{payment_status}'. Must be PAID, PENDING, FAILED, or REFUNDED")
                    continue
                
                status_enum = None
                if payment_status == 'PAID':
                    status_enum = PaymentStatus.PAID
                elif payment_status == 'PENDING':
                    status_enum = PaymentStatus.PENDING
                elif payment_status == 'FAILED':
                    status_enum = PaymentStatus.FAILED
                elif payment_status == 'REFUNDED':
                    status_enum = PaymentStatus.REFUNDED
                
                if existing:
                    existing.full_name = row.get('full_name', existing.full_name)
                    existing.email = row.get('email', existing.email)
                    existing.phone = row.get('phone', existing.phone)
                    existing.district = row.get('district', existing.district).lower()
                    existing.chapter = row.get('chapter', existing.chapter)
                    existing.payment_status = status_enum
                    existing.payment_reference = row.get('payment_reference', existing.payment_reference)
                    try:
                        existing.amount_paid = float(row.get('amount_paid', existing.amount_paid))
                    except:
                        pass
                    updated_count += 1
                else:
                    member = AssociationMember(
                        id=str(uuid.uuid4()),
                        association_id=association_id,
                        full_name=row['full_name'],
                        email=row['email'],
                        phone=row['phone'],
                        district=row.get('district', 'lagos').lower(),
                        chapter=row.get('chapter', ''),
                        payment_status=status_enum,
                        payment_reference=row.get('payment_reference'),
                        amount_paid=float(row.get('amount_paid', 0)) if row.get('amount_paid') else 0.00,
                        has_registered=False
                    )
                    db.session.add(member)
                    created_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=admin_id,
            action=AuditAction.BULK_USER_IMPORTED,
            description=f"Bulk upload association members: {created_count} created, {updated_count} updated",
            target_type='association_members',
            extra_metadata={'created': created_count, 'updated': updated_count, 'errors': errors}
        )
        
        return jsonify({
            'success': True,
            'message': f'Successfully processed {created_count + updated_count} records ({created_count} created, {updated_count} updated)',
            'data': {
                'created': created_count,
                'updated': updated_count,
                'errors': errors
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in bulk upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/association-members', methods=['GET'])
@super_admin_required()
def get_association_members():
    """Get all association members (Super Admin only)."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        payment_status = request.args.get('payment_status')
        has_registered = request.args.get('has_registered')
        
        from app.models.association_member import AssociationMember, PaymentStatus
        
        query = AssociationMember.query
        
        if payment_status:
            try:
                status_enum = None
                if payment_status.upper() == 'PAID':
                    status_enum = PaymentStatus.PAID
                elif payment_status.upper() == 'PENDING':
                    status_enum = PaymentStatus.PENDING
                elif payment_status.upper() == 'FAILED':
                    status_enum = PaymentStatus.FAILED
                elif payment_status.upper() == 'REFUNDED':
                    status_enum = PaymentStatus.REFUNDED
                if status_enum:
                    query = query.filter_by(payment_status=status_enum)
            except:
                pass
        
        if has_registered is not None:
            query = query.filter_by(has_registered=has_registered.lower() == 'true')
        
        pagination = query.order_by(AssociationMember.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        members_data = []
        for member in pagination.items:
            members_data.append({
                'id': member.id,
                'association_id': member.association_id,
                'full_name': member.full_name,
                'email': member.email,
                'phone': member.phone,
                'district': member.district,
                'chapter': member.chapter,
                'payment_status': member.payment_status.value if member.payment_status else None,
                'payment_reference': member.payment_reference,
                'amount_paid': float(member.amount_paid) if member.amount_paid else 0,
                'has_registered': member.has_registered,
                'registered_at': member.registered_at.isoformat() if member.registered_at else None,
                'created_at': member.created_at.isoformat() if member.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': members_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting association members: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== Election Management Endpoints ====================

@admin_bp.route('/elections', methods=['GET'])
@jwt_required()
def get_elections():
    """Get all elections (Admin only)."""
    try:
        claims = get_jwt()
        user_role = claims.get('role', '').lower()
        
        if user_role not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        elections = Election.query.order_by(Election.created_at.desc()).all()
        
        elections_data = []
        for election in elections:
            if hasattr(election.status, 'value'):
                status = election.status.value
            else:
                status = str(election.status) if election.status else 'DRAFT'
            
            if hasattr(election.election_type, 'value'):
                election_type = election.election_type.value
            else:
                election_type = str(election.election_type) if election.election_type else 'NATIONAL'
            
            elections_data.append({
                'id': election.id,
                'title': election.title or 'Untitled Election',
                'description': election.description or '',
                'election_type': election_type,
                'status': status,
                'start_date': election.start_date.isoformat() if election.start_date else None,
                'end_date': election.end_date.isoformat() if election.end_date else None,
                'created_at': election.created_at.isoformat() if election.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': elections_data,
            'elections': elections_data
        }), 200
        
    except Exception as e:
        print(f"Error fetching elections: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': True, 'data': [], 'elections': []}), 200


@admin_bp.route('/reset-all-votes', methods=['POST'])
@super_admin_required()
def reset_all_votes_alt():
    """Reset all votes in the system (Super Admin only)."""
    try:
        admin_id = get_jwt_identity()
        data = request.get_json()
        election_id = data.get('election_id')
        confirm = data.get('confirm', False)
        
        if not confirm:
            return jsonify({
                'success': False, 
                'message': 'Confirmation required. Please type RESET VOTES to confirm.'
            }), 400
        
        from app.models.vote import Vote, VoteReceipt
        
        if election_id:
            vote_count = Vote.query.filter_by(election_id=election_id).count()
            Vote.query.filter_by(election_id=election_id).delete()
            db.session.execute(
                db.text("DELETE FROM vote_receipts WHERE vote_id IN (SELECT id FROM votes WHERE election_id = :eid)"),
                {'eid': election_id}
            )
        else:
            vote_count = Vote.query.count()
            Vote.query.delete()
            VoteReceipt.query.delete()
        
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=admin_id,
            action=AuditAction.VOTES_RESET,
            description=f"Reset {vote_count} votes" + (f" in election {election_id}" if election_id else " across all elections"),
            target_type='votes',
            extra_metadata={'vote_count': vote_count, 'election_id': election_id}
        )
        
        return jsonify({
            'success': True,
            'message': f'Successfully reset {vote_count} votes',
            'data': {'votes_reset': vote_count}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error resetting votes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/elections', methods=['POST'])
@jwt_required()
def create_election():
    """Create a new election (Admin only)."""
    try:
        claims = get_jwt()
        user_role = claims.get('role', '').lower()
        
        if user_role not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        data = request.get_json()
        
        required_fields = ['title', 'start_date', 'end_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        try:
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        except ValueError as e:
            return jsonify({'success': False, 'message': f'Invalid date format: {str(e)}'}), 400
        
        election_type = data.get('election_type', 'NATIONAL').upper()
        
        from app.models.election import ElectionStatus
        election = Election(
            id=str(uuid.uuid4()),
            title=data['title'],
            description=data.get('description', ''),
            election_type=election_type,
            start_date=start_date,
            end_date=end_date,
            status=ElectionStatus.SCHEDULED,
            created_by=get_jwt_identity()
        )
        
        db.session.add(election)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Election created successfully',
            'data': {
                'id': election.id,
                'title': election.title,
                'election_type': election_type,
                'status': 'SCHEDULED',
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating election: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/elections/<election_id>', methods=['GET'])
@jwt_required()
def get_election(election_id):
    """Get a specific election by ID."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        return jsonify({
            'success': True,
            'data': election.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Error fetching election: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/elections/<election_id>', methods=['PUT'])
@jwt_required()
def update_election(election_id):
    """Update an existing election."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        data = request.get_json()
        
        if 'title' in data and data['title']:
            election.title = data['title']
        if 'description' in data:
            election.description = data['description']
        if 'election_type' in data and data['election_type']:
            election_type_val = data['election_type'].upper()
            election.election_type = election_type_val
        if 'start_date' in data and data['start_date']:
            try:
                start_date_str = data['start_date']
                if 'Z' in start_date_str:
                    election.start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                else:
                    election.start_date = datetime.fromisoformat(start_date_str)
            except ValueError as e:
                print(f"Date parsing error: {e}")
        if 'end_date' in data and data['end_date']:
            try:
                end_date_str = data['end_date']
                if 'Z' in end_date_str:
                    election.end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                else:
                    election.end_date = datetime.fromisoformat(end_date_str)
            except ValueError as e:
                print(f"Date parsing error: {e}")
        if 'status' in data and data['status']:
            status_val = data['status'].upper()
            from app.models.election import ElectionStatus
            status_map = {
                'DRAFT': ElectionStatus.DRAFT,
                'SCHEDULED': ElectionStatus.SCHEDULED,
                'ACTIVE': ElectionStatus.ACTIVE,
                'COMPLETED': ElectionStatus.COMPLETED,
                'CANCELLED': ElectionStatus.CANCELLED,
                'PAUSED': getattr(ElectionStatus, 'PAUSED', 'paused')
            }
            election.status = status_map.get(status_val, status_val)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Election updated successfully',
            'data': {
                'id': election.id,
                'title': election.title,
                'description': election.description,
                'election_type': election.election_type if isinstance(election.election_type, str) else (election.election_type.value if hasattr(election.election_type, 'value') else str(election.election_type)),
                'status': election.status if isinstance(election.status, str) else (election.status.value if hasattr(election.status, 'value') else str(election.status)),
                'start_date': election.start_date.isoformat() if election.start_date else None,
                'end_date': election.end_date.isoformat() if election.end_date else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating election: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/elections/<election_id>/status', methods=['PATCH'])
@jwt_required()
def update_election_status(election_id):
    """Update election status."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'success': False, 'message': 'Status is required'}), 400
        
        status_upper = new_status.upper()
        valid_statuses = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']
        if status_upper not in valid_statuses:
            return jsonify({'success': False, 'message': f'Invalid status. Must be one of: {valid_statuses}'}), 400
        
        from app.models.election import ElectionStatus
        status_map = {
            'DRAFT': ElectionStatus.DRAFT,
            'SCHEDULED': ElectionStatus.SCHEDULED,
            'ACTIVE': ElectionStatus.ACTIVE,
            'PAUSED': getattr(ElectionStatus, 'PAUSED', 'paused'),
            'COMPLETED': ElectionStatus.COMPLETED,
            'CANCELLED': ElectionStatus.CANCELLED
        }
        
        old_status = election.status
        old_status_str = old_status.value if hasattr(old_status, 'value') else str(old_status)
        election.status = status_map.get(status_upper, status_upper)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Election status changed from {old_status_str} to {new_status}'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating election status: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== Candidate Management Endpoints ====================

@admin_bp.route('/candidates', methods=['GET'])
@jwt_required()
def get_candidates():
    """Get all candidates (Admin only)."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        from sqlalchemy import text
        result = db.session.execute(text("""
            SELECT 
                c.id, 
                c.election_id, 
                c.user_id, 
                c.position_id, 
                c.status, 
                c.created_at,
                c.photo_url,
                p.title as position_title,
                u.full_name as user_name,
                u.email as user_email,
                e.title as election_title
            FROM candidates c
            LEFT JOIN positions p ON c.position_id = p.id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN elections e ON c.election_id = e.id
            ORDER BY c.created_at DESC
        """))
        
        candidates_data = []
        for row in result:
            candidates_data.append({
                'id': row[0],
                'election_id': row[1],
                'user_id': row[2],
                'position_id': row[3],
                'status': row[4],
                'created_at': str(row[5]) if row[5] else None,
                'photo_url': row[6] if len(row) > 6 else None,
                'position': row[7] if len(row) > 7 else None,
                'election_title': row[10] if len(row) > 10 else None,
                'user': {
                    'full_name': row[8] if len(row) > 8 else None,
                    'email': row[9] if len(row) > 9 else None
                } if (len(row) > 8 and row[8]) else None
            })
        
        print(f"✅ Found {len(candidates_data)} candidates")
        
        return jsonify({
            'success': True,
            'data': candidates_data,
            'candidates': candidates_data
        }), 200
        
    except Exception as e:
        print(f"Error fetching candidates: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/candidates', methods=['POST'])
@jwt_required()
def create_candidate():
    """Create a new candidate (Admin only)."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        data = request.get_json()
        
        election_id = data.get('election_id')
        position_name = data.get('position') or data.get('position_name')
        user_identifier = data.get('user_id') or data.get('candidate_email') or data.get('email')
        
        if not election_id:
            return jsonify({'success': False, 'message': 'Election ID is required'}), 400
        
        if not position_name:
            return jsonify({'success': False, 'message': 'Position is required'}), 400
        
        if not user_identifier:
            return jsonify({'success': False, 'message': 'User ID or email is required'}), 400
        
        user = User.query.filter(
            db.or_(
                User.id == user_identifier,
                User.email == user_identifier,
                User.full_name.ilike(f"%{user_identifier}%")
            )
        ).first()
        
        if not user:
            return jsonify({'success': False, 'message': f'User not found: {user_identifier}'}), 404
        
        from sqlalchemy import text
        election_result = db.session.execute(text("SELECT id, title FROM elections WHERE id = :id"), {'id': election_id})
        election = election_result.fetchone()
        
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        position = Position.query.filter_by(
            title=position_name,
            election_id=election_id
        ).first()
        
        if not position:
            position = Position(
                id=str(uuid.uuid4()),
                title=position_name,
                election_id=election_id
            )
            db.session.add(position)
            db.session.flush()
        
        existing = Candidate.query.filter(
            Candidate.election_id == election_id,
            Candidate.user_id == user.id,
            Candidate.position_id == position.id
        ).first()
        
        if existing:
            return jsonify({
                'success': False,
                'message': f'Candidate already registered for position: {position_name}'
            }), 409
        
        candidate = Candidate(
            id=str(uuid.uuid4()),
            election_id=election_id,
            user_id=user.id,
            position_id=position.id,
            manifesto=data.get('manifesto', ''),
            status=CandidateStatus.PENDING
        )
        
        db.session.add(candidate)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Candidate registered successfully',
            'data': {
                'id': candidate.id,
                'election_id': candidate.election_id,
                'user_id': candidate.user_id,
                'position_id': candidate.position_id,
                'position_name': position_name,
                'status': candidate.status.value
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating candidate: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/candidates/<candidate_id>', methods=['PUT'])
@jwt_required()
def update_candidate(candidate_id):
    """Update a candidate (Admin only)."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        candidate = Candidate.query.get(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404
        
        data = request.get_json()
        
        if 'election_id' in data and data['election_id'] != candidate.election_id:
            election = Election.query.get(data['election_id'])
            if not election:
                return jsonify({'success': False, 'message': 'Election not found'}), 404
            candidate.election_id = data['election_id']
        
        if 'user_id' in data:
            user = User.query.filter(
                db.or_(
                    User.id == data['user_id'],
                    User.email == data['user_id']
                )
            ).first()
            if user:
                candidate.user_id = user.id
        
        if 'position' in data and data['position'] != candidate.position:
            position = Position.query.filter_by(
                title=data['position'],
                election_id=candidate.election_id
            ).first()
            
            if not position:
                position = Position(
                    id=str(uuid.uuid4()),
                    title=data['position'],
                    election_id=candidate.election_id
                )
                db.session.add(position)
                db.session.flush()
            
            candidate.position_id = position.id
        
        if 'manifesto' in data:
            candidate.manifesto = data['manifesto']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Candidate updated successfully',
            'data': {'id': candidate.id}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating candidate: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/candidates/<candidate_id>/upload-photo', methods=['POST'])
@jwt_required()
def upload_candidate_photo(candidate_id):
    """Upload candidate photo and store as base64."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        candidate = Candidate.query.get(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404
        
        if 'photo' not in request.files:
            return jsonify({'success': False, 'message': 'No photo provided'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        file_data = file.read()
        base64_data = base64.b64encode(file_data).decode('utf-8')
        
        mime_type = file.content_type or 'image/jpeg'
        photo_url = f"data:{mime_type};base64,{base64_data}"
        
        candidate.photo_url = photo_url
        db.session.commit()
        
        return jsonify({'success': True, 'photo_url': photo_url}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error uploading photo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/candidates/<candidate_id>/approve', methods=['PATCH'])
@jwt_required()
def approve_candidate(candidate_id):
    """Approve a candidate (Admin only)."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        candidate = Candidate.query.get(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404
        
        candidate.status = CandidateStatus.APPROVED
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Candidate approved'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/candidates/<candidate_id>/reject', methods=['PATCH'])
@jwt_required()
def reject_candidate(candidate_id):
    """Reject a candidate (Admin only)."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        candidate = Candidate.query.get(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404
        
        candidate.status = CandidateStatus.REJECTED
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Candidate rejected'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/candidates/<candidate_id>', methods=['DELETE'])
@jwt_required()
def delete_candidate(candidate_id):
    """Delete a candidate with force delete support (Admin only)."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        from flask import request
        from app.models.election import Election
        
        candidate = Candidate.query.get(candidate_id)
        if not candidate:
            return jsonify({'success': False, 'message': 'Candidate not found'}), 404
        
        force = request.args.get('force', 'false').lower() == 'true'
        vote_count = Vote.query.filter_by(candidate_id=candidate_id).count()
        
        if vote_count > 0 and not force:
            return jsonify({
                'success': False, 
                'message': f'Cannot delete candidate with {vote_count} votes already cast. Use force=true to delete anyway (votes will be lost).'
            }), 400
        
        candidate_name = candidate.user.full_name if candidate.user else 'Unknown'
        
        election_title = 'Unknown'
        if candidate.election_id:
            election = Election.query.get(candidate.election_id)
            if election:
                election_title = election.title
        
        if vote_count > 0 and force:
            Vote.query.filter_by(candidate_id=candidate_id).delete()
        
        db.session.delete(candidate)
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=get_jwt_identity(),
            action=AuditAction.CANDIDATE_DELETED,
            description=f"Candidate {candidate_name} deleted from election {election_title}" + (f" (forced delete with {vote_count} votes)" if force and vote_count > 0 else ""),
            target_type='candidate',
            target_id=candidate_id
        )
        
        return jsonify({
            'success': True, 
            'message': f'Candidate {candidate_name} deleted successfully' + (f' along with {vote_count} votes' if force and vote_count > 0 else '')
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting candidate: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/seed-test-users', methods=['POST'])
@super_admin_required()
def seed_test_users():
    """Seed test users for development (Super Admin only)."""
    try:
        admin_id = get_jwt_identity()
        
        created_count = 0
        skipped_count = 0
        
        for i in range(1, 16):
            email = f"test{i}@gmail.com"
            password = email
            
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                skipped_count += 1
                continue
            
            user = User(
                membership_number=f"TEST{i:04d}",
                full_name=f"Test User {i}",
                email=email,
                phone=f"080000000{i:02d}",
                district=District.LAGOS,
                status=UserStatus.ACTIVE,
                role=UserRole.MEMBER,
                email_verified=True,
                phone_verified=True
            )
            user.set_password(password)
            
            db.session.add(user)
            created_count += 1
        
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=admin_id,
            action=AuditAction.USER_CREATED,
            description=f"Seeded {created_count} test users (skipped {skipped_count} existing)",
            target_type='bulk_upload',
            extra_metadata={'created': created_count, 'skipped': skipped_count}
        )
        
        return jsonify({
            'success': True,
            'message': f'Successfully created {created_count} test users',
            'data': {
                'created': created_count,
                'skipped': skipped_count
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error seeding test users: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/elections/<election_id>', methods=['DELETE'])
@jwt_required()
def delete_election(election_id):
    """Delete an election (Admin only)."""
    try:
        claims = get_jwt()
        if claims.get('role') not in ['super_admin', 'election_admin']:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        from flask import request
        from app.models import Election, Vote, Candidate, Position
        
        election = Election.query.get(election_id)
        if not election:
            return jsonify({'success': False, 'message': 'Election not found'}), 404
        
        force = request.args.get('force', 'false').lower() == 'true'
        vote_count = Vote.query.filter_by(election_id=election_id).count()
        
        if vote_count > 0 and not force:
            return jsonify({
                'success': False, 
                'message': f'Cannot delete election with {vote_count} votes cast. Use force=true to delete anyway (votes will be lost). Consider closing or cancelling it instead.'
            }), 400
        
        candidate_count = Candidate.query.filter_by(election_id=election_id).count()
        position_count = Position.query.filter_by(election_id=election_id).count()
        election_title = election.title
        
        Position.query.filter_by(election_id=election_id).delete()
        Candidate.query.filter_by(election_id=election_id).delete()
        Vote.query.filter_by(election_id=election_id).delete()
        
        db.session.delete(election)
        db.session.commit()
        
        try:
            AuthService.create_audit_log(
                user_id=get_jwt_identity(),
                action=AuditAction.ELECTION_DELETED,
                description=f"Election '{election_title}' deleted (had {candidate_count} candidates, {vote_count} votes, {position_count} positions)" + (" - forced delete" if force and vote_count > 0 else ""),
                target_type='election',
                target_id=election_id,
                extra_metadata={
                    'candidate_count': candidate_count,
                    'vote_count': vote_count,
                    'position_count': position_count,
                    'forced': force
                }
            )
        except Exception as audit_error:
            print(f"Audit log error: {audit_error}")
        
        return jsonify({
            'success': True, 
            'message': f'Election "{election_title}" deleted successfully' + (f' along with {vote_count} votes' if force and vote_count > 0 else '')
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting election: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/votes/reset', methods=['POST'])
@super_admin_required()
def reset_all_votes():
    """Reset all votes in the system (Super Admin only)."""
    try:
        admin_id = get_jwt_identity()
        data = request.get_json()
        election_id = data.get('election_id')
        confirm = data.get('confirm', False)
        
        if not confirm:
            return jsonify({
                'success': False, 
                'message': 'Confirmation required. Set confirm=true to proceed.'
            }), 400
        
        if election_id:
            vote_count = Vote.query.filter_by(election_id=election_id).count()
            Vote.query.filter_by(election_id=election_id).delete()
            db.session.execute(
                db.text("DELETE FROM vote_receipts WHERE vote_id IN (SELECT id FROM votes WHERE election_id = :eid)"),
                {'eid': election_id}
            )
        else:
            vote_count = Vote.query.count()
            Vote.query.delete()
            VoteReceipt.query.delete()
        
        db.session.commit()
        
        try:
            AuthService.create_audit_log(
                user_id=admin_id,
                action=AuditAction.VOTES_RESET,
                description=f"Reset {vote_count} votes" + (f" in election {election_id}" if election_id else " across all elections"),
                target_type='votes'
            )
        except TypeError:
            audit_log = AuditLog(
                user_id=admin_id,
                action=AuditAction.VOTES_RESET,
                action_description=f"Reset {vote_count} votes" + (f" in election {election_id}" if election_id else " across all elections"),
                target_type='votes',
                created_at=datetime.utcnow()
            )
            db.session.add(audit_log)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully reset {vote_count} votes',
            'data': {'votes_reset': vote_count}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error resetting votes: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/votes/stats', methods=['GET'])
@super_admin_required()
def get_vote_stats():
    """Get vote statistics for admin."""
    try:
        from app.models.election import Election
        
        total_votes = Vote.query.count()
        unique_voters = db.session.query(Vote.voter_id).distinct().count()
        
        election_stats = db.session.execute(
            db.text("""
                SELECT e.id, e.title, COUNT(v.id) as vote_count
                FROM elections e
                LEFT JOIN votes v ON e.id = v.election_id
                GROUP BY e.id, e.title
                ORDER BY vote_count DESC
            """)
        ).fetchall()
        
        return jsonify({
            'success': True,
            'data': {
                'total_votes': total_votes,
                'unique_voters': unique_voters,
                'elections': [{'id': e[0], 'title': e[1], 'votes': e[2]} for e in election_stats]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting vote stats: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500


@admin_bp.route('/debug/users', methods=['GET'])
@super_admin_required()
def debug_users():
    """Debug endpoint to list all users with IDs."""
    users = User.query.all()
    return jsonify({
        'success': True,
        'users': [{'id': u.id, 'email': u.email, 'name': u.full_name} for u in users]
    }), 200