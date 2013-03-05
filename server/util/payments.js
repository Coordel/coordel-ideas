var _ = require('underscore')
  , async = require('async')
  , request = require('request')
  , TokenProvider = require('refresh-token')
  , follow = require('follow')
  , settings = require('../../config/settings').settings('settings', './config')
  , coinbaseAuth = settings.auth.coinbase
  , moment = require('moment')
  , _ = require('underscore');


exports.start = function (store){
  //this module loads all allocations and payments that need to be made

  ////console.log("acct", coinbaseAuth.salesReceiveAccount);
  var UserApp = require('../models/userApp')(store)
    , Coinbase = require('../models/coinbase')(store)
    , Idea = require('../models/idea')(store);

  /*
  UserApp.findById('1', function(e, user){
    Coinbase.account.getBalance(user, function(e, balance){
      //console.log("balance", balance);
    });
  });
  */

  var makePayment = function(item){
    //console.log("makePayment", item);

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
        UserApp.findById(item.recipient, function(e, user){
          if (e){
            cb(e);
          } else {
            cb(null, user);
          }
        });
      },
      ideaAccountBalance: function(cb){
        //get the idea's available cash
        Idea.findAccountBalance(item.project, function(e, res){
          //console.log("ideaAccountBalance response", res);
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
            //console.log('error getting prices',e);
            cb(e);
          } else {
            body = JSON.parse(body);
            cb(null, body);
          }
        });
      }
    }, function(e, results){
      var currency = require('./currency')(results.prices, results.recipient.localCurrency);
      //console.log("recipient", results.recipient);
      if(e){
        console.log("error getting objects for use with payment");
      }else {
        var hasAccount = results.recipient.hasPaymentMethod;
        if (hasAccount){
          //send an email telling to connect, leave payment status STARTED
          //console.log("not connected to coinbase, send an email");

          var email = store.email;

          var mailOptions = {
            from: {
              fullName: results.creator.fullName + ' via Coordel',
              username: results.creator.username,
              email: results.creator.email,
              titleName: results.creator.fullName
            },
            to: {
              fullName: results.recipient.fullName,
              email: results.recipient.email,
              username: results.recipient.username
            },
            subject: 'Payment pending',
            generateTextFromHtml: true,
            idea: results.idea,
            btcAmount: currency.formatBtc(item.amount),
            localAmount:  currency.getSymbol() + currency.toLocal(item.amount) + ' ' + currency.localCurrency
          };

          email.send('paymentPending', mailOptions);

        } else if (item.amount < results.ideaAccountBalance){
          //money not available fail the payment
          console.log("amount exceeds idea account balance, fail payment");
          item.status = "FAILED";
          item.failed = moment().format(store.timeFormat);
          store.couch.db.save(item, function(e, res){
            //console.log("payment failed", item);
          });
        } else if (_.indexOf(results.idea.users, results.recipient.id) === -1){
          //user not part of idea, can't make this kind of payment, fail the payment
          console.log("recipient not part of idea, fail payment");
          item.status = "FAILED";
          item.failed = moment().format(store.timeFormat);
          store.couch.db.save(item, function(e, res){
            //console.log("payment failed", item);
          });
        } else {
          Coinbase.account.getReceiveAddress(results.recipient, function(e, address){
            if (e){
              //console.log("error getting receive address");
            } else {

              var data = {
                transaction: {
                  to: address,
                  amount: item.amount,
                  notes: 'Coordel payment -- amount <b>' + currency.formatBtc(item.amount) + ' BTC</b> (worth ' + currency.getSymbol() + currency.toLocal(item.amount) + ' ' + currency.localCurrency + ').<br><br>'
                }
              };

              //add the fee on transaction amounts less than .01
              if (item.amount < 0.01){
                data.transaction.fee = 0.0005;
              }

              //sender
              data.transaction.notes += 'Sender -- ' + results.creator.fullName + '<br><br>';
              //idea
              data.transaction.notes += 'Coordel Idea -- <i>&lsquo; ' + results.idea.name.trim() + '&rsquo; </i><br><br>';
              
              //console.log("payment data", data);
              Coinbase.coordel.sendMoney(data, function(e, res) {
                if (e){
                  //send failed, probably network error or something bad.
                  console.log("coinbase sendMoney error");
                } else {
                  //console.log("response from coinbase.coordel sendMoney", res);
                  if (res.success){
                    item.status = "COMPLETED";
                    item.completed = moment().format(store.timeFormat);
                    store.couch.db.save(item, function(e, res){
                      if (e){
                        console.log("payment failed");
                      } else {
                        console.log("payment completed");
                      }
  
                    });
                  }
                }
              });
            }
          });
        }
      }
    });
  };
  
  var allocate = function(item){
    //console.log("allocate", item);

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
            //console.log('error getting prices',e);
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
          //console.log("balance", balance);
          var currency = require('./currency')(results.prices, results.user.localCurrency)
            , fee = item.amount * 0.05;

          if (e){
            console.log("error getting account balance");

          } else {
            //console.log("testing allocation", balance, item.amount + fee);
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

              data.transaction.notes += 'Fee -- <b>' + fee + ' BTC</b> (worth ' + currency.getSymbol() + currency.toLocal(fee) + ' ' + currency.localCurrency + ').<br><br>';

              if (item.byProxy){
                data.transaction.notes += 'By proxy -- ' + results.proxy.fullName;
              }
              
              Coinbase.transactions.sendMoney(results.user, data, function(e, res) {
                if (e){
                  //send failed, probably network error or something bad.
                  console.log("coinbase sendMoney error", e);
                } else {
                  console.log("response from coinbase sendMoney", res);
                  if (res.success){
                    item.status = "COMPLETED";
                    item.completed = moment().format(store.timeFormat);
                    item.fee = fee;
                    store.couch.db.save(item, function(e, res){
                      //console.log("allocation completed", item);
                    });
                  }
                }
              });
            } else {
              //console.log("insufficient balance", balance, item.amount, (item.amount * 0.05));
            }
          }
        });
      }
    });
  };

  var reportTime = function(item){
    //console.log("reportTime", item);
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
          //console.log("ideaAccountBalance response", res);
          if (e){
            cb(e);
          } else {
            cb(null, res);
          }
        });
      }
    }, function(e, results){
        if (e){
          //console.log("error getting time report objects");
        } else {
          var bal = results.ideaAccountBalance
            , fee = item.amount * 0.0005;

          if (fee < bal){
            //set the status to completed
            item.status = "COMPLETED";
            item.completed = moment().format(store.timeFormat);
            item.fee = fee;
            store.couch.db.save(item, function(e, res){
              //console.log("timeReport completed", item);
            });
          }
        }
    });
  };

  store.couch.db.info(function(e, info){
    if (e){
      console.log("ERROR getting update sequence when starting to monitor couch changes: ");
    } else {
      //console.log("following", info);
      var since = info.update_seq;

      //start the changes stream using the latest sequence
      follow({db:store.couch.url, since: since, include_docs:true}, function(e, chg) {
        if (chg && chg.doc){
          var doc = chg.doc;
          if (doc.docType === "allocation" && doc.status === "STARTED"){
            //console.log("do allocation", doc);
            allocate(doc);
          } else if (doc.docType === "time-report" && doc.status === "STARTED"){
            //console.log("report time", doc);
            reportTime(doc);
          } else if (doc.docType === "idea-payment" && doc.status === "STARTED"){
            //console.log("make payment", doc);
            makePayment(doc);
          }
        }
      });
    }
  });

  
  var doAllocations = function () {
    //console.log('checking for allocations');
    store.couch.db.view('coordel/ideaAllocations',{include_docs:true}, function(e, ideas){
      if (e){
        console.log("error getting allocations", e);
      } else {
        //console.log("got allocations", ideas);
        ideas = _.map(ideas, function(item){
          return item.doc;
        });

        var a = _.filter(ideas, function(item){
          return item.docType === "allocation";
        });

        var r = _.filter(ideas, function(item){
          return item.docType === "time-report";
        });

        var p = _.filter(ideas, function(item){
          return item.docType === "idea-payment";
        });

        if (a.length){
          _.each(a, function(item){
            allocate(item);
          });
        }

        if (r.length){
          _.each(r, function(item){
            reportTime(item);
          });
        }

        if (p.length){
          _.each(r, function(item){
            makePayment(item);
          });
        }
      }
    });

    setTimeout(doAllocations,600000); //check for missed transactions every 10 minutes
  };
  

  doAllocations();
};