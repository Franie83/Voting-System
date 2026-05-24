"""
Management Script
"""
from flask.cli import FlaskGroup
from app import create_app, db
from app.models import *

cli = FlaskGroup(create_app=create_app)

@cli.command('init-db')
def init_db():
    """Initialize the database."""
    db.create_all()
    print('Database initialized.')

@cli.command('create-admin')
def create_admin():
    """Create default admin user."""
    admin = User.query.filter_by(role=UserRole.SUPER_ADMIN).first()
    if admin:
        print('Admin user already exists.')
        return
    
    admin = User(
        membership_number='ADMIN001',
        full_name='System Administrator',
        email='admin@ican.org.ng',
        phone='+2340000000000',
        district=District.LAGOS,
        status=UserStatus.ACTIVE,
        role=UserRole.SUPER_ADMIN,
        email_verified=True,
        phone_verified=True
    )
    admin.set_password('Admin@ICAN2024')
    db.session.add(admin)
    db.session.commit()
    print('Admin user created: admin@ican.org.ng / Admin@ICAN2024')

if __name__ == '__main__':
    cli()
