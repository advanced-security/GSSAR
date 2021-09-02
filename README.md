# GitHub Secret Scanner Auto Remediator (GSSAR)

Welcome to the GSSR Product! :wave:

## Overview 

GSSR is an open-source initiative helping teams automatically revoke secrets discovered by [GitHub's Secret Scanning tool](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning).

Right now, whenever a new secret is discovered, you are notified straight away within the Secret Scanning tab. You can then make a conscious decision over whether to revoke the secret or mark it as a false positive, etc.

With some secrets, it's okay not to take immediate action and only revoke after the right people have reviewed. However, for some other types of secrets (such as AWS Access Keys), more of an immediate (and automated) approach may be required in revoking these secrets. GSSR is an initiative to solve that use case. :rotating_light:

GitHub Secret Scanner Auto Remediator (GSSAR) is an initiative that revokes certain secret types automatically. GSSAR takes an agnostic approach to the kinds of secrets and leaves it up to each GitHub organization to decide what secret types should and should not be automatically revoked. 

## How this works

### Non-Technical

Whenever a secret is discovered within a repository, a webhook is triggered, and a process kicks off. That process starts by collecting information about that secret. It then looks within the webhook to see what type of secret it has found (e.g. AWS, Azure, GCP, Dropbox, etc.). Then, if the secret type is one you have a remediator for, the secret will automatically be revoked. You will then be notified via a GitHub Issue on the repository where the secret has been found. If the secret type is one you do not have a remediator for, the process will finish. 

### Technical

Whenever a new secret alert is `opened`, `resolved` or `reopened`, a webhook will fire from a GitHub App and be sent to an API Gateway within AWS. The API's first step is passing the context of the payload to a Lambda Authorizer, ensuring the Webhook has come from GitHub. If valid, the API will pass the event payload (from the webhook) to a Lambda to confirm the secret within the webhook is valid and expected. After both authentication methods pass, an AWS State Machine is kicked off to revoke the secret defined within the alert. 

The state machine firstly goes and filters out the `resolved` and `reopened` events. The state machine will automatically finish for any secret alert action that != `created`. If the action type does === `created`, it kicks off the first lambda, which fetches the value of the secret found. The secret itself doesn't come as part of the [webhook payload](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#secret_scanning_alert), so we have to make an [API call](https://docs.github.com/en/rest/reference/secret-scanning#get-a-secret-scanning-alert) to get the value. 

Once the value has been collected, we then kick off a [Choice](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-choice-state.html). This choice will look at the `alert.secret_type` and, based on the value, will decide to pass it onto a remediator or exit the state machine if the secret type isn't defined within the state machine. 

If the secret within the `alert.secret_type` matches a secret type within the state machine, it will send the payload to a remediator. A remediator is a function that revokes a secret, custom to a type of secret. Once revoked, it will send the result back to the state machine, then mark that secret as closed within GitHub. Finally, once all steps are complete, it will run a [parallel](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-parallel-state.html) step which notifies people the secret has been remediated. It informs by opening an issue on the repository where the secret was leaked. 

## Technical Design

### Overview

The design has been implemented in a way to be very plug and play. Where you, as an organization, only have to focus on building remediators. The architecture can be found below:

![GSSAR Architecture](https://lucid.app/publicSegments/view/8d88b9e4-3a03-4ba2-b2af-7c3abb54f45f/image.png)

This solution is designed in a way where the **remediators** are the only part you need to add/remove.

What are remediators? As mentioned above, remediators are functions that revoke specific secret types. There should be a 1:1 mapping between secret type and remediator. 

For example, if a company wanted to remediate the following secret types automatically:

- Dropbox Access Token
- Amazon AWS Access Key ID
- Google Cloud Private Key ID

There would need to be three remediators. One for Dropbox, one for Amazon and one for Google. 

The rest of the state machine (outside of remediators) is secret type agnostic. Meaning it will work for any current and future secret types. 

### Technoligies Used

The following technologies are used throughout this solution:

- AWS
    - [Lambda](https://aws.amazon.com/lambda/) is used for compute power.
    - [Cloud Formation](https://aws.amazon.com/cloudformation/) is used as our IaC (Infrastructure as Code).
    - [HTTP API Gateway](https://aws.amazon.com/api-gateway/) is used for ingress into AWS.
    - [Cloud Watch](https://aws.amazon.com/cloudwatch/) is used for logging and monitoring.
    - [IAM](https://aws.amazon.com/iam/) is used to connect resources and allow deployments into AWS from GitHub Actions
    - [S3](https://aws.amazon.com/s3/) is used by AWS SAM to deploy the stack, and therefore deploy it into the AWS ecosystem using Cloud Formation.
    - [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) is used to store parameters.
    - [AWS Step Functions](https://aws.amazon.com/step-functions/) is used to co-ordinate the end-to-end process
- GitHub
    - [GitHub App](https://docs.github.com/en/developers/apps/building-github-apps) is used as our egress method out of GitHub.
    - [GitHub Actions](https://docs.github.com/en/developers/apps/building-github-apps) is used to deploy the solution into AWS.

[AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) is used for the lambda &amp; HTTP API Gateway resources. 

**Note**: Even though this solution is deployed to AWS, the code can be changed to work with the likes of Azure and GCP (Azure Function, Google Functions, etc.).

## Pre-Req's

1. Access to a cloud environment (AWS would be the quickest to get started)
3. Access to a GitHub environment. 
4. A repository where the code for this solution is going to live.

## Initial Installation

The below steps show the *path of least resistance* way of deploying this solution into AWS. There are **many** different ways to deploy this. Every organization likely has different processes (especially with deploying into AWS), meaning you may have to pivot during these steps to accommodate organization-specific processes. This is okay. Please treat these instructions as an example and reference; if they work end-to-end, great; if not, please adjust to your company policies (and if needed, contribute back!).

If you get an error you cannot get around, please log an issue on this repository.

### Step One: Create IAM User

Create an [IAM User](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html). The IAM User will need to have the capability to do the following:

- CRUD access over S3 Resources. 
- CRUD access over IAM Resources. 
- CRUD access over API Gateway Resources.
- CRUD acess over Lambda Resources.
- CRUD access over CloudWatch Resources.
- CRUD access over Step Functions

From that user, create an AWS Access key and secret. Once you have both, create a [GitHub Enviroment](https://docs.github.com/en/actions/reference/environments#creating-an-environment) called **main** and within that environment create two secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` with the relevant information from AWS in. Set the environment to only deploy from the `main` branch. (This can be changed later at any time).

**NOTE**: If your organization doesn't allow the use of IAM Users, this isn't a problem. We use the official [configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) GitHub action. Meaning you can head to the `.github/workflows/deploy.yaml` file and swap out the AWS User method to assuming an AWS Role. Or, if you have a custom GitHub Action which authenticates into AWS, remove the `configure-AWS-credentials` action and swap it out for your custom one. 

### Step Two: Create and Configure GitHub App

Create a [GitHub Application](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app). You will need to be an administrator of your GitHub organization to do this. During the creation of the application, you only need to enter:

1. GitHub App Name: GSSAR
2. Homepage URL: https://donotknowthisurlyet.com
3. Webhook URL: https://donotknowthisurlyet.com
4. Webhook Secret: *enter secret of your choice - keep this value secret but note it down for later*
5. Permissions: 
    - Secret scanning alerts
    - Issues
6. Subscribe to events:
    - Secret scanning alert
7. Where can this integration be installed: Only on this account

The rest of the fields you do not need to enter. Right now, you don't know what the URL's are going to be, so put any value in there. 

Once the application is created, you need to install the GitHub App on your organization and then add the repositories you would like secrets to be auto-remediated. Follow the instructions here: [Installing your private GitHub App on your repository](https://docs.github.com/en/developers/apps/managing-github-apps/installing-github-apps#installing-your-private-github-app-on-your-repository). 

**NOTE**: When you install the GitHub App on your GitHub Organisation, I would advise you do not have it connected to **every** repository to start with. To get familiar with the process, only install on a few repositories and once comfortable, you can install across the organization if you like. 

Once it's installed, we need to collect some information:

1. GitHub App Private Key. Follow the instructions here: [Generating a private key](https://docs.github.com/en/developers/apps/building-github-apps/authenticating-with-github-apps#generating-a-private-key) to do that. 
2. Client Secret: Just above where you generated the private key, there will be an option for you to generate a client secret. Click the *Generate a new Client Secret* button and note down the secret. 
3. Client ID: Just above where you generated the client secret, you will see the Client ID; take a note of the id. 
4. App ID: Just above where you generated the client secret, you will see the App ID; take a note of the id. 
5. Installation ID: The Installation ID is in a different location; head to your Organizations GitHub App's page (https://github.com/organizations/${orgName}/settings/installations). Click *Configure* next to the GitHub App you created. If you look at the URL, at the end of the URL, you will see a number. It should be after the `installations/` part of the URL. Copy down that number.

### Step Four: Create Parameters within AWS Systems Manager (Parameter Store)

Log into AWS, head to AWS Systems Manager, then AWS Parameter Store. In total, you will need to create seven parameters. 

1. `/GSSAR/APP_CLIENT_ID`: The GitHub App Client ID you got from Step Three.
2. `/GSSAR/APP_CLIENT_SECRET`: The GitHub App Client Secret you got from Step Three.
3. `/GSSAR/APP_ID`: The GitHub App ID you got from Step Three.
4. `/GSSAR/APP_INSTALLATION_ID`: The GitHub App Installation ID you got from Step Three.
5. `/GSSAR/APP_PRIVATE_KEY`: The GitHub App Private Key you got from Step Three. (The first part when you created the GitHub App)
6. `/GSSAR/GITHUB_WEBHOOKS_SECRET`: The secret you assigned to the webhook. 

**NOTE**: It is recommended you make the: `/GSSAR/APP_CLIENT_SECRET`, `/GSSAR/APP_PRIVATE_KEY`, `/GSSAR/GITHUB_WEBHOOKS_SECRET` values `SecureString` within Parameter Store. The rest can be `String` types. 

### Step five: Deployment into AWS

Second to last step! Before we do this, let's check a few things:

- An environment is created with two GitHub Secrets in which can deploy the solution to AWS.
- A GitHub app is created, connected to the repositories where you would like to auto remediate secrets of a certain type
- AWS Parameters have been created. 

If the above is complete, pull the contents of this codebase and push it into the repository where you configured the GitHub Environment and Secrets. Make sure you push to the main branch (or the branch you configured in the environment to deploy from). 

GitHub Actions should now trigger! You can watch the workflow within the Actions tab of your repository, but what it is doing is:

- Linting
- Building (Typescript -> Javascript)
- Building (SAM)
- Deploying (SAM)

The first time you deploy, it should take about 5-6 minutes. As long as the role you created in Step One has the correct permissions mentioned above, your deployment should succeed. Log into AWS, head to Cloud Formation, look for the `GSSR` stack, head to outputs, and you should see an output called: `HttpApiUrl`. Note down this URL. 

### Step Six: Update GitHub App to send webhooks to the URL output from Step Five

Head back to the GitHub App you created in Step Four. Head down to the Webhook URL, enter the URL from Step Five and add `/gssr` onto the end of the URI. The URL you got from the output is the domain, but not the full URI where webhooks should be sent. So make sure to put the `/gssr` endpoint onto that URL. 

Click *Save* 

Done! From now on, whenever a Secret Scanning Alert gets: `created`, `fixed` and `closed_by_user`, an event will be fired to be processed. 