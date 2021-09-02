import { request } from "@octokit/request";

export const closeSecret = async (
  { login: owner, name: repo, number: alert_number }: InputFromStateMachine,
  token: string
): Promise<void> => {
  try {
    await request(
      "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}",
      {
        headers: {
          authorization: `token ${token}`,
        },
        owner,
        repo,
        alert_number,
        state: "resolved",
        resolution: "revoked",
      }
    );
  } catch (err) {
    console.error("Error within function (getSecretInformation)", err);
    throw err;
  }
};
