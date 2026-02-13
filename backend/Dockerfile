# Use full Python image for better SSL/TLS support with MongoDB Atlas
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8002

# Railway sets PORT; fallback to 8002 for local Docker
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8002}"]
