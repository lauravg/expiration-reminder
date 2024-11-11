# To build the image:  docker image build -t expiration-reminder .
# To launch an instance: docker run -d -p 4242:4242 --name=expiration-reminder expiration-reminder:latest

FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install  --no-cache-dir -r requirements.txt

# Replace /app/instance with storage
# This ensure we use our presisted database
RUN rm -fr /app/instance
RUN ln -s /storage /app/instance

# Start production WSGI server, bind to all IPs and port 5000.
CMD gunicorn -w 1 --threads=4 -b0.0.0.0:5000 app:app