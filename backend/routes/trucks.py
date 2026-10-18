from backend.models import Container, Truck
from backend.routes.generic import build_crud_router

trucks_router = build_crud_router(Truck, "trucks")
containers_router = build_crud_router(Container, "containers")
