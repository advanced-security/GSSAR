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
        "https://www.googleapis.com/auth/cloud-platform"
      ],
    });

    // Acquire an auth client, and bind it to all future calls
    const authClient = await auth.getClient();
    google.options({ auth: authClient });

    const data = await apikeys.projects.locations.keys.get({
      name: APIKeyID,
    });

    const parentID = APIKeyID.substring(0, APIKeyID.indexOf("/keys"));
    console.log("parentID", parentID);
    console.log("current key", data);

    const newKey = await apikeys.projects.locations.keys.create({
      keyId: APIKeyID,
      parent: parentID,
      requestBody: {},
    });

    console.log("new key", newKey);

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
