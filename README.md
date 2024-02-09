# expiration-reminder

## Set up the project
`python -m venv venv`
`pip install -r requirements.txt`

### Ensure you have the required API/Account keys:
- Put the OpenAI key into `./secrets/OPENAI_API_KEY`
- Put the Firebase JSON into `./secrets/FIREBASE_SERVICE_ACCOUNT_JSON`
- Put the Firebase Web API key into `./secrets/FIREBASE_WEB_API_KEY`

## Run without Docker
`flask run --debug`

## Docker configuration
First, build the image:
```docker image build -t expiration-reminder .```

Then, start the app through docker compose:
```docker compose up```