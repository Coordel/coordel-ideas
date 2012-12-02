/* Coordel Pledge
  A pledge tracks what someone who pleges money gives
*/
var _ = require('underscore');


module.exports = function(store) {

  var validator = require('revalidator')
    , UserApp;

  /* FIELDS
  id (USERNAME IN CODE)
  userId
  email
  username
  firstName
  lastName
  fullName
  user (couch user _id)
  auths [fb, li]
  defaultTemplatesLoaded
  myDelegatedProject
  myPrivateProject
  myPrivateRole
  showQuickStart
  suppressEmail
  */

  var Schema = {
    properties: {
      appId: {
        description: 'appid of the user',
        type: 'integer',
        required: true
      },
      userId: {
        description: 'unique userid of the user',
        type: 'integer',
        required: true
      },
      email: {
        description: 'the email of the user',
        type: 'string',
        format: 'email',
        required: true
      },
      username: {
        description: 'a unique alphanumeric username for the user',
        type: 'string',
        pattern: '^[a-zA-Z0-9]*$',
        minLength: 1
      },
      firstName: {
        description: 'first name of user--kept for backward campatibility',
        type: 'string',
        'default': ''
      },
      lastName: {
        description: 'last name of user--kept for backward campatibility',
        type: 'string',
        'default': ''
      },
      fullName: {
        description: 'full name of user',
        type: 'string',
        required: true
      },
      user: {
        description: '_id of doc with users profile',
        type: 'string', //redis wants 0 not false
        required: true
      },
      defaultTemplatesLoaded: {
        description: '1 if loaded 0 if not loaded yet',
        type:'integer',
        'default': 0
      },
      myDelegatedProject: {
        description: '_id of doc with users delegated project',
        type: 'string', //redis wants 0 not false
        required: true
      },
      myPrivateProject: {
        description: '_id of doc with users private project',
        type: 'string', //redis wants 0 not false
        required: true
      },
      myPrivateRole: {
        description: '_id of doc with users private role',
        type: 'string', //redis wants 0 not false
        required: true
      },
      showQuickStart: {
        description: '1 if quick start shown 0 if not shown yet',
        type:'integer',
        'default': 0
      },
      suppressEmail: {
        description: '1 if quick start shown 0 if not shown yet',
        type:'integer',
        'default': 0
      }
    }
  };

  //this function is called when a new app is created to set up the initial couchdb docs so they can be tracked in the app
  function addAppObjects(userData, fn){
    //console.log("ADD APP OBJECTS", userData);
    //this function creates the private project, private role, delegated project, and user profile
    //for a new user and returns the identifiers of the objects
    store.couch.cn.uuids(4, function(err, uuids){
      if (err){
        fn(err, false);
      } else {
        //console.log("uuids", uuids);
        var privProj = templates.privateProject,
            privRole = templates.privateRole,
            delegate = templates.delegatedProject,
            user = {},
            objs = [],
            timestamp = (new Date()).toISOString(),
            toReturn = {};
        
        privProj._id = uuids[0];
        toReturn.privateProject = uuids[0];
        privProj.responsible = userData.appId.toString();
        privProj.users = [userData.appId.toString()];
        privProj.assignments = [{
          username: userData.appId.toString(),
          role: uuids[1],
          status: "ACCEPTED"
        }];
        privProj.created = timestamp;
        privProj.creator = userData.curUser;
        privProj.updated = timestamp;
        privProj.updater = userData.curUser;
        
        objs.push(privProj);
        
        privRole._id = uuids[1];
        toReturn.privateRole = uuids[1];
        privRole.project = uuids[0];
        privRole.username = userData.appId.toString();
        privRole.isNew = false;
        privRole.created = timestamp;
        privRole.creator = userData.curUser;
        privRole.updated = timestamp;
        privRole.updater = userData.curUser;
        
        objs.push(privRole);
        
        delegate._id = uuids[2];
        toReturn.delegatedProject = uuids[2];
        delegate.responsible = userData.appId.toString();
        delegate.users = [userData.appId.toString()];
        delegate.assignments = [{
          username: userData.appId.toString(),
          role: "RESPONSIBLE",
          status: "ACCEPTED"
        }];
        delegate.created = timestamp;
        delegate.creator = userData.curUser;
        delegate.updated = timestamp;
        delegate.updater = userData.curUser;
        
        objs.push(delegate);
        
        user._id = uuids[3];
        toReturn.user = uuids[3];
        user.first = userData.firstName;
        user.last = userData.lastName;
        user.fullName = userData.fullName;
        user.email = userData.email.toLowerCase();
        user.username = userData.username;
        user.userId = userData.userId.toString();
        user.app = userData.appId.toString(); //kept app rather than appId to remain backwards compatible
        user.appId = userData.appId.toString();
        user.docType = "user";
        user.isTemplate = false;
        user.created = timestamp;
        user.creator = userData.curUser;
        user.updated = timestamp;
        user.updater = userData.curUser;
        
        objs.push(user);
        //console.log("appObjects", objs);
        store.couch.db.save(objs, function(err, res){
          if (err){
            fn(err, false);
          } else {
            fn(null, toReturn);
          }
        });
      }
    });
  }

  UserApp = {

    findById: function(id, fn){
      //get the app from redis
      var redis = store.redis;
    
      var key = 'coordelapp:' + id;
      //console.log("USER GET KEY", key);
      redis.hgetall(key, function(e, app){
        //console.log("USER", user);
        if (e){
          //console.log("couldn't load existing user from store",err);
          fn('app-not-found');
        } else {
          //console.log("found the user", user);
          fn(false, app);
        }
      });
    },

    findContacts: function(user, fn){
      var key = 'coordelapp:'+user.appId+':people'
        , redis = store.redis
        , multi = store.redis.multi();

      //get the keys of apps for the contacts of this person
      redis.smembers(key, function(err, appIds){
        if (err) return fn(err);

        if (!appIds) appIds = [];
    
        console.log('appIds', appIds);

        appIds.forEach(function(id){
          var akey = 'coordelapp:' + id;
          //console.log("GET USER APP FOR KEY", akey);
          multi.hgetall(akey);
        });

        if (appIds.length){
          multi.exec(function(err, apps){
            if (err) return fn(err);
            
            //need to make sure that there aren't any nulls
            apps = _.filter(apps, function(a){
              return a;
            });
            return fn(null, apps);
          });
        } else {
          return fn(null, []);
        }

        
      });
    },

    create: function(userData, fn){
      //create the app in redis
      var v = validator.validate(userData, Schema);

      if (!v.valid){
        fn(v.errors);
      } else {
        //add the default objects (private project, private role, delegated project, user profile)
        addAppObjects(userData, function(e, objIds){
          if (e){
            fn('add-app-objects ' + e);
          } else {
            //create the app
            var multi = redis.multi(),

            key = 'coordelapp:' + data.appId;

            multi.hset(key, 'id', data.appId);
            multi.hset(key, 'userId', data.userId);
            multi.hset(key, 'email', data.email);
            multi.hset(key, 'username', data.username); //won't be there on first pass
            multi.hset(key, 'firstName', data.firstName);
            multi.hset(key, 'lastName', data.lastName);
            multi.hset(key, 'fullName', data.fullName);
            multi.hset(key, 'user', data.user);
            multi.hset(key, 'defaultTemplatesLoaded', data.defaultTemplatesLoaded);
            multi.hset(key, 'myDelegatedProject', data.myDelegatedProject);
            multi.hset(key, 'myPrivateProject', data.myPrivateProject);
            multi.hset(key, 'myPrivateRole', data.myPrivateRole);
            multi.hset(key, 'showQuickStart', data.showQuickStart);
            multi.hset(key, 'suppressEmail', data.suppressEmail);
            
            multi.sadd('coordel-apps', key);
            multi.exec(function(err, replies){
              if (err) fn(err, false);
              //console.log("_save replies", replies);
              fn(null, replies);
            });
          }
        });
      }
    },

    save: function(app, fn){
      //update the redis app
    }

  };

  return UserApp;

};