import { graphql } from "@octokit/graphql";

export const getGitHubIpRange = async (
  token: string
): Promise<hookIPAddress> => {
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });

  try {
    const { meta } = (await graphqlWithAuth(
      `
        {
          meta {
            hookIpAddresses
          }
        }
        `
    )) as IP;
    return meta;
  } catch (err) {
    console.error("Error within function (graphqlWithAuth)", err);
    throw err;
  }
};
