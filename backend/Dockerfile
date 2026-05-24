FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y     gcc     libpq-dev     libmagic1     && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create upload directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Run with gunicorn
CMD ["gunicorn", "-w", "4", "-k", "gevent", "-b", "0.0.0.0:5000", "wsgi:app"]
