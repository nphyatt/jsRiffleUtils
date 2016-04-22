module.exports = {};
var exp = module.exports;
var utils = require('../xs_utils.js');

exp.successHandler = function(){
  var data = JSON.stringify(arguments);
  utils.saveToFile('./output.txt', data);
}

exp.errorHandler = function(){
  var data = JSON.stringify(arguments);
  utils.saveToFile('./errors.txt', data);
}
