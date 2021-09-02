declare namespace NodeJS {
  export interface ProcessEnv {
    APP_ID: string;
    APP_PRIVATE_KEY: string;
    APP_INSTALLATION_ID: string;
    APP_CLIENT_ID: string;
    APP_CLIENT_SECRET: string;
  }
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
