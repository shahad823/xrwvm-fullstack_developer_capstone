"""Session authentication endpoints used by the React client."""
import json
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

