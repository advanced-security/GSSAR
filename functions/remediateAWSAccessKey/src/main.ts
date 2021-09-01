import { ssm } from "./ssm";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
// import { checkIFSecretIsInAccount } from "./checkIFSecretIsInAccount";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log(event);
  try {
    await ssm();
    // const result = await checkIFSecretIsInAccount(event);
    //console.log(result);
    return { statusCode: 200, body: "Success" };
  } catch (e: any) {
    const body = e.message || "";
    console.error(e);
    return { statusCode: 500, body };
  }
};
