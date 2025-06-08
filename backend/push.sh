#!/bin/bash

# This script is used to manually deploy the backend to Google Cloud Run.
# Note: You need to have the service account credentials and that account activated.

PROJECT_ID="pantryguardian-f8381"
SERVICE_ACCOUNT="pg-service-account@pantryguardian-f8381.iam.gserviceaccount.com"

if ! command -v gcloud &> /dev/null
then
    echo -e "\033[1;31mError:\033[0m \033[1;33mThe 'gcloud' CLI is not installed.\033[0m"
    echo -e "Please install it by following the instructions at: \033[1;34mhttps://cloud.google.com/sdk/docs/install\033[0m"
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
    echo -e "\033[1;33mSwitching gcloud project to '$PROJECT_ID'...\033[0m"
    gcloud config set project $PROJECT_ID
fi

# Double check the project switch
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
    echo -e "\033[1;31mError:\033[0m \033[1;33mFailed to set gcloud project to '$PROJECT_ID'.\033[0m"
    exit 1
else
    echo -e "\033[1;32mGcloud project is set to '$PROJECT_ID'.\033[0m"
fi

# Check if the active account is the desired service account
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null)

if [[ "$CURRENT_ACCOUNT" != "$SERVICE_ACCOUNT" ]]; then
    echo -e "\033[1;33mSwitching gcloud account to '$SERVICE_ACCOUNT'...\033[0m"
    gcloud config set account $SERVICE_ACCOUNT
fi

# Double check the account switch
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [[ "$CURRENT_ACCOUNT" != "$SERVICE_ACCOUNT" ]]; then
    echo -e "\033[1;31mError:\033[0m \033[1;33mFailed to set gcloud account to '$SERVICE_ACCOUNT'.\033[0m"
    exit 1
else
    echo -e "\033[1;32mGcloud account is set to '$SERVICE_ACCOUNT'.\033[0m"
fi

echo -e "\033[1;32mProject and service account are set correctly\033[0m"
echo -e "\033[1;33mDeploying expiration-reminder...\033[0m"
gcloud run deploy expiration-reminder --source . --service-account=pg-service-account@$PROJECT_ID.iam.gserviceaccount.com --max-instances=1 --port=5000
