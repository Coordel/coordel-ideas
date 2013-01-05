var v1       = '/api/v1'
  , _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log      = console.log
  , moment   = require('moment')
  , md5      = require('MD5')
  , async    = require('async')
  , IdeasController;

IdeasController = function(store, socket) {

  var Idea = require('../models/idea')(store)
    , UserApp = require('../models/userApp')(store)
    , MoneyPledge = require('../models/moneyPledge')(store)
    , TimePledge = require('../models/timePledge')(store)
    , Profile = require('../models/profile')(store);

  function parsePurpose(purpose){
    //NOTE: this is just rudimentary
    //this function looks through the purpose and finds hash tags and pointers and handles any found
    var hashtagPattern = /[#]+[A-Za-z0-9-_]+/g; //finds words with hashtags like #coordel
    var pointerPattern = /[>]+[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g; //finds pointers to domains like >coordel.com
  
    var hashtagMatches = purpose.match(hashtagPattern);
    var pointerMatches = purpose.match(pointerPattern);

    console.log("hashtags", hashtagMatches, "pointers", pointerMatches);


  }

  //used to sum money and time allocations
  function getTotalAllocations(array, fn){
    //this lists everyone who gave time or money

    var list = _.map(array, function(item){
      return item.doc;
    });

    var acct = {}
      , gave = []
      , users = [];

    //sum up what was given
    _.each(list, function(item){
      if (!acct[item.creator]){
        users.push(item.creator);
        acct[item.creator] = {amount: item.amount};
        acct[item.creator].amount = item.amount;
      } else {
        acct[item.creator].amount = acct[item.creator].amount + item.amount;
      }

    });

    //now we need to load the users so we have their details
    Idea.findUserBatch(users, function(e, users){

      if (e){
        fn(e);
      } else {
        _.each(users, function(user){
          acct[user.appId].user = user;
        });

        //now put the accounts into an array for return
        _.each(acct, function(item){
          gave.push(item);
        });

        fn(null, gave);
      }
    });
  }

  function updateTimeline(idea, user, fn){
    var multi = store.redis.multi()
      , timestamp = moment().format(store.timeFormat);

    //add the user's imageUrl
    user.imageUrl = 'http://www.gravatar.com/avatar/' + md5(user.email) + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png');

    //create the object to be stored in the timeline
    idea.creatorDetails = user;

    idea = JSON.stringify(idea);
    //push the new idea onto the timeline
    multi.lpush('global:timeline', idea);
    //keep the timeline to 1000 items
    multi.ltrim('global:timeline', 0, 1000);
    multi.exec(function(e, o){
      if (e){
        fn(e);
      } else {
        fn(null,o);
      }
    });
  }

  function support(id, userid, res){
    //console.log("support function", id, userid, res);
    Idea.support(id, userid, function(e,o){
      if (e){
        res.json({error: e});
      } else {

        //if it wasn't already supported notify
        //console.log("results", o[0], o[1]);
        if (o[0] && o[1]){
          //make a global:trending entry for this idea if this user hadn't already been supporting
          res.json({success: "1"});
        } else {
          res.json({success: "0"});
        }
      }
    });
  }

  var Ideas = {

    addFeedback: function(req, res){

      var args = {
        ideaId: req.params.id,
        appId: req.params.appId,
        user: req.session.currentUser,
        feedback: req.body
      };


 

      var user = {appId: args.appId};

      UserApp.findById(args.appId, function(e, app){
        args.name = app.fullName;
        Idea.addFeedback(args, function(e, o){
          console.log("addFeedback", e, o);
          if (e){
            res.json({
              success: false,
              errors: [e]
            });
          } else {
            console.log("addFeedback response", o);
            Profile.findMiniProfile(user, function(e, mini){
              console.log("after findMiniProfile", e, mini);
              if (e){
                //TODO log error
              } else {
                console.log("new mini profile in ideas.js", user.appId, mini);
                socket.emit('miniProfile:'+user.appId, mini);
              }
            });
            res.json({
              success: true,
              idea: o
            });
          }
        });
      });
    },

    findStream: function(req, res){
      var id = req.params.id;
      //console.log("range", req.header('Range'));
      store.couch.db.view('coordel/projectStream', { startkey: [id, {}], endkey: [id], descending: true}, function (e, stream) {
        if (e){
          cb('error ' + e);
        } else {
          var map = {}
            , users = [];

          stream = _.map(stream, function(item){
            //console.log("stream item", item);
            var id = item.value.actor.id;
            if (!map[id]){
              users.push(id);
              map[id] = true;
            }
            return item.value;
          });

          Idea.findUserBatch(users, function(e, users){
            if (e){
              res.json({
                success: false,
                errors: [e]
              });
            } else {
              res.json({
                success: true,
                stream: stream,
                users: users
              });
            }
          });
        }
      });
    },

    /*
    findStream: function(req, res){
      var id = req.params.id;
      console.log("range", req.header('Range'));
      async.parallel({
        stream: function(cb){
          store.couch.db.view('coordel/projectStream', { startkey: [id, {}], endkey: [id], descending: true}, function (e, stream) {
            if (e){
              cb('error ' + e);
            } else {
              var map = {}
                , users = [];

              stream = _.map(stream, function(item){
                var id = item.actor.id;
                if (!map[id]){
                  users.push(id);
                  map[id] = true;
                }
                return item.value;
              });

              Idea.findUserBatch(users, function(e, o){
                if (e){
                  res.json({
                    success: false,
                    errors: [e]
                  });
                } else {
                  res.json({
                    success: true,
                    stream: results.stream,
                    users: results.users
                  });
                }
              });
            }
          });
        },
        users: function(cb){
          Idea.findUsers(id, function(e, o){
            if (e){
              cb('error ' + e);
            } else {
              console.log("users", o);
              cb(null, o);
            }
          });
        }
      },
      function(e, results) {
        console.log("findStream", e, results);
        if (e){
          res.json({
            success: false,
            errors: [e]
          });
        } else {
          res.json({
            success: true,
            stream: results.stream,
            users: results.users
          });
        }
        
      });
    },
    */

    /*
    findStream: function(req, res){
      var id = req.params.id;
      console.log("range", req.header('Range'));
      store.couch.db.view('coordel/projectStream', { startkey: [id, {}], endkey: [id], descending: true}, function (e, stream) {
        if (e){
          res.json({error: e});
        } else {

          if (stream.length){
            var list = [];
            _.each(stream, function(item){
              list.push(item.value);
            });
            res.json(list);
          } else {
            res.json([]);
          }
        }
      });
    },
    */

    findDetails: function(req, res){
      var id= req.params.id;

      //console.log("getting details", id);
      // an example using an object instead of an array
      async.parallel({
        idea: function(cb){
          store.couch.db.get(id, function(e, idea){
            //console.log("idea refresh", e, idea);
            if (e){
              cb(e);
            } else {
              cb(null, idea);
            }
          });
        },
        activity: function(cb){
          store.couch.db.view('coordel/projectActivityReport', {startkey: [id], endkey:[id, {}], group: true, group_level: 2, reduce: true}, function(e, rows){
            if (e){
              cb('error'+e);
            } else {
              var act = {};
              var tasks = [];
              var other = [];
              var keys = ['message'
                , 'project-gave-feedback'
                , 'idea-invites-sent'
                , 'task-cleared-issue'
                , 'task-raised-issue'
                , 'task-submitted'
                , 'task-created'
                , 'task-agreed-done'
                , 'task-delegated'
                , 'task-declined'
                , 'task-accepted'
                , 'task-returned'
                , 'task-left'];
              var map = {
                message: 'MESSAGES',
                "project-gave-feedback": 'FEEDBACK',
                "project-invites-sent": "INVITED",
                "task-cleared-issue": "CLEARED ISSUES",
                "task-raised-issue": "RAISED ISSUES",
                "task-created": "CREATED",
                "task-submitted": "PROPOSED DONE",
                "task-agreed-done": "AGREED DONE",
                "task-delegated": "DELEGATED",
                "task-declined": "DECLINED",
                "task-accepted": "ACCEPTED",
                "task-returned": "RETURNED",
                "task-left": "LEFT"
              };
              _.each(rows, function(item){
                var name = item.key[1];
                if (_.indexOf(keys, name)> -1){
                  var entry = {name: map[name], value:item.value, key: name};
                  if (name.indexOf('task') > -1){
                    tasks.push(entry);
                  } else {
                    other.push(entry);
                  }
                }
              });
              act.tasks = tasks;
              act.other = other;
              console.log("activity rows", act);
              cb(null, act);
            }
          });
        },
        userDetails: function(cb){
          Idea.findUsers(id, function(e, users){
            if (e){
              cb(e);
            } else {
              cb(null, users);
            }
          });
        },
        account: function(cb){
          //console.log("idea support account", id);
          store.couch.db.view('coordel/ideaSupportAccount', {
            startkey: [id],
            endkey: [id, {}]}, function(e, acct){
            if (e){
              cb('error '+e);
            } else {
              //console.log("idea support account", acct);
              acct = _.map(acct, function(item){
                return item.value;
              });
           
              var result = {
                pledges: [],
                pledged: 0,
                pledgedIdeas: [],
                recurringPledges: [],
                recurringAllocatedPledges: [],
                recurringTimePledges: [],
                recurringAllocatedTimePledges: [],
                proxied: 0,
                proxiedIdeas: [],
                allocated: 0,
                allocatedIdeas: [],
                pledgedTimeIdeas: [],
                pledgedTime: 0,
                reportedTime: 0
              };

              if (acct.length){
                result.pledges = acct;
                _.each(acct, function(item){
                  if (item.docType === "money-pledge") {
                    if (item.status === "PLEDGED"){
                      result.pledged = parseFloat(result.pledged) + parseFloat(item.amount);
                      result.pledgedIdeas.push(item.project);
                      //this shows the user that this is a recurring pledge
                      if (item.type === "RECURRING"){
                        result.recurringPledges.push(item.project);
                      }
                    } else if (item.status === "PROXIED"){
                      //console.log("proxied", item);
                      result.proxied = parseFloat(result.proxied) + parseFloat(item.amount);
                      result.proxiedIdeas.push(item.project);
                    } else if (item.status === "ALLOCATED"){
                      //this shows the user that this is an allocated recurring pledge
                      if (item.type === "RECURRING"){
                        //the pledged amount recurs so add it
                        result.pledged = parseFloat(result.pledged) + parseFloat(item.amount);
                        result.recurringAllocatedPledges.push(item.project);
                      }
                    }
                  } else if (item.docType === "allocation"){

                    result.allocated = parseFloat(result.allocated) + parseFloat(item.amount);

                  } else if (item.docType === "time-report"){
                    console.log("time report in ideas.js", parseFloat(result.reportedTime), parseFloat(item.amount));
                    result.reportedTime = parseFloat(result.reportedTime) + parseFloat(item.amount);
                  } else if (item.docType === "time-pledge") {
                    if (item.status === "PLEDGED"){
                      result.pledgedTime = parseFloat(result.pledgedTime) + parseFloat(item.amount);
                      result.pledgedTimeIdeas.push(item.project);
                      if (item.type === "RECURRING"){
                        result.recurringTimePledges.push(item.project);
                      }
                    } else if (item.status === "ALLOCATED"){
                      if (item.type === "RECURRING"){
                        result.reportedTime = parseFloat(result.reportedTime) + parseFloat(item.amount);
                        result.recurringAllocatedTimePledges.push(item.project);
                      }
                    }
                  }
                });
              }

              cb(null, result);
            }
          });

        },
        supporting: function(cb){
          store.redis.smembers('ideas:' + id + ':supporting', function(e, o){
            //console.log("smembers", e, o);
            if (e){
              cb(e);
            } else {
              if (o.length){
                cb(null, o[0]);
              } else {
                cb (null, 0);
              }
              
            }
          });
        },
        gaveTime: function(cb){
          store.couch.db.view('coordel/ideaTimeAllocations', {startkey: [id], endkey:[id,{}], include_docs: true}, function(e,o){
            if (e){
              cb(e);
            } else {
              getTotalAllocations(o, function(e, gave){
                if (e){
                  cb(e);
                } else {
                  cb(null, gave);
                }
              });
            }
          });
        },
        gaveMoney: function(cb){
          store.couch.db.view('coordel/ideaMoneyAllocations', {startkey: [id], endkey:[id,{}], include_docs: true}, function(e,o){
            if (e){
              cb(e);
            } else {
              getTotalAllocations(o, function(e, gave){
                if (e){
                  cb(e);
                } else {
                  cb(null, gave);
                }
              });
            }
          });
        }
      },
      function(e, results) {
        
        if (e){
          res.json({error: e});
        } else {
          //console.log("results", results);
          var idea = results.idea
            , supporting = results.supporting
            , following = 0
            , participating = 0
            , invited = 0;

          _.each(idea.assignments, function(assign){
            if (assign.role === "FOLLOWER" && assign.status === "INVITE"){
              //invite
              invited += 1;
            } else if (assign.role === "FOLLOWER" && assign.status === "ACCEPTED"){
              //follower
              following += 1;
            } else if (assign.role === "RESPONSIBLE" && assign.status === "ACCEPTED"){
              //participant
              participating += 1;
            } else if (assign.role !== "FOLLOWER" && assign.status === "ACCEPTED"){
              //participant
              participating += 1;
            }
          });

          res.json({
            idea: idea,
            supporting: supporting,
            following: following,
            participating: participating,
            invited: invited,
            userDetails: results.userDetails,
            activity: results.activity,
            account: results.account,
            gaveTime: results.gaveTime,
            gaveMoney: results.gaveMoney
          });
        }
      });

    },

    findUserCreated: function(req, res){
      //returns all the ideas this user has created
    },

    findUsers: function(req, res){

      var id = req.params.id;
      Idea.findUsers(id, function(e, o){
        //console.log("found users", e, o);
        if (e){
          res.json(e);
        } else {
          res.json(o);
        }
      });

    },

    findMoneyPledges: function(req, res){
      //get all the money pledges for this idea
      var idea = req.params.id;

      MoneyPledge.findByIdea(idea, function(e, o){
        res.json(o);
      });

    },

    findProxyPledges: function(req, res){
      //get all the money pledges for this idea
      var idea = req.params.id;

      MoneyPledge.findByIdea(idea, function(e, o){
        if (o.length){
          o = _.filter(o, function(item){
            return item.status === "PROXIED";
          });
        }
        res.json(o);
      });

    },

    findTimePledges: function(req, res){
      //get all the money pledges for this idea
      var idea = req.params.id;

      TimePledge.findByIdea(idea, function(e, o){
        res.json(o);
      });

    },

    create: function(req, res){
      //console.log("called ideas create");

      //create an idea
      //the idea will come with a name and purpose from the posted form
      var user = req.session.currentUser
        , idea = req.body;

      Idea.create(idea, user, function(e, o){

        if (e){
          //there was a problem creating the idea
        } else {

          //console.log("created idea", o);
          //add the idea with the creator's information to the redis timeline set
          updateTimeline(o, user, function(e, res){

          });

          parsePurpose(o.purpose);
          
          //returns the idea and details
          res.json(o);

          //broadcast the change
          socket.emit('idea', o);
          //you support ideas with coordel. the only way to expand your contact list is to participate (not just follow)
          //when you participate, the other participants in the idea are added to your contact list
          /*
            the id is the _id of the opportunity created in couchdb
            idea.creator will be the current user, fail if not
            redis push global:timeline, JSON.stringify(idea), false
            redis ltrim global:timeline, 0, 1000
          */
        }
      });
    },

    support: function(req, res){
      
      var id = req.body.id
        , userid = req.session.currentUser.appId;

      //console.log("support", id, userid);

      support(id, userid, res);
    },

    supportTime: function(req, res){
      //just like a accepting a follow invitation in the app
      //followers and participants will be counted in the supporting count for the idea when the idea is queried
      //publish invest time

      var sender = req.session.currentUser
        , id = req.body.id
        , self = Ideas;

      //console.log("supportTime", id, sender);

      Idea.follow(id, sender, function(e, o){
        if (e){
          res.json({error: e});
        } else {
          support(id, sender.appId, res);
        }
      });
    },

    reply: function(req, res){
      var message = req.body.message
        , user = req.session.currentUser
        , idea = JSON.parse(req.body.idea);

      //console.log("reply", idea, user, message);

      Idea.addMessage(idea, user, message, function(e, o){
        if (e){
          res.json({error: e});
        } else {
          res.json({success: o});
          socket.emit('stream', o);
        }
      });
    },

    invite: function(req, res){
      var message = req.body.message
        , user = req.session.currentUser
        , idea = req.body.idea
        , toName = req.body.toName
        , toEmail = req.body.toEmail;

      //console.log("send invite", message, toName, toEmail, user, idea);

      res.json({success: "okay"});
    },

    supportMoney: function(req, res){
      //the pledge will have the userid and details of the pledge
      //publish invest money
    }

    

  };

  return Ideas;
};

module.exports = IdeasController;