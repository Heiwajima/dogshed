# dogshed
## forked from Darius' [express-activitypub](https://github.com/dariusk/express-activitypub) project

A very simple standalone ActivityPub server that supports:

* creation of new Actors via API
* discovery of our Actors via webfinger (so you can find these accounts from other instances)
* notifying followers of new posts (so new posts show up in their timeline)

_This is meant as a reference implementation!_ This code implements a very small subset of ActivityPub and is supposed to help you get your bearings when it comes to making your own barebones ActivityPub support in your own projects. (Of course you can still fork this and start building on it as well, but it's not exactly hardened production code.)

My initial use case: rework to depend primarily on flat json files in the filesystem for data storage, add enough functionality to mimic a barebones implementation of Mastodon's backend done as minimalistically as possible, targeting single-user instances running on low-power systems. My primary development systems will be a Raspberry Pi 3 with a 120 Gb SATA drive and a Raspberry Pi Zero W with a 16 Gb USB flash drive, but this should run on any ARM 7 or x86-64 platform that supports Node.js.

## Requirements

This requires Node.js v10.10.0 or above.

## Installation

Clone the repository, then `cd` into its root directory. Install dependencies:

`npm install`

Update your `config.json` file:

**TODO**: move to .env, add some more structure for configuration, write setup script to populate .env if none exists on first run

```js
{
  "USER": "pickAUsername",
  "PASS": "pickAPassword",
  "DOMAIN": "mydomain.com", // your domain! this should be a discoverable domain of some kind like "example.com"
  "PORT": "3000", // the port that Express runs on
  "PRIVKEY_PATH": "/path/to/your/ssl/privkey.pem", // point this to your private key you got from Certbot or similar
  "CERT_PATH": "/path/to/your/ssl/cert.pem" // point this to your cert you got from Certbot or similar
}
```

Run the server!

`node index.js`

**TODO**: add creation of first admin account during setup script, detect if .env exists but first user has not been created and prompt for creation at start

Go to the admin page and create an account:

`http://yourdomain.com/admin`

Enter "test" in the "Create Account" section and hit the "Create Account" button. It will prompt you for the user/pass you just set in your config file, and then you should get a message with some verification instructions, pointing you to some URLs that should be serving some ActivityPub JSON now.

## Local testing

**TODO**: explain nginx and apache configs here, add to setup script, offer to write nginx and apache configs during setup script

You can use a service like [ngrok](https://ngrok.com/) to test things out before you deploy on a real server. All you need to do is install ngrok and run `ngrok http 3000` (or whatever port you're using if you changed it). Then go to your `config.json` and update the `DOMAIN` field to whatever `abcdef.ngrok.io` domain that ngrok gives you and restart your server.

## Admin Page

For your convenience, if you go to the `/admin` endpoint in a browser, you will see an admin page. Don't worry, nothing is possible here unless either your admin user/pass (for creating accounts) or a valid API key (for sending messages as an account). This page provides a simple web form for both creating accounts and sending messages to followers.

## API

**TODO**: flesh this out - target mastodon/pleroma API compatibility from client side for initial pass, same for ActivityPub coverage

### Create Account

Create a new account. This is a new ActivityPub Actor, along with its webfinger record. This creates a new row in the `accounts` table in the database.

Send a POST to `/api/admin/create` using basic HTTP auth with the admin username/password. The form body needs an "account" field. An example CURL request:

```
curl -u adminUsername:adminPassword -d "account=test" -H "Content-Type: application/x-www-form-urlencoded" -X POST http://example.com/api/admin/create
```

This will return a 200 status and `{msg: "ok", apikey: "yourapikey"}` if all goes well.

### Send Message to Followers

Send a message to followers. This is NOT a direct message or an @-mention. This simply means that the message you post via this endpoint will appear in the timelines (AKA inboxes) of every one of the account's followers.

Send a POST to `api/sendMessage` with the form fields `acct`, `apikey`, and `message`.

* `acct`: the account name in the form "myAccountName" (no domain or @'s needed)
* `apikey`: your hex API key
* `message`: the message you want to send -- for Mastodon-compatible posts this might be plain text or simple HTML, but ActivityPub is a lot more flexible than just Mastodon! In theory, according to the [ActivityPub spec](https://www.w3.org/TR/activitypub/#create-activity-outbox) it can be any [ActivityStreams object](https://www.w3.org/TR/activitystreams-core/#object)

## Database

**TODO**: explain directory structure of flat json files for various pertinent Actors and Objects.

This server uses a SQLite database to keep track of all the data. There is one table in the database: `accounts`.

### `accounts`

This table keeps track of all the data needed for the accounts. Columns:

* `name` `TEXT PRIMARY KEY`: the account name, in the form `thename@example.com`
* `privkey` `TEXT`: the RSA private key for the account
* `pubkey` `TEXT`: the RSA public key for the account
* `webfinger` `TEXT`: the entire contents of the webfinger JSON served for this account
* `actor` `TEXT`: the entire contents of the actor JSON served for this account
* `apikey` `TEXT`: the API key associated with this account
* `followers` `TEXT`: a JSON-formatted array of the URL for the Actor JSON of all followers, in the form `["https://remote.server/users/somePerson", "https://another.remote.server/ourUsers/anotherPerson"]`
* `messages` `TEXT`: not yet used but will eventually store all messages so we can render them on a "profile" page

## License

Copyright (c) 2018 DJ Sundog. Licensed under the MIT license.

