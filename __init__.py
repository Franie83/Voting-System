# backend/app/__init__.py
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail
from flask_socketio import SocketIO
from config import config_by_name
import os
import logging

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
socketio = SocketIO(cors_allowed_origins="*", async_mode='gevent')


def create_super_admin_if_not_exists():
    """Create super admin user on first application run."""
    from app.models.user import User, UserRole, UserStatus, District
    import uuid
    import secrets
    import string
    from datetime import datetime
    
    # Check if any super admin exists
    super_admin = User.query.filter_by(role=UserRole.SUPER_ADMIN).first()
    
    if super_admin:
        print("✅ Super admin already exists")
        return super_admin
    
    # Generate secure random password
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    
    # Create super admin
    admin = User(
        id=str(uuid.uuid4()),
        membership_number="SUPERADMIN001",
        full_name="System Administrator",
        email="admin@ican.gov.ng",
        phone="+2348000000000",
        district=District.ABUJA,
        chapter="National",
        status=UserStatus.ACTIVE,
        role=UserRole.SUPER_ADMIN,
        email_verified=True,
        phone_verified=True,
        created_at=datetime.utcnow()
    )
    admin.set_password(temp_password)
    
    db.session.add(admin)
    db.session.commit()
    
    # Write password to a secure file (first run only)
    password_file = os.path.join(os.path.dirname(__file__), '../../', 'admin_credentials.txt')
    try:
        with open(password_file, 'w') as f:
            f.write(f"SUPER ADMIN CREDENTIALS - SAVE THIS IMMEDIATELY\n")
            f.write(f"="*50 + "\n")
            f.write(f"Email: admin@ican.gov.ng\n")
            f.write(f"Temporary Password: {temp_password}\n")
            f.write(f"="*50 + "\n")
            f.write(f"Please change this password after first login!\n")
            f.write(f"\nFirst login URL: https://ican-voting-frontend.onrender.com/first-login\n")
    except:
        pass
    
    print(f"\n{'='*60}")
    print("✅ SUPER ADMIN CREATED!")
    print(f"   Email: admin@ican.gov.ng")
    print(f"   Temporary Password: {temp_password}")
    print(f"{'='*60}\n")
    
    return admin


def create_app(config_name=None):
    """Application factory pattern."""
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    
    # Get Render frontend URL from environment or use default
    render_frontend_url = os.environ.get('FRONTEND_URL', 'https://ican-voting-frontend.onrender.com')
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    socketio.init_app(app)
    
    # CORS configuration - Allow both localhost and Render frontend
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        render_frontend_url,
        "https://ican-voting-frontend.onrender.com"
    ]
    
    CORS(app, 
         origins=allowed_origins,
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
         supports_credentials=True,
         max_age=86400)
    
    # Handle preflight requests manually
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = jsonify({'success': True})
            origin = request.headers.get('Origin', '')
            if origin in allowed_origins:
                response.headers.add('Access-Control-Allow-Origin', origin)
            else:
                response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 200
    
    # Rate Limiter
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        storage_uri=app.config.get('RATELIMIT_STORAGE_URI', 'memory://'),
        strategy=app.config.get('RATELIMIT_STRATEGY', 'fixed-window'),
        default_limits=[app.config.get('RATELIMIT_DEFAULT', '200 per day')]
    )
    
    # Logging configuration
    if not app.debug:
        os.makedirs('logs', exist_ok=True)
        file_handler = logging.FileHandler('logs/ican_voting.log')
        file_handler.setLevel(logging.ERROR)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        app.logger.addHandler(file_handler)
        app.logger.addHandler(console_handler)
        app.logger.setLevel(logging.INFO)
    
    # Create super admin on first run (within app context)
    with app.app_context():
        try:
            create_super_admin_if_not_exists()
        except Exception as e:
            print(f"Admin setup error: {e}")
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.elections import elections_bp
    from app.routes.candidates import candidates_bp
    from app.routes.voting import voting_bp
    from app.routes.results import results_bp
    from app.routes.admin import admin_bp
    from app.routes.audit import audit_bp
    from app.routes.analytics import analytics_bp
    from app.routes.notifications import notifications_bp
    from app.routes.observer import observer_bp
    from app.routes.dashboard import dashboard_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(elections_bp, url_prefix='/api/elections')
    app.register_blueprint(candidates_bp, url_prefix='/api/candidates')
    app.register_blueprint(voting_bp, url_prefix='/api/voting')
    app.register_blueprint(results_bp, url_prefix='/api/results')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(audit_bp)  # audit_bp already has /api/audit prefix
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(observer_bp, url_prefix='/api/observer')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    
    # Start election status scheduler
    try:
        from app.services.election_scheduler import start_election_scheduler
        start_election_scheduler()
        print("✅ Election status scheduler started")
    except Exception as e:
        print(f"⚠️ Could not start election scheduler: {e}")
    
    # Error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'success': False, 'message': 'Bad request', 'error': str(error)}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'success': False, 'message': 'Unauthorized - Please login again'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'success': False, 'message': 'Forbidden - Insufficient permissions'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'message': 'Resource not found'}), 404
    
    @app.errorhandler(429)
    def rate_limit(error):
        return jsonify({'success': False, 'message': 'Rate limit exceeded. Please try again later.'}), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        app.logger.error(f'Server Error: {str(error)}')
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
    
    # Health check
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'ICAN Electronic Voting System',
            'version': '1.0.0',
            'environment': config_name
        })
    
    # Root endpoint
    @app.route('/')
    def index():
        return jsonify({
            'message': 'Welcome to ICAN Electronic Voting System API',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'elections': '/api/elections',
                'voting': '/api/voting',
                'results': '/api/results',
                'admin': '/api/admin',
                'audit': '/api/audit',
                'dashboard': '/api/dashboard'
            }
        })
    
    # Create necessary directories
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)
    os.makedirs('logs', exist_ok=True)
    
    return app


# Import models for SQLAlchemy
from app.models import User, Election, Candidate, Vote, AuditLog, Notification, Position, SystemConfig