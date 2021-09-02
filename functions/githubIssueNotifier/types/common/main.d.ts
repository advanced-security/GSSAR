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

interface response {
  number: number;
  name: string;
  login: string;
  secret: string;
  secret_type: string;
  html_url: string;
  created_at: string;
}

interface SecretDetailResponse {
  secret: string;
  secret_type: string | undefined;
  html_url: string | undefined;
  created_at: string | undefined;
}

interface InputFromStateMachine {
  number: number;
  name: string;
  login: string;
  secret: string;
  secret_type: string;
  html_url: string;
  created_at: string;
}
