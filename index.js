const config = require('./.env'); // pulls .env as a block variable with global scope
const { USER, PASS, DOMAIN, PORT } = config; // Breaks config into 4 variables with global scope
const express = require('express'); // sets express as the module express with global scope
const app = express(); /* sets the function express() as app with global scope http://expressjs.com/ */
const fs = require('fs'); /* sets fs context for fs https://nodejs.org/api/fs.html */
const routes = require('./routes'); // the routes directory used by express
const bodyParser = require('body-parser'); /* Json parser https://www.npmjs.com/package/body-parser */
const cors = require('cors'); /* allows cross domain posting https://www.npmjs.com/package/cors */
const http = require('http'); /* Maintains connection https://nodejs.org/api/http.html#http_class_http_agent */
const basicAuth = require('express-basic-auth'); /* Allows use of passwords
                                                    https://www.npmjs.com/package/express-basic-auth */

app.set('domain', DOMAIN); // adds the domain to app variable calling on express
app.set('port', process.env.PORT || PORT || 3000); // sets port to 3000 or the port value in the .env file
app.use(bodyParser.json({type: 'application/activity+json'})); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// basic http authorizer

// activate the authorizer
let basicUserAuth = basicAuth({
  authorizer: asyncAuthorizer,
  authorizeAsync: true, // overrides the defalt synchronise behavior -- passed a callback as the third parameter
    // which is expected to be called by standard node convention with an error and a boolean to indicate if
    // the credentials have been approved or not.
  challenge: true // <--- needed to actually show the login dialog!
});



function asyncAuthorizer(username, password, cb) { // username and password as entered from form
    // cb is an error code and a boolean value for determining if username/password pair match USER/PASS
  let isAuthorized = false; // Sets default value of function to false
  const isUsernameAuthorized = username === USER; // returns true if username and USER are strictly equal
  const isPasswordAuthorized = password === PASS; // returns true if password and PASS are strictly equal
    // PASS and USER are imported from the values in ./.env
  isAuthorized = isPasswordAuthorized && isUsernameAuthorized; // are both the username and password true
  if (isAuthorized) { // checks to see if isAuthorized is true i.e. username/password pair match USER/PASS
    return cb(null, true); // set error check value and boolean value for successful match
  }
  else {
    return cb(null, false); // set error check value and boolean value for a mismatch of either PASS or USER
  }
}

app.get('/', (req, res) => res.send('Hello World!')); // Domain address route i.e. site.url/

// Sets default routes required for admin access and activity pub communication with remote servers
app.options('/api', cors()); // ???
app.use('/api', cors(), routes.api); // ???
app.use('/api/admin', cors({ credentials: true, origin: true }), basicUserAuth, routes.admin); // password check for admin page
app.use('/admin', express.static('public/admin')); // route to admin page
app.use('/.well-known/webfinger', routes.webfinger); // location of webfinger to verify user exists
app.use('/u', cors(), routes.user); // ???
app.use('/api/inbox', cors(), routes.inbox); // ???

http.createServer(app).listen(app.get('port'), function(){ // starts the webserver using express on port defined in ./.env
  console.log('dogshed server listening on port ' + app.get('port')); // console output of successful server start
});
