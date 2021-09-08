import { ssm } from "./ssm";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { secretVerifier } from "./verify";

import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
  PutEventsCommandOutput,
} from "@aws-sdk/client-eventbridge";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    await ssm();

    const secretValidBool = (await secretVerifier(event)) as boolean;

    console.log(`Is secret valid: ${secretValidBool}`);

    if (!secretValidBool) {
      return {
        statusCode: 401,
        body: "Webhook secret provided does not match. unauthorized.",
      };
    }

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
    } as PutEventsCommandInput;

    console.log(input);

    const command = new PutEventsCommand(input);

    const { FailedEntryCount } = (await client.send(
      command
    )) as PutEventsCommandOutput;

    const count = FailedEntryCount as number;

    if (count > 0) {
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
