var _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , request    = require('request')
  , log      = console.log
  , CoinbaseController;

CoinbaseController = function(store) {


  var Coinbase = {

    createUser: function(req, res){
      var user = JSON.parse(req.body.user);

      console.log("user", user);

      console.log('email', user.email);

      
      var options = {
        uri: 'https://coinbase.com/api/v1/users',
        strictSSL: true,
        method: 'POST',
        json: {
          user: user
        }
      };

      request(options, function(e, r, body){
        console.log("response from coinbase", e, body);
        if (e){

        } else {
          console.log("returning body");
          res.json(body);
        }
        
      });

      /*

      var request = https.request(options, function(res) {
        console.log("statusCode: ", res.statusCode);
        console.log("headers: ", res.headers);

        res.on('data', function(d) {
          process.stdout.write(d);
        });
      });
*/
    }
  };

  return Coinbase;
};

module.exports = CoinbaseController;