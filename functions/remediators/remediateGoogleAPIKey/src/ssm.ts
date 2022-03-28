import { SSMClient, GetParametersByPathCommand } from "@aws-sdk/client-ssm";

export const ssm = async (): Promise<void> => {
  const region = process.env.LOCATION ? process.env.LOCATION : "global";
  const client = new SSMClient({ region });
  const command = new GetParametersByPathCommand({
    Path: "/gssar",
    WithDecryption: true,
  });

  try {
    const { Parameters } = await client.send(command);

    if (Parameters) {
      Parameters.forEach((param) => {
        const name = param.Name ? param.Name.replace("/gssar/", "") : "";
        const value = param.Value ? param.Value : "";
        process.env[name] = value;
      });
    }
  } catch (err) {
    console.error("Error within function (ssm)", err);
    throw err;
  }
};
