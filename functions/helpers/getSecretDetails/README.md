# Function that gets Secret Information

### Purpose

Within the Webhook, we don't any information about what the actual secret is. E.G the value of the secret. As every secret type is going to require this, we split the logic out to a seperate function to promote resusability. 