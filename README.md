# jsRiffle Utils

## A set of tools that can be used to do helpful things with Exis that I build as I need them.

2. [Exis CLI Tool](#Exis CLI Tool)
1. [Token Getter](#Token Getter)

### Exis CLI TOOL

> Login with your Exis Developer Credentials to open a connection and than use riffle commands from cli

Usage: `node exis_cli.js`

Option Flags:
 * -- help - Show help dialogue
 * -e - Authenticate using environment variables EXIS_DOMAIN and EXIS_TOKEN.
 * -p domain - Authenticate using previously stored domain profile.
 * --script /path/to/file - Run a script of instructions from a file. Use // to denote comments.

Commands:

### Token Getter

> Retrieve a token for a particular domain that you can use to join the fabric with. Tokens are good for 60 days.

Usage: `node token_getter.js`

Option Flags:
 * -- help - Show help dialogue
 * -e - Authenticate using environment variables EXIS_DOMAIN and EXIS_TOKEN.
 * -p domain - Authenticate using previously stored domain profile.
 * -d - Delete the token from the specified Auth Appliance.
 * -l - List the tokens belonging to a domain from the specified Auth Appliance.
 * -s - Save the token as a profile that you can use for later authentication with the -p flag.
 * -f /path/to/file - Save the token to the specified file.

