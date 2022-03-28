import { google } from "googleapis";
// - Enable the API at:
//   https://console.developers.google.com/apis/api/apikeys.googleapis.com
const apikeys = google.apikeys("v2");

export const getAPIKeyIDOfSecret = async ({
  secret,
}: InputFromStateMachine): Promise<response> => {
  const credentials: string = process.env
    .GOOGLE_APPLICATION_CREDENTIALS as string;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/cloud-platform.read-only",
      ],
    });

    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    const res = await apikeys.keys.lookupKey({
      keyString: secret,
    });

    if (!res.data.name)
      return {
        status: 404,
        message:
          "Google API Key Discovered within Secret Scanning Alert Not Found Within List Of API Keys in this Acconunt ",
      };

    return { status: 200, message: res.data.name as string };
  } catch (err) {
    console.error("Error within function (getAPIKeyIDOfSecret)", err);
    throw err;
  }
};
