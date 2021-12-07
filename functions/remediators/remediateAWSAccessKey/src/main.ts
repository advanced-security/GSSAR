import { ssm } from "./ssm";
import { checkIFSecretIsInAccount } from "./checkIFSecretIsInAccount";
import { getUsernameOfAccessKeyID } from "./getUsernameOfAccessKeyID";
import { revokeAccessKeyID } from "./revokeAccessKeyID";

export const handler = async (
  event: InputFromStateMachine
): Promise<InputFromStateMachine> => {
  console.log(event);
  try {
    await ssm();

    const { status, message } = (await getUsernameOfAccessKeyID(
      event
    )) as response;

    if (status !== 200) throw Error(message);

    console.log(process.env);

    const result = (await checkIFSecretIsInAccount(event, message)) as response;

    if (result.status !== 200) throw Error(result.message);

    await revokeAccessKeyID(event, message);

    return event as InputFromStateMachine;
  } catch (err: any) {
    console.error(err);
    throw err;
  }
};
