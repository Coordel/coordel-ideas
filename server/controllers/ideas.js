var v1       = '/api/v1'
  , _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log      = console.log
  , moment   = require('moment')
  , md5      = require('MD5')
  , IdeasController;

IdeasController = function(store, socket) {

  var Idea = require('../models/idea')(store);

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
    console.log("support function", id, userid, res);
    Idea.support(id, userid, function(e,o){
      if (e){
        res.json({error: e});
      } else {

        //if it wasn't already supported notify
        console.log("results", o[0], o[1]);
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

    findUserCreated: function(req, res){
      //returns all the ideas this user has created
    },

    findUserSupporting: function(req, res){
      //returns both of the folowing

      //all the ideas in which this user is a participant (investing time or money)

      //all the ideas this user is supporting (gave the thumbs up)
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
      
      var id = req.body.ideas
        , userid = req.session.currentUser.appId;

      console.log("support", id, userid);

      support(id, userid, res);
    },

    supportTime: function(req, res){
      //just like a accepting a follow invitation in the app
      //followers and participants will be counted in the supporting count for the idea when the idea is queried
      //publish invest time

      var sender = req.session.currentUser
        , id = req.body.id
        , self = Ideas;

      console.log("supportTime", id, sender);

      Idea.follow(id, sender, function(e, o){
        if (e){
          res.json({error: e});
        } else {
          support(id, sender.appId, res);
        }
      });
    },

    supportMoney: function(req, res){
      //the pledge will have the userid and details of the pledge
      //publish invest money
    }

    

  };

  return Ideas;
};

module.exports = IdeasController;