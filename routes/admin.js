'use strict';
const express = require('express'),
      router = express.Router(),
      crypto = require('crypto'),
      fs = require('fs'),
      path = require('path'),
      generateRSAKeypair = require('generate-rsa-keypair');

function createActor(name, domain, pubkey) {
  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1'
    ],

    'id': `https://${domain}/u/${name}`,
    'type': 'Person',
    'preferredUsername': `${name}`,
    'inbox': `https://${domain}/api/inbox`,

    'publicKey': {
      'id': `https://${domain}/u/${name}#main-key`,
      'owner': `https://${domain}/u/${name}`,
      'publicKeyPem': pubkey
    }
  };
}

function createWebfinger(name, domain) {
  return {
    'subject': `acct:${name}@${domain}`,

    'links': [
      {
        'rel': 'self',
        'type': 'application/activity+json',
        'href': `https://${domain}/u/${name}`
      }
    ]
  };
}

router.post('/create', function (req, res) {
  // pass in a name for an account, if the account doesn't exist, create it!
  const account = req.body.account;
  const domain = req.app.get('domain');
  if (account === undefined) {
    return res.status(400).json({msg: 'Bad request. Please make sure "account" is a property in the POST body.'});
  }

  // check to see if account already exists on filesystem
  const accountDirectory = path.join(__dirname, '..', 'accounts', account + '@' + domain);
  if (fs.existsSync(accountDirectory)) {
    return res.status(400).json({msg: 'Bad request. Account already exists.'});
  }

  // new account - good to go, create the account directory structure
    try {
        fs.mkdirSync(accountDirectory, 0o775); // make dir, owner group rw world r
        fs.mkdirSync(path.join(accountDirectory, 'private'), 0o770);
        fs.mkdirSync(path.join(accountDirectory, 'private', 'subscribers'), 0o770);
        fs.mkdirSync(path.join(accountDirectory, 'private', 'subscriptions'), 0o770);
        fs.mkdirSync(path.join(accountDirectory, 'private', 'subscriptions', 'subscriptionLists'), 0o770);
        fs.mkdirSync(path.join(accountDirectory, 'public'), 0o775);
        fs.mkdirSync(path.join(accountDirectory, 'public', 'media'), 0o775);
        fs.mkdirSync(path.join(accountDirectory, 'public', 'posts'), 0o775);
        fs.mkdirSync(path.join(accountDirectory, 'public', 'tags'), 0o775);
        fs.mkdirSync(path.join(accountDirectory, 'public', 'profile'), 0o775);
    } catch (e) {
        throw e;
    }

  // directory structure successfully created, now create signing keypair for the account
  var pair = generateRSAKeypair();
  // write public key
  const pubKeyPath = path.join(accountDirectory, 'id_rsa.pub');
  try {
    fs.writeFileSync(pubKeyPath, pair.public, {encoding: 'utf8', mode: 0o664});
  } catch (e) {
    throw e;
  }
  // write private key
  const privKeyPath = path.join(accountDirectory, 'private', 'id_rsa.privkey');
  try {
    fs.writeFileSync(privKeyPath, pair.private, {encoding: 'utf8', mode: 0o660});
  } catch (e) {
    throw e;
  }

  // time to create the ActivityPub actor for the account
  let actorRecord = createActor(account, domain, pair.public);
  const actorPath = path.join(accountDirectory, 'public', 'profile', 'profile.json');
  try {
    fs.writeFileSync(actorPath, JSON.stringify(actorRecord), {encoding: 'utf8', mode: 0o664});
  } catch (e) {
    throw e;
  }

  // now create the webfinger file for the account
  let webfingerRecord = createWebfinger(account, domain);
  const webfingerPath = path.join(accountDirectory, 'public', 'webfinger.json');
  try {
    fs.writeFileSync(webfingerPath, JSON.stringify(webfingerRecord), {encoding: 'utf8', mode: 0o664});
  } catch (e) {
    throw e;
  }

  // and finally, generate and store an api key for account access
  const apikey = crypto.randomBytes(64).toString('hex');
  const apikeyPath = path.join(accountDirectory, 'private', '.apikey');
  try {
    fs.writeFileSync(apikeyPath, apikey, {encoding: 'utf8', mode: 0o660});
  } catch (e) {
   throw e;
  }
  // return success and api key
  res.status(200).json({msg: 'ok', key: apikey});
});

module.exports = router;
