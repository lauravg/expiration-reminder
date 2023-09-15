# To build the image:  docker image build -t expiration-reminder .
# To launch an instance: docker run -d -p 4242:4242 --name=expiration-reminder expiration-reminder:latest

FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt

ENTRYPOINT [ "python" ]
CMD [ "app.py" ]