FROM python:3.11-slim-bookworm
WORKDIR /python-docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python3", "-m", "flask", "--app", "app", "run", "--host=0.0.0.0", "--port=5000"]
