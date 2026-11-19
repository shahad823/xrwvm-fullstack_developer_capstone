# fullstack_developer_capstone

Best Cars dealership — Django static pages for the Full Stack Application Development Capstone.

## Static pages

- `/`: starter homepage
- `/about/`: company introduction and illustrative team profiles
- `/contact/`: contact details and opening hours

The team profiles, portraits, addresses and contact details are demonstration content for this course project.

## Run

First build the React authentication pages from `server/frontend/`:

```sh
npm install
npm run build
```

From `server/`, create a virtual environment, activate it, then run:

```sh
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py runserver 0.0.0.0:8000
```

For another preview host, set `DJANGO_ALLOWED_HOSTS` to its hostname and `DJANGO_CSRF_TRUSTED_ORIGINS` to its HTTPS origin before starting Django. Multiple values may be comma-separated.

Based on the IBM `xrwvm-fullstack_developer_capstone` starter. See LICENSE.


## User management

React pages at `/login/` and `/register/` connect to Django session authentication. Successful registration signs the user in automatically. Navigation shows the authenticated username and Logout, or Login and Register for anonymous visitors.

Create a local Django administrator with `python manage.py createsuperuser`. Test the full flow with `python manage.py test djangoapp --verbosity 2` from `server/` after building React. These tests cover registration, duplicate usernames, password hashing, invalid credentials, CSRF protection, logout, session restoration and page rendering.

API endpoints: `GET /djangoapp/session`, `POST /djangoapp/login`, `POST /djangoapp/register`, and `GET` or `POST /djangoapp/logout`. POST requests use the CSRF cookie returned by the session endpoint.

