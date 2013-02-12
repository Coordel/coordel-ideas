/* Coordel Pledge
  A pledge tracks what someone who pleges money gives
*/
var _ = require('underscore')
  , md5 = require('MD5')
  , templates = require('../../templates');


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
        //console.log("uuids", uuids, templates);
        var privProj = templates.privateProject,
            privRole = templates.privateRole,
            delegate = templates.delegatedProject,
            user = {},
            objs = [],
            timestamp = (new Date()).toISOString(),
            toReturn = {};
        
        privProj._id = uuids[0];
        userData.privateProject = uuids[0];
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
        userData.privateRole = uuids[1];
        privRole.project = uuids[0];
        privRole.username = userData.appId.toString();
        privRole.isNew = false;
        privRole.created = timestamp;
        privRole.creator = userData.curUser;
        privRole.updated = timestamp;
        privRole.updater = userData.curUser;
        
        objs.push(privRole);
        
        delegate._id = uuids[2];
        userData.delegatedProject = uuids[2];
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
        userData.user = uuids[3];
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
            fn(null, userData);
          }
        });
      }
    });
  }

  function updateSettings(key, settings, fn){
    var multi = store.redis.multi();
    multi.hdel(key, 'undefined');
    _.each(settings, function(item){
      if (item.value){
        multi.hset(key, item.name, item.value);
      } else {
        multi.hdel(key, item.name);
      }
    });

    multi.hgetall(key);
    multi.exec(function(err, replies){
      //console.log('set replies', replies);
      if (err) return fn(err);
      fn(null, _.last(replies));
    });
  }

  UserApp = {

    findById: function(id, fn){
      //get the app from redis
      var redis = store.redis;
    
      var key = 'coordelapp:' + id;
      //console.log("USER GET KEY", key);
      redis.hgetall(key, function(e, app){
        //console.log("USER", app);
        if (e){
          //console.log("couldn't load existing user from store",err);
          fn('app-not-found');
        } else {
          //console.log("found the user", user);
          fn(false, app);
        }
      });
    },

    findByUsername: function(username, fn){
      var key = 'users:' + username;
      store.redis.get(key, function(e, userid){
        //console.log("looked in redis for key", key, e, userid);
        if (e){
          //console.log("there was an error",key, e);
          return fn('user-not-found');
        } else if (!userid){
          //console.log("this userid doesn't exist", key, userid);
          return fn('user-not-found');
        } else {
          //console.log("we're good to go", userid);
          key = 'users:' + userid;
          //console.log("USER GET KEY", key);
          store.redis.hgetall(key, function(e, u){
            //console.log("USER", e, u);
            if (e){
              //console.log("couldn't load existing user from store",err);
              fn('user-not-found');
            } else {
              //console.log("found the user", user);
              //console.log("got the user", e, u);
              var appId = u.appId;
              key = 'coordelapp:' + appId;
              //console.log("USER GET KEY", key);
              store.redis.hgetall(key, function(e, app){
                //console.log("USER", user);
                if (e){
                  //console.log("couldn't load existing user from store",err);
                  fn('app-not-found');
                } else {
                  //console.log("found the user", user);
                  fn(false, app);
                }
              });
            }
          });
        }
      });
    },

    bulkFind: function(keys, fn){
      var multi = store.redis.multi();

      _.each(keys, function(id){
        var key = 'coordelapp:' + id;
        //console.log("USER GET KEY", key);
        multi.hgetall(key);
      });

      multi.exec(function(e, batch){
        //console.log("USER", user);
        if (e){
          //console.log("couldn't load existing user from store",err);
          fn(e);
        } else {
          //console.log("found the user", user);
          fn(false, batch);
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
    
        //console.log('appIds', appIds);

        appIds.forEach(function(id){
          var akey = 'coordelapp:' + id;
          //console.log("GET USER APP FOR KEY", akey);
          multi.hgetall(akey);
        });

        if (appIds.length){
          multi.exec(function(err, apps){
            if (err) return fn(err);

            apps = _.filter(apps, function(a){
              return a;
            });

            multi = store.redis.multi();

            _.each(apps, function(item){
              var key = 'users:'+ item.userId;

              multi.hgetall(key);
            });

            multi.exec(function(e, users){
              
              if (e) return fn(e);
              var info = [];
              users = _.each(users, function(u){
                if (u){
                  var item = {};
                  item.id = u.id;
                  item.appId = u.appId;
                  if (u.bio){
                    item.bio = u.bio;
                  }
                  if (u.location){
                    item.location = u.location;
                  }
                  if (u.personalLink){
                    item.personalLink = u.personalLink;
                  }
                  //console.log("info item", e, item);
                  info.push(item);
                }
              });

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
                    imageUrl: 'https://secure.gravatar.com/avatar/' + md5(a.email) + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png')
                  };
                }
              });

              //assign the info to the app
              _.each(apps, function(a){

                _.each(info, function(u){
                  //console.log("app", a);
                  if (a.appId === u.appId){
                    a.info = u;
                  }
                });
              });

              return fn(null, apps);

            });
            
            
          });
        } else {
          return fn(null, []);
        }
      });
    },

    set: function(appId, vals, fn){
      //this updates or adds values in the app hash
      //appId of the user, vals [{name:"field name", value: "field value"}]

      //forbidden fields - can't update these fields with this function
      var forbidden = ['id','userId', 'email', 'password', 'username'];
      if (vals.length){
        var multi = store.redis.multi()
          , doUpdate = false;
        var key = 'coordelapp:' + appId;
        
        _.each(vals, function(item){
          if (!_.contains(forbidden, item.name)){
            doUpdate = true;
            multi.hset(key, item.name, item.value);
          }
        });

        if (doUpdate){
          multi.hgetall(key);
          multi.exec(function(err, replies){
            //console.log('set replies', replies);
            if (err) return fn(err);
            fn(null, _.last(replies));
          });
        }
      }
    },

    disconnectTwitter: function(appId, fn){
      var key = 'coordelapp:' + appId;
      var settings = [
        {name: "twitterToken", value: false},
        {name: "twitterTokenSecret", value: false}
      ];

      updateSettings(key, settings, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    },

    disconnectCoinbase: function(appId, fn){
      var key = 'coordelapp:' + appId;
      var settings = [
        {name: "hasPaymentMethod", value: false},
        {name: "coinbaseAccessToken", value: false},
        {name: "coinbaseRefreshToken", value: false}
      ];

      updateSettings(key, settings, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    },

    reset: function(appId, fn){
      var key = 'coordelapp:' + appId;
      //this function resets all settings to the default value
      var settings = [
        {name: "showQuickStart", value: true},
        {name: "hasViewedAboutMoney", value: false},
        {name: "hasPaymentMethod", value: false},
        {name: "twitterToken", value: false},
        {name: "twitterTokenSecret", value: false},
        {name: "coinbaseAccessToken", value: false},
        {name: "coinbaseRefreshToken", value: false}
      ];

      updateSettings(key, settings, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    },


    create: function(userData, fn){
      //create the app in redis
      var v = validator.validate(userData, Schema);
      //console.log("v", v);
      var data = userData;
      if (!v.valid){
        fn(v.errors);
      } else {
        //add the default objects (private project, private role, delegated project, user profile)
        addAppObjects(userData, function(e, data){
          if (e){
            fn('add-app-objects ' + e);
          } else {
            //console.log('back from adding objects getting ready to save', data);
            //create the app
            var multi = store.redis.multi(),

            key = 'coordelapp:' + data.appId;

            multi.hset(key, 'id', data.appId);
            multi.hset(key, 'userId', data.userId);
            multi.hset(key, 'email', data.email);
            multi.hset(key, 'username', data.username); //won't be there on first pass
            multi.hset(key, 'firstName', data.firstName);
            multi.hset(key, 'lastName', data.lastName);
            multi.hset(key, 'fullName', data.fullName);
            multi.hset(key, 'user', data.user);
            multi.hset(key, 'defaultTemplatesLoaded', false);
            multi.hset(key, 'myDelegatedProject', data.delegatedProject);
            multi.hset(key, 'myPrivateProject', data.privateProject);
            multi.hset(key, 'myPrivateRole', data.privateRole);
            multi.hset(key, 'showQuickStart', false);
            multi.hset(key, 'suppressEmail', false);
            
            multi.sadd('coordel-apps', key);
            multi.exec(function(err, replies){
              if (err) fn(err, false);
              //console.log("_save replies", replies);
              fn(null, data);
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