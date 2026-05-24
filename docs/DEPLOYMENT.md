# ICAN Electronic Voting System - Deployment Guide

## Production Deployment

### Server Requirements
- Ubuntu 22.04 LTS
- 4 CPU cores
- 8GB RAM minimum (16GB recommended)
- 100GB SSD storage
- SSL certificate (Let's Encrypt or commercial)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install nginx
sudo apt install -y nginx

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 2: SSL Certificate

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d voting.ican.org.ng
```

### Step 3: Application Deployment

```bash
# Clone repository
git clone https://github.com/ican-org/electronic-voting-system.git
cd electronic-voting-system

# Create production environment
cp backend/.env.example backend/.env
# Edit with production values

# Build and start
docker-compose -f docker-compose.yml up -d --build

# Run migrations
docker-compose exec backend flask db upgrade

# Create admin user
docker-compose exec backend python manage.py create-admin
```

### Step 4: Monitoring

```bash
# Install Prometheus and Grafana for monitoring
# Configure log rotation
sudo logrotate -f /etc/logrotate.conf
```

### Step 5: Backup Strategy

```bash
# Automated database backup script
#!/bin/bash
BACKUP_DIR="/backups/ican-voting"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U ican_user ican_voting > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql
# Keep last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

Add to crontab:
```
0 */6 * * * /path/to/backup.sh
```

## Scaling

### Horizontal Scaling
- Use Docker Swarm or Kubernetes for multiple backend instances
- Configure Redis Cluster for session storage
- Use PostgreSQL read replicas for analytics queries

### Load Balancing
```nginx
upstream backend {
    least_conn;
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}
```

## Security Hardening

1. Disable root login
2. Use SSH keys only
3. Enable fail2ban
4. Regular security updates
5. Monitor logs with ELK stack
6. Regular penetration testing

## Disaster Recovery

### RPO: 1 hour (hourly backups)
### RTO: 30 minutes

1. Restore from latest backup
2. Verify database integrity
3. Restart services
4. Verify application health
5. Notify stakeholders
