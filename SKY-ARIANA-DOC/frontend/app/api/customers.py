from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.core.security import require_permission
from app.models.models import Customer, User, ActivityLog
from app.schemas.schemas import CustomerOut, CustomerCreate

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("", response_model=List[CustomerOut])
def list_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customers.view"))
):
    return db.query(Customer).order_by(Customer.company_name).all()

@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customers.create"))
):
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="create_customer",
        entity_type="customer",
        entity_id=customer.id,
        details=f"Customer created: {customer.company_name}"
    )
    db.add(log)
    db.commit()
    return customer

@router.get("/{id}", response_model=CustomerOut)
def get_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customers.view"))
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.put("/{id}", response_model=CustomerOut)
def update_customer(
    id: int,
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customers.edit"))
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    update_data = payload.model_dump()
    for field, value in update_data.items():
        setattr(customer, field, value)
        
    log = ActivityLog(
        user_id=current_user.id,
        action="update_customer",
        entity_type="customer",
        entity_id=customer.id,
        details=f"Customer updated: {customer.company_name}"
    )
    db.add(log)
    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("customers.delete"))
):
    customer = db.query(Customer).filter(Customer.id == id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    db.delete(customer)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="delete_customer",
        entity_type="customer",
        entity_id=id,
        details=f"Customer deleted: {customer.company_name}"
    )
    db.add(log)
    db.commit()
