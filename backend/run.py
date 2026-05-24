"""
ICAN Electronic Voting System - Entry Point
"""
import os
import sys
from app import create_app, db, socketio
from app.models import *

# Add parent directory to path if needed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Create application
app = create_app(os.environ.get('FLASK_ENV', 'development'))

@app.shell_context_processor
def make_shell_context():
    return {
        'db': db,
        'User': User,
        'Election': Election,
        'Candidate': Candidate,
        'Vote': Vote,
        'AuditLog': AuditLog,
        'Notification': Notification
    }

if __name__ == '__main__':
    # Get configuration from environment variables
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    print("=" * 60)
    print("🗳️  ICAN Electronic Voting System")
    print("=" * 60)
    print(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print(f"Server: http://{host}:{port}")
    print(f"API Base URL: http://{host}:{port}/api")
    print(f"WebSocket URL: ws://{host}:{port}")
    print(f"Debug Mode: {debug}")
    print("=" * 60)
    print("\n🚀 Starting server...")
    print("Press CTRL+C to stop the server\n")
    
    try:
        socketio.run(
            app,
            host=host,
            port=port,
            debug=debug,
            allow_unsafe_werkzeug=True,  # For development
            use_reloader=debug,
            log_output=True
        )
    except KeyboardInterrupt:
        print("\n👋 Shutting down server...")
    except Exception as e:
        print(f"\n❌ Error starting server: {str(e)}")
        sys.exit(1)