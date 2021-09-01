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
  secret_type: string | undefined;
  html_url: string | undefined;
  created_at: string | undefined;
}

interface SecretDetailResponse { secret: string, secret_type: string | undefined, html_url: string | undefined, created_at: string | undefined }

interface SecretResponse {
  number: number;
  created_at: string;
  url: string;
  html_url: string;
  state: string;
  secret_type: string;
  secret: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
}

