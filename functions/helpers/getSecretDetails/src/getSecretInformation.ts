import { request } from "@octokit/request";

export const getSecretInformation = async (
  token: string,
  alert_number: number,
  repo: string,
  owner: string
): Promise<SecretDetailResponse> => {
  try {
    const {
      data: { secret, secret_type, html_url, created_at },
    } = await request(
      "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}",
      {
        headers: {
          authorization: `token ${token}`,
        },
        owner,
        repo,
        alert_number,
      }
    );

    console.log("secret", secret);

    if (!secret) throw new Error("No Secret Found in API Response");

    return { secret, secret_type, html_url, created_at };
  } catch (err) {
    console.error("Error within function (getSecretInformation)", err);
    throw err;
  }
};
