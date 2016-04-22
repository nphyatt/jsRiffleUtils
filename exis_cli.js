var utils = require('./xs_utils.js');
var riffle = utils.getRiffle();
var colors = utils.getColorProfile();
var parseArgv = utils.getArgv();


var readline = require('readline');
var rl = null;

function prompt(cwd){
 rl.setPrompt("(".data +cwd.data +")$".data);
 rl.prompt(true)
}

function setupRL(){
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', function(input){
    if(logInterval){
      stopLogs();
    }else{
      parseCommand(null, input);
    }
  });

  rl.on('SIGINT', () => {
    console.log('');
    process.exit();
  });
}

var commands = [
    {match: /^\s*c\s*$/, fnc: clearCommand },
    {match: /^\s*script\s+/, fnc: scriptCommand },
    {match: /^\s*logs\s*$/, fnc: logsCommand },
    {match: /^\s*clear\s*$/, fnc: clearCommand },
    {match: /^\s*help\s+/, fnc: helpCommand },
    {match: /^\s*import\s+/, fnc: importCommand },
    {match: /^\s*save\s+/, fnc: saveCommand },
    {match: /^\s*use\s+/, fnc: useCommand },
    {match: /^\s*exit\s*$/, fnc: exitCommand },
    {match: /^\s*xs\.register/, fnc: regCommand },
    {match: /^\s*xs\.subscribe/, fnc: regCommand },
    {match: /^\s*xs\.call/, fnc: runCommand },
    {match: /^\s*xs\.publish/, fnc: runCommand },
    {match: /^\s*xs\.unregister/, fnc: runCommand },
    {match: /^\s*xs\.unsubscribe/, fnc: runCommand },
    ];

var imports = {};
var connections = {};
var storages = {};
var cwd = undefined;
var topConn = undefined;
var runningScript = false;
var script = null;

var argvs = parseArgv(process.argv.slice(2));
if(argvs.help){
  showHelp();
  process.exit();
}

utils.determineLoginMethod(process.argv, join)

function join(user){
  topConn = user;
  var scrpt = utils.argPair(argvs.s, argvs.script, 'string');
  if(scrpt){
    runScript(argvs.script, exitCommand);
  }else{
    setupRL();
    useCommand('use -d ' + user.getName(), user);
  }
}

function scriptCommand(command, conn){
  var argv = parseArgv(command.replace(/\s+/g, ' ').trim().split(' ').slice(1));
  if(argv.f = utils.argPair(argv.f, argv.file, 'string')){
    return runScript(argv.f, getCommand);
  }else{
    console.log("Missing -f flag.".error);
    return helpCommand();
  }
}

function runScript(path, cb){
  runningScript = cb;
  script = utils.readFromFile(path);
  if(!script){
    return finishRunning();
  }else{
    try{
      script = script.split('\n');
    }catch(e){
      console.log(e.message.error);
      return finishRunning();
    }
  }
  cwd = topConn.getName();
  if(!connections[cwd]){
    connections[cwd] = topConn.linkDomain(cwd);
  }
  continueRunning();
}

function continueRunning(){
  var cmd =  null;
  if(script.length > 0){
    cmd = script.shift();
    cmd.replace(/\/\/.*$/g, '');
    if(cmd === '' || cmd.match(/^\/\//)){
      return continueRunning();
    }
    return parseCommand(null, cmd);
  }else{
    return finishRunning();
  }
}

function finishRunning(){
  var finish = runningScript;
  runningScript = null;
  finish();
}

function getCommand(){
  if(runningScript){
    return continueRunning();
  }
  prompt(cwd);
}

function parseCommand(err, cmd){

  if(err){
    throw err;
    process.exit(1);
  }

  var command = cmd.match(/(.*\);)(.*)/);
  var args = null;
  if(command){
    args = parseArgv(command[2].replace(/\s/g, ' ').trim().split(' '));
    command = command[1].trim();
  }else{
    command = cmd;
  }


  var run = null;
  commands.forEach(function(cmd){
    if(command.match(cmd.match)){
      run = cmd.fnc;
    }   
  });
  if(!run){
    var appl = ['Auth', 'Bouncer', 'Container', 'Replay', 'Storage'];
    appl.forEach(function(name){
      if(cwd.includes(name)){
        run = runCommand;
      }
    });
  }
  if(!run){
    helpCommand();
    return;
  }

  run(command, connections[cwd], args)
  
}

function exitCommand(){
  topConn.onLeave = function(){ 
    console.log('Goodbye'.silly);
    process.exit();
  }
  topConn.leave();
  setTimeout(badClose, 4000);
  function badClose(){
    console.log('Connection didn\'t close properly.'.warn);
    console.log('Goodbye'.silly);
    process.exit(1);
  }
}

