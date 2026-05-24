import pytest
from app.models.user import User, UserStatus, UserRole, District

def test_register_success(client):
    response = client.post('/api/auth/register', json={
        'membership_number': 'NEW001',
        'full_name': 'New Member',
        'email': 'new@test.com',
        'phone': '+2340000000002',
        'district': 'lagos',
        'password': 'SecurePass123!'
    })
    assert response.status_code == 201
    assert response.json['success'] == True
    assert response.json['data']['membership_number'] == 'NEW001'

def test_register_duplicate_email(client, member_user):
    response = client.post('/api/auth/register', json={
        'membership_number': 'NEW002',
        'full_name': 'Another Member',
        'email': 'member@test.com',
        'phone': '+2340000000003',
        'district': 'lagos',
        'password': 'SecurePass123!'
    })
    assert response.status_code == 409
    assert response.json['success'] == False

def test_login_success(client, member_user):
    response = client.post('/api/auth/login', json={
        'membership_number': 'MEM001',
        'password': 'MemberPass123!'
    })
    assert response.status_code == 200
    assert response.json['success'] == True
    assert 'user_id' in response.json['data']

def test_login_invalid_credentials(client):
    response = client.post('/api/auth/login', json={
        'membership_number': 'INVALID',
        'password': 'wrong'
    })
    assert response.status_code == 401
    assert response.json['success'] == False

def test_login_account_locked(client, member_user):
    # Attempt multiple failed logins
    for _ in range(5):
        client.post('/api/auth/login', json={
            'membership_number': 'MEM001',
            'password': 'wrong'
        })

    response = client.post('/api/auth/login', json={
        'membership_number': 'MEM001',
        'password': 'MemberPass123!'
    })
    assert response.status_code == 403
    assert 'locked' in response.json['message'].lower()
