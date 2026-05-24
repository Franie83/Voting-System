"""
Election Scheduler Service - Auto-update election statuses
"""
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app import db
from app.models.election import Election, ElectionStatus

scheduler = BackgroundScheduler()

def update_election_statuses():
    """Automatically update election statuses based on dates."""
    from app import create_app
    app = create_app()
    with app.app_context():
        now = datetime.now()
        
        # Update elections from SCHEDULED to ACTIVE
        scheduled_to_active = Election.query.filter(
            Election.status == ElectionStatus.SCHEDULED,
            Election.start_date <= now
        ).all()
        
        for election in scheduled_to_active:
            election.status = ElectionStatus.ACTIVE
            print(f"✅ Election '{election.title}' automatically started")
        
        # Update elections from ACTIVE to COMPLETED
        active_to_completed = Election.query.filter(
            Election.status == ElectionStatus.ACTIVE,
            Election.end_date <= now
        ).all()
        
        for election in active_to_completed:
            election.status = ElectionStatus.COMPLETED
            print(f"✅ Election '{election.title}' automatically completed")
        
        if scheduled_to_active or active_to_completed:
            db.session.commit()
            print(f"[{datetime.now()}] Election statuses updated: {len(scheduled_to_active)} started, {len(active_to_completed)} completed")

def start_election_scheduler():
    """Start the election status update scheduler."""
    # Run every 5 minutes
    scheduler.add_job(
        func=update_election_statuses,
        trigger='interval',
        minutes=5,
        id='election_status_updater',
        replace_existing=True
    )
    scheduler.start()
    print("✅ Election status scheduler started (runs every 5 minutes)")

def stop_election_scheduler():
    """Stop the election status update scheduler."""
    scheduler.shutdown()
    print("Election status scheduler stopped")