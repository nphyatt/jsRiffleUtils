var utils = require('./xs_utils.js');
var riffle = utils.getRiffle();
var colors = utils.getColorProfile();
var parseArgv = utils.getArgv();
var prompt = utils.getPrompt();


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
    {match: /^help /, fnc: helpCommand },
    {match: /^import /, fnc: importCommand },
    {match: /^save$/, fnc: saveCommand },
    {match: /^use /, fnc: useCommand },
    {match: /^exit$/, fnc: exitCommand },
    {match: /^xs\.register/, fnc: regCommand },
    {match: /^xs\.subscribe/, fnc: regCommand },
    {match: /^xs\.call/, fnc: runCommand },
    {match: /^xs\.publish/, fnc: runCommand },
    {match: /^xs\.unregister/, fnc: runCommand },
    {match: /^xs\.unsubscribe/, fnc: runCommand },
    ];

var imports = {};
var connections = {};
var storages = {};
var cwd = undefined;
var topConn = undefined;

var argvs = parseArgv(process.argv.slice(2));
if(argvs.help){
  showHelp();
  process.exit();
}

utils.determineLoginMethod(process.argv, join)

function join(user){
  topConn = user;
  useCommand('use -d ' + user.getName(), user);
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
  var args = null;
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

  run(command, connections[cwd], args)
  
}

