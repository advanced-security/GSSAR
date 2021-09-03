import { ssm } from "./ssm";
import { APIGatewayProxyResultV2 } from "aws-lambda";
import { secretVerifier } from "./verify";

export const handler = async (
  event: any,
  context: any
): Promise<APIGatewayProxyResultV2> => {
  console.log(event);
  console.log(context);
  try {
    await ssm();

    const response = (await secretVerifier(event)) as boolean;

    if (!response)
      return {
        statusCode: 401,
        body: "Webhook secret provided does not match. unauthorized.",
      };

    return {
      statusCode: 200,
      body: "Webhook secret provided does match. authorized.",
    };
  } catch (e: any) {
    const body = e.message || "";
    console.error(e);
    return { statusCode: 401, body };
  }
};
