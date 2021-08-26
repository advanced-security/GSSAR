import { verify } from "@octokit/webhooks-methods";
import { APIGatewayProxyEventV2 } from "aws-lambda";

export const secretVerifier = async (
  event: APIGatewayProxyEventV2
): Promise<boolean> => {
  try {
    const body = event.body as string;
    const signature = event.headers["x-hub-signature-256"] as string;
    const authedAnswer = await verify(
      process.env.GITHUB_WEBHOOKS_SECRET,
      body,
      signature
    );
    return authedAnswer;
  } catch (err) {
    console.error("Error within function (secretVerifier)", err);
    throw err;
  }
};
