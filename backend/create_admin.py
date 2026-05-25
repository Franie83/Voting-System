from app import create_app, db 
from app.models.user import User, UserRole, UserStatus, District 
import uuid 
 
app = create_app() 
ctx = app.app_context() 
ctx.push() 
 
admin = User( 
    id=str(uuid.uuid4()), 
    membership_number='SUPERADMIN001', 
    full_name='System Administrator', 
    email='admin@ican.gov.ng', 
    phone='+2348000000000', 
    district=District.ABUJA, 
    status=UserStatus.ACTIVE, 
    role=UserRole.SUPER_ADMIN, 
    email_verified=True, 
    phone_verified=True 
) 
 
admin.set_password('Admin123!') 
db.session.add(admin) 
db.session.commit() 
ctx.pop() 
print('? Super Admin created: admin@ican.gov.ng / Admin123!') 
