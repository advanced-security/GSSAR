import { ssm } from "./ssm";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { secretVerifier } from "./verify";

import { put } from "./eventBridge";

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

    const errorCount = await put(event);

    console.log(
      `Was there an error in sending the message? (Yes if > 0): ${errorCount}`
    );

    if (errorCount > 0) {
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
