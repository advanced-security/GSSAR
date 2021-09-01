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

interface response {
  status: number;
  message: string;
}
interface InputFromStateMachine {
  number: number;
  name: string;
  login: string;
  secret: string;
  secret_type: string | undefined;
  html_url: string | undefined;
  created_at: string | undefined;
}
