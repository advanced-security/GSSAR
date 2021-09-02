import { graphql } from "@octokit/graphql";

import type { GraphQlQueryResponseData } from "@octokit/graphql";

import { message } from "./message";

export const postIssue = async (
  token: string,
  event: InputFromStateMachine
): Promise<void> => {
  try {
    const {
      name: repo,
      login: owner,
      html_url,
      created_at,
      secret_type,
    } = event;

    const body = await message(repo, owner, html_url, created_at, secret_type);

    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
      },
    });

    const {
      repository: { id: repositoryId },
    } = await graphqlWithAuth<GraphQlQueryResponseData>(
      `
      query FindRepo($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          id
        }
      }`,
      {
        owner,
        repo,
      }
    );

    const title = "Secret Auto Remediated";

    const issueID = (await graphqlWithAuth(
      `
      mutation CreateIssue($repositoryId: String!, $title: String!, $body: String!) {
        createIssue(input: {repositoryId: $repositoryId, title: $title, body: $body}) {
          issue {
            number
            body
          }
        }
      }`,
      {
        repositoryId,
        title,
        body,
      }
    )) as GraphQlQueryResponseData;

    console.log(issueID);
  } catch (err) {
    console.error("Error within function (getSecretInformation)", err);
    throw err;
  }
};
