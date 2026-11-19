import json
from django.contrib.auth.models import User
from django.test import Client, TestCase

class UserManagementTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.details = {"userName": "sample_driver", "password": "CarJourney!4082", "firstName": "Sample", "lastName": "Driver", "email": "driver@example.com"}

    def post(self, path, body):
        self.client.get("/djangoapp/session")
        token = self.client.cookies["csrftoken"].value
        return self.client.post(path, json.dumps(body), content_type="application/json", HTTP_X_CSRFTOKEN=token)

    def test_registration_hashes_password_and_authenticates(self):
        response = self.post("/djangoapp/register", self.details)
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username=self.details["userName"])
        self.assertNotEqual(user.password, self.details["password"])
        self.assertTrue(user.check_password(self.details["password"]))
        self.assertEqual(self.client.get("/djangoapp/session").json()["userName"], user.username)

    def test_duplicate_does_not_create_a_second_user(self):
        self.post("/djangoapp/register", self.details)
        response = self.post("/djangoapp/register", self.details)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(User.objects.count(), 1)

    def test_logout_and_login_restore_session(self):
        self.post("/djangoapp/register", self.details)
        self.assertEqual(self.client.get("/djangoapp/logout").json(), {"userName": ""})
        self.assertFalse(self.client.get("/djangoapp/session").json()["authenticated"])
        self.assertEqual(self.post("/djangoapp/login", {"userName": "sample_driver", "password": "wrong"}).status_code, 401)
        self.assertEqual(self.post("/djangoapp/login", self.details).json()["status"], "Authenticated")

    def test_bad_registration_and_csrf_are_rejected(self):
        self.assertEqual(self.client.post("/djangoapp/register", "{}", content_type="application/json").status_code, 403)
        self.assertEqual(self.post("/djangoapp/register", {"userName": "incomplete"}).status_code, 400)
        self.assertEqual(self.post("/djangoapp/register", {**self.details, "password": "123"}).status_code, 400)
        self.assertEqual(self.post("/djangoapp/login", []).status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_static_and_react_routes(self):
        for path in ["/", "/about/", "/contact/", "/login/", "/register/"]:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

