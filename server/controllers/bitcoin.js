var _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , request    = require('request')
  , log      = console.log
  , BitcoinController;

BitcoinController = function(store) {


  var Bitcoin = {

    getPrices: function(req, res){
      var bitcoin = store.bitcoin;

      bitcoin.prices(function(o){
        if (o){
          res.json(o);
        } else {
          res.json({});
        }
      });
    }
  };

  return Bitcoin;
};

module.exports = BitcoinController;