from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.core.security import require_permission
from app.models.models import Product, User, ActivityLog
from app.schemas.schemas import ProductOut, ProductCreate

router = APIRouter(prefix="/products", tags=["products"])

@router.get("", response_model=List[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.view"))
):
    return db.query(Product).order_by(Product.name).all()

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.create"))
):
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="create_product",
        entity_type="product",
        entity_id=product.id,
        details=f"Product created: {product.name}"
    )
    db.add(log)
    db.commit()
    return product

@router.put("/{id}", response_model=ProductOut)
def update_product(
    id: int,
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.edit"))
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    update_data = payload.model_dump()
    for field, value in update_data.items():
        setattr(product, field, value)
        
    log = ActivityLog(
        user_id=current_user.id,
        action="update_product",
        entity_type="product",
        entity_id=product.id,
        details=f"Product updated: {product.name}"
    )
    db.add(log)
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products.delete"))
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db.delete(product)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="delete_product",
        entity_type="product",
        entity_id=id,
        details=f"Product deleted: {product.name}"
    )
    db.add(log)
    db.commit()
