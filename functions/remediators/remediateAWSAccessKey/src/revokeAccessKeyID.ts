import { IAMClient, UpdateAccessKeyCommand } from "@aws-sdk/client-iam";

export const revokeAccessKeyID = async (
  { secret: AccessKeyId }: InputFromStateMachine,
  UserName: string
): Promise<void> => {
  const region = process.env.REGION ? process.env.REGION : "us-east-1";

  try {
    const client = new IAMClient({ region });
    const command = new UpdateAccessKeyCommand({
      AccessKeyId,
      UserName,
      Status: "Inactive",
    });
    await client.send(command);
    console.log("Remediated");
  } catch (err) {
    console.error("Error within function (revokeAccessKeyID)", err);
    throw err;
  }
};
