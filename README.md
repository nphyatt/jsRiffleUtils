# jsRiffle Utils

## A set of tools that can be used to do helpful things with Exis that I build as I need them.

1. [Token Getter](#Token Getter)
2. [Exis CLI Tool](#Exis CLI Tool)

### Token Getter

> Retrieve a token for a particular domain that you can use to join the fabric with. Tokens are good for 60 days.

```
//follow prompt
node token_getter.js
```

### Exis CLI TOOL

> Login with your Exis Developer Credentials to open a connection and than use riffle commands from cli

```
//login with username and password
node exis_cli.js

//use enviroment variables EXIS_DOMAIN and EXIS_TOKEN as credentials
node exis_cli.js -e

//use a saved profile as credentials
node exis_cli.js -p domain

//help dialoge
node exis_cli.js --help

```
