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

var pjson = require('prettyjson');

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

exp.argPair = function(arg1, arg2, type){
  if(typeof arg1 === type){
    return arg1;
  }else if(typeof arg2 === type){
    return arg2;
  }else{
    return undefined;
  }
};

exp.determineLoginMethod = function(argv, callback){
  var mainArgs = parseArgv(argv.splice(2));
  var env = exp.argPair(mainArgs.e, mainArgs.env, 'boolean');
  var profile = exp.argPair(mainArgs.p, mainArgs.profile, 'string');
  if(env){
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
  }else if(profile){
    console.log("Attempting to Join from profile ".info, profile.info);
    var user = loadFromProfile(profile);
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

exp.saveProfile = function(domain, token, name){
  if(!token || !domain || !name){
    console.log("Error: Couldn't find token/domain/name to save.".error);
    return false;
  }
  if(!mkdir('./.xs_profiles')){
    return false;
  }
  var file = domain + '\n' + token;
  return saveToFile('./.xs_profiles/' + name, file);
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

function loadFromProfile(name){
  console.log("Attempting to load profile for ".info, name.info );
  var file = readFromFile('./.xs_profiles/'+ name, "Couldn't find profile " + name);
  if(!file){
    return false;
  }
  file = file.split('\n');
  if(file.length < 2){
    console.log("Error: Improperly formated profile.".error);
    return false;
  }
  var user = riffle.Domain(file[0]);
  user.setToken(file[1]);
  return user;
}
exp.loadFromProfile = loadFromProfile;

function readFromFile(path, errmsg){
  var data = null;
  try{
    data = fs.readFileSync(path, 'utf8');
  }catch(e){
    if(errmsg){
      console.log("Error: ".error, errmsg.error);
    }else{
      console.log("Error: ".error, e.message.error);
    }
    return false;
  }
  return data;
}
 
exp.readFromFile = readFromFile;

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

exp.prettyPrintLoop = function(items, title, label){
        label = label || '';
        if(title){
          console.log('\n' + title.help);
        }
        console.log('******************************'.help);
        for(var i in items){
          console.log(label.help + ' ' + i.help, ': \n'.help, pjson.render(items[i] ,{}));
        }
        console.log('******************************'.help);
};

exp.mkdir = mkdir;

var helps = {};
function loadHelps(){
  var dir = fs.readdirSync('./help_dialogues');
  dir.forEach(function(help){
    helps[help] = exp.readFromFile('./help_dialogues/'+help);
  });
}
loadHelps();

exp.help = function(name){
  return helps[name];
}
