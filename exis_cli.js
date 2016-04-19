var riffle = require('jsriffle');
var registrar = require('./login.js');
var prompt = require('prompt');
require('shelljs/global');
var parseArgv = require('minimist');
var schema = {
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

var cli = {
  properties: {
    "$": { 
      type: 'string'
    }
  }
}

var commands = [
    {match: /^c$/, fnc: clearCommand },
    {match: /^clear$/, fnc: clearCommand },
    {match: /^help$/, fnc: helpCommand },
    {match: /^use /, fnc: useCommand },
    {match: /^exit$/, fnc: exitCommand },
    {match: /^xs\.register/, fnc: regCommand },
    {match: /^xs\.subscribe/, fnc: regCommand },
    {match: /^xs\.call/, fnc: runCommand },
    {match: /^xs\.publish/, fnc: runCommand },
    {match: /^xs\.unregister/, fnc: runCommand },
    {match: /^xs\.unsubscribe/, fnc: runCommand },
    ];

var connections = {};
var storages = {};
var cwd = undefined;
var topConn = undefined;

prompt.start();

prompt.get(schema, login);

//login process
function login(err, user){

  if(err){
    console.log(err);
    process.exit(1);
  }

  var xs = riffle.Domain('xs.demo');

  registrar.login.bind(xs)(user).then(join, loginError);

  function loginError(error){
    console.log(error);
    process.exit(1);
  }

  function join(user){
    topConn = user;
    user.onJoin = function(){
      useCommand('use -d ' + user.getName(), user);
    };;
    user.join();
  }
}

function getCommand(){
  cli.properties.$.description = '(' + cwd + ')$';
  prompt.get(cli, parseCommand);
}

function parseCommand(err, argv){

  if(err){
    throw err;
    process.exit(1);
  }

  var command = argv.$.split('--options');
  var args = [];
  if(command[1]){
   args = parseArgv(command[1].replace(/\s/g, ' ').trim().split(' '));
  }
  command = command[0].trim();


  var run = null;
  commands.forEach(function(cmd){
    if(command.match(cmd.match)){
      run = cmd.fnc;
    }   
  });
  if(!run && cwd.includes('Storage')){
    run = runCommand;
  }
  if(!run){
    helpCommand();
    return;
  }

  run(command, connections[cwd])
  
}

function exitCommand(){
  console.log('Goodbye');
  process.exit();
}

function useCommand(command, conn){
  var argv = parseArgv(command.replace(/\s/g, ' ').trim().split(' ').slice(1));
  if(! argv.s && argv.d){
    cwd = argv.d;
    if(!connections[cwd]){
      connections[cwd] = topConn.linkDomain(cwd);
    }
  }else if( argv.s && argv.c){
    cwd = 'StorageCollection[' + argv.c + ']' + argv.s;
    if(!connections[cwd]){
      if(!storages[argv.s]){
        storages[argv.s] = riffle.xsStorage(topConn.linkDomain(argv.s));
      }
      connections[cwd] = storages[argv.s].xsCollection(argv.c);
    }
  }else{
    helpCommand();
    return;
  }
  getCommand();
}

function runCommand(command, conn){
    var p = undefined;
    var pre = "return ";
    try {
      var fnc = new Function('xs', pre + command);
      p = fnc.call({}, conn);
    } catch (e) {
      console.log("Error: " + e.message);
      getCommand();
      return;
    }
    p.then(function(){
      console.log('\n******************************\n* Recieved Response\n* Return:\n');
      for(var arg in arguments){
        console.log('arg(', arg, '): ', arguments[arg]);
      }
      console.log('******************************');
      getCommand();
    }, function(err){
      console.log(err);
      getCommand();
    });
}

function regCommand(command, conn){
    var p = undefined;
    var pre = "return ";
    command = command.replace(/\);?$/g, ', print);');
    try {
      var type = command.includes('subscribe') ? "Publish" : "Call";
      var name = conn.getName() + '/' + command.match(/\([\'\"]([a-zA-Z0-9]+)[\'\"]/)[1];
      var print = function(){
        console.log('\n******************************\n* Recieved ' + type + " on " + name +"\n* Results:\n");
        for(var arg in arguments){
          console.log('* ', arg, ': ', arguments[arg]);
        }
        console.log('******************************');
      };
      var fnc = new Function('xs', 'print', pre + command);
      p = fnc.call({}, conn, print);
    } catch (e) {
      console.log("Error: " + e.message);
      getCommand();
      return;
    }
    p.then(function(){
      console.log("Successful Sub/Reg");
      getCommand();
    }, function(err){
      console.log(err);
      getCommand();
    });
}

function helpCommand(){
  var help = "Usage: \n\thelp - (show this dialogue)\n\tuse -d domain - (switch working domain)\n\t";
  help += "use -s domain -c collection - (switch working domain to collection api for storage appliance with domain)\n\t"
  help += "Note: The 'xs' variable is your current working domain or Appliance API\n\t"
  help += "xs.call(...) - (make a call  using the cwd)\n\t"
  help += "xs.publish(...) - (make a publish  using the cwd)\n\t"
  help += "xs.register(endpoint) - (register to recieve calls using the cwd)\n\t"
  help += "xs.unregister(endpoint) - (unregister a call on the cwd)\n\t"
  help += "xs.subscribe(channel) - (subscribe to a channel using the cwd)\n\t"
  help += "xs.unsubscribe(channel) - (unsubscribe from a channel using the cwd)\n\t"
  help += "clear/c - (clear screen)\n\t"
  help += "exit - (exit)\n\t"
  console.log(help);
  getCommand();
}

function clearCommand(){
  exec('clear');
  getCommand();
}
