import { ssm } from "./ssm";
import { githubAuth } from "./getGitHubAppJWT";
import { postIssue } from "./postIssue";

export const handler = async (event: InputFromStateMachine): Promise<void> => {
  try {
    await ssm();
    const token = (await githubAuth()) as string;
    (await postIssue(token, event)) as void;
  } catch (e) {
    console.error(e);
    throw e;
  }
};
