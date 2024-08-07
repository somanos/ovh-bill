# ovh-bill
*Automatically get your OVH bills*

**This module require OVH API key**

To generate credentials
1. Generate appKey + appSecret from https://eu.api.ovh.com/createToken/
2. Then run below command from your shell
3. curl -H "Content-type: application/json" -H "X-Ovh-Application: **APP_KEY**" -d '{"accessRules": [{"method": "GET", "path": "/me/*"}]}' https://eu.api.ovh.com/1.0/auth/credential

Then copy returned values into the file $HOME/my-ovh-bills/credentials.json.
See example ./credentials.json

**KEEP YOUR credentials.json SECRET**
_You can store you file anywhere and use the option --credentials=/path/to/your/file_

*Install*
1. git clone https://github.com/somanos/ovh-bill
2. cd ovh-bill
3. npm i  
4. node index.js --from=YYYY-MM-DD

*Other Examples*
1. node index.js --from=2022-01-01 --to=2022-06-31
2. node index.js --from=2022-01-01 --to=2022-06-31 --output=/home/me/balance/ovh --credentials=/home/me/credentials.json 

*Options*
--format=[pdf|html] default pdf
--verbose to show bill metadat
--json to save bill metadat in json file
--from=YYYY-MM-DD -> Mandatory, start of billing period date
--to=YYYY-MM-DD -> Optional, end of billing period date, defaulted to today
--output=/path/to/bill-files -> Optional, directory where to store bills, defaulted to $HOME/my-ovh-bills
