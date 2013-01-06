var _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log      = console.log
  , MoneyPledgesController
  , async = require('async')
  , moment   = require('moment');


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
    reportTime: function(req, res){
      var report = JSON.parse(req.body.report)
        , pledge = JSON.parse(req.body.pledge);

      var user = {appId: pledge.creator};

      async.parallel({
        report: function(cb){
          TimePledge.reportTime(report, function(e, o){
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
          report._id = results.report.id;
          report._rev = results.report.rev;
          res.json({
            success: true,
            timeReport: report
          });
        }
      });
    },
    proxyDeallocate: function(req, res){
      var alloc = JSON.parse(req.body.alloc);

      var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = alloc.creator
        , toSave = [];

      var user = {appId: appId};

      async.parallel({
        alloc: function(cb){
          console.log("proxy-allocation to deallocate", alloc);
          MoneyPledge.update(alloc, function(e, o){
            if (e){
              cb('error '+ e);
            } else {
              cb(null, o);
            }
          });
        },
        pledges: function(cb){
          //get all pledges for this project
          MoneyPledge.findByIdea(alloc.project, function(e, pledges){

            console.log("unfiltered project pledges", pledges);

            //filter for pledges that are recurring and allocated
            pledges = _.filter(pledges, function(item){
              return item.status === "ALLOCATED" && item.type === "RECURRING";
            });

            console.log("idea pledges to proxy deallocate", pledges);

            //set recurring allocated back to proxied
            _.forEach(pledges, function(item){

              item.status = "PROXIED";
              toSave.push(item);
            });

            console.log("recurring", toSave);
            //merge all allocations and pledges to do a bulk save
            if (toSave.length){
              MoneyPledge.save(toSave, function(e, o){
                if (e){
                  console.log("error doing bulk update", e);
                  cb('error '+ e);
                } else {
                  cb(null, o);
                }
              });
            } else {
              cb(null, []);
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
          console.log("alloc", alloc);
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
    },
    proxyAllocate: function(req, res){
      var alloc = JSON.parse(req.body.alloc);

      var timestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSSZ")
        , appId = alloc.creator
        , toSave = [];

      var user = {appId: appId};

      async.parallel({
        alloc: function(cb){
          console.log("proxy-allocation", alloc);
          if (alloc._rev){
            MoneyPledge.update(alloc, function(e, o){
              if (e){
                cb('error '+ e);
              } else {
                cb(null, o);
              }
            });
          } else {
            MoneyPledge.save(alloc, function(e, o){
            if (e){
              cb('error '+ e);
            } else {
              cb(null, o);
            }
          });
          }
          
        },
        pledges: function(cb){
          //get all the pledges for this idea
          MoneyPledge.findByIdea(alloc.project, function(e, pledges){

            console.log("unfiltered project pledges", pledges);

            //filter for pledges that are proxied
            pledges = _.filter(pledges, function(item){
              return item.status === "PROXIED";
            });

            console.log("idea pledges to proxy allocate", pledges);

            //create allocations for each pledge and update the pledge status to ALLOCATED
            _.forEach(pledges, function(item){

              toSave.push({
                docType: "allocation",
                byProxy: true,
                project: item.project,
                pledgeId: item._id,
                amount: item.amount,
                created: timestamp,
                allocator: appId,
                creator: item.creator,
                status: "STARTED"
              });

              item.status = "ALLOCATED";
              toSave.push(item);
            });
            console.log("pledges and allocations", toSave);
            //merge all allocations and pledges to do a bulk save
            MoneyPledge.save(toSave, function(e, o){
              if (e){
                console.log("error doing bulk update", e);
                cb('error '+ e);
              } else {
                cb(null, o);
              }
            });
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