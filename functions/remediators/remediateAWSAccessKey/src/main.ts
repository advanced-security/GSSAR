import { ssm } from "./ssm";
import { checkIFSecretIsInAccount } from "./checkIFSecretIsInAccount";
import { getUsernameOfAccessKeyID } from "./getUsernameOfAccessKeyID";

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

    const result = (await checkIFSecretIsInAccount(event, message)) as response;

    if (result.status !== 200) throw Error(result.message);

    return event as InputFromStateMachine;
  } catch (e: any) {
    console.error(e);
    throw Error(e.message);
  }
};
