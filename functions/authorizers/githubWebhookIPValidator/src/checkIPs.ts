import { cidrSubnet } from "ip";

const findIP = (keys: string[], ipToCheck: string) => {
  return keys.some((cidr) => cidrSubnet(cidr).contains(ipToCheck));
};

export const checkIPs = async (
  meta: hookIPAddress,
  ipFromRequest: string
): Promise<boolean> => {
  let ipToCheck;

  const keys = Object.values(meta) as string[];

  if (ipFromRequest === "test-invoke-source-ip") {
    ipToCheck = "40.224.81.5";
  } else {
    ipToCheck = ipFromRequest;
  }

  try {
    const response = await findIP(keys, ipToCheck);
    return response;
  } catch (err) {
    console.error("Error within function (findIP)", err);
    throw err;
  }
};
