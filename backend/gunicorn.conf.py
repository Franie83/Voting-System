# Gunicorn configuration file for ICAN Voting System

import multiprocessing
import os

# Server socket
bind = os.environ.get('GUNICORN_BIND', '0.0.0.0:5000')
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'eventlet'  # For SocketIO support
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = 'logs/gunicorn_access.log'
errorlog = 'logs/gunicorn_error.log'
loglevel = os.environ.get('GUNICORN_LOG_LEVEL', 'info')

# Process naming
proc_name = 'ican_voting'

# Server mechanics
daemon = False
pidfile = 'logs/gunicorn.pid'
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if using HTTPS)
# keyfile = '/path/to/keyfile'
# certfile = '/path/to/certfile'

# Environment variables
raw_env = [
    f'FLASK_ENV={os.environ.get("FLASK_ENV", "production")}',
    f'SECRET_KEY={os.environ.get("SECRET_KEY", "")}',
]

# For development
reload = False
reload_extra_files = []

# Maximum requests before worker restart
max_requests = 1000
max_requests_jitter = 100

# Preload app for better performance
preload_app = True

def on_starting(server):
    """Called before the master process is initialized."""
    print("🚀 Starting ICAN Voting System Gunicorn server...")

def on_reload(server):
    """Called before code is reloaded."""
    print("🔄 Reloading ICAN Voting System...")

def when_ready(server):
    """Called just after the server is started."""
    print("✅ ICAN Voting System is ready to accept requests!")

def worker_int(worker):
    """Called just after a worker exited on SIGINT."""
    print(f"⚠️ Worker {worker.pid} received SIGINT")

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    print(f"❌ Worker {worker.pid} aborted")