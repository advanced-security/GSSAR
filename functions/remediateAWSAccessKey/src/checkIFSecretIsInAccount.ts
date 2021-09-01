import { IAMClient, ListAccessKeysCommand } from "@aws-sdk/client-iam";

export const checkIFSecretIsInAccount = async ({secret}: InputFromStateMachine, UserName: string): Promise<response> => {
  const region = process.env.REGION ? process.env.REGION : "us-east-1";

  try {
    const client = new IAMClient({ region });
    const command = new ListAccessKeysCommand({ UserName });
    const { AccessKeyMetadata, IsTruncated, Marker } = await client.send(command); // TODO: Paginate

    if(IsTruncated)
      console.log("Ah man, there are more results to get, the marker is: ", Marker)

    if (!AccessKeyMetadata)
      return { status: 404, message: "No Access Keys Found" };

    const secretFound = AccessKeyMetadata.some(
      (AccessKey) => (AccessKey.AccessKeyId === secret)
    );

    if (!secretFound)
      return {
        status: 404,
        message:
          "Access Key Discovered within Secret Scanning Alert Not Found Within List Of Access Keys in this Acconunt ",
      };

    return { status: 200, message: "Key Found!" };
  } catch (err) {
    console.error("Error within function (checkIFSecretIsInAccount)", err);
    return { status: 500, message: "Error Thrown! Go Get the checkIFSecretIsInAccount module for errors. Guessing it's a permission error though!" };
  }
};
