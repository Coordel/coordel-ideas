/* Coordel User
  A User is the base object and is stored in redis
*/
var bcrypt = require('bcrypt')
  , moment = require('moment')
  , _ = require('underscore');

module.exports = function(store){

  var validator = require('revalidator')
    , _ = require('underscore')
    , User;

  var Schema = {
    properties: {
      email: {
        description: 'the email of the user',
        type: 'string',
        format: 'email',
        required: true
      },
      username: {
        description: 'a unique alphanumeric username for the user',
        type: 'string',
        pattern: '^[0-9a-zA-Z]*$',
        minLength: 1
      },
      userId: {
        description: 'unique userid of the user',
        type: 'integer',
        required: true
      },
      appId: {
        description: 'unique appid of the user application, used to identify the user in the app',
        type: 'integer',
        required: true
      },
      password: {
        description: 'user password',
        type: 'string',
        required: true,
        minLength: 6
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
        type: 'string'
      },
      invited: {
        description: 'indicates if this user is invited',
        type: 'integer', //redis wants 0 not false
        'default': 0
      }
    }
  };

  function tempPassword(){

    function rand(digits){
      return Math.floor(Math.random()* parseInt(digits+1, 10));
    }

    var year = (1970 + rand(500)),
        month = rand(11),
        day = rand(28),
        hour = rand(23),
        min = rand(59),
        sec = rand(59),
        mills = rand(999);

    var dt = new Date(year, month, day, hour, min, sec, mills);

    //console.log("dt", dt);

    var time = dt.getTime().toString(),
        password = new Buffer(time).toString('base64');

        //console.log("password", password);

    return password;

  }

  function loginUser(login, fn){
    var redis = store.redis;
    //login will contain the user, key to find the userid, and the password
    //login format {key: 'user:'[username] or 'user:[email', user:[username] or [email], password: [password]}

    //get the userid at the key
    redis.get(login.key, function(e, userid){
      //console.log("looked for the key", login.key, e, userid);
      if (e){
        fn('error-user-login');
      } else if (userid === null){
        fn('user-not-found');
      } else {
        //load the user with the userid
        loadUser(userid, function(e, o){
          //console.log("loaded the user", e, o);
          if (e){
            fn(e);
          } else {
            fn(null, o);
          }
        });
      }
    });
  }

  function loadUser(userid, fn){
    //this function loads a user at the userid
    var redis = store.redis;
    
    //load the user with the userid
    var key = 'users:' + userid;
    //console.log("USER GET KEY", key);
    redis.hgetall(key, function(e, user){
      //console.log("USER", e, user);
      if (e){
        ////console.log("couldn't load existing user from store",err);
        fn('user-not-found');
      } else {
        ////console.log("found the user", user);
        fn(false, user);
      }
    });
  }

  function validateLogin(user, pass){
    //this validates the sumbmitted user (email or username) and password and sets the key to use to load the user
    var login = {
        user: user,
        password: pass
      }
      , props = {
        user: {
          type: 'string'
        },
        password: {
          type: 'string',
          minLength: 6
        }
      }
      , usernameProps = _.extend(props, {
          user: {
            pattern: '^[a-zA-Z0-9]$', //usernames are alphanumeric only
            minLength: 1
          }
        })
      , emailProps = _.extend(props, {
          user: {
            format: 'email'
          }
        });

    if (validator.validate(login, usernameProps).valid || validator.validate(login, emailProps).valid) {
      //if validation passes for a username or email and the password, then set the key to use
      //to get the userid for the login credentials submitted
      login.key = 'users:'+ user;

      //NOTE: on account creation, both user:[email] and user:[username] entries are made with the userid as the value
    }

    return login;
  }

  function saltAndHash(pass, fn){
    bcrypt.genSalt(10, function(err, salt) {
      //console.log('salt', salt);
      bcrypt.hash(pass, salt, function(err, hash) {
        //console.log('hash', hash);
        fn(false, hash);
      });
    });
  }

  User = {

    findById: function(id, fn){
      //console.log("finding user by id", id);
      loadUser(id, function(e, user){
        //console.log("result from find", e, user);
        if (e){
          fn('user-not-found');
        } else if (user === null){
          fn('user-not-found');
        } else {
          fn(null, user);
        }
      });
    },

    findByUsername: function(username, fn){
      var key = 'users:' + username;
      store.redis.get(key, function(e, userid){
        //console.log("looked for the username key", key, e, userid);
        if (e){
          fn('error-user-login');
        } else if (userid === null){
          fn('user-not-found');
        } else {
          //load the user with the userid
          loadUser(userid, function(e, o){
            //console.log("loaded the user", e, o);
            if (e){
              fn(e);
            } else {
              fn(null, o);
            }
          });
        }
      });
    },

    login: function(user, pass, fn){
      user = user.toLowerCase();
      //validate the login and get a key to use to see if the user exists
      var login = validateLogin(user, pass);

      //console.log("validated login", login);

      if (login.key){
        //the user and passwords were valid
        //load the user
        loginUser(login, function(e, o){
          if(e){
            return fn('user-not-found');
          } else if (o === null){
            return fn('user-not-found');
          } else{

            bcrypt.compare(pass, o.password, function(err, res) {
              if (res){

                //console.log("password okay, returning user", o);
                //remove the password from the object
                delete o.password;
                fn(null, o);
              } else{
                //console.log("invalid password");
                fn('invalid-password');
              }
            });
          }
        });
      } else {
        //format was invalid for user or password throw an error
        fn('user-not-found');
      }
    },

    resetPassword: function(key, fn){
      //this function returns a user with a hash that can be used to send an email link
      //and can be used to verify that the reset is correct
      //console.log("in user.resetPassword",key);
      //create a temp password
      var tempPass = tempPassword();

      //console.log("temp password", tempPass);

      //increment the reset passwords set to get a new id
      store.redis.incr('password-resets', function(e, id){

        //console.log("password reset id", id);

        saltAndHash(new Buffer(id).toString('base64'), function(e, hash){
          //console.log("hash", hash);
         
          store.redis.get(key, function(e, userId){
            if (e){
              fn(e);
            } else if (userId === null){
              fn('user not found');
            } else {
              //console.log("user found", e, userId);
              var multi = store.redis.multi();
              multi.set('reset:' + hash, JSON.stringify({userId: userId, pass:tempPass}));
              var userKey = 'users:' + userId;
              multi.hset(userKey, 'password', tempPass);
              multi.hgetall(userKey);
              multi.exec(function (e, replies){
                var user = _.last(replies);
                user.hash = hash;
                if (e){
                  fn(e);
                } else {
                  fn(null, user);
                }
              });
            }
          });
        });
      });
    },

    completeResetPassword: function(userId, password, fn){
      //console.log("userid, password", userId, password);
      saltAndHash(password, function(e, hashPassword){
        var key = 'users:' + userId;
        var multi = store.redis.multi();
        multi.hset(key, 'password', hashPassword);
        multi.hgetall(key);
        multi.exec(function(e, o){
          var user = _.last(o);
          //console.log("heres the user", e, o);
          fn(null, user);
        });
      });
    },

    updatePassword: function(args, fn){
      //args ={userId, current, newPass};


      loadUser(args.id, function(e, user){
        //console.log("result from updatePassword load user", e, user);
        if (e){
          fn('user-not-found');
        } else if (user === null){
          fn('user-not-found');
        } else {
          //console.log("current", args.current, 'user', user.password);
          bcrypt.compare(args.current, user.password, function(err, res) {
            if (res){
              saltAndHash(args.newPass, function(e, hashPassword){
                store.redis.hset('users:' + args.id, 'password', hashPassword);
                fn(null, 'password-updated');
              });
            } else{
              //console.log("invalid password");
              fn('invalid-password');
            }
          });
        }
      });
    },

    requestInvite: function(user, fn){
      var redis = store.redis;
      var key = 'inviteRequest:' + user.email;
      //console.log("key", key, user);
      redis.exists(key, function(e, o){
        ////console.log('testing exists', e, o);
        if (e){
          fn(null, [0]);
        } else if (o===0){
          ////console.log("didn't exist, pushing");
          redis.set(key, user.email, function(e, o){
            ////console.log("set the key", e, o);
          });
          redis.lpush('inviteRequests', JSON.stringify(user), function(e, o){
            if (e){
              fn(e);
            } else {
              fn(null, o);
            }
          });
        } else {
          ////console.log("existed, don't insert");
          fn(null, [0]);
        }
      });
    },

    //if the user doesn't have a username, they were imported from the old system. so we need to show them a page where
    //they can create a username and then

    importUser: function(user, fn){
      //use this function to import users from the original site. it hashes the passwords and it creates the required lookups
     
      //imported users won't have a username, but need one, so make it their first name + last name
      user.username = user.firstName.trim().toLowerCase() + user.lastName.trim().toLowerCase();
      store.redis.incr('userKeys', function(e, userId){
        //hash the password for storage
        saltAndHash(user.password, function(e, hashPassword){
          var redis = store.redis
          , multi = redis.multi()
          , key = 'users:' + userId; //save the user hash with key user:[userid]
          
          //create the hash
          multi.hset(key, 'id', userId);
          multi.hset(key, 'appId', user.appId);
          multi.hset(key, 'email', user.email.toLowerCase());
          multi.hset(key, 'username', user.username);
          multi.hset(key, 'password', hashPassword);
          if (user.invited) multi.hset(key, 'invited', user.invited);
          if (user.firstName) multi.hset(key, 'firstName', user.firstName);
          if (user.lastName) multi.hset(key, 'lastName', user.lastName);
          if (user.fullName) multi.hset(key, 'fullName', user.fullName);

          //save the user's userid to sets user:[user.email] and user:[user.username]
          multi.set('users:'+user.email.trim().toLowerCase(), userId);
          multi.set('users:'+user.username.trim().toLowerCase(), userId);

          //now we need to update the app with the new information username, fullName
          var appKey = 'coordelapp:' + user.appId;
          multi.hset(appKey, 'username', user.username);
          multi.hset(appKey, 'userId', userId);
          if (user.fullName) multi.hset(appKey, 'fullName', user.fullName);

          
          multi.exec(function(err, replies){
            //console.log('imported user', replies);
            if (err) fn(err, false);
            fn(null, true);
          });
        
        });
      });
    },

    redeem: function(user, fn){
      //this function updates the user and userApp
      saltAndHash(user.password, function(e, hashPassword){

        var redis = store.redis
        , multi = redis.multi()
        , key = 'users:' + user.userId; //save the user hash with key user:[userid]

        //create the hash
        multi.hset(key, 'id', user.userId);
        multi.hset(key, 'appId', user.appId);
        multi.hset(key, 'email', user.email.toLowerCase());
        multi.hset(key, 'username', user.username);
        multi.hset(key, 'password', hashPassword);
        if (user.firstName) multi.hset(key, 'firstName', user.firstName);
        if (user.lastName) multi.hset(key, 'lastName', user.lastName);
        if (user.fullName) multi.hset(key, 'fullName', user.fullName);

        //save the user's userid to sets user:[user.email] and user:[user.username]
        multi.set('users:'+user.email.trim().toLowerCase(), user.userId);
        multi.set('users:'+user.username.trim().toLowerCase(), user.userId);

        //now we need to update the app with the new information username, fullName
        var appKey = 'coordelapp:' + user.appId;
        multi.hset(appKey, 'username', user.username);
        multi.hset(appKey, 'userId', user.userId);
        multi.hset(appKey, 'invited', 0);
        if (user.fullName) multi.hset(appKey, 'fullName', user.fullName);
        multi.hgetall(key);
        multi.exec(function(e, replies){
          //console.log('redeemed user', replies);
          if (e){
            fn(e);
          } else {
            fn(null, user);
          }
        });
      });
    },
    
    create: function(user, fn){
      var v = validator.validate(user, Schema);
      if (!v.valid){
        fn(v.errors);
      } else {

        //hash the password for storage
        saltAndHash(user.password, function(e, hashPassword){
          var redis = store.redis
          , multi = redis.multi()
          , key = 'users:' + user.userId; //save the user hash with key user:[userid]
          
          //create the hash
          multi.hset(key, 'id', user.userId);
          multi.hset(key, 'appId', user.appId);
          multi.hset(key, 'email', user.email.toLowerCase());
          multi.hset(key, 'username', user.username);
          multi.hset(key, 'password', hashPassword);
          if (user.invited) multi.hset(key, 'invited', user.invited);
          if (user.firstName) multi.hset(key, 'firstName', user.firstName);
          if (user.lastName) multi.hset(key, 'lastName', user.lastName);
          if (user.fullName) multi.hset(key, 'fullName', user.fullName);

          //update lookup sets
          multi.sadd('coordel-users', key); //keep for backward compatibility

          //save the user's userid to sets user:[user.email] and user:[user.username]
          multi.set('users:'+user.email.trim().toLowerCase(), user.userId);
          multi.set('users:'+user.username.trim().toLowerCase(), user.userId);
          
          multi.exec(function(err, replies){
            //console.log('created user', replies);
            if (err) return fn(err, false);
            fn(null, user);
          });
        
        });
      }
    },

    save: function(id, data, fn){
      var key = "users:" + id
        , multi = store.redis.multi();

      //console.log("saving user", id, data);

      //updates the user object with any fields sent in as data (update app with any common fields)
      if (data.fullName){
        multi.hset(key, 'fullName', data.fullName);
        //update the app with the fullname
        multi.hset('coordelapp:'+id, 'fullName', data.fullName);
      }
      if (data.email){
        data.email = data.email.toLowerCase();
        multi.hset(key, 'email', data.email);
        //update the app with the email
        multi.hset('coordelapp:'+id, 'email', data.email);
         //since this is a new email, then we need to make sure we can find the user by it
        multi.set('users:'+data.email, id);
      }
      if (data.username){
        multi.hset(key, 'username', data.username);
        //update the app with the username
        multi.hset('coordelapp:'+id, 'username', data.username);
        //since this is a new username, then we need to make sure we can find the user by it
        multi.set('users:'+data.username.toLowerCase(), id);
      }
      if (data.location){
        multi.hset(key, 'location', data.location);
      } else {
        multi.hdel(key, 'location');
      }
      if (data.personalLink){
        multi.hset(key, 'personalLink', data.personalLink);
      } else {
        multi.hdel(key, 'personalLink');
      }
      if (data.localCurrency){
        multi.hset(key, 'localCurrency', data.localCurrency);
      } else {
        multi.hdel(key, 'localCurrency');
      }
      if (data.bio){
        multi.hset(key, 'bio', data.bio);
      } else {
        multi.hdel(key, 'bio');
      }
      multi.hgetall(key);
      multi.exec(function(e, replies){
        //console.log("response from multi in save", e, replies);
        if (e){
          fn(e);
        } else {
          fn(null, _.last(replies));
        }
      });
    },

    remove: function(id, fn){

    }

  };

  return User;
};