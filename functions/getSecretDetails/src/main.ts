import { ssm } from "./ssm";
import { SecretScanningAlertCreatedEvent } from "@octokit/webhooks-types";

import { githubAuth } from "./getGitHubAppJWT";
import { getSecretInformation } from "./getSecretInformation";

export const handler = async (event: SecretScanningAlertCreatedEvent): Promise<response> => {
  const {
    alert: { number },
    repository: {
      name,
      owner: { login },
    },
  } = event;
  try {
    await ssm();
    const token = (await githubAuth()) as string;
    const secret = (await getSecretInformation(token, number, name, login)) as string;
    const response = { secret } as response
    return response;
  } catch (e: any) {
    console.error(e);
    throw e;
  }
};
