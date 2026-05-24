import pytest
from app import create_app, db
from app.models.user import User, UserStatus, UserRole, District

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def runner(app):
    return app.test_cli_runner()

@pytest.fixture
def admin_user(app):
    with app.app_context():
        user = User(
            membership_number='ADMIN001',
            full_name='Test Admin',
            email='admin@test.com',
            phone='+2340000000000',
            district=District.LAGOS,
            status=UserStatus.ACTIVE,
            role=UserRole.SUPER_ADMIN,
            email_verified=True,
            phone_verified=True
        )
        user.set_password('AdminPass123!')
        db.session.add(user)
        db.session.commit()
        return user

@pytest.fixture
def member_user(app):
    with app.app_context():
        user = User(
            membership_number='MEM001',
            full_name='Test Member',
            email='member@test.com',
            phone='+2340000000001',
            district=District.ABUJA,
            status=UserStatus.ACTIVE,
            role=UserRole.MEMBER,
            email_verified=True,
            phone_verified=True
        )
        user.set_password('MemberPass123!')
        db.session.add(user)
        db.session.commit()
        return user
