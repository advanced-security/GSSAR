import { ssm } from "./ssm";
import { getAPIKeyIDOfSecret } from "./getAPIKeyIDOfSecret";
import { rotateAPIKeyID } from "./rotateAPIKeyID";

export const handler = async (
  event: InputFromStateMachine
): Promise<InputFromStateMachine> => {
  console.log(event);
  try {
    await ssm();

    const { status, message } = (await getAPIKeyIDOfSecret(event)) as response;

    if (status !== 200) throw Error(message);

    await rotateAPIKeyID(message);

    return event as InputFromStateMachine;
  } catch (err: any) {
    console.error(err);
    throw err;
  }
};
