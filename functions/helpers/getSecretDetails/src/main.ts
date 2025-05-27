import { ssm } from "./ssm";
import { SecretScanningAlertCreatedEvent } from "@octokit/webhooks-types";

import { githubAuth } from "./getGitHubAppJWT";
import { getSecretInformation } from "./getSecretInformation";
import { EventBridgeEvent } from "aws-lambda";

export const handler = async (
  event: EventBridgeEvent<"transaction", SecretScanningAlertCreatedEvent>
): Promise<response> => {
  const {
    detail: {
      alert: { number },
      repository: {
        name,
        owner: { login },
      },
    },
  } = event;
  try {
    await ssm();
    const token = (await githubAuth()) as string;
    const secret = (await getSecretInformation(
      token,
      number,
      name,
      login
    )) as SecretDetailResponse;
    const response = { ...secret, number, name, login } as response;
    return response;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
