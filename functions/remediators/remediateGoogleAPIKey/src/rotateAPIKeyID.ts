import { google } from "googleapis";
// - Enable the API at:
//   https://console.developers.google.com/apis/api/apikeys.googleapis.com
const apikeys = google.apikeys("v2");

export const rotateAPIKeyID = async (APIKeyID: string): Promise<void> => {
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

    // Acquire an auth client, and bind it to all future calls
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    await apikeys.projects.locations.keys.clone({
      // Required. The resource name of the API key to be cloned in the same project.
      name: APIKeyID,
      // Request body metadata
      requestBody: {},
    });

    // Do the magic
    await apikeys.projects.locations.keys.delete({
      // Required. The resource name of the API key to be deleted.
      name: APIKeyID,
    });
  } catch (err) {
    console.error("Error within function (rotateAPIKeyID)", err);
    throw err;
  }
};
