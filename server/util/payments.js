var _ = require('underscore')
  , async = require('async')
  , request = require('request')
  , TokenProvider = require('refresh-token')
  , follow = require('follow')
  , settings = require('../../config/settings').settings('settings', './config')
  , coinbaseAuth = settings.auth.coinbase
  , moment = require('moment');


exports.start = function (store){
  //this module loads all allocations and payments that need to be made

  //console.log("acct", coinbaseAuth.salesReceiveAccount);
  var UserApp = require('../models/userApp')(store)
    , Coinbase = require('../models/coinbase')(store)
    , Idea = require('../models/idea')(store);

  /*
  UserApp.findById('1', function(e, user){
    Coinbase.account.getBalance(user, function(e, balance){
      console.log("balance", balance);
    });
  });
  */

  var makePayment = function(item){
    console.log("makePayment", item);

    async.parallel({
      idea: function(cb){
        Idea.findById(item.project, function(e, idea){
          if (e){
            cb(e);
          } else {
            cb(null, idea);
          }
        });
      },
      creator: function(cb){
        UserApp.findById(item.creator, function(e, user){
          if (e){
            cb(e);
          } else {
            cb(null, user);
          }
        });
      },
      recipient: function(cb){
        if (item.byProxy){
          UserApp.findById(item.recipient, function(e, user){
            if (e){
              cb(e);
            } else {
              cb(null, user);
            }
          });
        } else {
          cb(null,{});
        }
      },
      ideaAccountBalance: function(cb){
        //get the idea's available cash
        Idea.findAccountBalance(item.project, function(e, res){
          console.log("ideaAccountBalance response", res);
          if (e){
            cb(e);
          } else {
            cb(null, res);
          }
        });
      },
      prices: function(cb){
        request.get(store.coordelUrl + '/bitcoin/prices', function(e, r, body){
          if (e){
            console.log('error getting prices',e);
            cb(e);
          } else {
            body = JSON.parse(body);
            cb(null, body);
          }
        });
      }
    }, function(e, results){

      if(e){
        console.log("error getting objects for use with payment");
      }else {
        //console.log("results", results);
        //the amount of the payment has to be less than the current idea balance
        
      }
    });
  };
  

  var allocate = function(item){
    console.log("allocate", item);

    async.parallel({
      idea: function(cb){
        Idea.findById(item.project, function(e, idea){
          if (e){
            cb(e);
          } else {
            cb(null, idea);
          }
        });
      },
      user: function(cb){
        UserApp.findById(item.creator, function(e, user){
          if (e){
            cb(e);
          } else {
            cb(null, user);
          }
        });
      },
      proxy: function(cb){
        if (item.byProxy){
          UserApp.findById(item.allocator, function(e, proxy){
            if (e){
              cb(e);
            } else {
              cb(null, proxy);
            }
          });
        } else {
          cb(null,{});
        }
      },
      prices: function(cb){
        request.get(store.coordelUrl + '/bitcoin/prices', function(e, r, body){
          if (e){
            console.log('error getting prices',e);
            cb(e);
          } else {
            body = JSON.parse(body);
            cb(null, body);
          }
        });
      }
    }, function(e, results){

      if(e){
        console.log("error getting objects for use with allocation");
      }else {
        //console.log("results", results);
        Coinbase.account.getBalance(results.user, function(e, balance){
          console.log("balance", balance);
          var currency = require('./currency')(results.prices, results.user.localCurrency)
            , fee = currency.formatBtc(item.amount * 0.05);

          if (e){

          } else {
            //we only allocate when there is balance available. otherwise, the system tries daily until there is balance
            if (balance > (item.amount + fee)){
              //do a send transaction
              //calculate the Coordel fee of 5%
              var data = {
                transaction: {
                  to: coinbaseAuth.salesReceiveAccount,
                  amount: item.amount + fee,
                  notes: 'Coordel Idea -- <i>&lsquo; ' + results.idea.name.trim() + '&rsquo; </i> received <b>' + currency.formatBtc(item.amount) + ' BTC</b> (worth ' + currency.getSymbol() + currency.toLocal(item.amount) + ' ' + currency.localCurrency + ').<br><br>'
                }
              };

              data.transaction.notes += 'Coordel fee -- <b>' + fee + ' BTC</b> (worth ' + currency.getSymbol() + currency.toLocal(fee) + ' ' + currency.localCurrency + ').<br><br>';

              if (item.byProxy){
                data.transaction.notes += 'By proxy -- ' + results.proxy.fullName;
              }
              
              Coinbase.transactions.sendMoney(results.user, data, function(e, res) {
                if (e){
                  //send failed, probably network error or something bad.
                } else {
                  if (res.success){
                    item.status = "COMPLETED";
                    item.completed = moment().format(store.timeFormat);
                    item.fee = fee;
                    store.couch.db.save(item, function(e, res){
                      console.log("allocation completed", item);
                    });
                  }
                }
              });
            } else {
              console.log("insufficient balance", balance, item.amount, (item.amount * 0.05));
            }
          }
        });
      }
    });
  };

  var reportTime = function(item){
    console.log("reportTime", item);
    async.parallel({
      user: function(cb){
        UserApp.findById(item.creator, function(e, user){
          if (e){
            cb(e);
          } else {
            cb(null, user);
          }
        });
      },
      idea: function(cb){
        Idea.findById(item.project, function(e, idea){
          if (e){
            cb(e);
          } else {
            cb(null, idea);
          }
        });
      },
      ideaAccountBalance: function(cb){
        //get the idea's available cash
        Idea.findAccountBalance(item.project, function(e, res){
          console.log("ideaAccountBalance response", res);
          if (e){
            cb(e);
          } else {
            cb(null, res);
          }
        });
      }
    }, function(e, results){
        if (e){
          console.log("error getting time report objects");
        } else {
          var bal = results.ideaAccountBalance
            , fee = item.amount * 0.0005;

          if (fee < bal){
            //set the status to completed
            item.status = "COMPLETED";
            item.completed = moment().format(store.timeFormat);
            item.fee = fee;
            store.couch.db.save(item, function(e, res){
              console.log("timeReport completed", item);
            });
          }
        }
    });
  };

  store.couch.db.info(function(e, info){
    if (e){
      console.log("ERROR getting update sequence when starting to monitor couch changes: " + JSON.stringify(err));
    } else {
      //console.log("following", info);
      var since = info.update_seq;
      //start the changes stream using the latest sequence
      follow({db:store.followUrl, since: since, include_docs:true}, function(e, chg) {
        var doc = chg.doc;
        if (doc.docType === "allocation" && doc.status === "STARTED"){
          console.log("do allocation", doc);
          allocate(doc);
        } else if (doc.docType === "time-report" && doc.status === "STARTED"){
          console.log("report time", doc);
          reportTime(doc);
        } else if (doc.docType === "idea-payment" && doc.status === "STARTED"){
          console.log("make payment", doc);
          makePayment(doc);
        }
      });
    }
  });

  /*
  var doAllocations = function () {
    console.log('checking for allocations');
    store.couch.db.view('coordel/ideaAllocations',{include_docs:true}, function(e, ideas){
      if (e){
        console.log("error getting allocations", e);
      } else {

        ideas = _.map(ideas, function(item){
          return item.doc;
        });

        var a = _.filter(ideas, function(item){
          return item.docType === "allocation";
        });

        var r = _.filter(ideas, function(item){
          return item.docType === "time-report";
        });

        if (a.length){
          _.each(a, function(item){
            allocate(item);
          });
        }

        if (r.length){
          _.each(r, function(item){
            pay(item);
          });
        }
      }
    });
    setTimeout(doAllocations,15000);
  };
  */

  //doAllocations();
};