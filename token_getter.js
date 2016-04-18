var riffle = require('jsriffle');
var argv = require('minimist')(process.argv.slice(2));

if(Object.keys(argv).length < 5){
  console.log("Usage: node token_getter.js -p password -u username -d domain -n name\n");
  process.exit(1);
}

var xs = riffle.Domain('xs.demo');
var auth = xs.subdomain('Auth');
var user = {username: argv.u, password: argv.p};
var token_name = argv.n;
var domain = argv.d

xs.login(user).then(join, error.bind({call: "login"}));

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