function useCommand(command, conn){
  var command = command.replace(/\s+/g, ' ').trim().split(' ').slice(1);
  var argv = parseArgv(command); 
  if(utils.argPair(argv.d, argv.domain, 'string')){
    cwd = utils.argPair(argv.d, argv.domain, 'string');
    if(!connections[cwd]){
      connections[cwd] = topConn.linkDomain(cwd);
    }
  }else if(utils.argPair(argv.s, argv.storage,'string') && utils.argPair(argv.c, argv.collection,'string')){
    argv.c = utils.argPair(argv.c, argv.collection,'string');
    argv.storage = utils.argPair(argv.s, argv.storage,'string');
    cwd = 'StorageCollection[' + argv.c + ']' + argv.storage;
    if(!connections[cwd]){
      if(!storages[argv.storage]){
        storages[argv.storage] = riffle.xsStorage(topConn.linkDomain(argv.storage));
      }
      connections[cwd] = storages[argv.storage].xsCollection(argv.c);
    }
  }else if(argv.auth = utils.argPair(argv.a, argv.auth, 'string')){
    cwd = 'Auth[' + argv.auth + ']';
    if(!connections[cwd]){
      connections[cwd] = riffle.xsAuth(topConn.linkDomain(argv.auth));
    }
  }else if(utils.argPair(argv.b, argv.bouncer, 'boolean')){
    cwd = 'Bouncer';
    if(!connections[cwd]){
      connections[cwd] = riffle.xsBouncer(topConn);
    }
  }else if(argv.container = utils.argPair(argv.container, argv.C,'string')){
    cwd = 'Container[' + argv.container + ']';
    if(!connections[cwd]){
      connections[cwd] = riffle.xsContainers(topConn.linkDomain(argv.container));
    }
  }else if(argv.replay = utils.argPair(argv.r, argv.replay,'string')){
    cwd = 'Replay[' + argv.replay + ']';
    if(!connections[cwd]){
      connections[cwd] = riffle.xsReplay(topConn.linkDomain(argv.replay));
    }
  }else{
    helpCommand();
    return;
  }
  getCommand();
}

function runCommand(command, conn, options){
    var handlers = {success: null, error: null};
    if(options){
      if(options.h = utils.argPair(options.h, options.handler, 'string')){
        handlers.success = fetchHandler(options.h)
        if(!handlers.success){
          return getCommand();
        }
      }    
      if(options.e = utils.argPair(options.e, options.err, 'string')){
        handlers.error = fetchHandler(options.e)
        if(!handlers.error){
          return getCommand();
        }
      }    
    }
    var p = undefined;
    var pre = "return ";
    try {
      var fnc = new Function('xs', pre + command);
      p = fnc.call({}, conn);
    } catch (e) {
      console.log("Error: ".error, e.message.error);
      getCommand();
      return;
    }

    p.then(defaultHandler, defaultErr);
    function defaultHandler(){
      if(!handlers.success){
        utils.prettyPrintLoop(arguments, 'Recieved Response', 'Arg');
      }else{
        try{
          handlers.success.apply({}, arguments);
        }catch(e){
          console.log(e.message.error);
        }
      }
      getCommand();
    }
    function defaultErr(err){
      if(!handlers.error){
        console.log(String(err).error);
      }else{
        try{
          handlers.error(err);
        }catch(e){
          console.log(e.message.error);
        }
      }
      getCommand();
    }
}

function fetchHandler(module){
  var handler = null;
  try{
    var chain = module.trim().split('.');
    var top = chain[0];
    if(!top){
      console.log('Error: couldn\'t find module.'.error);
      return false;
    }
    handler = imports[top];
    if(!handler){
      console.log('Error: couldn\'t find module.'.error);
      return false;
    }
    chain.shift();
    while(chain.length > 0){
      handler = handler[chain.shift()];
    }
  }catch(e){
    console.log(e.message.error);
    return false;
  }
  return handler;
}

