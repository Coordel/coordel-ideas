var _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log      = console.log
  , MoneyPledgesController
  , async = require('async');


MoneyPledgesController = function(store, socket) {

  var MoneyPledge = require('../models/moneyPledge')(store)
    , TimePledge = require('../models/timePledge')(store)
    , Profile = require('../models/profile')(store)
    , Idea = require('../models/idea')(store);

  function support(ideaId, appId){
    //when we create a pledge, need to add support to the idea as well if we haven't already
    Idea.support(ideaId, appId, function(e,o){
      console.log("supported an idea when pledging", e, o);
      if (o[0] && o[1]){
        socket.emit('supporting:'+appId,  "1");
      }
    });
  }



  var Pledges = {

    create: function(req, res){
      var pledge = req.body;
      console.log("creating pledge", pledge);

      var user = {appId: pledge.creator};

      if (pledge.docType === "money-pledge"){
        MoneyPledge.create(pledge, function(e, o){
          if (e){
            res.json(e);
          } else {
            //when we create a pledge, need to add support to the idea as well if we haven't already
            support(pledge.project, pledge.creator);
            Profile.findMiniProfile(user, function(e, mini){
              socket.emit('miniProfile:'+user.appId, mini);
            });
            Profile.findSupportAccount(user, function(e, acct){
              socket.emit('supportAccount:'+user.appId, acct);
            });
            res.json(o);
          }
        });
      } else if (pledge.docType === "time-pledge") {
        TimePledge.create(pledge, function(e,o){
          if (e){
            res.json(e);
          } else {
            support(pledge.project, pledge.creator);
            Profile.findMiniProfile(user, function(e, mini){
              socket.emit('miniProfile:'+user.appId, mini);
            });
            Profile.findSupportAccount(user, function(e, acct){
              socket.emit('supportAccount:'+user.appId, acct);
            });
            res.json(o);
          }
        });
      }
    },
    save: function(req, res){

      var pledge = req.body;
      console.log("saving pledge", pledge);

      var user = {appId: pledge.creator};

      //NOTE THE MONEY/TIME pledge concept doesn't really matter here
      MoneyPledge.save(pledge, function(e, o){
        if (e){
          res.json(e);
        } else {
          //now we need to get a new profile for the pledge creator and send the updated values
          Profile.findMiniProfile(user, function(e, mini){
            socket.emit('miniProfile:'+user.appId, mini);
          });
          Profile.findSupportAccount(user, function(e, acct){
            socket.emit('supportAccount:'+user.appId, acct);
          });
          //when we create a pledge, need to add support to the idea as well if we haven't already
          res.json(o);
        }
      });
    },
    allocate: function(req, res){
      var alloc = req.body.alloc
        , pledge = req.body.pledge;
      
      alloc = JSON.parse(alloc);
      pledge = JSON.parse(pledge);

      var user = {appId: pledge.creator};

      async.parallel({
        alloc: function(cb){
          MoneyPledge.allocate(alloc, function(e, o){
            if (e){
              cb('error '+ e);
            } else {
              cb(null, o);
            }
          });
        },
        pledge: function(cb){
          MoneyPledge.save(pledge, function(e, o){
            if (e){
              cb('error '+ e);
            } else {
              cb(null, o);
            }
          });
        }
      },
      function(e, results) {
        if (e){
          res.json({
            success: false,
            errors: [e]
          });
        } else {
          //now we need to get a new profile for the pledge creator and send the updated values
          Profile.findMiniProfile(user, function(e, mini){
            socket.emit('miniProfile:'+user.appId, mini);
          });
          Profile.findSupportAccount(user, function(e, acct){
            socket.emit('supportAccount:'+user.appId, acct);
          });
          alloc._id = results.alloc.id;
          alloc._rev = results.alloc.rev;
          res.json({
            success: true,
            allocation: alloc
          });
        }
      });
    }
  };

  return Pledges;
};

module.exports = MoneyPledgesController;