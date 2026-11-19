"""Session authentication endpoints used by the React client."""
import json
from urllib.parse import quote
from .models import CarMake, CarModel
from .populate import initiate
from .restapis import get_request, post_review, analyze_review_sentiments, BackendError
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

def _payload(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        raise ValueError("Enter a valid JSON object.")
    if not isinstance(data, dict):
        raise ValueError("Enter a valid JSON object.")
    return data

@ensure_csrf_cookie
@require_GET
def session_status(request):
    return JsonResponse({"userName": request.user.username if request.user.is_authenticated else "", "authenticated": request.user.is_authenticated})

@require_POST
def login_user(request):
    try:
        data = _payload(request)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    username, password = data.get("userName"), data.get("password")
    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        return JsonResponse({"error": "Username and password are required."}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid username or password.", "status": "Not Authenticated"}, status=401)
    login(request, user)
    return JsonResponse({"userName": user.username, "status": "Authenticated"})

@require_http_methods(["GET", "POST"])
def logout_request(request):
    logout(request)
    return JsonResponse({"userName": ""})

@require_POST
def registration(request):
    try:
        data = _payload(request)
        required = ("userName", "password", "firstName", "lastName", "email")
        if any(not isinstance(data.get(field), str) or not data[field].strip() for field in required):
            return JsonResponse({"error": "All fields are required.", "status": False}, status=400)
        username = data["userName"].strip()
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Already Registered", "status": False}, status=409)
        candidate = User(username=username, email=data["email"].strip(), first_name=data["firstName"].strip(), last_name=data["lastName"].strip())
        candidate.full_clean(exclude=["password"])
        validate_email(candidate.email)
        validate_password(data["password"], candidate)
        with transaction.atomic():
            user = User.objects.create_user(username=candidate.username, password=data["password"], email=candidate.email, first_name=candidate.first_name, last_name=candidate.last_name)
    except (ValueError, ValidationError) as exc:
        message = " ".join(exc.messages) if isinstance(exc, ValidationError) else str(exc)
        return JsonResponse({"error": message, "status": False}, status=400)
    except IntegrityError:
        return JsonResponse({"error": "Already Registered", "status": False}, status=409)
    login(request, user)
    return JsonResponse({"userName": user.username, "status": True}, status=201)


def _upstream_error():
    return JsonResponse({'status': 502, 'message': 'Backend service is unavailable.'}, status=502)


@require_GET
def get_cars(request):
    if not CarModel.objects.exists():
        initiate()
    cars = [{'CarModel': car.name, 'CarMake': car.car_make.name} for car in CarModel.objects.select_related('car_make').order_by('car_make__name', 'name')]
    return JsonResponse({'CarModels': cars})


@require_GET
def get_dealerships(request, state='All'):
    endpoint = '/fetchDealers' if state == 'All' else '/fetchDealers/' + quote(state, safe='')
    try:
        return JsonResponse({'status': 200, 'dealers': get_request(endpoint)})
    except BackendError:
        return _upstream_error()


@require_GET
def get_dealer_details(request, dealer_id):
    try:
        return JsonResponse({'status': 200, 'dealer': get_request('/fetchDealer/' + str(dealer_id))})
    except BackendError:
        return _upstream_error()


@require_GET
def get_dealer_reviews(request, dealer_id):
    try:
        reviews = get_request('/fetchReviews/dealer/' + str(dealer_id))
        for review in reviews:
            review['sentiment'] = analyze_review_sentiments(review['review'])['sentiment']
        return JsonResponse({'status': 200, 'reviews': reviews})
    except (BackendError, KeyError, TypeError):
        return _upstream_error()


@require_POST
def add_review(request):
    if not request.user.is_authenticated:
        return JsonResponse({'status': 403, 'message': 'Unauthorized'}, status=403)
    try:
        data = _payload(request)
        required = ('dealership', 'review', 'purchase', 'purchase_date', 'car_make', 'car_model', 'car_year')
        if any(key not in data for key in required):
            raise ValueError('All review fields are required.')
        # Form inputs arrive as strings in the supplied React client.
        for field in ('dealership', 'car_year'):
            if isinstance(data[field], str) and data[field].isdigit():
                data[field] = int(data[field])
        if type(data['dealership']) is not int or data['dealership'] < 1 or type(data['purchase']) is not bool:
            raise ValueError('Invalid dealership or purchase value.')
        if not isinstance(data['review'], str) or not data['review'].strip():
            raise ValueError('Review text is required.')
        if type(data['car_year']) is not int or not 2015 <= data['car_year'] <= 2023:
            raise ValueError('Car year must be between 2015 and 2023.')
        if not CarModel.objects.filter(name=data['car_model'], car_make__name=data['car_make']).exists():
            raise ValueError('Select a valid car make and model.')
        data['name'] = request.user.get_full_name() or request.user.username
        response = post_review({key: data[key] for key in (*required, 'name')})
        return JsonResponse({'status': 200, 'review': response})
    except ValueError as exc:
        return JsonResponse({'status': 400, 'message': str(exc)}, status=400)
    except BackendError:
        return _upstream_error()

