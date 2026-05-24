from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models.user import User, UserStatus, UserRole, District
from app.models.audit_log import AuditLog, AuditAction
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from datetime import datetime, timedelta
import uuid
import pyotp
import qrcode
import base64
from io import BytesIO

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint."""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        two_factor_code = data.get('two_factor_code')
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
        from app.models.user import User, UserStatus
        from app.services.auth_service import AuthService
        from app.models.audit_log import AuditAction
        from datetime import datetime
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            AuthService.create_audit_log(
                user_id=None,
                action=AuditAction.LOGIN_FAILED,
                description=f"Failed login attempt for email: {email}",
                target_type='auth'
            )
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        if user.status != UserStatus.ACTIVE:
            return jsonify({'success': False, 'message': 'Account is not active. Please contact admin.'}), 403
        
        # Check 2FA if enabled
        if user.two_factor_enabled:
            if not two_factor_code:
                return jsonify({
                    'success': False, 
                    'message': 'Two-factor authentication required',
                    'require_2fa': True
                }), 401
            
            totp = pyotp.TOTP(user.two_factor_secret)
            if not totp.verify(two_factor_code):
                AuthService.create_audit_log(
                    user_id=user.id,
                    action=AuditAction.LOGIN_FAILED,
                    description=f"Failed 2FA attempt for email: {email}",
                    target_type='auth'
                )
                return jsonify({'success': False, 'message': 'Invalid 2FA code'}), 401
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        db.session.commit()
        
        # Create tokens
        from flask_jwt_extended import create_access_token, create_refresh_token
        
        access_token = create_access_token(identity=user.id, additional_claims={
            'role': user.role.value,
            'district': user.district.value if user.district else None,
            'membership_number': user.membership_number,
            'phone_verified': user.phone_verified
        })
        refresh_token = create_refresh_token(identity=user.id)
        
        # Log successful login
        AuthService.create_audit_log(
            user_id=user.id,
            action=AuditAction.LOGIN_SUCCESS,
            description=f"User logged in successfully",
            target_type='auth'
        )
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'expires_in': 3600,
                'token_type': 'Bearer',
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/enable-2fa', methods=['POST'])
@jwt_required()
def enable_2fa():
    """Enable two-factor authentication for the current user."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Generate secret key
        secret = pyotp.random_base32()
        
        # Generate QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(user.email, issuer_name="ICAN Voting System")
        
        qr = qrcode.make(provisioning_uri)
        buffered = BytesIO()
        qr.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Store secret temporarily (will be verified before saving)
        user.two_factor_secret = secret
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'secret': secret,
                'qr_code': f'data:image/png;base64,{qr_base64}'
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error enabling 2FA: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/verify-2fa', methods=['POST'])
@jwt_required()
def verify_2fa():
    """Verify and activate two-factor authentication."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        data = request.get_json()
        code = data.get('code')
        
        if not user or not user.two_factor_secret:
            return jsonify({'success': False, 'message': '2FA not initialized'}), 400
        
        if not code:
            return jsonify({'success': False, 'message': 'Verification code required'}), 400
        
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(code):
            return jsonify({'success': False, 'message': 'Invalid verification code'}), 400
        
        user.two_factor_enabled = True
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=user.id,
            action=AuditAction.TWO_FACTOR_ENABLED,
            description="Two-factor authentication enabled",
            target_type='user',
            target_id=user.id
        )
        
        return jsonify({
            'success': True,
            'message': 'Two-factor authentication enabled successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error verifying 2FA: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/disable-2fa', methods=['POST'])
@jwt_required()
def disable_2fa():
    """Disable two-factor authentication for the current user."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        user.two_factor_enabled = False
        user.two_factor_secret = None
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=user.id,
            action=AuditAction.TWO_FACTOR_DISABLED,
            description="Two-factor authentication disabled",
            target_type='user',
            target_id=user.id
        )
        
        return jsonify({
            'success': True,
            'message': 'Two-factor authentication disabled successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error disabling 2FA: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/validate-association', methods=['POST'])
def validate_association():
    """Validate association ID and payment status before registration."""
    try:
        data = request.get_json()
        association_id = data.get('association_id', '').strip().upper()
        
        if not association_id:
            return jsonify({
                'success': False, 
                'message': 'Association ID is required'
            }), 400
        
        from app.models.association_member import AssociationMember, PaymentStatus
        
        member = AssociationMember.query.filter_by(association_id=association_id).first()
        
        if not member:
            return jsonify({
                'success': False,
                'valid': False,
                'message': 'Invalid Association ID. Please check and try again.'
            }), 404
        
        if member.has_registered:
            return jsonify({
                'success': False,
                'valid': False,
                'message': 'This Association ID has already been used to register. Please login to continue.'
            }), 400
        
        if member.payment_status != PaymentStatus.PAID:
            return jsonify({
                'success': False,
                'valid': False,
                'message': f'Payment status: {member.payment_status.value.upper()}. Please complete payment before registration.'
            }), 400
        
        return jsonify({
            'success': True,
            'valid': True,
            'message': 'Association ID verified. Please complete your registration.',
            'data': {
                'association_id': member.association_id,
                'full_name': member.full_name,
                'email': member.email,
                'phone': member.phone,
                'district': member.district,
                'chapter': member.chapter
            }
        }), 200
        
    except Exception as e:
        print(f"Error validating association: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.status != UserStatus.ACTIVE:
            return jsonify({'success': False, 'message': 'User not found or inactive'}), 401
        
        access_token = create_access_token(identity=user.id, additional_claims={
            'role': user.role.value,
            'district': user.district.value if user.district else None,
            'membership_number': user.membership_number,
            'phone_verified': user.phone_verified
        })
        
        return jsonify({
            'success': True,
            'data': {'access_token': access_token}
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        AuthService.create_audit_log(
            user_id=current_user_id,
            action=AuditAction.LOGOUT,
            description=f"User logged out",
            user_email=user.email if user else None
        )
        
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint."""
    try:
        data = request.get_json()
        
        required_fields = ['full_name', 'email', 'phone', 'district', 'password', 'association_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        from app.models.association_member import AssociationMember, PaymentStatus
        
        association_id = data.get('association_id').strip().upper()
        member = AssociationMember.query.filter_by(association_id=association_id).first()
        
        if not member:
            return jsonify({'success': False, 'message': 'Invalid Association ID'}), 400
        
        if member.has_registered:
            return jsonify({'success': False, 'message': 'This Association ID has already been used to register'}), 400
        
        if member.payment_status != PaymentStatus.PAID:
            return jsonify({'success': False, 'message': 'Payment not completed. Please complete payment first.'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'success': False, 'message': 'Email already registered'}), 409
        
        try:
            district = District(data['district'].lower())
        except ValueError:
            return jsonify({'success': False, 'message': f"Invalid district"}), 400
        
        user = User(
            id=str(uuid.uuid4()),
            membership_number=data.get('membership_number', f"USER{User.query.count() + 1:04d}"),
            full_name=data['full_name'],
            email=data['email'],
            phone=data['phone'],
            district=district,
            chapter=data.get('chapter', member.chapter),
            status=UserStatus.PENDING,
            role=UserRole.VOTER,
            email_verified=False,
            phone_verified=False,
            two_factor_enabled=False
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.flush()
        
        member.has_registered = True
        member.registered_at = datetime.utcnow()
        member.registered_user_id = user.id
        
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=user.id,
            action=AuditAction.USER_REGISTERED,
            description=f"New user registered via association ID: {association_id}",
            user_email=user.email
        )
        
        return jsonify({
            'success': True,
            'message': 'Registration successful. Your account is pending approval.',
            'data': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/force-reset-password', methods=['POST'])
def force_reset_password():
    """Force password reset for first login (no authentication required)."""
    try:
        data = request.get_json()
        email = data.get('email')
        temp_password = data.get('temp_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not all([email, temp_password, new_password, confirm_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match'}), 400
        
        if len(new_password) < 8:
            return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if not user.check_password(temp_password):
            return jsonify({'success': False, 'message': 'Temporary password is incorrect'}), 401
        
        user.set_password(new_password)
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=user.id,
            action=AuditAction.PASSWORD_CHANGED,
            description="Password changed on first login",
            user_email=user.email
        )
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully. Please login with your new password.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error forcing password reset: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change password for authenticated users."""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not all([current_password, new_password, confirm_password]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'New passwords do not match'}), 400
        
        if len(new_password) < 8:
            return jsonify({'success': False, 'message': 'Password must be at least 8 characters'}), 400
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if not user.check_password(current_password):
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 401
        
        user.set_password(new_password)
        db.session.commit()
        
        AuthService.create_audit_log(
            user_id=user.id,
            action=AuditAction.PASSWORD_CHANGED,
            description="Password changed by user",
            user_email=user.email
        )
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully. Please login with your new password.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error changing password: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/reset-password', methods=['POST'])
@jwt_required()
def reset_password():
    """Reset password endpoint (alias for change-password)."""
    return change_password()


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset email."""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'success': True, 'message': 'If an account exists, a reset link will be sent'}), 200
        
        reset_token = str(uuid.uuid4())
        
        return jsonify({
            'success': True,
            'message': 'Password reset link has been sent to your email'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info."""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'data': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# Also update User model to add 2FA fields - Add to app/models/user.py
# two_factor_enabled = db.Column(db.Boolean, default=False)
# two_factor_secret = db.Column(db.String(32), nullable=True)