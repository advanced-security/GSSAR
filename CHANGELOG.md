# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.1](https://github.com/NickLiffen/GSSAR/releases/v1.0.0) - 2021-09-09

- Authorizers: Fixed a bug where the github secret was not getting validated

## [v1.0.0](https://github.com/NickLiffen/GSSAR/releases/v1.0.0) - 2021-09-03

- Authorizers: Functions that validates the webhook comes from a valid GitHub IP and validates the secret.
- Helpers: Functions that support the end-to-end process for GSSAR but do not perform any remediation. E.G. Function for closing a secret. 
- Remediators: Functions that revoke certain secret types. 
- GitHub workflow that deploys the solution to AWS. 
- Infrastructure as Code (IaC) written in Cloud Formation.