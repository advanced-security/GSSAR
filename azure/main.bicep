// GitHub Secret Scanner Auto Remediator (GSSAR) - Azure Infrastructure
// This Bicep template is the Azure equivalent of the AWS template.yml

@description('The Azure region to deploy resources into.')
param location string = resourceGroup().location

@description('A unique suffix for resource names to avoid conflicts.')
param resourceSuffix string = uniqueString(resourceGroup().id)

@description('The name of the Key Vault to store secrets and configuration.')
param keyVaultName string = 'gssar-kv-${resourceSuffix}'

@description('The name of the Function App.')
param functionAppName string = 'gssar-func-${resourceSuffix}'

@description('The name of the Logic App.')
param logicAppName string = 'gssar-logic-${resourceSuffix}'

@description('The name of the Event Grid Topic.')
param eventGridTopicName string = 'gssar-events-${resourceSuffix}'

// ============================================================================
// Storage Account (required by Azure Functions)
// ============================================================================

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'gssarst${resourceSuffix}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// Dead Letter Queue (equivalent to AWS SQS Dead Letter Queue)
resource deadLetterQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  name: '${storageAccount.name}/default/gssar-dead-letter-queue'
}

// Blob service and container for Event Grid dead-letter events
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource deadLetterContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'dead-letter-events'
}

// ============================================================================
// Application Insights (equivalent to AWS CloudWatch for monitoring/tracing)
// ============================================================================

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'gssar-logs-${resourceSuffix}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'gssar-insights-${resourceSuffix}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

// ============================================================================
// Key Vault (equivalent to AWS Systems Manager Parameter Store)
// ============================================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// Grant the Function App access to Key Vault secrets
// (Defined separately to avoid a circular dependency between Function App and Key Vault)
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: functionApp.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// ============================================================================
// App Service Plan (Consumption plan for Azure Functions)
// ============================================================================

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'gssar-plan-${resourceSuffix}'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {}
}

// ============================================================================
// Azure Function App (equivalent to AWS Lambda Functions)
// ============================================================================
// All functions are deployed into a single Function App.
// Each function within the app corresponds to an AWS Lambda:
//   - githubWebhookIPValidator    (Authorizer - validates GitHub IP)
//   - githubWebhookSecretValidator (Authorizer - validates webhook secret)
//   - getSecretDetails            (Helper - fetches secret details from GitHub API)
//   - closeSecret                 (Helper - closes the GitHub secret alert)
//   - githubIssueNotifier         (Helper - creates a GitHub Issue notification)
//   - remediateAWSAccessKey       (Remediator - revokes AWS Access Keys)
//   - remediateGoogleAPIKey       (Remediator - revokes Google API Keys)

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: applicationInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsights.properties.ConnectionString
        }
        {
          name: 'NODE_ENV'
          value: 'Production'
        }
        {
          name: 'KEY_VAULT_URI'
          value: keyVault.properties.vaultUri
        }
        {
          name: 'EVENT_GRID_TOPIC_ENDPOINT'
          value: eventGridTopic.properties.endpoint
        }
        {
          name: 'EVENT_GRID_TOPIC_KEY'
          value: eventGridTopic.listKeys().key1
        }
      ]
    }
  }
}

// ============================================================================
// Event Grid Topic (equivalent to AWS EventBridge)
// ============================================================================

resource eventGridTopic 'Microsoft.EventGrid/topics@2023-12-15-preview' = {
  name: eventGridTopicName
  location: location
  properties: {
    inputSchema: 'EventGridSchema'
  }
}

// ============================================================================
// Logic App - Secret Scanner Workflow
// (equivalent to AWS Step Functions State Machine)
// ============================================================================
// This Logic App orchestrates the same workflow as the AWS Step Function:
//   1. Filter Action Type (created, resolved, reopened)
//   2. Get Secret Details
//   3. Find Secret Type to Remediate (choice/switch)
//   4. Run the appropriate Remediator
//   5. Close the GitHub Secret
//   6. Notify via GitHub Issue

resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    state: 'Enabled'
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      parameters: {
        functionAppId: {
          type: 'String'
          defaultValue: functionApp.id
        }
        functionAppName: {
          type: 'String'
          defaultValue: functionApp.name
        }
      }
      triggers: {
        // Triggered by Event Grid (equivalent to EventBridge rule)
        manual: {
          type: 'Request'
          kind: 'Http'
          inputs: {
            schema: {
              type: 'object'
              properties: {
                action: { type: 'string' }
                alert: { type: 'object' }
              }
            }
          }
        }
      }
      actions: {
        // Step 1: Filter Action Type
        // Equivalent to the "Filter Action Type" Choice state
        Filter_Action_Type: {
          type: 'Switch'
          expression: '@triggerBody()?[\'action\']'
          cases: {
            created: {
              case: 'created'
              actions: {
                // Step 2: Get Secret Details
                Get_Secret_Details: {
                  type: 'Function'
                  inputs: {
                    function: {
                      id: '${functionApp.id}/functions/getSecretDetails'
                    }
                    body: '@triggerBody()'
                    retryPolicy: {
                      type: 'fixed'
                      count: 3
                      interval: 'PT2S'
                    }
                  }
                  runAfter: {}
                }
                // Step 3: Find Secret Type to Remediate
                Find_Secret_Type_To_Remediate: {
                  type: 'Switch'
                  expression: '@body(\'Get_Secret_Details\')?[\'secret_type\']'
                  cases: {
                    aws_access_key_id: {
                      case: 'aws_access_key_id'
                      actions: {
                        Remediate_AWS_Access_Key: {
                          type: 'Function'
                          inputs: {
                            function: {
                              id: '${functionApp.id}/functions/remediateAWSAccessKey'
                            }
                            body: '@body(\'Get_Secret_Details\')'
                            retryPolicy: {
                              type: 'fixed'
                              count: 3
                              interval: 'PT2S'
                            }
                          }
                          runAfter: {}
                        }
                      }
                    }
                    google_api_key: {
                      case: 'google_api_key'
                      actions: {
                        Remediate_Google_API_Key: {
                          type: 'Function'
                          inputs: {
                            function: {
                              id: '${functionApp.id}/functions/remediateGoogleAPIKey'
                            }
                            body: '@body(\'Get_Secret_Details\')'
                            retryPolicy: {
                              type: 'fixed'
                              count: 3
                              interval: 'PT2S'
                            }
                          }
                          runAfter: {}
                        }
                      }
                    }
                  }
                  default: {
                    actions: {
                      No_Remediator_Found: {
                        type: 'Terminate'
                        inputs: {
                          runStatus: 'Succeeded'
                          runError: {
                            message: 'No remediator configured for this secret type.'
                          }
                        }
                        runAfter: {}
                      }
                    }
                  }
                  runAfter: {
                    Get_Secret_Details: ['Succeeded']
                  }
                }
                // Step 4: Close the GitHub Secret
                Close_The_GitHub_Secret: {
                  type: 'Function'
                  inputs: {
                    function: {
                      id: '${functionApp.id}/functions/closeSecret'
                    }
                    body: '@body(\'Get_Secret_Details\')'
                    retryPolicy: {
                      type: 'fixed'
                      count: 3
                      interval: 'PT2S'
                    }
                  }
                  runAfter: {
                    Find_Secret_Type_To_Remediate: ['Succeeded']
                  }
                }
                // Step 5: Notify via GitHub Issue
                Notify_Via_GitHub_Issue: {
                  type: 'Function'
                  inputs: {
                    function: {
                      id: '${functionApp.id}/functions/githubIssueNotifier'
                    }
                    body: '@body(\'Get_Secret_Details\')'
                    retryPolicy: {
                      type: 'fixed'
                      count: 3
                      interval: 'PT2S'
                    }
                  }
                  runAfter: {
                    Close_The_GitHub_Secret: ['Succeeded']
                  }
                }
              }
            }
          }
          default: {
            actions: {
              Terminate_Non_Created_Event: {
                type: 'Terminate'
                inputs: {
                  runStatus: 'Succeeded'
                }
                runAfter: {}
              }
            }
          }
          runAfter: {}
        }
      }
    }
  }
}

// ============================================================================
// Event Grid Subscription
// (connects Event Grid Topic to Logic App, equivalent to EventBridge Rule)
// ============================================================================

resource eventGridSubscription 'Microsoft.EventGrid/topics/eventSubscriptions@2023-12-15-preview' = {
  parent: eventGridTopic
  name: 'gssar-logic-app-subscription'
  properties: {
    destination: {
      endpointType: 'WebHook'
      properties: {
        endpointUrl: logicApp.listCallbackUrl().value
      }
    }
    filter: {
      includedEventTypes: [
        'custom.kickOffSecretScanRemediation'
      ]
    }
    deadLetterDestination: {
      endpointType: 'StorageBlob'
      properties: {
        resourceId: storageAccount.id
        blobContainerName: 'dead-letter-events'
      }
    }
    retryPolicy: {
      maxDeliveryAttempts: 3
      eventTimeToLiveInMinutes: 1440
    }
  }
}

// ============================================================================
// Outputs
// ============================================================================

output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output functionAppName string = functionApp.name
output keyVaultName string = keyVault.name
output eventGridTopicEndpoint string = eventGridTopic.properties.endpoint
output applicationInsightsName string = applicationInsights.name
