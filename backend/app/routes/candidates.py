"""
Candidate Routes - Nomination and Management
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models.candidate import Candidate, CandidateStatus
from app.models.election import Election, ElectionStatus
from app.models.position import Position
from app.models.user import User, UserRole
from app.models.audit_log import AuditAction
from app.services.auth_service import AuthService
from app.services.notification_service import NotificationService
from datetime import datetime
import uuid
import os

# ✅ CORRECT BLUEPRINT NAME - matches the import in __init__.py
candidates_bp = Blueprint('candidates', __name__, url_prefix='/api/candidates')


@candidates_bp.route('/', methods=['GET'])
@jwt_required()
def list_candidates():
    """List candidates with filtering."""
    election_id = request.args.get('election_id')
    position_id = request.args.get('position_id')
    status = request.args.get('status', 'approved')
    
    query = Candidate.query
    
    if election_id:
        query = query.filter_by(election_id=election_id)
    if position_id:
        query = query.filter_by(position_id=position_id)
    if status:
        try:
            query = query.filter_by(status=CandidateStatus(status))
        except ValueError:
            pass
    
    candidates = query.all()
    
    return jsonify({
        'success': True,
        'data': [c.get_full_profile() for c in candidates]
    }), 200


@candidates_bp.route('/<candidate_id>', methods=['GET'])
@jwt_required()
def get_candidate(candidate_id):
    """Get candidate profile."""
    candidate = Candidate.query.get_or_404(candidate_id)
    return jsonify({'success': True, 'data': candidate.get_full_profile()}), 200


@candidates_bp.route('/nominate', methods=['POST'])
@jwt_required()
def nominate_candidate():
    """Nominate a candidate for a position."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    required_fields = ['election_id', 'position_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'success': False, 'message': field + ' is required'}), 400
    
    # Check election exists and is in draft/scheduled status
    election = Election.query.get_or_404(data['election_id'])
    if election.status not in [ElectionStatus.DRAFT, ElectionStatus.SCHEDULED]:
        return jsonify({'success': False, 'message': 'Cannot nominate for active/closed election'}), 400
    
    # Check position exists
    position = Position.query.get_or_404(data['position_id'])
    if position.election_id != data['election_id']:
        return jsonify({'success': False, 'message': 'Position does not belong to this election'}), 400
    
    # Check if already nominated
    existing = Candidate.query.filter_by(
        user_id=user_id,
        election_id=data['election_id'],
        position_id=data['position_id']
    ).first()
    
    if existing:
        return jsonify({'success': False, 'message': 'Already nominated for this position'}), 409
    
    # Create candidate
    candidate = Candidate(
        id=str(uuid.uuid4()),
        election_id=data['election_id'],
        position_id=data['position_id'],
        user_id=user_id,
        manifesto=data.get('manifesto'),
        biography=data.get('biography'),
        contact_email=data.get('contact_email'),
        contact_phone=data.get('contact_phone'),
        status=CandidateStatus.PENDING
    )
    
    db.session.add(candidate)
    db.session.commit()
    
    AuthService.create_audit_log(
        user_id=user_id,
        action=AuditAction.CANDIDATE_NOMINATED,
        description="Self-nomination for position " + data['position_id'],
        election_id=data['election_id'],
        target_type='candidate',
        target_id=candidate.id
    )
    
    return jsonify({
        'success': True,
        'message': 'Nomination submitted successfully. Awaiting approval.',
        'data': candidate.to_dict()
    }), 201


@candidates_bp.route('/<candidate_id>/approve', methods=['POST'])
@jwt_required()
def approve_candidate(candidate_id):
    """Approve a candidate (Admin only)."""
    claims = get_jwt()
    if claims.get('role') not in ['SUPER_ADMIN', 'ELECTION_ADMIN']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    user_id = get_jwt_identity()
    candidate = Candidate.query.get_or_404(candidate_id)
    
    if candidate.status != CandidateStatus.PENDING:
        return jsonify({'success': False, 'message': 'Candidate is not in pending status'}), 400
    
    candidate.status = CandidateStatus.APPROVED
    candidate.approved_by = user_id
    candidate.approved_at = datetime.utcnow()
    db.session.commit()
    
    AuthService.create_audit_log(
        user_id=user_id,
        action=AuditAction.CANDIDATE_APPROVED,
        description="Candidate approved for position " + candidate.position_id,
        election_id=candidate.election_id,
        target_type='candidate',
        target_id=candidate.id
    )
    
    return jsonify({
        'success': True,
        'message': 'Candidate approved successfully',
        'data': candidate.to_dict()
    }), 200


@candidates_bp.route('/<candidate_id>/reject', methods=['POST'])
@jwt_required()
def reject_candidate(candidate_id):
    """Reject a candidate (Admin only)."""
    claims = get_jwt()
    if claims.get('role') not in ['SUPER_ADMIN', 'ELECTION_ADMIN']:
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    user_id = get_jwt_identity()
    data = request.get_json()
    candidate = Candidate.query.get_or_404(candidate_id)
    
    candidate.status = CandidateStatus.REJECTED
    candidate.rejection_reason = data.get('reason')
    db.session.commit()
    
    AuthService.create_audit_log(
        user_id=user_id,
        action=AuditAction.CANDIDATE_REJECTED,
        description="Candidate rejected: " + (data.get('reason') or 'No reason provided'),
        election_id=candidate.election_id,
        target_type='candidate',
        target_id=candidate.id
    )
    
    return jsonify({
        'success': True,
        'message': 'Candidate rejected',
        'data': candidate.to_dict()
    }), 200


@candidates_bp.route('/<candidate_id>/upload', methods=['POST'])
@jwt_required()
def upload_candidate_files(candidate_id):
    """Upload candidate documents (photo, certificates, video)."""
    user_id = get_jwt_identity()
    candidate = Candidate.query.get_or_404(candidate_id)
    
    # Only candidate owner or admin can upload
    claims = get_jwt()
    if candidate.user_id != user_id and claims.get('role') not in ['SUPER_ADMIN', 'ELECTION_ADMIN']:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', {'png', 'jpg', 'jpeg', 'gif', 'pdf'})
    
    uploaded_files = {}
    
    if 'photo' in request.files:
        file = request.files['photo']
        if file and '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
            filename = f'candidate_{candidate_id}_photo.{file.filename.rsplit(".", 1)[1].lower()}'
            filepath = os.path.join(upload_folder, filename)
            file.save(filepath)
            candidate.photo_url = '/uploads/' + filename
            uploaded_files['photo'] = candidate.photo_url
    
    if 'certificates' in request.files:
        files = request.files.getlist('certificates')
        cert_urls = []
        for i, file in enumerate(files):
            if file and '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                filename = f'candidate_{candidate_id}_cert_{i}.{file.filename.rsplit(".", 1)[1].lower()}'
                filepath = os.path.join(upload_folder, filename)
                file.save(filepath)
                cert_urls.append('/uploads/' + filename)
        candidate.certificates_url = cert_urls
        uploaded_files['certificates'] = cert_urls
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Files uploaded successfully',
        'data': uploaded_files
    }), 200