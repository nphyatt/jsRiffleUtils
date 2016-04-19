module.exports = {};
var exp = module.exports;

var fs = require('fs');

var colors = require('colors');
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

var riffle = require('jsriffle');
if(process.env.WS_URL){
  riffle.setFabric(process.env.WS_URL);
}

var registrar = require('./login.js');
if(process.env.WS_URL){
  var url = process.env.WS_URL.trim().replace(/^wss/g, 'https').replace(/^ws/g, 'http').replace(/:8000(\/wss?)?/g, ':8880');
  registrar.setRegistrar(url);
}

require('shelljs/global');

var parseArgv = require('minimist');

var prompt = require('prompt');
var loginSchema = {
  properties: {
    username: { 
      type: 'string',
      pattern: /^[a-zA-Z0-9]+$/,
      description: "Enter your Exis developer login",
      message: "usernames are only letters and numbers",
      required: true
    },
    password: {
     type: 'string',
     hidden: true,
     required: true
    }
  }
}
prompt.start();

exp.getPrompt = function(){
  return prompt;
};

function promptLogin(callback){
  prompt.get(loginSchema, passLogin.bind({}, callback));
}

//login process
function passLogin(callback, err, user){

  if(err){
    console.log(String(err).error);
    process.exit(1);
  }

  var xs = riffle.Domain('xs.demo');

  login(xs, user).then(loginSuccess, loginError);

  function loginSuccess(user){
    completeJoin(callback, user);
  }

  function loginError(error){
    console.log(error.error);
    process.exit(1);
  }
}


exp.promptLogin = promptLogin;


exp.getArgv = function(){
  return parseArgv;
}

exp.determineLoginMethod = function(argv, callback){
  var mainArgs = parseArgv(argv.splice(2));

  if(mainArgs.e){
    //join from env vars
    var domain = process.env.EXIS_DOMAIN;
    var token = process.env.EXIS_TOKEN;
    if(!domain || domain === ''){
      console.log("Error: Couldn't find EXIS_DOMAIN in ENV".error);
      process.exit(1);
    }else if (!token || token === ''){
      console.log("Error: Couldn't find EXIS_TOKEN in ENV".error);
      process.exit(1);
    }else{
      console.log("Attempting to Join as ".info, domain.info );
      var user = riffle.Domain(domain);
      user.setToken(token);
      completeJoin(callback, user);
    }
  }else if(mainArgs.p){
    console.log("Attempting to Join from profile ".info, mainArgs.p.info);
    var user = loadFromProfile(mainArgs.p);
    if(!user){
      process.exit(1);
    }
    completeJoin(callback, user);
  }else{
    //default to password login
    promptLogin(callback);
  }
}

function completeJoin(callback, user){
  var joined = false;
  user.onJoin = function(){
    joined = true;
    callback(user);
  };
  user.join();
  setTimeout(joinError, 5000);

  function joinError(){
    if(!joined){
      console.log("Failed to connect...aborting".error);
      process.exit(1);
    }
  }
}


function login(domain, user){
  return registrar.login.bind(domain)(user);
}
exp.login = login;

exp.getRiffle = function(){
  return riffle;
}

exp.getColorProfile = function(){
  return colors;
};

exp.saveProfile = function(domain, token){
  if(!token || !domain){
    console.log("Error: Couldn't find token/domain to save.".error);
    return false;
  }
  if(!mkdir('./.xs_profiles')){
    return false;
  }
  return saveToFile('./.xs_profiles/' + domain, token);
};

function saveToFile(path, data){
  try{
    fs.writeFileSync(path, data, 'utf8');
  }catch(e){
    if(e.code === "ENOENT"){
      console.log(e.path.error, " is not a valid path. Please specify a valid path to save to.".error);
    }else{
      console.log(e.message.error);
    }
    return false;
  }
  return true;
}

exp.saveToFile = saveToFile;

function loadFromProfile(domain){
  var token = null;
  try{
    token = fs.readFileSync('./.xs_profiles/'+ domain, 'utf8');
  }catch(e){
    console.log("Error: ".error, e.message.error);
    return false;
  }
  console.log("Attempting to Join as ".info, domain.info );
  var user = riffle.Domain(domain);
  user.setToken(token);
  return user;
}
exp.loadFromProfile = loadFromProfile;

function mkdir(dir){
  try{
    fs.statSync(dir);
  }catch(e){
    if(e.code === "ENOENT"){
      try{
        fs.mkdirSync(dir);
      }catch(e){
        console.log(e.message.error);
        return false;
      }
    }else{
      console.log(e.message.error);
      return false;
    }
  }
  return true;
}

exp.mkdir = mkdir;

exp.helpFlags = function(){
  var help = "";
  help += "\tflags: \n";
  help += "\t\t--help - Show this dialogue\n";
  help += "\t\t-p domain - Authenticate using a saved profile corresponding to the domain.\n";
  help += "\t\t-e - Authenticate using the enviroment variables EXIS_DOMAIN and EXIS_TOKEN.\n";
  return help;
}
