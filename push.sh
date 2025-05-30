#!/bin/bash

gcloud run deploy expiration-reminder --source . --service-account=pg-service-account@pantryguardian-f8381.iam.gserviceaccount.com --max-instances=1 --port=5000
