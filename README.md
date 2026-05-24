# ICAN Secure Electronic Voting System

A production-ready, secure, scalable, and auditable electronic voting platform for the Institute of Chartered Accountants of Nigeria (ICAN).

## Features

- **Multi-Level Elections**: National, State, District, Chapter, and Committee elections
- **Secure Authentication**: Multi-factor authentication with OTP via Email/SMS
- **Anonymous Voting**: AES-256 encrypted votes with cryptographic hashing
- **Real-Time Monitoring**: Live dashboards for admins, observers, and auditors
- **Audit Trail**: Immutable blockchain-like audit logs with hash chain verification
- **Anti-Fraud**: Device fingerprinting, IP monitoring, geolocation anomaly detection
- **Digital Receipts**: QR-coded vote verification receipts
- **Accessibility**: Mobile-responsive, dark mode, screen reader support
- **PWA Support**: Progressive Web App for offline capability

## Technology Stack

### Backend
- Python 3.11 + Flask
- PostgreSQL 15 + SQLAlchemy ORM
- Redis (caching, sessions, rate limiting)
- JWT Authentication
- Celery (background tasks)
- Socket.IO (real-time updates)

### Frontend
- React 18 + Vite
- Tailwind CSS
- Recharts (analytics)
- Zustand (state management)
- React Query (data fetching)

### Infrastructure
- Docker + Docker Compose
- NGINX Reverse Proxy
- SSL/TLS encryption
- Prometheus monitoring

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ican-org/electronic-voting-system.git
cd electronic-voting-system
```

2. Create environment file:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

3. Start services:
```bash
docker-compose up -d
```

4. Initialize database:
```bash
docker-compose exec backend python manage.py init-db
docker-compose exec backend python manage.py create-admin
```

5. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost/api
- Admin credentials: admin@ican.org.ng / Admin@ICAN2024

### Development Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run

# Frontend
cd frontend
npm install
npm run dev
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new member
- `POST /api/auth/login` - Login (returns OTP)
- `POST /api/auth/verify-otp` - Verify OTP and get JWT
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Elections
- `GET /api/elections/` - List elections
- `POST /api/elections/` - Create election (Admin)
- `GET /api/elections/:id` - Get election details
- `PUT /api/elections/:id` - Update election (Admin)
- `POST /api/elections/:id/start` - Start election (Admin)
- `POST /api/elections/:id/close` - Close election (Admin)

### Voting
- `GET /api/voting/elections/:id/ballot` - Get ballot
- `POST /api/voting/cast` - Cast vote
- `POST /api/voting/verify-receipt` - Verify receipt

### Results
- `GET /api/results/elections/:id` - Get results
- `GET /api/results/elections/:id/export?format=csv` - Export results

### Admin
- `GET /api/admin/users` - List users
- `GET /api/admin/dashboard/stats` - Dashboard stats

### Audit
- `GET /api/audit/logs` - View audit logs
- `GET /api/audit/verify-integrity` - Verify log integrity

## Security Features

1. **Encryption**: AES-256 for vote encryption, bcrypt for passwords
2. **Authentication**: JWT with refresh tokens, OTP via Email/SMS
3. **Rate Limiting**: Configurable per-endpoint limits
4. **CSRF Protection**: Token-based CSRF protection
5. **XSS Prevention**: Content Security Policy headers
6. **SQL Injection**: Parameterized queries via SQLAlchemy
7. **Audit Trail**: Immutable hash-chained audit logs
8. **Device Fingerprinting**: Track and detect anomalous devices
9. **IP Monitoring**: Hash and monitor IP addresses
10. **Account Lockout**: Automatic lock after failed attempts

## Testing

```bash
# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment instructions.

## License

Copyright (c) 2024 Institute of Chartered Accountants of Nigeria. All rights reserved.

## Support

For technical support, contact:
- Email: elections@ican.org.ng
- Phone: +234 1 277 0000
