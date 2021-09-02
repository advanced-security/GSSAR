import { ssm } from "./ssm";

import { githubAuth } from "./getGitHubAppJWT";
import { closeSecret } from "./closeSecret";

export const handler = async (
  event: InputFromStateMachine
): Promise<InputFromStateMachine> => {
  try {
    await ssm();
    const token = (await githubAuth()) as string;
    (await closeSecret(event, token)) as void;
    return event as InputFromStateMachine;
  } catch (e: any) {
    console.error(e);
    throw e;
  }
};
