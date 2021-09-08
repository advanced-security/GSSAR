import { ssm } from "./ssm";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { secretVerifier } from "./verify";

import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandOutput,
} from "@aws-sdk/client-eventbridge";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log(event);

  try {
    await ssm();

    const response = (await secretVerifier(event)) as boolean;

    const client = new EventBridgeClient({ region: process.env.REGION });

    const input = {
      Entries: [
        {
          Source: "custom.kickOffSecretScanRemediation",
          EventBusName: process.env.EVENT_BUS_NAME,
          DetailType: "transaction",
          Time: new Date(),
          Detail: event.body,
        },
      ],
    };

    console.log(input);

    const command = new PutEventsCommand(input);

    console.log(response);

    if (!response)
      return {
        statusCode: 401,
        body: "Webhook secret provided does not match. unauthorized.",
      };

    const { FailedEntryCount, Entries } = (await client.send(
      command
    )) as PutEventsCommandOutput;

    console.log(Entries);
    console.log(FailedEntryCount);

    if (!FailedEntryCount || FailedEntryCount > 0) {
      return {
        statusCode: 500,
        body: "Something went wrong. Please try again later.",
      };
    }

    return {
      statusCode: 200,
      body: "Success! Message sent to Step Functions State Machine",
    };
  } catch (e: any) {
    const body = e.message || "";
    console.error(e);
    return { statusCode: 401, body };
  }
};
