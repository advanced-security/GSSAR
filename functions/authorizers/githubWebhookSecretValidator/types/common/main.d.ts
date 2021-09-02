declare namespace NodeJS {
  export interface ProcessEnv {
    GITHUB_WEBHOOKS_SECRET: string;
  }
}

interface SimpleResponse {
  isAuthorized: boolean;
}

interface IP {
  meta: hookIPAddress;
}

interface hookIPAddress {
  hookIpAddresses: string[];
}
