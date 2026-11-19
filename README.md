# fullstack_developer_capstone

Best Cars dealership — Django static pages for the Full Stack Application Development Capstone.

## Static pages

- `/`: starter homepage
- `/about/`: company introduction and illustrative team profiles
- `/contact/`: contact details and opening hours

The team profiles, portraits, addresses and contact details are demonstration content for this course project.

## Run

From `server/`, create a virtual environment, activate it, then run:

```sh
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py runserver 0.0.0.0:8000
```

For another preview host, set `DJANGO_ALLOWED_HOSTS` to its hostname and `DJANGO_CSRF_TRUSTED_ORIGINS` to its HTTPS origin before starting Django. Multiple values may be comma-separated.

Based on the IBM `xrwvm-fullstack_developer_capstone` starter. See LICENSE.

