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
        for path in ["/", "/about/", "/contact/", "/login/", "/register/", "/dealers", "/dealer/3", "/postreview/3"]:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)


from unittest.mock import patch, Mock
from django.core.exceptions import ValidationError
from .models import CarMake, CarModel
from .populate import initiate
from .restapis import get_request, post_review, analyze_review_sentiments, BackendError
import requests


class BackendTests(TestCase):
    def setUp(self):
        initiate()

    def test_seed_relationships_and_validation(self):
        initiate()
        self.assertEqual(CarMake.objects.count(), 5)
        self.assertEqual(CarModel.objects.count(), 15)
        car = CarModel.objects.first()
        self.assertIn(car.car_make.name, str(car))
        car.year = 2014
        with self.assertRaises(ValidationError):
            car.full_clean()
        from django.contrib import admin
        self.assertIn(CarMake, admin.site._registry)
        self.assertIn(CarModel, admin.site._registry)

    def test_car_route(self):
        self.assertEqual(len(self.client.get('/djangoapp/get_cars').json()['CarModels']), 15)

    @patch('djangoapp.views.get_request')
    def test_dealer_routes(self, get):
        get.return_value = [{'id': 3, 'state': 'Kansas'}]
        for route, endpoint, key in [
            ('get_dealers', '/fetchDealers', 'dealers'),
            ('get_dealers/Kansas', '/fetchDealers/Kansas', 'dealers'),
            ('dealer/3', '/fetchDealer/3', 'dealer'),
        ]:
            with self.subTest(route=route):
                result = self.client.get('/djangoapp/' + route)
                self.assertEqual(result.status_code, 200)
                self.assertEqual(result.json()[key][0]['id'], 3)
                get.assert_called_with(endpoint)
        get.side_effect = BackendError()
        self.assertEqual(self.client.get('/djangoapp/get_dealers').status_code, 502)

    @patch('djangoapp.views.analyze_review_sentiments')
    @patch('djangoapp.views.get_request')
    def test_reviews_include_sentiment(self, get, analyze):
        get.return_value = [{'review': 'Fantastic services'}]
        analyze.return_value = {'sentiment': 'positive'}
        result = self.client.get('/djangoapp/reviews/dealer/3')
        self.assertEqual(result.json()['reviews'][0]['sentiment'], 'positive')
        get.assert_called_once_with('/fetchReviews/dealer/3')
        analyze.assert_called_once_with('Fantastic services')

    @patch('djangoapp.views.post_review')
    def test_review_authorization_and_author(self, post):
        data = {'name': 'Spoofed', 'dealership': 3, 'review': 'Fantastic services', 'purchase': True,
                'purchase_date': '2023-10-01', 'car_make': 'Toyota', 'car_model': 'Camry', 'car_year': 2023}
        self.assertEqual(self.client.post('/djangoapp/add_review', data, content_type='application/json').status_code, 403)
        user = User.objects.create_user(username='reviewer', password='TestReview123!')
        self.client.force_login(user)
        post.return_value = {'id': 101}
        result = self.client.post('/djangoapp/add_review', data, content_type='application/json')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(post.call_args.args[0]['name'], 'reviewer')
        data['car_model'] = 'Unknown'
        self.assertEqual(self.client.post('/djangoapp/add_review', data, content_type='application/json').status_code, 400)
        self.assertEqual(self.client.get('/djangoapp/add_review').status_code, 405)

    @patch('djangoapp.restapis.requests.get')
    @patch('djangoapp.restapis.requests.post')
    def test_http_clients_and_upstream_errors(self, post, get):
        response = Mock()
        response.json.return_value = [{'id': 3}]
        get.return_value = post.return_value = response
        self.assertEqual(get_request('/fetchDealers', city='New York'), [{'id': 3}])
        self.assertEqual(get.call_args.kwargs['params'], {'city': 'New York'})
        post_review({'review': 'Great'})
        self.assertEqual(post.call_args.kwargs['json'], {'review': 'Great'})
        analyze_review_sentiments('Great / friendly?')
        self.assertIn('Great%20%2F%20friendly%3F', get.call_args.args[0])
        get.side_effect = requests.Timeout()
        with self.assertRaises(BackendError):
            get_request('/fetchDealers')
