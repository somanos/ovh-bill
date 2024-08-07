#!/usr/bin/env node

// appKey + appSecret are generated by https://eu.api.ovh.com/createToken/
// export AK=appKey
// curl -H "Content-type: application/json" -H "X-Ovh-Application: $AK" -d '{"accessRules": [{"method": "GET", "path": "/me/*"}]}' https://eu.api.ovh.com/1.0/auth/credential
// the credential query return consumerKey

const Path = require('path');
const Fs = require('fs');
const https = require('https');
const Jsonfile = require('jsonfile');
const { exit } = require('process');
const argv = require('minimist')(process.argv.slice(2)) || {};
const APP_DATA = Path.resolve(process.env.HOME, "my-ovh-bills");
const HIST_FILE = Path.resolve(APP_DATA, ".history.json");
const YEAR = new Date().getUTCFullYear().toString();
let OUTPUT = Path.resolve(APP_DATA, YEAR);
let HISTORY = [];
let OPTIONS = {};
if (!Fs.existsSync(OUTPUT)) {
  Fs.mkdirSync(OUTPUT, { recursive: true });
}

/**
 * 
 * @returns 
 */
function today() {
  let d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}


/**
 * 
 */
function help() {
  console.log(`--help -> show this message)`);
}

/**
 * 
 */
function usage(to, quit = 0) {
  console.log(`--from=YYYY-MM-DD -> Mandatory, start of billing period date`);
  console.log(`--to=YYYY-MM-DD -> Optional, end of billing period date, defaulted to today (${today()})`);
  console.log(`--output=/path/to/bill-files -> Optional, directory where to store bills, defaulted to`);
  if (quit) exit(1);
}

/**
 * 
 */
function tip() {
  let a = '{"accessRules": [{"method": "GET", "path": "/me/*"}]}';
  console.log("==========================================================================");
  console.log("To generate credentials :");
  console.log("  1/ Generate appKey + appSecret from https://eu.api.ovh.com/createToken/:");
  console.log("  2/ Then run this command on your shell: :");
  console.log("export AK=appKey");
  console.log(`curl -H "Content-type: application/json" -H "X-Ovh-Application: $AK" -d '${a}' https://eu.api.ovh.com/1.0/auth/credential`);
  console.log("Then use returned values to fill in all the fields in the file credentials.json");
  console.log("==========================================================================");
  exit(1);
}


if (argv.help) {
  help();
  usage();
  tip();
}


/** */
function getBillsUrl() {
  let d = new Date();
  let to = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  let opt = {
    to: argv.to || to,
    from: argv.from
  }
  if (Fs.existsSync(HIST_FILE)) {
    HISTORY = Jsonfile.readFileSync(HIST_FILE) || [];
    if (HISTORY.length) {
      opt = HISTORY.reverse()[0];
      if (opt.to && !opt.from) {
        opt.from = opt.to;
      }
    }
  }
  if (!opt.from) {
    usage(to, 1);
  }
  OPTIONS = opt;
  return `/me/bill?date.from=${opt.from}&date.to=${opt.to}`;
}

function getPrice(data){
  let price = '';
  if(data && data.priceWithoutTax){
    price = '[' + data.priceWithoutTax.text.padStart(12, " ") + ']';
  }
  return price;
}
/**
 * 
 * @param {*} api 
 * @returns 
 */
function getBill(bill) {
  const a = new Promise(async function (resolve, reject) {
    let url = `/me/bill/${bill}`;
    let data = await fetch(url);
    let fileUrl = data.pdfUrl;
    let target = Path.resolve(OUTPUT, `${bill}.pdf`);
    if (argv.format == 'html') {
      fileUrl = data.url;
      target = Path.resolve(OUTPUT, `${bill}.html`);
    }

    var localStream = Fs.createWriteStream(target);

    console.log(`Saving bill ${data.billId} ${getPrice(data)} into ${target}`);
    if (argv.verbose) {
      console.log("Date".padStart(20, '.'), data.date);
      for (let k in data) {
        if (/Id$|Tax$/.test(k)) {
          console.log(k.padStart(20, '.'), data[k]);
        }
      }
    }
    if (argv.json) {
      let json = { ...data };
      delete json.url;
      delete json.pdfUrl;
      let jfile = Path.resolve(OUTPUT, `${bill}.json`);
      Jsonfile.writeFileSync(jfile, json);
    }
    const req = https.request(fileUrl, res => {

      res.on('data', chunk => {
        localStream.write(chunk);
      })
      res.on('end', () => {
        resolve(target);
        localStream.end();
      })
    });

    req.on('error', (err) => {
      console.error("Failed to download", url);
      reject(err)
    });
    req.end()
  })
  return a;
}


/**
 * 
 * @returns 
 */
function fetch(url) {
  const a = new Promise(function (resolve, reject) {
    ovh.requestPromised('GET', url)
      .then(function (response) {
        resolve(response)
      })
      .catch(function (err) {
        console.log("Failed to fetch", url);
        if (/^\[date\.from\]/.test(err.message)) {
          console.error(`Start of period date ${OPTIONS.from} is invalid`);
        }else if (/^\[date\.to\]/.test(err.message)){
          console.error(`End of period date ${OPTIONS.to} is invalid`);
        }else if(err.message){
          if(err) console.error("OVH Server rejected:", err.message);
        }
        exit(1);
      });
  })
  return a;
}

function saveHistory(){
  let h = [];
  if(typeof(HISTORY.push) === "function"){
    h = HISTORY.push(OPTIONS);
  }
  Jsonfile.writeFileSync(HIST_FILE, h);

}

let cred = null;
let filenam = Path.resolve(APP_DATA, 'credentials.json');
try {
  if (argv.credentials) filenam = argv.credentials;
  cred = Jsonfile.readFileSync(filenam);
} catch (e) {
  console.error(`Could read credentials from file ${filenam}`);
  console.error(`Please be sure it exists and is a valid JSON file`);
  console.error(`type npm index.js --help to get some tips`);
  console.log("Visit https://github.com/somanos/ovh-bill#readme to learn more");
  exit(1);
}

if (!cred || !cred.appKey || !cred.appSecret || !cred.consumerKey) {
  tip();
}

const ovh = require('ovh')(cred);
let billsUrls = getBillsUrl();

let title = `| ... Getting bills for the period ${OPTIONS.from} - ${OPTIONS.to} ... |`;
console.log("".padStart(title.length, '-'));
console.log(title);
console.log("".padStart(title.length, '-'));


fetch(billsUrls).then(async (bills) => {
  //console.log("BILLS", bills);
  if (argv.output) {
    OUTPUT = argv.output;
  }

  if(!bills || !bills.length){
    console.log(`No bill found for the period ${OPTIONS.from} - ${OPTIONS.to}`);
    exit(0);
  }
  console.log(`Saving bills into ${OUTPUT}`);

  for (var bill of bills) {
    await getBill(bill);
  }
})
