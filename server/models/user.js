/* Coordel User
  A User is the base object and is stored in redis
*/
var bcrypt = require('bcrypt')
  , moment = require('moment');

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

  function loginUser(login, fn){
    var redis = store.redis;
    //login will contain the user, key to find the userid, and the password
    //login format {key: 'user:'[username] or 'user:[email', user:[username] or [email], password: [password]}

    //get the userid at the key
    redis.get(login.key, function(e, userid){
      console.log("looked for the key", login.key, e, userid);
      if (e){
        fn('error-user-login');
      } else if (userid === null){
        fn('user-not-found');
      } else {
        //load the user with the userid
        loadUser(userid, function(e, o){
          console.log("loaded the user", e, o);
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
      //console.log("USER", user);
      if (e){
        //console.log("couldn't load existing user from store",err);
        fn('user-not-found');
      } else {
        //console.log("found the user", user);
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
      console.log('salt', salt);
      bcrypt.hash(pass, salt, function(err, hash) {
        console.log('hash', hash);
        fn(false, hash);
      });
    });
  }

  User = {

    findById: function(id, fn){
      loadUser(id, function(e, user){
        if (e){
          fn('user-not-found');
        } else if (user === null){
          fn('user-not-found');
        } else {
          fn(null, user);
        }
      });
    },

    login: function(user, pass, fn){
      //validate the login and get a key to use to see if the user exists
      var login = validateLogin(user, pass);

      console.log("validated login", login);

      if (login.key){
        //the user and passwords were valid
        //load the user
        loginUser(login, function(e, o){
          if(e){
            fn('user-not-found');
          } else if (o === null){
            fn('user-not-found');
          } else{
            bcrypt.compare(pass, o.password, function(err, res) {
              if (res){

                console.log("password okay, returning user", o);
                //remove the password from the object
                delete o.password;
                fn(null, o);
              } else{
                console.log("invalid password");
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

    importUser: function(user, fn){
      //use this function to import users from the original site. it hashes the passwords and it creates the required lookups
      //it also updates the user's app with the

      //imported users won't have a username, but need one, so make it their first name + last name + milliseconds for safety
      user.username = user.firstName.trim().toLowerCase() + user.lastName.trim().toLowerCase() + moment().format('SSS');
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
            console.log('imported user', replies);
            if (err) fn(err, false);
            fn(null, true);
          });
        
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
            console.log('created user', replies);
            if (err) fn(err, false);
            fn(null, true);
          });
        
        });
      }
    },

    save: function(user, fn){

    },

    remove: function(id, fn){

    }

  };

  return User;
};