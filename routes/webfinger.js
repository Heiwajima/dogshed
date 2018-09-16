'use strict';
const express = require('express'),
      router = express.Router(),
      fs = require('fs'),
      path = require('path');

router.get('/', function (req, res) {
  let resource = req.query.resource;
  if (!resource || !resource.includes('acct:')) {
    return res.status(400).send('Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.');
  }
  else {
    let name = resource.replace('acct:','');
    let accountPath = path.join(__dirname, '..', 'accounts', name);
    let result = fs.existsSync(accountPath);
    if (result === false) {
        return res.status(404).send(`No record found for ${name}.`);
    } else {
        try {
            let webfingerData = JSON.parse(fs.readFileSync(path.join(accountPath, 'public', 'webfinger.json')));
            res.json(webfingerData);
        } catch (Exception e) {
            throw e;
        }
    }
  }
});

module.exports = router;
