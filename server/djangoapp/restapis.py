"""HTTP clients for the Mongo/Express and sentiment services."""
import os
from pathlib import Path
from urllib.parse import quote
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name('.env'))
backend_url = os.getenv('backend_url', 'http://localhost:3030').rstrip('/')
sentiment_analyzer_url = os.getenv('sentiment_analyzer_url', 'http://localhost:5050').rstrip('/')


class BackendError(Exception):
    pass


def _json(response):
    try:
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        raise BackendError('Upstream service failed') from exc


def get_request(endpoint, **kwargs):
    try:
        return _json(requests.get(backend_url + '/' + endpoint.lstrip('/'), params=kwargs, timeout=10))
    except requests.RequestException as exc:
        raise BackendError('Backend is unavailable') from exc


def analyze_review_sentiments(text):
    try:
        return _json(requests.get(sentiment_analyzer_url + '/analyze/' + quote(text, safe=''), timeout=10))
    except requests.RequestException as exc:
        raise BackendError('Sentiment service is unavailable') from exc


def post_review(data_dict):
    try:
        return _json(requests.post(backend_url + '/insert_review', json=data_dict, timeout=10))
    except requests.RequestException as exc:
        raise BackendError('Backend is unavailable') from exc
