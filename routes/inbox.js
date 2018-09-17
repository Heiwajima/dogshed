'use strict';
const express = require('express'),
      crypto = require('crypto'),
      request = require('request'),
      router = express.Router(),
      fs = require('fs'),
      path = require('path');

function signAndSend(message, name, domain, req, res, targetDomain) {
    // get the private key from the proper subdirectory on the filesystem
    let accountPath = path.join(__dirname, '..', 'accounts', name + '@' + domain);
    let privkeyPath = path.join(accountPath, 'private', 'id_rsa.privkey');
    let privkey = false;
    try {
      privkey = fs.readFileSync(privkeyPath, {encoding: 'utf8'});
    } catch (e) {
      throw e;
    }

    if (privkey === false) {
      return res.status(500).send(`Unable to sign message for ${name}.`);
    }
    const signer = crypto.createSign('sha256');
    let d = new Date();
    let stringToSign = `(request-target): post /inbox\nhost: ${targetDomain}\ndate: ${d.toUTCString()}`;
    signer.update(stringToSign);
    signer.end();
    const signature = signer.sign(privkey);
    const signature_b64 = signature.toString('base64');
    let header = `keyId="https://${domain}/u/${name}",headers="(request-target) host date",signature="${signature_b64}"`;
    request({
        url: `https://${targetDomain}/inbox`,
        headers: {
          'Host': targetDomain,
          'Date': d.toUTCString(),
          'Signature': header
        },
        method: 'POST',
        json: true,
        body: message
    }, function (error, response){
        if (error) {
          console.log('Error:', error, response.body);
        }
        else {
          console.log('Response:', response.body);
        }
    });
    return res.status(200);
}

function sendAcceptMessage(thebody, name, domain, req, res, targetDomain) {
  const guid = crypto.randomBytes(16).toString('hex');
  let message = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    'id': `https://${domain}/${guid}`,
    'type': 'Accept',
    'actor': `https://${domain}/u/${name}`,
    'object': thebody,
  };
  return signAndSend(message, name, domain, req, res, targetDomain);
}

function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch(e) {
    return null;
  }
}

router.post('/', function (req, res) {
  let domain = req.app.get('domain');
  const myURL = new URL(req.body.actor);
  let targetDomain = myURL.hostname;

  // make sure we can read the request
  if (typeof req.body.object !== 'string') {
    return res.status(400).send('Unparseable request.');
  }

    // all good - tease out the account name
  let name = req.body.object.replace(`https://${domain}/u/`,'');
  let accountName = req.body.object.replace(`https://${domain}/u/`,'') + '@' + domain;
  // does the account exist?
  let accountPath = path.join(__dirname, '..', 'accounts', accountName);
  if (fs.existsSync(accountPath) === false) {
    return res.status(404).send('Account not found: ' + accountName);
  }

  if (req.body.type === 'Follow') {
    // handle follow request
    // TODO: handle locked accounts / follow approval use case
    // check subscribers for account
    try {
        let subscribersPath = path.join(accountPath, 'private', 'subscribers');
        let newSubscriberPath = path.join(subscribersPath, encodeURIComponent(req.body.actor));
        if (fs.existsSync(newSubscriberPath)) {
            // already following, just say okay
            return res.status(200);
        }
        // still here? new subscriber - set them up
        fs.mkdirSync(newSubscriberPath, 0o770);
        let subscriberProfilePath = path.join(newSubscriberPath, 'profile.json');

        // get the new subscriber's profile and cache it locally
        request({
            // TODO: use proper header instead of this masto-centric hack
            url: req.body.actor + '.json',
            method: "GET"
        }, (err, resp) => {
            fs.writeFileSync(subscriberProfilePath, resp.body, {encoding: 'utf8', mode: 0o660});
        });
    } catch (e) {
      throw(e);
    }
    console.log('added ' + req.body.actor +  ' to followers of ' + accountName);
    return sendAcceptMessage(req.body, name, domain, req, res, targetDomain);
  }
});

module.exports = router;
