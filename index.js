const config = require('./.env');
const { USER, PASS, DOMAIN, PORT } = config;
const express = require('express');
const app = express();
const fs = require('fs');
const routes = require('./routes'),
      bodyParser = require('body-parser'),
      cors = require('cors'),
      http = require('http'),
      basicAuth = require('express-basic-auth');

app.set('domain', DOMAIN);
app.set('port', process.env.PORT || PORT || 3000);
app.use(bodyParser.json({type: 'application/activity+json'})); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// basic http authorizer
let basicUserAuth = basicAuth({
  authorizer: asyncAuthorizer,
  authorizeAsync: true,
  challenge: true
});

function asyncAuthorizer(username, password, cb) {
  let isAuthorized = false;
  const isUsernameAuthorized = username === USER;
  const isPasswordAuthorized = password === PASS;
  isAuthorized = isPasswordAuthorized && isUsernameAuthorized;
  if (isAuthorized) {
    return cb(null, true);
  }
  else {
    return cb(null, false);
  }
}

app.get('/', (req, res) => res.send('Hello World!'));

// admin page
app.options('/api', cors());
app.use('/api', cors(), routes.api);
app.use('/api/admin', cors({ credentials: true, origin: true }), basicUserAuth, routes.admin);
app.use('/admin', express.static('public/admin'));
app.use('/.well-known/webfinger', routes.webfinger);
app.use('/u', cors(), routes.user);
app.use('/api/inbox', cors(), routes.inbox);

http.createServer(app).listen(app.get('port'), function(){
  console.log('dogshed server listening on port ' + app.get('port'));
});