function regCommand(command, conn, options){
    var handlers = {success: null, error: null, subRegHandler: null};
    if(options){
      if(options.h = utils.argPair(options.h, options.handler, 'string')){
        handlers.success = fetchHandler(options.h)
        if(!handlers.success){
          return getCommand();
        }
      }    
      if(options.e = utils.argPair(options.e, options.err, 'string')){
        handlers.error = fetchHandler(options.e)
        if(!handlers.error){
          return getCommand();
        }
      }    
      if(options.func = utils.argPair(options.f, options.func, 'string')){
        handlers.subRegHandler = fetchHandler(options.func)
        if(!handlers.subRegHandler){
          return getCommand();
        }
      }    
    }
    var p = undefined;
    var pre = "return ";
    try {
      var args = command.split(',');
      if(!args || !args[1] || !args[1].includes('func')){
        console.log("Reg/Subs must use keyword ".error, "func".info, "as handler.".error);
        if(command.includes('subscribe')){
          cmdHelp('subscribe');
        }else{
          cmdHelp('register');
        }
        return getCommand();
      }
      var type = command.includes('subscribe') ? "Publish" : "Call";
      var name = conn.getName() + '/' + command.match(/\([\'\"]([a-zA-Z0-9]+)[\'\"]/)[1];
      var func = function(){
        utils.prettyPrintLoop(arguments, 'Recieved ' + type + " on " + name, 'Result');
      };
      if(handlers.subRegHandler){
        func = handlers.subRegHandler;
      }
      var fnc = new Function('xs', 'func','riffle', pre + command);
      p = fnc.call({}, conn, func, riffle);
    } catch (e) {
      console.log("Error: ".error, e.message.error);
      getCommand();
      return;
    }
    p.then(function(res){
      if(!handlers.success){
        console.log("Successful Sub/Reg".info);
      }else{
        try{
          handlers.success(res);
        }catch(e){
          console.log(e.message.error);
        }
      }
      getCommand();
    }, function(err){
      if(!handlers.error){
        console.log(String(err).error);
      }else{
        try{
          handlers.error(err);
        }catch(e){
          console.log(e.message.error);
        }
      }
      getCommand();
    });
}

function importCommand(command){
  if(command){
    var args = parseArgv(command.trim().replace(/\s/g, ' ').split(' ')); 
    if(!(args.n = utils.argPair(args.n, args.name, 'string')) || !(args.f = utils.argPair(args.f, args.file, 'string'))){
      cmdHelp('import');
      return getCommand();
    }else{
      try{
        imports[String(args.n)] = require(String(args.f));
      }catch(e){
        console.log(e.message.error);
        return getCommand();
      }
      console.log("Imported ".info, String(args.f).info, ' as '.info, String(args.n).info);
    }
  }
  getCommand();
}

var detailCommands = [
    'use',
    'call',
    'publish',
    'register',
    'unregister',
    'subscribe',
    'unsubscribe',
    'save',
    'import',
    'storage'
];
function helpCommand(command){
  if(command){
    var args = parseArgv(command.trim().replace(/\s/g, ' ').split(' ')); 
    detailCommands.forEach(function(cmd){
      if(args._.indexOf(cmd) > -1){
        cmdHelp(cmd);
      }
    });
  }else {
    console.log(utils.help('cli_help'));
  }
  getCommand();
}

function cmdHelp(cmd){
  console.log(utils.help('cli_'+cmd));
}


function showHelp(){
  console.log(utils.help('exis_cli'));
}

function saveCommand(command){
  var argv = parseArgv(command.replace(/\s+/g, ' ').trim().split(' ').slice(1));
  var name = utils.argPair(argv.n, argv.name, 'string');
  if(name){
    var domain = topConn.getName();
    var token = topConn.getToken();
    utils.saveProfile(domain, token, name);
  }else{
    cmdHelp('save');
  }
  getCommand();
}

var logger = null;
var logInterval = null;
var lastLog = 0;
function logsCommand(command){
    if(!logger){
      logger = topConn.linkDomain('xs.demo.NodeLogger');
    }
    lastLog = 0;
    logInterval = setInterval(fetchLogsLoop, 300);
}

function gotLogsLoop(logs){
  readline.clearLine(process.stdout);
  readline.cursorTo(process.stdout,0);
  while(logs.length > 0){
    var l = logs.pop();
    if(l.time > lastLog){
      lastLog = l.time;
      printLog(l);
    }
  }
 rl.setPrompt("(Press enter to quit)".data);
 rl.prompt(true)
}

function fetchLogsLoop(){
  var options = {limit: 30}
  if(lastLog > 0){
    options.startts = lastLog;
  }
  logger.call('getMessages', cwd, options).then(gotLogsLoop, logErr);
}

function logErr(err){
  console.log("Couldn't fetch logs: ".error, err.error);
  stopLogs();
}

function printLog(l){
  if(l.error !== ''){
    console.log("[".data, (new Date(l.time * 1000)).toLocaleString().data, "]".data.bold, (l.response + ": " +l.error + " Agent: " + l.agent.bold + "[" + l.type + "]" + " => " + l.endpoint).error);
  }else{
    console.log("[".data, (new Date(l.time * 1000)).toLocaleString().data, "]".data.bold, ("Agent: " + l.agent.bold + "[" + l.type + "]" + " => " + l.endpoint).info);
  }
}

function stopLogs(){
  clearInterval(logInterval);
  logInterval = null;
  setTimeout(getCommand,350);
}

function clearCommand(){
  exec('clear');
  getCommand();
}
