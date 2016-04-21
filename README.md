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
 * help - show help dialogue.
 * help storage - show dialogue detailing storage API and options.
 * help [command] - show detailed help dialogues for any specified commands.
 * use -d domain - switch working domain.
 * use -s domain -c collection - switch working domain to xsCollection API for Storage Appliance with domain.
 **Note:** The 'xs' variable is your current working domain or Appliance API
 * xs.call('ep', ...args); - make a call  using the cwd.
 * xs.publish('channel', ...args) - make a publish  using the cwd.
 * xs.register('ep', func) - **Must use keyword func** register to recieve calls using the cwd.
 * xs.unregister('ep') - unregister a call on the cwd.
 * xs.subscribe('channel', func) - **Must use keyword func** subscribe to a channel using the cwd.
 * xs.unsubscribe('channel') - unsubscribe from a channel using the cwd.
 * clear | c - clear screen.
 * save - save the current logged in token and domain as a profile to be used later for authentication with -p.
 * logs - follow the logs for the current working domain.
 * import -f /path/to/file -n name - Import a node module at path and store under name.
 * script -f /path/to/file - Run a script of instructions from a file. Use // to denote comments.
 * exit - exit CLI Tool.

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

