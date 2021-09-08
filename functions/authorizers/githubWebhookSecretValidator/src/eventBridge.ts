import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
  PutEventsCommandOutput,
} from "@aws-sdk/client-eventbridge";

import { APIGatewayProxyEventV2 } from "aws-lambda";

export const put = async (event: APIGatewayProxyEventV2): Promise<number> => {


  try {
    const client = new EventBridgeClient({
      region: process.env.REGION,
    }) as EventBridgeClient;

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

    const command = new PutEventsCommand(input);

    const { FailedEntryCount } = (await client.send(
      command
    )) as PutEventsCommandOutput;

    const count = FailedEntryCount as number;

    return count;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
