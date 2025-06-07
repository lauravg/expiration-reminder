# Pantry Guardian - BACKEND

The projects consists of two part: The Python/Flask based backend, and the react-native/expo
based frontend. Both need to be configured and executed separately.

## Set up
After checking out the code for the first time, run `setup.sh`. This will create a virtual
environemtn and install all the necessary dependencies. Afterwards, run `. venv/bin/activate`.

### Ensure you have the required API/Account keys:
- Put the OpenAI key into `./secrets/OPENAI_API_KEY`
- Put the Firebase JSON into `./secrets/FIREBASE_SERVICE_ACCOUNT_JSON`
- Put the Firebase Web API key into `./secrets/FIREBASE_WEB_API_KEY`

## Run without Docker locally
`flask run --debug`

## Running using Docker
This is usually not required but helps debugging issues with the Docker container that is
ultimately build and used in Google Cloud. The following allows you to build the container
and run it locally. You need to have Docker (Desktop) installed locally.

First, build the image:
```docker image build -t expiration-reminder .```

Then, start the app through docker compose:
```docker compose up```
