from django.db import transaction
from .models import CarMake, CarModel


@transaction.atomic
def initiate():
    """Idempotently seed the lab's five makes and fifteen models."""
    records = [
        ('NISSAN', 'Japanese', [('Pathfinder', 'SUV'), ('Qashqai', 'SUV'), ('XTRAIL', 'SUV')]),
        ('Mercedes', 'German', [('A-Class', 'SEDAN'), ('C-Class', 'SEDAN'), ('E-Class', 'SEDAN')]),
        ('Audi', 'German', [('A4', 'SEDAN'), ('A5', 'SEDAN'), ('A6', 'SEDAN')]),
        ('Kia', 'Korean', [('Sorrento', 'SUV'), ('Carnival', 'WAGON'), ('Cerato', 'SEDAN')]),
        ('Toyota', 'Japanese', [('Corolla', 'SEDAN'), ('Camry', 'SEDAN'), ('Kluger', 'SUV')]),
    ]
    for name, origin, cars in records:
        make, _ = CarMake.objects.get_or_create(name=name, defaults={'description': f'Great cars. {origin} technology'})
        for model, kind in cars:
            CarModel.objects.get_or_create(car_make=make, name=model, year=2023, dealer_id=1, defaults={'type': kind})
