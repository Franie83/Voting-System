# ICAN Electronic Voting System - Operational Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Pre-Election Setup](#pre-election-setup)
3. [Election Day Operations](#election-day-operations)
4. [Post-Election Procedures](#post-election-procedures)
5. [User Management](#user-management)
6. [Troubleshooting](#troubleshooting)
7. [Emergency Procedures](#emergency-procedures)
8. [Daily Operations Checklist](#daily-operations-checklist)

---

## System Overview

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Voters    │────▶│   NGINX     │────▶│   React     │
│  (Members)  │     │  (Reverse   │     │  Frontend   │
└─────────────┘     │   Proxy)    │     └─────────────┘
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Flask     │
                    │   Backend   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │PostgreSQL│  │  Redis  │  │  Celery │
        │   DB    │  │  Cache  │  │ Workers │
        └─────────┘  └─────────┘  └─────────┘
```

### Access URLs
| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | https://voting.ican.org.ng | Member login |
| Admin Panel | https://voting.ican.org.ng/admin | Admin credentials |
| Observer Portal | https://voting.ican.org.ng/observer | Observer credentials |
| API Health | https://voting.ican.org.ng/health | Public |

---

## Pre-Election Setup

### 1. System Health Check (T-7 Days)

```bash
# Check all services are running
docker-compose ps

# Verify database connectivity
docker-compose exec backend python -c "from app import db; db.engine.connect()"

# Check Redis
docker-compose exec redis redis-cli ping

# Verify SSL certificate expiry
docker-compose exec nginx openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates

# Test email service
docker-compose exec backend python -c "
from app import mail
from flask_mail import Message
msg = Message('Test', recipients=['test@ican.org.ng'], body='Test')
mail.send(msg)
"
```

### 2. Member Registration & Verification

#### Bulk Import Members
```python
# scripts/bulk_import_members.py
import csv
from app import create_app, db
from app.models.user import User, UserStatus, UserRole, District

app = create_app()
with app.app_context():
    with open('members.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            user = User(
                membership_number=row['membership_number'],
                full_name=row['full_name'],
                email=row['email'],
                phone=row['phone'],
                district=District(row['district'].lower()),
                chapter=row.get('chapter'),
                status=UserStatus.ACTIVE,
                role=UserRole.MEMBER,
                email_verified=True,
                phone_verified=True
            )
            user.set_password(row['membership_number'])  # Default: membership number
            db.session.add(user)
        db.session.commit()
```

#### Verify Member Eligibility
```bash
# Check active members count
docker-compose exec backend python -c "
from app.models.user import User, UserStatus
print(f'Active members: {User.query.filter_by(status=UserStatus.ACTIVE).count()}')
"
```

### 3. Election Configuration

#### Create Election
1. Login as Election Admin
2. Navigate to Admin Dashboard
3. Click "Create Election"
4. Fill required fields:
   - Title (e.g., "ICAN National Executive Council Election 2024")
   - Election Type: national/state/district/chapter/committee
   - Start Date/Time (WAT timezone)
   - End Date/Time (WAT timezone)
   - Eligible Districts (select applicable)
   - Voting Rules: single_choice/multiple_choice/ranked/yes_no

#### Add Positions
```bash
# Example: Add positions via API
curl -X POST https://voting.ican.org.ng/api/elections/{election_id}/positions   -H "Authorization: Bearer {admin_token}"   -H "Content-Type: application/json"   -d '{
    "name": "President",
    "description": "National President of ICAN",
    "max_winners": 1,
    "sort_order": 1
  }'
```

### 4. Candidate Nomination Period

#### Open Nominations
- Set election status to "scheduled"
- Announce nomination period to members
- Members self-nominate via portal

#### Approve Candidates
1. Review pending candidates in Admin Dashboard
2. Verify candidate eligibility:
   - Active membership status
   - No disciplinary sanctions
   - Meets position requirements
3. Approve or reject with reason

```bash
# Bulk approve candidates
docker-compose exec backend python -c "
from app.models.candidate import Candidate, CandidateStatus
from app import db

candidates = Candidate.query.filter_by(status=CandidateStatus.PENDING).all()
for c in candidates:
    c.status = CandidateStatus.APPROVED
    c.approved_by = 'admin_user_id'
    c.approved_at = datetime.utcnow()
db.session.commit()
print(f'Approved {len(candidates)} candidates')
"
```

### 5. Pre-Election Notifications

```bash
# Send election announcement to all eligible voters
docker-compose exec backend python -c "
from app.services.notification_service import NotificationService
from app.models.election import Election
from app.models.user import User, UserStatus

election = Election.query.get('election_id')
eligible_users = User.query.filter_by(status=UserStatus.ACTIVE).all()

NotificationService.notify_election_announcement(election, eligible_users)
print(f'Notifications sent to {len(eligible_users)} members')
"
```

---

## Election Day Operations

### 1. Election Start Procedure

#### 15 Minutes Before Start
```bash
# Verify system status
docker-compose exec backend python -c "
from app.models.election import Election, ElectionStatus
from datetime import datetime

election = Election.query.get('election_id')
print(f'Election: {election.title}')
print(f'Status: {election.status.value}')
print(f'Starts: {election.start_date}')
print(f'Current: {datetime.utcnow()}')
print(f'Time until start: {election.start_date - datetime.utcnow()}')
"
```

#### Start Election
1. Admin navigates to election details
2. Click "Start Election" button
3. System automatically:
   - Changes status to "active"
   - Sends voting reminders to eligible members
   - Opens ballot access

```bash
# Or start via API
curl -X POST https://voting.ican.org.ng/api/elections/{election_id}/start   -H "Authorization: Bearer {admin_token}"
```

### 2. Real-Time Monitoring

#### Monitor Dashboard
Access: https://voting.ican.org.ng/observer

Key Metrics to Watch:
- **Voter Turnout**: Target >60% participation
- **Active Sessions**: Normal vs. suspicious patterns
- **Geographic Distribution**: Expected vs. actual
- **Error Rates**: Should be <0.1%

#### Monitor Commands
```bash
# Check active votes per minute
docker-compose exec backend python -c "
from app.models.vote import Vote
from datetime import datetime, timedelta
from sqlalchemy import func

now = datetime.utcnow()
last_minute = now - timedelta(minutes=1)
count = Vote.query.filter(Vote.cast_at >= last_minute).count()
print(f'Votes in last minute: {count}')
"

# Check for duplicate attempts
docker-compose exec backend python -c "
from app.models.audit_log import AuditLog, AuditAction
from datetime import datetime, timedelta

recent = AuditLog.query.filter(
    AuditLog.action == AuditAction.LOGIN_FAILED,
    AuditLog.created_at >= datetime.utcnow() - timedelta(hours=1)
).count()
print(f'Failed logins in last hour: {recent}')
"
```

### 3. Fraud Detection

#### Automated Alerts
System automatically flags:
- Multiple votes from same device fingerprint
- Unusual geographic patterns
- Rapid-fire voting (bot detection)
- Account lockout events

#### Manual Review
```bash
# View suspicious activity
docker-compose exec backend python -c "
from app.models.audit_log import AuditLog, AuditAction

suspicious = AuditLog.query.filter(
    AuditLog.action.in_([
        AuditAction.SUSPICIOUS_ACTIVITY,
        AuditAction.FRAUD_ALERT,
        AuditAction.ACCOUNT_LOCKED
    ])
).order_by(AuditLog.created_at.desc()).limit(20).all()

for log in suspicious:
    print(f'{log.created_at}: {log.action.value} - {log.action_description}')
"
```

### 4. Voter Support

#### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Forgot Password | Use "Forgot Password" link or admin reset |
| OTP Not Received | Check spam folder, verify phone/email, resend OTP |
| Account Locked | Wait 30 minutes or contact admin |
| Can't Access Ballot | Verify eligibility (district, status, chapter) |
| Vote Not Confirmed | Check voting status page, verify receipt |

#### Support Escalation
1. **Level 1**: Tech Support Officer - Basic troubleshooting
2. **Level 2**: Election Administrator - Eligibility issues
3. **Level 3**: Super Admin - System-level issues

---

## Post-Election Procedures

### 1. Close Election

#### Automatic Close
System auto-closes at end_date if `auto_close=true`

#### Manual Close
```bash
curl -X POST https://voting.ican.org.ng/api/elections/{election_id}/close   -H "Authorization: Bearer {admin_token}"
```

### 2. Result Computation

#### Automatic Counting
System automatically:
1. Tallies all encrypted votes
2. Applies tie-breaking rules
3. Generates result reports

#### Verify Results
```bash
# Get results
curl https://voting.ican.org.ng/api/results/elections/{election_id}   -H "Authorization: Bearer {admin_token}"

# Export to CSV
curl https://voting.ican.org.ng/api/results/elections/{election_id}/export?format=csv   -H "Authorization: Bearer {admin_token}"   --output results.csv
```

### 3. Result Certification

#### Steps:
1. **Auditor Review**: Verify vote counts match audit logs
2. **Observer Sign-off**: Independent observers confirm results
3. **Board Approval**: ICAN election committee approves
4. **Public Announcement**: Publish results on portal

```bash
# Publish results
curl -X POST https://voting.ican.org.ng/api/admin/elections/{election_id}/publish   -H "Authorization: Bearer {admin_token}"
```

### 4. Result Notification
```bash
# Notify all members
docker-compose exec backend python -c "
from app.services.notification_service import NotificationService
from app.models.election import Election
from app.models.user import User, UserStatus

election = Election.query.get('election_id')
users = User.query.filter_by(status=UserStatus.ACTIVE).all()
NotificationService.notify_results_published(election, users)
"
```

### 5. Audit & Archive

#### Generate Audit Report
```bash
# Export audit logs
docker-compose exec backend python -c "
from app.models.audit_log import AuditLog
import json

logs = AuditLog.query.filter_by(election_id='election_id').all()
report = [log.to_dict() for log in logs]

with open('/app/uploads/audit_report.json', 'w') as f:
    json.dump(report, f, indent=2)
print(f'Exported {len(logs)} audit records')
"
```

#### Verify Audit Integrity
```bash
curl https://voting.ican.org.ng/api/audit/verify-integrity   -H "Authorization: Bearer {auditor_token}"
```

#### Database Backup
```bash
# Create post-election backup
docker-compose exec db pg_dump -U ican_user ican_voting >   /backups/post_election_$(date +%Y%m%d_%H%M%S).sql
```

---

## User Management

### Role Definitions

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full system access, user management, system config |
| **Election Admin** | Create/manage elections, approve candidates, publish results |
| **Auditor** | View audit logs, verify integrity, compliance checks |
| **Observer** | Read-only monitoring, real-time stats, incident reporting |
| **Tech Support** | View users, basic troubleshooting, password resets |
| **Member** | Vote, view elections, view results, update profile |

### Create New Admin
```bash
docker-compose exec backend python -c "
from app import db
from app.models.user import User, UserStatus, UserRole, District

admin = User(
    membership_number='ADMIN002',
    full_name='New Administrator',
    email='newadmin@ican.org.ng',
    phone='+2340000000000',
    district=District.LAGOS,
    status=UserStatus.ACTIVE,
    role=UserRole.ELECTION_ADMIN,
    email_verified=True,
    phone_verified=True
)
admin.set_password('SecurePassword123!')
db.session.add(admin)
db.session.commit()
print('Admin created successfully')
"
```

### Suspend User
```bash
curl -X PUT https://voting.ican.org.ng/api/admin/users/{user_id}/status   -H "Authorization: Bearer {admin_token}"   -H "Content-Type: application/json"   -d '{"status": "suspended"}'
```

---

## Troubleshooting

### System Issues

#### Service Down
```bash
# Check service status
docker-compose ps

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
docker-compose restart db

# View logs
docker-compose logs -f backend
docker-compose logs -f --tail=100 backend
```

#### Database Connection Issues
```bash
# Check PostgreSQL
docker-compose exec db pg_isready -U ican_user

# Restart database
docker-compose restart db

# Check connection pool
docker-compose exec backend python -c "
from app import db
print(f'Pool size: {db.engine.pool.size()}')
print(f'Checked in: {db.engine.pool.checkedin()}')
print(f'Checked out: {db.engine.pool.checkedout()}')
"
```

#### Redis Issues
```bash
# Check Redis
docker-compose exec redis redis-cli info stats

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHDB

# Check memory usage
docker-compose exec redis redis-cli INFO memory
```

#### High Load
```bash
# Check CPU/Memory
docker stats

# Scale backend (if using Docker Swarm)
docker-compose up -d --scale backend=3

# Check slow queries
docker-compose exec db psql -U ican_user -d ican_voting -c "
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

### Application Issues

#### Vote Encryption Errors
```bash
# Verify encryption key
docker-compose exec backend python -c "
from flask import current_app
key = current_app.config.get('ENCRYPTION_KEY')
print(f'Key length: {len(key) if key else 0}')
print(f'Key configured: {bool(key)}')
"
```

#### Email Delivery Issues
```bash
# Test email
docker-compose exec backend python -c "
from app import mail
from flask_mail import Message
msg = Message('Test', recipients=['test@ican.org.ng'])
mail.send(msg)
"

# Check mail queue
docker-compose logs backend | grep -i mail
```

---

## Emergency Procedures

### Security Breach

1. **Immediate Actions**:
   ```bash
   # Put system in maintenance mode
   docker-compose exec backend python -c "
   # Set maintenance flag in Redis
   import redis
   r = redis.from_url('redis://redis:6379/0')
   r.set('maintenance_mode', 'true')
   "
   ```

2. **Preserve Evidence**:
   ```bash
   # Backup current state
   docker-compose exec db pg_dump -U ican_user ican_voting > /backups/emergency_$(date +%Y%m%d_%H%M%S).sql

   # Export audit logs
   docker-compose exec backend python -c "
   from app.models.audit_log import AuditLog
   import json
   logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(1000).all()
   with open('/app/uploads/emergency_audit.json', 'w') as f:
       json.dump([l.to_dict() for l in logs], f)
   "
   ```

3. **Notify Stakeholders**:
   - ICAN President
   - Election Committee
   - Security Team
   - Legal Counsel

### System Failure During Election

1. **Check System Status**:
   ```bash
   docker-compose ps
   docker-compose logs --tail=500 backend
   ```

2. **If Database is Down**:
   ```bash
   # Switch to read-only mode
   docker-compose exec backend python -c "
   import redis
   r = redis.from_url('redis://redis:6379/0')
   r.set('read_only_mode', 'true')
   "

   # Notify voters
   docker-compose exec backend python -c "
   from app.services.notification_service import NotificationService
   # Send maintenance notification
   "
   ```

3. **Restore from Backup**:
   ```bash
   # Stop services
   docker-compose down

   # Restore database
   docker-compose up -d db
   sleep 10
   cat /backups/latest_backup.sql | docker-compose exec -T db psql -U ican_user -d ican_voting

   # Restart services
   docker-compose up -d
   ```

### Rollback Procedures

```bash
# Rollback to previous version
git log --oneline -10  # View recent commits
git checkout <previous_commit>
docker-compose up -d --build

# Or use Docker image tags
docker-compose pull backend:previous-tag
docker-compose up -d
```

---

## Daily Operations Checklist

### Morning (Before 8:00 AM WAT)
- [ ] Check system health: `docker-compose ps`
- [ ] Verify SSL certificate validity
- [ ] Check disk space: `df -h`
- [ ] Review overnight logs for errors
- [ ] Check backup completion status
- [ ] Verify email/SMS service connectivity

### During Active Election (Every 30 minutes)
- [ ] Monitor voter turnout dashboard
- [ ] Check for suspicious activity alerts
- [ ] Verify system response time < 3 seconds
- [ ] Monitor server CPU/memory usage
- [ ] Check error rates in logs
- [ ] Verify backup is running

### Evening (After 6:00 PM WAT)
- [ ] Generate daily activity report
- [ ] Review all audit logs
- [ ] Verify database backup completed
- [ ] Check Redis memory usage
- [ ] Document any incidents
- [ ] Prepare next day operations plan

### Weekly
- [ ] Full system security scan
- [ ] Review user access logs
- [ ] Update threat intelligence
- [ ] Test disaster recovery procedure
- [ ] Review and rotate secrets
- [ ] Update documentation

---

## Contact Information

| Role | Name | Phone | Email |
|------|------|-------|-------|
| System Administrator | [Name] | +234... | admin@ican.org.ng |
| Election Committee | [Name] | +234... | elections@ican.org.ng |
| Security Team | [Name] | +234... | security@ican.org.ng |
| Technical Support | [Name] | +234... | support@ican.org.ng |
| ICAN President | [Name] | +234... | president@ican.org.ng |

---

## Appendix

### A. Useful Commands Reference

```bash
# Database
psql -h localhost -U ican_user -d ican_voting
SELECT * FROM users WHERE status='active';
SELECT COUNT(*) FROM votes WHERE election_id='...';

# Redis
redis-cli -h localhost
KEYS otp:*
DEL otp:user_id

# Logs
docker-compose logs -f backend | grep ERROR
docker-compose logs -f backend | grep "vote_cast"

# Performance
 docker-compose exec backend python -c "
from app.models.vote import Vote
from datetime import datetime
print(f'Total votes: {Vote.query.count()}')
"
```

### B. Backup Schedule

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Database Full | Every 6 hours | 30 days | /backups/db/ |
| Database Incremental | Every hour | 7 days | /backups/db/incr/ |
| Audit Logs | Daily | 7 years | /backups/audit/ |
| System Config | Weekly | 1 year | /backups/config/ |

### C. Maintenance Windows

| Activity | Schedule | Duration | Impact |
|----------|----------|----------|--------|
| Security Patches | Sunday 2:00-4:00 AM | 2 hours | Read-only |
| Database Optimization | Sunday 4:00-6:00 AM | 2 hours | Degraded |
| Full Backup | Daily 1:00 AM | 30 min | None |
| Log Rotation | Daily midnight | 5 min | None |

---

**Document Version**: 1.0
**Last Updated**: 2024
**Next Review**: Before each election cycle
