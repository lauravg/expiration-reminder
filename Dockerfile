# To build the image:  docker image build -t expiration-reminder .
# To launch an instance: docker run -d -p 4242:4242 --name=expiration-reminder expiration-reminder:latest

FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt

# Replace /app/instance with storage
# This ensure we use our presisted database
RUN rm -fr /app/instance
RUN ln -s /storage /app/instance

# Ensure the database has the most recent schema.
# Will also create a DB if none exists yet.
CMD gunicorn -w 4 -b127.0.0.1:5000 app:app