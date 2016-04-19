var utils = require('./xs_utils.js');
var riffle = utils.getRiffle();
var colors = utils.getColorProfile();
var prompt = utils.getPrompt();;
var parseArgv = utils.getArgv();

var tokenSchema = {
  properties: {
    domain: {
     type: 'string',
     pattern: /^[a-zA-Z0-9\.]+$/,
     description: "Enter the domain you would like a token for.",
     message: "domains are only letters and numbers seperated by dots i.e. xs.nick2",
     required: true
    },
    name: {
     type: 'string',
     description: "Enter a name for the token.",
     required: true
    }, auth: {
     type: 'string',
     pattern: /^[a-zA-Z0-9\.]+$/,
     description: "Enter the domain of the auth appliance you would like a token from.",
     message: "domains are only letters and numbers seperated by dots i.e. xs.nick2",
     required: true
    },
  }
}
var domainSchema = {
  properties: {
    domain: {
     type: 'string',
     pattern: /^[a-zA-Z0-9\.]+$/,
     description: "Enter a domain. You will see any tokens that are a subdomain of this domain.",
     message: "domains are only letters and numbers seperated by dots i.e. xs.nick2",
     required: true
    },
 auth: {
     type: 'string',
     pattern: /^[a-zA-Z0-9\.]+$/,
     description: "Enter the domain of the auth appliance you would like to list tokens from.",
     message: "domains are only letters and numbers seperated by dots i.e. xs.nick2",
     required: true
    },
  }
}

var conn = undefined;
var args = parseArgv(process.argv.slice(2));
console.log(args);
if(args.help){
  showHelp();
  process.exit();
}

utils.determineLoginMethod(process.argv, join)

var saveFile = undefined;
var profileSave = false;
function join(user){
 conn = user;
 if(args.d){
  prompt.get(tokenSchema, getToken.bind({}, true));
 }else if(args.l){
  prompt.get(domainSchema, listTokens);
 }else{
  if(args.s){
    profileSave = true
  }
  saveFile = args.f;
  prompt.get(tokenSchema, getToken.bind({}, false));
 }
}

function getToken(deleteToken, err, result){

  if(err){
    console.log(String(err).error);
    process.exit(1);
  }
  var token_name = result.name;
  var domain = result.domain;
  var auth = conn.linkDomain(result.auth);

  if(!deleteToken){
    auth.call('gen_custom_token', token_name, domain).then(genSuccess, error.bind({call: "gen_custom_token"}));
  }else{
    auth.call('delete_custom_token', token_name, domain).then(delSuccess, error.bind({call: "delete_custom_token"}));
  }

  function delSuccess(ok){
    if(ok){
      console.log("Token deleted.".info);
      process.exit();
    }else{
      console.log("Error: Failed to delete token. It may not have existed.".error);
      process.exit(1);
    }
  }

  function get_token(){
    auth.call('get_custom_token', token_name, domain).then(getSuccess, error.bind({call: "get_custom_token"}));
  }

  function genSuccess(ok){
    if(ok){
      get_token();
    }else{
      console.log("Error: Failed to generate token.".error);
      process.exit(1);
    }
  }

  function getSuccess(token){
    if(!saveFile && !profileSave){
      console.log(token);
    }else{
      if(saveFile){
        utils.saveToFile(saveFile, token);
      }
      if(profileSave){
        utils.saveProfile(domain, token);
      }
    }
    process.exit();
  }

  function error(error){
    //TODO on gen_token fail check if token already exists warn and fetch
    if(error === "wamp.error.runtime_error: Token name/domain pair already exists"){
      console.log('Warning: Token name/domain pair already exists. Fetching existing token.'.warn);
      get_token();
      return;
    }
    console.log(this.call.error, ' : '.error, error.error);
    process.exit(1);
  }
}

function listTokens(err, result){

  if(err){
    console.log(String(err).error);
    process.exit(1);
  }
  var domain = result.domain;
  var auth = conn.linkDomain(result.auth);

  auth.call('list_custom_tokens', domain).then(listSuccess, error.bind({call: "list_custom_tokens"}));

  function listSuccess(resp){
    for(var dom in resp){
      console.log("******************************".help);
      console.log("*".help, "Domain: ".data, dom.help);
      for(var token in resp[dom]){
        console.log("*".help, "\tToken Name: ".data, resp[dom][token].name.help, '\tCreated: '.data, (new Date(resp[dom][token].created *1000)).toLocaleString().help, '\tExpires: '.data, (new Date(resp[dom][token].expires *1000)).toLocaleString().help)
      }
      console.log("******************************".help);
    }
    process.exit();
  }

  function error(error){
    console.log(this.call.error, ' : '.error, error.error);
    process.exit(1);
  }
}

function showHelp(){

  var desc = "\n\nThis module helps with some token management functions. You can\n";
  desc +=        "easily save delete and list tokens for which you have          \n";
  desc +=        "permissions saved in the Auth appliance you specify. Retrieved \n";
  desc +=        "tokens can be saved to file, or to the profiles folder for use \n";
  desc +=        "in authentication in this and other jsRiffleUtils modules.   \n\n";

  var help = "Usage: node token_getter.js (-flags)\n";
  help += utils.helpFlags();
  help += "\t\t-d - Delete the token from the specified Auth Appliance.\n";
  help += "\t\t-l - List the tokens belonging to the specified domain from the specified Auth Appliance.\n";
  help += "\t\t-s - Save the token as a profile that you can use for later authentication with the -p flag.\n";
  help += "\t\t-f /path/to/file - Save the token to the specified file.\n";
  console.log(desc.data, help.help);
}
