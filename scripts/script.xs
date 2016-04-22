xs.register('hey', func);
xs.call('hey', 44);
xs.call('hey', "test");
xs.unregister('hey');
use -d xs.demo.nick2.swindler
import -f ./example_module.js -n h

//register with a want and a custom handler
xs.register('hey', riffle.want(func, String)); --options --func h.successHandler

//this call should work
xs.call('hey', "Should work");

xs.call('hey', 33);//This call shouldn't work
