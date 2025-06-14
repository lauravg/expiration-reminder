#!/bin/bash

# Exit on error
set -e

# Project ID
PROJECT_ID="pantryguardian-f8381"

# Array of secrets to fetch (format: "name:type")
# type is empty for regular secrets, "json" for JSON secrets
SECRETS=(
    "OPENAI_API_KEY:"
    "FIREBASE_WEB_API_KEY:"
    "FIREBASE_SERVICE_ACCOUNT_JSON:json"
)

# Function to fetch a secret
fetch_secret() {
    local secret_id=$1
    local version="latest"
    local name="projects/${PROJECT_ID}/secrets/${secret_id}/versions/${version}"
    
    # Fetch the secret value
    local value=$(gcloud secrets versions access "${version}" --secret="${secret_id}" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to fetch secret ${secret_id}" >&2
        exit 1
    fi
    
    echo "${value}"
}

# Create .env file
echo "# Generated .env file from Google Cloud Secret Manager" > .env
echo "# Generated on $(date)" >> .env
echo "" >> .env

# Fetch and add all secrets
for secret_info in "${SECRETS[@]}"; do
    # Split the secret info into name and type
    secret_id="${secret_info%%:*}"
    secret_type="${secret_info##*:}"

    echo "Fetching secret: ${secret_id} ..."
    
    value=$(fetch_secret "${secret_id}")
    
    # Handle JSON secrets differently
    if [ "${secret_type}" = "json" ]; then
        echo "${secret_id}='$(echo "${value}" | sed "s/'/\\'/g")'" >> .env
    else
        echo "${secret_id}=${value}" >> .env
    fi
done

echo "Successfully created .env file"
