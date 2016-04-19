module.exports = {};
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
var exp = module.exports;
var request = require('request');
var Q = global.Q;

//TODO allow for connection to other urls
var registrar = 'https://node.exis.io:8880';

exp.loginAnonymous = function(){
  var p = Q.defer();
  getToken({domain: "", password: "", requestingdomain: this.getName()}, p, this);
  return p.promise;
};

exp.loginUsernameOnly = function(user){
  var p = Q.defer();
  getToken({domain: user.username, password: "", requestingdomain: this.getName()}, p, this);
  return p.promise;
};

exp.login = function(user){
  var p = Q.defer();
  getToken({domain: user.username, password: user.password, requestingdomain: this.getName()}, p, this);
  return p.promise;
};


function getToken(body, promise, conn){

  request.post({
    url: registrar + '/login',
    form: JSON.stringify(body)
  },
  function(err, resp, body){
    if(err){
      promise.reject(err);
    }else if(resp.statusCode !== 200){
      promise.reject(body);
    }else{
      body = JSON.parse(body);
      var d = conn.linkDomain(body.domain);
      d.setToken(body.login_token);
      promise.resolve(d);
    }
  });
}
