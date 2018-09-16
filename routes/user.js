'use strict';
const express = require('express'),
      router = express.Router(),
      fs = require('fs'),
      path = require('path');

router.get('/:name', function (req, res) {
  let name = req.params.name;
  if (!name) {
    return res.status(400).send('Bad request.');
  }
  let domain = req.app.get('domain');
  name = `${name}@${domain}`;
  const accountPath = path.join(__dirname, '..', 'accounts', name);
  let result = fs.existsSync(accountPath);
  if (result === false) {
    return res.status(404).send(`No record found for ${name}.`);
  }
  // return the json on file for this account
  try {
    let account = JSON.parse(fs.readFileSync(path.join(accountPath, 'public', 'profile', 'profile.json')));
    res.json(account);
  } catch (e) {
    throw e;
  }
});

module.exports = router;
