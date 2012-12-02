/* Coordel Idea

Manages the ideas for the ideas app

*/
var moment = require('moment')
  , _ = require('underscore');

module.exports = function(store) {

  var validator = require('revalidator')
    , Idea
    , stamp = moment().format(store.timeFormat);

  var Schema = {
    properties: {
      // enter any properties required for validation here
      assignments: {
        definition: 'people with work in the idea',
        type: 'array'
      },
      created: {
        definition: 'date idea was created',
        type: 'string',
        'default': stamp
      },
      creator: {
        definition: 'person who created the idea',
        type: 'string'
      },
      deadline: {
        definition: 'deadline of the idea -- defaults to 90 days from now',
        type: 'string',
        'default': moment().add('days', 90).format("YYYY-MM-DD")
      },
      docType: {
        definition: 'couchdb type indicator',
        type: 'string',
        'default': 'project'
      },
      isMyDelegated: {
        definition: 'indicates if this is a delegated idea',
        type: 'boolean',
        'default': false
      },
      isMyPrivate: {
        definition: 'indicates if this is a private idea',
        type: 'boolean',
        'default': false
      },
      isTemplate: {
        definition: 'indicates if this idea is a blueprint',
        type: 'boolean',
        'default': false
      },
      name: {
        definition: 'indicates the name of the idea',
        type: 'string',
        maxLength: 65,
        'default': 'Oops, no name given'
      },
      purpose: {
        definition: 'tells why this is a good idea',
        type: 'string',
        maxLength: 560,
        'default' : ''
      },
      responsible: {
        definition: 'who is responsible for the idea',
        type: 'string',
        required: true
      },
      status: {
        definition: 'status of the idea',
        type: 'string',
        'default': 'ACTIVE'
      },
      substatus: {
        definition: 'substatus of the idea',
        type: 'string',
        'default': 'OPPORTUNITY'
      },
      updated: {
        definition: 'when this ideas was last updated',
        type: 'string',
        'default': stamp
      },
      users: {
        definition: 'people who are following or participating in this idea',
        type: 'array'
      }

    }
  };
  

  Idea = {

    findById: function(id, fn) {
      //returns the idea from couchdb.get(id)
      //returns couchdb view projectStream startkey = [id] endkey = [id, {}]
      //returns supporting time investors (idea.users) + LLEN ideas:[id]:supporting + money investors (get pledges startkey[id], endkey[id,{}])
    },

    timeline: function(fn){
      //the timeline gets ideas from the redis global:timeline set
      store.redis.lrange('global:timeline', 0, -1, function(e, o){
        if (e){
          fn(e);
        } else {
          //console.log("timeline", o);
          fn(null, o);
        }
      });
    },

    create: function(idea, user, fn){
      //idea will have a name and a purpose, use will be the current user
      store.couch.cn.uuids(1, function(e, uuid){
        //create an idea
        //the idea will come with a name and purpose from the posted form
        var timestamp = moment().format(store.timeFormat);

        //grab the new uuid
        idea._id = uuid[0];

        //set the idea responsible to be the submitting user
        idea.responsible = user.appId;
        //add the submitting user to the users of the idea
        idea.users = [user.appId];

        //create the assignent for the person submitting the idea
        idea.assignments = [{
          username: user.appId,
          role: "RESPONSIBLE",
          status: "ACCEPTED"
        }];

        idea.creator = user.appId;
        idea.created = timestamp;
        idea.updater = user.appId;
        idea.updated = timestamp;
        idea.docType = "project";
        idea.deadline = moment().add('days', 90).format("YYYY-MM-DD");
        idea.isNew = true;
        idea.origin = "coordel-ideas";

        idea.status = "ACTIVE";
        idea.substatus = "OPPORTUNITY";


        idea = Idea.addActivity({
            verb: "POST",
            sender: user
          }, idea);

        //validate the idea
        var v = validator.validate(idea, Schema);
        console.log("validator", v, idea);
        if (v.valid){
          //add the idea to the couchdb as an opportunity
          store.couch.db.save(idea, function(e, o){
            console.log("saved to couch", e,o);
            if (e) {
              fn(e);
            } else {
              idea._rev = o.rev;
              fn(null, idea);
            }
          });
        } else {
          fn(v.errors);
        }
      });
    },

    support: function(ideaId, userId, fn){

      var multi = store.redis.multi();
      //creates a supporting entry for this user and adds the supporting user to the idea

      //ideas:[id]:supporting [userid] entry to keep track of all the supporters of this idea
      multi.sadd('ideas:' + ideaId + ':supporting', userId);
      
      //user:[userid]:supporting [id] to keep track of all of the ideas a user is supporting
      multi.sadd('user:' + userId + ':supporting', ideaId);

      multi.exec(function(e,o){
        if (e){
          res(e);
        } else {

          //if this user hadn't already supported this idea then increment the trending score
          if (o[0] && o[1]){
            store.redis.zincrby('global:trending', 1, ideaId);
          }

          fn(null, o);
        }
      });
    },

    follow: function(id, sender, fn){
      var self = Idea;
      //get the idea
      store.couch.db.get(id, function(e, idea){
        console.log("got the idea", idea, self);

        var username = sender.appId
          , hasUser = false;

        _.each(idea.users, function(user){
          if (user === username){
            hasUser = true;
          }
        });

        //make sure this user is in the user list
        if (!hasUser){
          idea.users.push(username);
        }

        //go through the assignments and set the follower role status to ACCEPTED
        var hasRole = false;
        
        //first check if there is already a follower role and if so, set its status
        _.each(idea.assignments, function(assign){
          if (assign.username === username) {
            
            if (assign.role === "FOLLOWER"){
              
              assign.status = "ACCEPTED";
              
              self.addActivity({
                verb: "FOLLOW",
                sender: sender
              }, idea);
            }
  
            hasRole = true;
          }
        });

        //in case there wasn't a role, create it and set its status to accepted
        if (!hasRole){
          idea.assignments.push({
            username: username,
            role: "FOLLOWER",
            status: "ACCEPTED"
          });
          
          self.addActivity({
            verb: "FOLLOW",
            sender: sender
          }, idea);
        }

        idea = self.setVersion(idea);

        idea.updater = username;
        idea.updated = moment().format(store.timeFormat);

        //console.log("before update in projectModel.follow");
        store.couch.db.save(idea, function(e, o){
          console.log('followed idea', o);
          if (e){
            fn(e);
          } else {
            fn(null, o);
          }
        });
      });
    },

    addActivity: function(opts, idea){
      var username = opts.sender.appId
        , fullName = opts.sender.fullName;
      
      var defaults = {
        actor: {id:username, name:fullName, type:"PERSON"},
        object: {id: idea._id, name: idea.name, type: "PROJECT"},
        time: moment().format(store.timeFormat),
        users: idea.users,
        rev: "-1"
      };

      console.log("in addActivity", defaults, opts);
      
      //we use the rev to track the history. that way the alerts can be tested against the rev
      if (idea._rev){
        defaults.rev = idea._rev;
      }
      opts = _.extend(defaults, opts || {});
      
      //make sure there is a place to put history
      if (!idea.history){
        idea.history = [];
      }
      
      idea.history.unshift(opts);
      return idea;
    },

    setVersion: function(doc){
      console.log("setting version", doc.name, doc.docType);
      //this tracks the versions of this doc.
      //if the doc doesn't have versions create them
      if (!doc.versions){
        doc.versions = {};
      }
      
      if (!doc.versions.latest){
        //if there isn't a latest member of versions then set it to a clone of this doc
        doc.versions.latest = _.clone(doc);
      } else {
        //create a versions history array
        if (!doc.versions.history){
          doc.versions.history = [];
        }
        //there was a latest member, so push the existing one to history
        doc.versions.history.push(doc.versions.latest);
        //then create a clone of this doc as the new latest
        doc.versions.latest = _.clone(doc);
      }
      
      //don't replicate versions or history in the versions
      delete doc.versions.latest.history;
      delete doc.versions.latest.versions;
      return doc;
    }
  };

  return Idea;
  
};