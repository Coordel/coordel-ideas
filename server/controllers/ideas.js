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
    , TimePledge = require('../models/timePledge')(store);

  function parsePurpose(purpose){
    //NOTE: this is just rudimentary
    //this function looks through the purpose and finds hash tags and pointers and handles any found
    var hashtagPattern = /[#]+[A-Za-z0-9-_]+/g; //finds words with hashtags like #coordel
    var pointerPattern = /[>]+[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g; //finds pointers to domains like >coordel.com
  
    var hashtagMatches = purpose.match(hashtagPattern);
    var pointerMatches = purpose.match(pointerPattern);

    console.log("hashtags", hashtagMatches, "pointers", pointerMatches);


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

    addUserFeedback: function(req, res){
      var ideaId = req.params.id
        , appId = req.params.appId
        , feedback = req.body;

      var args = {
        ideaId: req.params.id,
        appId: req.params.appId,
        feedback: req.body
      };

      Idea.addUserFeedback(args, function(e, o){
        if (e){
          res.json(e);
        } else {
          res.json(o);
        }
      });
    },

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
            invited: invited
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