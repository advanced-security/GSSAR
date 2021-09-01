import { ssm } from "./ssm";
import { APIGatewayProxyResultV2 } from "aws-lambda";
import { checkIFSecretIsInAccount } from "./checkIFSecretIsInAccount";
import { getUsernameOfAccessKeyID } from "./getUsernameOfAccessKeyID";

export const handler = async (
  event: InputFromStateMachine
): Promise<APIGatewayProxyResultV2> => {
  console.log(event);
  try {
    await ssm();

    const { status, message } = (await getUsernameOfAccessKeyID(
      event
    )) as response;

    if (status !== 200) return { statusCode: 500, body: message };

    const result = (await checkIFSecretIsInAccount(event, message)) as response;

    if (result.status !== 200) return { statusCode: 500, body: result.message };

    return { statusCode: 200, body: "Success" };
  } catch (e: any) {
    const body = e.message || "";
    console.error(e);
    return { statusCode: 500, body };
  }
};
