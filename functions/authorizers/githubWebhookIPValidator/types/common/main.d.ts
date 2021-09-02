declare namespace NodeJS {
  export interface ProcessEnv {
    APP_ID: string;
    APP_PRIVATE_KEY: string;
    APP_INSTALLATION_ID: string;
    APP_CLIENT_ID: string;
    APP_CLIENT_SECRET: string;
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
