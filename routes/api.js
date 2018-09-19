'use strict';
const express = require('express'),
      router = express.Router(),
      request = require('request'),
      crypto = require('crypto'),
      fs = require('fs'),
      path = require('path');

router.post('/sendMessage', function (req, res) {
  console.log("sendMessage:");
  let domain = req.app.get('domain');
  let acct = req.body.acct;
  let apikey = req.body.apikey;
  let message = req.body.message;
    // check to see if your API key matches
    const fullAccount = `${acct}@${domain}`;
    const accountDirectory = path.join(__dirname, '..', 'accounts', fullAccount);
    const apikeyFile = path.join(accountDirectory, 'private', '.apikey');
    let actualApikey = fs.readFileSync(apikeyFile, {encoding: 'utf8'});
    //db.get('select apikey from accounts where name = $name', {$name: `${acct}@${domain}`}, (err, result) => {
    if (actualApikey === apikey) {
      console.log("  apikey valid.");
      sendCreateMessage(message, acct, domain, req, res);
    }
    else {
      res.status(403).json({msg: 'wrong api key'});
    }
    //});
});

function signAndSend(message, name, domain, req, res, targetDomain, inbox) {
  // get the private key
  let inboxFragment = inbox.replace('https://'+targetDomain,'');
  let privkey = fs.readFileSync(path.join(__dirname, '..', 'accounts', name + '@' + domain, 'private', 'id_rsa.privkey'));
  const signer = crypto.createSign('sha256');
  let d = new Date();
  let stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}`;
  signer.update(stringToSign);
  signer.end();
  const signature = signer.sign(privkey);
  const signature_b64 = signature.toString('base64');
  let header = `keyId="https://${domain}/u/${name}",headers="(request-target) host date",signature="${signature_b64}"`;
  request({
    url: inbox,
    headers: {
        'Host': targetDomain,
        'Date': d.toUTCString(),
        'Signature': header
    },
    method: 'POST',
    json: true,
    body: message
  }, function (error, response){
    console.log(`Sent message to an inbox at ${targetDomain}!`);
    if (error) {
      console.log('Error:', error, response);
    }
    else {
      console.log('Response Status Code:', response.statusCode);
    }
  });
}

function createMessage(text, name, domain) {
  const guid = crypto.randomBytes(16).toString('hex');
  let d = new Date();

  return {
    '@context': 'https://www.w3.org/ns/activitystreams',

    'id': `https://${domain}/${guid}`,
    'type': 'Create',
    'actor': `https://${domain}/u/${name}`,

    'object': {
      'id': `https://${domain}/${guid}`,
      'type': 'Note',
      'published': d.toISOString(),
      'attributedTo': `https://${domain}/u/${name}`,
      'content': text,
      'to': 'https://www.w3.org/ns/activitystreams#Public'
    }
  };
}

function sendCreateMessage(text, name, domain, req, res) {
    console.log("  sendCreateMessage:");
    let message = createMessage(text, name, domain);
    const accountDirectory = path.join(__dirname, '..', 'accounts', name + '@' + domain);
    const subscriberDirectory = path.join(accountDirectory, 'private', 'subscribers');

    // let's build a subscriber list
    let subscribers = JSON.parse(fs.readFileSync(path.join(subscriberDirectory, 'subscribers.json')));
    console.log("    subscribers:");
    console.dir(subscribers);
    if (subscribers.length === 0) { res.status(400).json({msg: `No followers for account ${name}@${domain}`});}

    for (let subscriber of subscribers) {
        let inbox = subscriber.inbox;
        let myURL = new URL(subscriber.id);
        let targetDomain = myURL.hostname;
        signAndSend(message, name, domain, req, res, targetDomain, inbox);
    }
    res.status(200).json({msg: 'ok'});
};

module.exports = router;
