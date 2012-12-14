var _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log      = console.log
  , MoneyPledgesController;

MoneyPledgesController = function(store) {

  var MoneyPledge = require('../models/moneyPledge')(store)
    , TimePledge = require('../models/timePledge')(store);


  var Pledges = {

    create: function(req, res){
      var pledge = req.body;
      console.log("creating pledge", pledge);

      if (pledge.docType === "money-pledge"){
        MoneyPledge.create(pledge, function(e, o){
          if (e){
            res.json(e);
          } else {
            res.json(o);
          }
        });
      } else if (pledge.docType === "time-pledge") {
        TimePledge.create(pledge, function(e,o){
          if (e){
            res.json(e);
          } else {
            res.json(o);
          }
        });
      }
    }
  };

  return Pledges;
};

module.exports = MoneyPledgesController;