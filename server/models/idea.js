/* Coordel Idea

Manages the ideas for the ideas app

*/
var moment = require('moment')
  , _ = require('underscore')
  , md5 = require('MD5');



module.exports = function(store) {

  var UserApp = require('./userApp')(store);

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

  function loadBatch(keys, fn){
    //now get the ideas in bulk
    store.couch.db.all({keys: keys, include_docs: true}, function(e, ideas){
      //console.log("got ideas", ideas);

      ideas = _.map(ideas, function(item){
        return item.doc;
      });

      //need to get all of the creators to get their details from the cache
      var map = {}
        , creators = [];

      _.each(ideas, function(item){
        if (!map[item.creator]){
          map[item.creator] = true;
          creators.push(item.creator);
        }
      });

      //now get the apps from the redis cache to append them to the ideas
      UserApp.bulkFind(creators, function(e, o){
        //console.log("creators", o);
        //make a map of the creators to append to the idea as creatorDetails
        var list = {};
        _.each(o, function(item){
          list[item.id] = {
            appId: item.id,
            username: item.username,
            fullName: item.fullName,
            email:item.email,
            userId: item.userId,
            imageUrl: 'http://www.gravatar.com/avatar/' + md5(item.email) + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png')
          };
        });

        _.each(ideas, function(item){
          item.creatorDetails = list[item.creator];
        });

        fn(null, ideas);
      });
    });
  }
  

  Idea = {

    findById: function(id, fn) {
      //returns the idea from couchdb.get(id)
      //returns couchdb view projectStream startkey = [id] endkey = [id, {}]
      //returns supporting time investors (idea.users) + LLEN ideas:[id]:supporting + money investors (get pledges startkey[id], endkey[id,{}])
    },

    addUserFeedback: function(args, fn){
      //{ideaId, "xadfdfd", appId: "1",feedback: {from: "2", coordination: 88, performance: 98, comment: "comment", created: "date"} }
      var couch = store.couch;

      couch.db.get(args.ideaId, function(e, idea){
        if(e){
          fn({
            success: false,
            errors: [e]
          });
        } else {
          _.each(idea.assignments, function(assign){
            //only give feedback to people who accepted a role in the idea and who
            //weren't only followers
            if (assign.username === args.appId){
              if (!assign.feedback){
                assign.feedback = [];
              }
              assign.feedback.push(args.feedback);
              couch.db.save(idea, function(e, o){
                if (e){
                  fn({
                    success: false,
                    errors: [e]
                  });
                } else {
                  fn({
                    success: true,
                    idea: idea
                  });
                }
              });
            }
          });
        }
      });
    },

    findUsers: function(ideaId, fn){
      var couch = store.couch
        , multi = store.redis.multi();

      //console.log("ideaId", ideaId);
      couch.db.get(ideaId, function(e, idea){
        if (e){
          fn(e);
        } else {

        var appIds = idea.users;

        if (!appIds) appIds = [];
      
          //console.log('appIds', appIds);

          appIds.forEach(function(id){
            var akey = 'coordelapp:' + id;
            //console.log("GET USER APP FOR KEY", akey);
            multi.hgetall(akey);
          });

          if (appIds.length){
            multi.exec(function(err, apps){
              if (err) return fn(err);
              
              //need to send back only the contact info
              apps = _.map(apps, function(a){
                if (a){
                  return {
                    firstName: a.firstName,
                    fullName: a.fullName,
                    appId: a.id,
                    lastName: a.lastName,
                    user: a.user,
                    userId: a.userId,
                    username: a.username,
                    imageUrl: 'http://www.gravatar.com/avatar/' + md5(a.email) + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png')
                  };
                }
              });
              return fn(null, apps);
            });
          } else {
            return fn(null, []);
          }
        }
      });
    },

    findUserSupporting: function(appId, fn){

      var redis = store.redis
        , couch = store.couch;

      redis.smembers('user:'+appId+':supporting', function(e, keys){
        if (e){
          //console.log("error getting supporting", e);
          fn('error ' + e);
        } else {
          //occasionally an undefined element gets added. need to investigate. this works for prototyping
          keys = _.filter(keys, function(id){
            if (id !== 'undefined'){
              return id;
            }
          });

          loadBatch(keys, function(e, o){
            //console.log("batch", o);
            fn(null, o);
          });
          
        }
      });
    },

    findBatch: function(keys, fn){
      loadBatch(keys, function(e, o){
        fn(null, o);
      });
    },

    timeline: function(fn){
      var defaults = {
        start: 0,
        count: 200
      };

      var total = 0;

      //first we need to get the count of all ideas to be able to enable pagination
      store.couch.db.view("coordel/opportunities", {reduce: true}, function(e, o){
       
        if (e){
          //some kind of error with couch
        } else {
          total = o[0].value;
        }

         //console.log("results from reduce call", total);
      });

      
      /*

      //if the start is greater 999, need to start couch pagination where appropriate

      store.redis.lrange('global:timeline', optins.start, options.start + options.count -1, function(e, o){
        if (e){
          fn(e);
        } else {
          //console.log("timeline", o);
          //if the list length is less that the number of items selected, we need to go to couch
          if (o.length < count){
            //need to use the last item in the list as the start key for the remainder of the key

            store.couch.db.view("coordel/opportunities", {limit: count, descending: true, startkey: [options.startkey]}, function(e, o){

            });
          } else {
            fn(null, o);
          }
        }
      });

      */


     

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
        //console.log("validator", v, idea);
        if (v.valid){
          //add the idea to the couchdb as an opportunity
          store.couch.db.save(idea, function(e, o){
            //console.log("saved to couch", e,o);
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

      //console.log("ideaId", ideaId, "userId", userId);

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
          //console.log("support in idea.js", e, o);
          //if this user hadn't already supported this idea then increment the trending score
          if (o[0] && o[1]){
            store.redis.zincrby('global:trending', 1, ideaId);
            //console.log("trending added");
          }

          fn(null, o);
        }
      });
    },

    follow: function(id, sender, fn){
      var self = Idea;
      //get the idea
      store.couch.db.get(id, function(e, idea){
        //console.log("got the idea", idea, self);

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
          //console.log('followed idea', o);
          if (e){
            fn(e);
          } else {
            fn(null, o);
          }
        });
      });
    },

    addMessage: function(idea, user, message, fn){
      //messages are fundamentally targeted at the project level
      //they can be overridden to target different levels (task, group, objective, etc)
      var a = {
            actor: {},
            target: {},
            object: {}
          }
        , timestamp = moment().format(store.timeFormat);
        
      a.actor.id = user.appId;
      a.actor.username = user.username;
      a.actor.email = user.email;
      a.actor.name = user.fullName;
      a.actor.type = "PERSON";
      a.target.id = idea._id;
      a.target.name = idea.name;
      a.target.type = "PROJECT";
      a.project = idea._id;
      a.users = idea.users;
      a._id = store.couch.uuid();
      a.object.id = a._id;
      a.object.name = "";
      a.object.type = "COMMENT";
      a.body = message;
      a.verb = "POST";
      a.docType = "message";
      a.time = timestamp;
      a.created = timestamp;
      a.creator = user.appId;
      a.updated = timestamp;
      a.updater = user.appId;

      //console.log("saving reply", a);
      
      store.couch.db.save(a, function(e, o){
        if (e){
          fn(e);
        } else {
          //console.log("reply from saving reply", o);
          a._rev = o.rev;
          fn(null, a);
        }
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

      //console.log("in addActivity", defaults, opts);
      
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
      //console.log("setting version", doc.name, doc.docType);
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