function exitCommand(){
  console.log('Goodbye'.silly);
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

function runCommand(command, conn, options){
    var handlers = {success: null, error: null};
    if(options){
      if(options.h){
        handlers.success = fetchHandler(options.h)
        if(!handlers.success){
          return getCommand();
        }
      }    
      if(options.e){
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
        console.log('\n******************************\n* Recieved Response\n* Return:\n'.warn);
        for(var arg in arguments){
          console.log('* '.warn, 'arg('.data , arg.data, '): '.data, arguments[arg]);
        }
        console.log('******************************'.warn);
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
      if(options.h){
        handlers.success = fetchHandler(options.h)
        if(!handlers.success){
          return getCommand();
        }
      }    
      if(options.e){
        handlers.error = fetchHandler(options.e)
        if(!handlers.error){
          return getCommand();
        }
      }    
      if(options.func){
        handlers.subRegHandler = fetchHandler(options.func)
        if(!handlers.subRegHandler){
          return getCommand();
        }
      }    
    }
    var p = undefined;
    var pre = "return ";
    command = command.replace(/\);?$/g, ', print);');
    try {
      var type = command.includes('subscribe') ? "Publish" : "Call";
      var name = conn.getName() + '/' + command.match(/\([\'\"]([a-zA-Z0-9]+)[\'\"]/)[1];
      var print = function(){
        console.log('\n******************************\n* Recieved '.warn, type.warn, " on ".warn, name.help, "\n* Results:\n".warn);
        for(var arg in arguments){
          console.log('* '.warn, arg.data, ': '.data, arguments[arg]);
        }
        console.log('******************************'.warn);
      };
      if(handlers.subRegHandler){
        print = handlers.subRegHandler;
      }
      var fnc = new Function('xs', 'print', pre + command);
      p = fnc.call({}, conn, print);
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
    if(args.f === '' || !args.f || args.n === '' || !args.n){
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

var detailCommands = ['use', 'call', 'publish', 'register', 'unregister', 'subscribe', 'unsubscribe', 'save', 'import', 'storage'];
function helpCommand(command){
  if(command){
    var args = parseArgv(command.trim().replace(/\s/g, ' ').split(' ')); 
    detailCommands.forEach(function(cmd){
      if(args._.indexOf(cmd) > -1){
        cmdHelp(cmd);
      }
    });
  }else {
    var help = "Usage: \n\t";
    help += "help - show this dialogue.\n\t";
    help += "help storage - show dialogue detailing storage API and options.\n\t";
    help += "help [command command2...] - show detailed help dialogues for any specified commands.\n\t";
    help += "use -d domain - switch working domain.\n\t";
    help += "use -s domain -c collection - switch working domain to collection api for storage appliance with domain.\n\t"
    help += "Note: The 'xs' variable is your current working domain or Appliance API\n\t"
    help += "xs.call(...) - make a call  using the cwd.\n\t"
    help += "xs.publish(...) - make a publish  using the cwd.\n\t"
    help += "xs.register(endpoint) - register to recieve calls using the cwd.\n\t"
    help += "xs.unregister(endpoint) - unregister a call on the cwd.\n\t"
    help += "xs.subscribe(channel) - subscribe to a channel using the cwd.\n\t"
    help += "xs.unsubscribe(channel) - unsubscribe from a channel using the cwd.\n\t"
    help += "clear | c - clear screen.\n\t"
    help += "save - save the current logged in token and domain as a profile.\n\t"
    help += "import -f /path/to/file -n name - Import a node module at path and store under name.\n\t"
    help += "exit - exit cli.\n\t"
    console.log(help.help);
  }
  getCommand();
}

var flagOptions = {};

flagOptions["-e"] = "\t\t\t-e module.errHandler - specify a errHandler function from a previsously imported module.\n";
flagOptions["-e"] += "\t\t\t\tExample: xs.call(...); -e logger.Errors\n";

flagOptions["-h"] = "\t\t\t-h module.successHandler - specify a successHandler from a previsously imported module.\n";
flagOptions["-h"] += "\t\t\t\tExample: xs.call(...); -h logger.Results\n";

flagOptions["--func"] = "\t\t\t--func module.regSubHandler - specify a handler for call or publishes received by this reg/sub from a previsously imported module.\n";
flagOptions["--func"] += "\t\t\t\tExample: xs.register('hello'); --func logger.helloHandler\n";

var detailHelps = {};
detailCommands.forEach(function(val){
  detailHelps[val] = "";
});
detailHelps.use += "\nUsage: use (flags)\n";
detailHelps.use += "\tNote: either -d or -s and -c must be specified. -s and -c must always both be set if one is.\n";
detailHelps.use += "\t\tFlags:\n";
detailHelps.use += "\t\t\t-d domain - Switch to the specified working domain. Opertions will be done under working domain.\n";
detailHelps.use += "\t\t\t-s domain - The domain of the Storage Appliance you wish to interact with.\n";
detailHelps.use += "\t\t\t-c collection - The name of the collection in the Storage Appliance you wish to interact with.\n";
detailHelps.use += "\n\t\tExamples:\n";
detailHelps.use += "\t\t\tuse -d xs.demo.user.app\n";
detailHelps.use += "\t\t\tuse -s xs.demo.user.app.Storage -c users\n";

detailHelps.call += "\nUsage: xs.call('ep',...args); --options (flags)\n";
detailHelps.call += "\tDescription: Make a call on the fabric using regular riffle syntax with option --options\n";
detailHelps.call += "\t\t--options flags:\n";
detailHelps.call += flagOptions['-h'];
detailHelps.call += flagOptions['-e'];
detailHelps.call += "\n\t\tExamples:\n";
detailHelps.call += "\t\t\txs.call('echo', 'Hello World');\n";

detailHelps.publish += "\nUsage: xs.publish('ep',...args); --options (flags)\n";
detailHelps.publish += "\tDescription: Publish an event on the fabric using regular\n";
detailHelps.publish += "\triffle syntax with options --options\n";
detailHelps.publish += "\t\t--options flags:\n";
detailHelps.publish += flagOptions['-h'];
detailHelps.publish += flagOptions['-e'];
detailHelps.publish += "\n\t\tExamples:\n";
detailHelps.publish += "\t\t\txs.publish('listeners', 'Hello World');\n";

detailHelps.register += "\nUsage: xs.register('ep'); --options (flags)\n";
detailHelps.register += "\tDescription: Register for calls on and endpoint. By default \n";
detailHelps.register += "\treceived calls will be logged to console. Use --options to \n";
detailHelps.register += "customize behavior.\n";
detailHelps.register += "\t\t--options flags:\n";
detailHelps.register += flagOptions['-h'];
detailHelps.register += flagOptions['-e'];
detailHelps.register += flagOptions['--func'];
detailHelps.register += "\n\t\tExamples:\n";
detailHelps.register += "\t\t\txs.register('callMe');\n";

detailHelps.unregister += "\nUsage: xs.unregister('ep'); --options (flags)\n";
detailHelps.unregister += "\tDescription: Unregister an endpoint on the current domain.\n";
detailHelps.unregister += "\t\t--options flags:\n";
detailHelps.unregister += flagOptions['-h'];
detailHelps.unregister += flagOptions['-e'];
detailHelps.unregister += "\n\t\tExamples:\n";
detailHelps.unregister += "\t\t\txs.unregister('callMe');\n";

detailHelps.subscribe += "\nUsage: xs.subscribe('channel'); --options (flags)\n";
detailHelps.subscribe += "\tDescription: Subscribe to a channel on this domain. By default\n";
detailHelps.subscribe += "\treceived publishes will be logged to console. Use --options to \n";
detailHelps.subscribe += "customize behavior.\n";
detailHelps.subscribe += "\t\t--options flags:\n";
detailHelps.subscribe += flagOptions['-h'];
detailHelps.subscribe += flagOptions['-e'];
detailHelps.subscribe += flagOptions['--func'];
detailHelps.subscribe += "\n\t\tExamples:\n";
detailHelps.subscribe += "\t\t\txs.subscribe('publishToMe');\n";

detailHelps.unsubscribe += "\nUsage: xs.unsubscribe('channel'); --options (flags)\n";
detailHelps.unsubscribe += "\tDescription: Unsubscribe from a channel on the current domain.\n";
detailHelps.unsubscribe += "\t\t--options flags:\n";
detailHelps.unsubscribe += flagOptions['-h'];
detailHelps.unsubscribe += flagOptions['-e'];
detailHelps.unsubscribe += "\n\t\tExamples:\n";
detailHelps.unsubscribe += "\t\t\txs.unsubscribe('publishToMe');\n";

detailHelps.save += "\nUsage: save\n";
detailHelps.save += "\tDescription: Save the current credentials for the connection\n";
detailHelps.save += "\tas a profile that can be used with the -p flag authentication in\n";
detailHelps.save += "\tthis cli util and others in this package.\n";


detailHelps.storage += "\nUsage: xs.find(),xs.find_one(),...\n";
detailHelps.storage += "See https://exis.io/docs/API-Reference/jsRiffle#rifflecollection for full API\n";
detailHelps.storage += "\tDescription: Interact with a collection in a storage appliance via the xsCollection API.\n";
detailHelps.storage += "\t\t--options flags:\n";
detailHelps.storage += flagOptions['-h'];
detailHelps.storage += flagOptions['-e'];

detailHelps.import += "\nUsage: import -f /path/to/file.js -n name\n";
detailHelps.import += "\tDescription: import a custom node module to be used for handling\n";
detailHelps.import += "\tsubscriptions, registrations, or results from calls.\n";
detailHelps.import += "\tThe specified name will be used to hold the module. If you\n";
detailHelps.import += "\thave an existing module under the name it will be overwritten.\n";
detailHelps.import += "\tBoth the -f and -n flags are required.\n";
detailHelps.import += "\n\t\tExamples:\n";
detailHelps.import += "\t\t\timport -f /home/me/handlers.js -n handlers\n";


function cmdHelp(cmd){
  console.log(detailHelps[cmd].help);
}


function showHelp(){
  var desc = "\n\nThis module provides a cli for making calls and interacting with\n";
  desc +=        "services on Exis. \n";

  var help = "Usage: node exis_cli.js (-flags)\n";
  help += utils.helpFlags();
  console.log(desc.data, help.help);
}

function saveCommand(){
  var domain = topConn.getName();
  var token = topConn.getToken();
  utils.saveProfile(domain, token);
  getCommand();
}

function clearCommand(){
  exec('clear');
  getCommand();
}
