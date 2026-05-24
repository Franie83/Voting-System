"""
ICAN Electronic Voting System - Configuration
"""
import os
from datetime import timedelta


class Config:
    """Base configuration."""
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'ican-dev-secret-key'

    # Database - Use SQLite for development
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///ican_voting.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'max_overflow': 20,
        'pool_timeout': 30,
        'pool_recycle': 1800,
    }

    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'ican-jwt-secret'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_ERROR_MESSAGE_KEY = 'message'

    # Redis - Disabled for development (use memory)
    REDIS_URL = os.environ.get('REDIS_URL') or 'memory://'
    USE_REDIS = os.environ.get('USE_REDIS', 'False').lower() == 'true'

    # Celery - Disabled for development
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL') or 'memory://'
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND') or 'memory://'

    # Mail
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'elections@ican.org.ng'

    # Twilio
    TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

    # Encryption
    ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')

    # File Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf', 'mp4'}

    # Rate Limiting - Disabled for development
    RATELIMIT_ENABLED = False
    RATELIMIT_STORAGE_URI = os.environ.get('RATELIMIT_STORAGE_URI') or 'memory://'
    RATELIMIT_STRATEGY = 'fixed-window'
    RATELIMIT_DEFAULT = "200 per hour"

    # ICAN Specific
    ICAN_ORG_NAME = "Institute of Chartered Accountants of Nigeria"
    ELECTION_TIMEZONE = "Africa/Lagos"

    # Security - Relaxed for development
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=2)

    # Pagination
    ITEMS_PER_PAGE = 20


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    RATELIMIT_ENABLED = False
    USE_REDIS = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///ican_voting_test.db'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    WTF_CSRF_ENABLED = False
    SESSION_COOKIE_SECURE = False
    RATELIMIT_ENABLED = False
    USE_REDIS = False


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'

    # Stricter rate limits in production
    RATELIMIT_ENABLED = True
    RATELIMIT_DEFAULT = "100 per hour"
    USE_REDIS = True

    # Production database pool settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 50,
        'max_overflow': 100,
        'pool_timeout': 30,
        'pool_recycle': 1800,
    }


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}