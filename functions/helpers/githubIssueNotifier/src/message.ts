export const message = async (
  repo: string,
  owner: string,
  html_url: string,
  created_at: string,
  secret_type: string
): Promise<string> => {
  const date = Date.now();

  const fixedDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);

  return `
     Hey :wave. 

     This is an automated message from the GitHub Secret Scanning Auto Remediator Tool. 

     I just wanted to let you know we have automatically remediated a ${secret_type}, which was discovered by GitHub's Secret Scanning.

     Some details about the remediation and secret can be found below:

     - Repository: ${repo}
     - Owner: ${owner}
     - Secret URL: ${html_url}
     - Date Found: ${created_at}
     - Date Remediated: ${fixedDate}

     This may have some downstream consequences, so we reccommend you looking at the above URL and take any appropriate follow up.

     - Cheers,
     GSSR`;
};
