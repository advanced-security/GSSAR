# Function that remediates Google API Keys

### Purpose

The purpose of this Lambda is to rotate the Google API Key found by GitHub Secret Scanning

This is a Lambda authorizer.

### Prerequisites

1. Enable the [Api Key API](https://console.developers.google.com/apis/api/apikeys.googleapis.com)
2. Create a [Service Account](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#creating). The service account file contents must be stored as the GOOGLE_APPLICATION_CREDENTIALS environment variable. The service account's role needs to have the same permissions as "API Keys Admin" role.
   Example service account file contents:

```
     {
      "type": "...",
      "project_id": "...",
      "private_key_id": "...",
      "private_key": "...",
      "client_email": "...",
      "client_id": "...",
      "auth_uri": "...",
      "token_uri": "...",
      "auth_provider_x509_cert_url": "...",
      "client_x509_cert_url": "..."
    }
```
