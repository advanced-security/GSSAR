import { IAMClient, GetAccessKeyLastUsedCommand } from "@aws-sdk/client-iam"

export const getUsernameOfAccessKeyID = async ({secret}: InputFromStateMachine): Promise<response> => {
  const region = process.env.REGION ? process.env.REGION : "us-east-1";

  try {
    const client = new IAMClient({ region });
    const command = new GetAccessKeyLastUsedCommand({ AccessKeyId: secret });
    const { UserName } = await client.send(command);

    console.log(UserName);

    if (!UserName)
      return { status: 404, message: "Hmm, this key doesn't seem to be tied to a user!" };

    return { status: 200, message: UserName };
  } catch (err) {
    console.error("Error within function (checkIFSecretIsInAccount)", err);
    return { status: 500, message: "Error Thrown! Go Get the getUsernameOfAccessKeyID module for errors. Guessing it's a permission error though!" };
  }
};
