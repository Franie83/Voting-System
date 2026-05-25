"""
ICAN Electronic Voting System - WSGI Entry Point for Production
Production server: Gunicorn, uWSGI, Waitress, etc.
"""
import os
import sys
import logging
from datetime import datetime

# Add application directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('logs/wsgi.log'),
        logging.StreamHandler()
    ]
)

# Create necessary directories
os.makedirs('logs', exist_ok=True)
os.makedirs('uploads', exist_ok=True)
os.makedirs('static/uploads', exist_ok=True)

# Import application factory
from app import create_app, db, socketio
from flask import send_from_directory

# Determine environment
env = os.environ.get('FLASK_ENV', 'production')

# Create application for WSGI server (Gunicorn, uWSGI, etc.)
app = create_app(env)

# ==================== Static File Serving ====================

# Serve uploaded files from uploads directory
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serve uploaded files from uploads directory."""
    try:
        return send_from_directory('uploads', filename)
    except Exception as e:
        logging.error(f"Error serving file {filename}: {str(e)}")
        return {'error': 'File not found'}, 404

# Serve static uploaded files
@app.route('/static/uploads/<path:filename>')
def static_uploaded_file(filename):
    """Serve static uploaded files."""
    try:
        return send_from_directory('static/uploads', filename)
    except Exception as e:
        logging.error(f"Error serving static file {filename}: {str(e)}")
        return {'error': 'File not found'}, 404

# Serve candidate photos
@app.route('/candidate-photos/<path:filename>')
def candidate_photo(filename):
    """Serve candidate photos."""
    try:
        return send_from_directory('uploads', filename)
    except Exception as e:
        logging.error(f"Error serving candidate photo {filename}: {str(e)}")
        return {'error': 'File not found'}, 404

# ==================== Application Health Check ====================
# Note: health_check already exists in app/__init__.py, so we don't redefine it

# Application health check function (for monitoring)
def application_health():
    """Health check for load balancers"""
    return {
        'status': 'healthy',
        'environment': env,
        'service': 'ICAN Voting System'
    }

# Log startup
logging.info(f"WSGI application initialized in {env} mode")
logging.info(f"Uploads directory: {os.path.abspath('uploads')}")
logging.info(f"Static uploads directory: {os.path.abspath('static/uploads')}")

# Application variables for different WSGI servers
application = app  # For Gunicorn, uWSGI
wsgi_app = app     # Alternative name

# For SocketIO with Gunicorn (using eventlet worker)
# Use: gunicorn -k eventlet wsgi:app
socketio_app = socketio  # For SocketIO server

if __name__ == '__main__':
    # When run directly, use SocketIO server for development
    # IMPORTANT: For Render deployment, bind to 0.0.0.0 to accept external connections
    # and use the PORT environment variable provided by Render
    host = os.environ.get('FLASK_HOST', '0.0.0.0')  # Changed from 127.0.0.1 to 0.0.0.0
    port = int(os.environ.get('PORT', 8080))        # Changed from FLASK_PORT to PORT
    
    print("=" * 60)
    print("🗳️  ICAN Voting System - WSGI Server")
    print("=" * 60)
    print(f"Environment: {env}")
    print(f"Server running on http://{host}:{port}")
    print(f"Uploads directory: {os.path.abspath('uploads')}")
    print("=" * 60)
    
    socketio.run(
        app,
        host=host,
        port=port,
        debug=False,
        allow_unsafe_werkzeug=True
    )