# Step 1: Use a Python 3.12 slim base image
FROM python:3.12-slim

# Step 2: Install system dependencies and FFmpeg
RUN apt-get update && apt-get install -y \
    wget \
    build-essential \
    software-properties-common \
    ffmpeg \
    libc6 \
    && apt-get clean

# Step 3: Set the working directory inside the container
WORKDIR /app

# Step 4: Copy only necessary files into the container
COPY requirements.txt /app/requirements.txt
COPY app.py /app/app.py
COPY recall.py /app/recall.py
COPY record.py /app/record.py

COPY app /app/app

# Step 5: Install Python dependencies
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Step 6: Expose the application port
EXPOSE 8000

# Step 7: Command to run the application using Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]