var riffle = require('jsriffle');
var prompt = require('prompt');
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
    },
    domain: {
     type: 'string',
     pattern: /^[a-z0-9\.]+$/,
     description: "Enter the domain you would like a token for.",
     message: "domains are only lowercase letters and numbers seperated by dots i.e. xs.nick2",
     required: true
    },
    name: {
     type: 'string',
     description: "Enter a name for the token.",
     required: true
    }
  }
}

prompt.start();

prompt.get(schema, getToken);

function getToken(err, result){

  if(err){
    console.log(err);
    process.exit(1);
  }
  var token_name = result.name;
  var domain = result.domain;

  var xs = riffle.Domain('xs.demo');
  var auth = xs.subdomain('Auth');



  xs.login(result).then(join, error.bind({call: "login"}));

  function onJoin(){
    console.log('joined');
    auth.call('gen_custom_token', token_name, domain).then(genSuccess, error.bind({call: "gen_custom_token"}));
  }

  function genSuccess(ok){
    if(ok){
      auth.call('get_custom_token', token_name, domain).then(getSuccess, error.bind({call: "get_custom_token"}));
    }else{
      console.log("failure to gen token");
    }
  }

  function getSuccess(token){
    console.log(token);
  }

  function error(error){
    console.log(this.call, ' : ', error);
  }

  function join(user){
    console.log(user);
    user.onJoin = onJoin.bind(user);
    user.join();
  }
}
