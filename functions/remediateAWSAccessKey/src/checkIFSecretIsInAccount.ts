import { IAMClient, ListAccessKeysCommand } from "@aws-sdk/client-iam";

export const checkIFSecretIsInAccount = async (secret: SecretResponse): Promise<response> => {
  const region = process.env.REGION ? process.env.REGION : "us-east-1";

  try {
    const client = new IAMClient({ region });
    const command = new ListAccessKeysCommand({});
    const { AccessKeyMetadata } = await client.send(command); // TODO: Paginate

    if (!AccessKeyMetadata)
      return { status: 404, message: "No Access Keys Found" };

    const secretFound = AccessKeyMetadata.some(
      (AccessKey) => (AccessKey.AccessKeyId = secret.secret)
    );

    if (!secretFound)
      return {
        status: 404,
        message:
          "Access Key Discovered within Secret Scanning Alert Not Found Within List Of Access Keys in this Acconunt ",
      };

    return { status: 200, message: "Key Found!" };
  } catch (err) {
    console.error("Error within function (getSecret)", err);
    throw err;
  }
};
