import { APIGatewayProxyEventV2 } from "aws-lambda";
import { ssm } from "./ssm";

import { getGitHubIpRange } from "./getIPs";
import { githubAuth } from "./getGitHubAppJWT";
import { checkIPs } from "./checkIPs";

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<SimpleResponse> => {
  const sourceIP = event.requestContext.http.sourceIp;

  try {
    await ssm();
    const token = (await githubAuth()) as string;
    const ips = (await getGitHubIpRange(token)) as hookIPAddress;
    const isAuthorized = (await checkIPs(ips, sourceIP)) as boolean;
    console.log(isAuthorized);
    return {
      isAuthorized,
    };
  } catch (e) {
    console.error(e);
    return {
      isAuthorized: false,
    };
  }
};
