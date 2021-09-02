# GitHub Secret Scanner Auto Remediator (GSSAR)

Welcome to the GSSR Product! :wave

## Overview 

This is an open source initiaitve looking to help teams auto remediate secrets discovered by [GitHub's Secret Scanning tool](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning).

Right now, whenever a new secret is discovered, you are notified straight away within the Secret Scanning tab. You are then able to make a concious decision over wether to revoke the secret, or mark as another suitable option (False Positive, Won't Fix, etc.). 

For some types of secrets, it is sutiable to not take immediate action, and revoke after the right people have reviewed. However, for some other types of secrets (such as AWS Access Keys), there may need to be more of an immediate (and automated) approach to revoking secrets. This is where the GSSR initiaitve comes in. 

GitHub Secret Scanner Auto Remediator (GSSAR) is an initative that automates the remediation of certain secret types, based on whats important to each organisation. GSSAR takes an agnostic approach to the types of secrets, and leaves it up to each GitHub organisation to decide what secret types should, and should not be auto revoked. 

## How this works

### Non-Technical

Whenever a new secret is discovered in a repository, an event is triggered and kicks off a process. That process goes and finds out further information about that secret, it then looks within the alert to see what type of secret it has found (e.g. aws, azure, gcp, dropbox, etc.). If the secret type is one you have a remediator for, the secret will be automatically revoked and you will notififed via a GitHub Issue on the repository where the secret has been found, as well as Slack (if you have Slack). If the secret type if one you do not have a remediator for, the process will finish. 

### Technical

Whenever a new secret alert is `opened`, `resolved` or `reopened`, a webhook will fire from a GitHub App and be sent to an API Gateway within AWS. The API's first step is passing the context of the payload to a Lambda Authorizer, ensuring the Webhook has come from GitHub. If valid, the API will pass the event payload (from the webhook) to a Lambda to confirm the secret within the webhook is valid and expected. After both authentication methods pass, an AWS State Machine is kicked off to process revoking the Secret defined within the alert. 

The state machine firstly goes and filters out the `resolved` and `reopened` events. The state machine will automatically finish for any secret alert action that != `created`. If the action type does === `created` it kicks off the first lambda which fetches the value of the secret found. The secret itself doesn't come as part of the [webhook payload](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads#secret_scanning_alert) so we have to make an [API call](https://docs.github.com/en/rest/reference/secret-scanning#get-a-secret-scanning-alert) to get the value. 

Once the value has been collected, we then kick off a [Choice](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-choice-state.html). This choice will look at the `alert.secret_type` and based on the value will decide to pass it onto a remedaitor, or exit the state machine if the secret type isn't defined within the state machine. 

If the secret within the `alert.secret_type` matches a secret type within the state machine, it will send the payload to a remedaitor. A remedaitor is a function which revokes a secret, custom to a type of secret. Once revoked, it will send the result back to the state machine which will then go and mark that secret as closed within GitHub. Finally, once all steps are complete, it will run a [parallel](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-parallel-state.html) step which notifies people the secret has been remediated. It informs by opening an issue on the repository where the secret was leaked, as well as notifying a slack channel. 

## Technical Design

### Overview

The design has been implemented in a way to be very plug and play. Where you, as an organisation, only have to focus on building remediators. The architecure can be found below:

![GSSAR Architecture](https://lucid.app/publicSegments/view/8d88b9e4-3a03-4ba2-b2af-7c3abb54f45f/image.png)

This solution is designed so the only section of the design which should be of interest to you is the **remediators** section. 

What are remediators? As mentioned above remediators are individual functions of code which revoke specific secret types. There should be a 1:1 mapping between secret type and remediator. 

For example, if a company wanted to automatically remediate the following secret types:

- Dropbox Access Token
- Amazon AWS Access Key ID
- Google Cloud Private Key ID

There would need to be three remediators. One for Dropbox, one for Amazon and one for Google. 

The rest of the state machine (outside of remediators) is secret type agnostic. Meaning it will work for any current, and future secret types. 

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

[AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html) is used for the Lambda &amp; HTTP API Gateway resources. 

**Note**: Even though this solution is deployed to AWS, the code can be changed to work with the likes of Azure and GCP (Azure Function, Google Functions, etc.).

## Pre-Req's

1. Access to a cloud enviroment (AWS would be the quickest to get started)
3. Access to a GitHub environment. 
4. A repository where the code for this solution is going to live.

## Getting Started

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
