var v1       = '/api/v1'
  , _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log      = console.log
  , bcrypt = require('bcrypt')
  , async    = require('async')
  , validator = require('revalidator')
  , moment = require('moment')
  , UsersController;

UsersController = function(store) {

  var User = require('../models/user')(store);
  var App = require('../models/userApp')(store);
  var Profile = require('../models/profile')(store);
  var Token = require('../models/token')(store);
  var Blueprint = require('../models/blueprint')(store);

  var Schema = {
    properties: {
      email: {
        description: 'email',
        type: 'string',
        format: 'email'
      },
      username: {
        description: 'alphanumeric username',
        type: 'string',
        pattern: '^[0-9a-zA-Z]*$',
        minLength: 1
      }
    }
  };

  function register(userData, fn){
    var redis = store.redis
      , multi = redis.multi();

    multi.incr('userKeys');
    multi.incr('appKeys');
    
    multi.exec(function(err, ids){
      if (err) fn(err, false);
      
      //put the new ids into the submitted data
      userData.userId = ids[0];
      userData.appId = ids[1];
      
      //console.log("register userData", userData);

      //in the original app, firstName and lastName were used. in the latest version, that was replaced with fullname
      //to maintain compatibility, need to try and create the first and last names from the fullname given
      //all the types of names, this is iffy, which is way it was changed to fullName
      var names = userData.fullName.split(' ');
      if (names.length >= 2){
        //this makes the assumption that the first name and the last name of 3 or more name parts is first and last
        firstName = names[0];
        lastName = names[names.length - 1];
      } else if (names.length > 1 && names.length < 2){
        //assumes that first given is first and last is last (might not fit with all cultures)
        userData.firstName = names[0];
        userData.lastName = names[1];
      } else if (names.length === 1){
        //makes the first name the only given name if one only
        firstName = names[0];
      }

      var funcs = [];

      //create the user
      funcs.push(User.create(userData, function(e, o){
        console.log("user created", e, o);
      }));

      /*
      //create the user's App
      funcs.push(App.create(userData, function(e, o){
        console.log("app created", e, o);
      }));
*/

      async.parallel(funcs, function(e, o){
        //return all the created objects from the registration process
        console.log("async done", e, o);
        fn(false, o);
      });

    });
  }

  //when a user gets invited to participate, this function provides a temporary password to use as a placeholder
  //for the user...it is overwritten when the user creates their account
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
    
    var time = dt.getTime().toString(),
        password = new Buffer(time).toString('base64');

    return password;
  }

  function getData(req, origin){
    //this function gets the values based on where the values were submitted
    //TODO: create logs accordingly if analytics doesn't suffice
    var userData = {};
    
    switch (origin){
        case 'index-signup':
          //this came from the intro homepage
          userData.fullName = req.body['signup-fullname'].trim();
          userData.email = req.body['signup-email'];
          userData.password = req.body['signup-password'];
          break;
        case 'signup':
          //this came from the intro homepage
          userData.fullName = req.body['fullname'].trim();
          userData.email = req.body['email'];
          userData.password = req.body['password'];
          break;
        case 'invite':
          //comes from when an invite is posted to an idea by a user
          break;
        default:
          //this is here in case there isn't a source or there is a problem
          userData.fullName = '';
          userData.email = '';
          userData.password = '';
      }

      return userData;
  }

  var Users = {

    copyBlueprint: function(req, res){
      var appId = req.params.appId
        , blueprint = JSON.parse(req.body.blueprint);

      console.log("copy blueprint", appId, blueprint);
      var stamp = moment().format(store.timeFormat);
      blueprint.username = appId;
      blueprint.creator = appId;
      blueprint.created = stamp;
      blueprint.updated = stamp;
      blueprint.updater = appId;

      Blueprint.create(blueprint, function(e, o){
        if (e){
          res.json({
            success: false,
            errors: [e]
          });
        } else {
          res.json({
            success: true,
            blueprint: o
          });
        }
      });
    },

    login: function(req, res){
      res.render('user/login');
    },

    getContactMiniProfile: function(req, res){
      var appId = req.params.appId
        , contactId = req.params.contactId;

      var user = {};
      user.appId = contactId;
      Profile.findMiniProfile(user, function(e, o){
        if (e){
          res.json({
            success: false,
            errors: [e]
          });
        } else {
          res.json(o);
        }
      });
    },

    manualLogin: function(req, res){
      console.log("doing manual login");
      var username = req.body['login-username'];
      var password = req.body['login-password'];

      var funcs = [];
      var user;
      //login the user
      User.login(username, password, function(e, o){
        console.log("back from login", e, o);

        if (e){
          //fail, redirect to signin
          res.redirect('/signin');
        } else if (o === null ){
          //fail, redirect to signin
          res.redirect('/signin');

        } else {
          console.log("login okay, user is good", o);
          req.session.username = o.username;
          req.session.currentUser = o;
          // Remember me
          if (req.body.remember_me) {
            console.log("remember this user");
            var token = Token.generate(o.username);
            console.log("token", Token);
            res.cookie('logintoken', JSON.stringify(token), { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
          }
        }
        
        res.redirect('/');
      });
      /*
      funcs.push();

      async.parallel(funcs, function(e, o){
        console.log("parallel done", e, o);
        res.render('index', user);
      });
      */
      //get the ideas profile

      //get the settings profile

    },

    logout: function(req, res){
      if (req.session) {
        var username = req.session.username;
        res.clearCookie('logintoken');
        req.session.destroy(function() {});
        if (username){
          Token.remove(username, function(){});
        }
      }
      res.redirect('/intro');
    },

    checkEmail: function(req, res){
      var redis = store.redis
        , email = req.query.email.toLowerCase();

      var v = validator.validate({email: email}, Schema);

      if (!v.valid){
        res.json({error: 'invalid-email', report: v.errors});
      } else {
        //this checks if this email is available in user:[email];
        redis.get('user:'+ email, function(e, o){
          var message = 'This email is already registered!';
          console.log("get email", e,o);
          if (e) {
            res.json(message);
          } else if (o !== null){
            res.json(message);
          } else {
            res.json(true);
          }
        });
      }
    },

    checkUsername: function(req, res){
      //checks that this username is available
      var redis = store.redis
        , username = req.query.username.trim().toLowerCase();

      var v = validator.validate({username:username}, Schema);

      if (!v.valid){
        res.json({error: 'invalid-username', report: v.errors});
      } else {
        //this checks if this username is available in user:[username];
        redis.get('user:' + username, function(e, o){
          var message = 'This username is already taken!';
          console.log("sismember username", e, o);
          if (e) {
            res.json(message);
          } else if (o !== null){
            res.json(message);
          } else {
            res.json(true);
          }
        });
      }
    },

    startRegistration: function(req, res){
      //a user can get started registering by submitting an email, fullName, and password. enabling this
      //will allow creation of the initial app, and to see which users don't finish
      //it will also allow for the invite process to happen. either the user or the invited user can complete the registration
      //save the
      var userData = {}
        , origin= req.body.origin;

      userData = getData(req, origin);

      //create a default username if there is a fullname
      if (userData.fullName.length){
        var username = '';
        var names = userData.fullName.split(' ');
        _.forEach(names, function(name){
          username += name.toLowerCase();
        });
        userData.username = username;
      } else {
        userData.username = '';
      }

      //if there is an email in the submission save it
      if (userData.email && userData.email.length){
        var redis = store.redis
          , key = 'registration-starts';

        //only save the email and fullname if submitted
        var val = {
          email: userData.email,
          created: moment().format(store.timeFormat)
        };

        if (userData.fullName && userData.fullName.length){
          val.fullName = userData.fullName;
        }

        console.log('started registrations', val);

        redis.sadd(key, JSON.stringify(val));
      }

      res.render('user/signup', userData);
    },

    completeRegistration: function(req, res){

      var userData = {}
        , origin= req.body.origin;

      userData = getData(req, origin);

      /*
      switch (origin){
        case 'index-signup':
          //this came from the intro homepage
          userData.fullName = req.body['signup-fullname'].trim();
          userData.email = req.body['signup-email'];
          userData.password = req.body['signup-password'];
          break;
        case 'signup':
          //this came from the intro homepage
          userData.fullName = req.body['fullname'].trim();
          userData.email = req.body['email'];
          userData.password = req.body['password'];
          break;
        case 'invite':
          //comes from when an invite is posted to an idea by a user
          break;
        default:
          //this is here in case there isn't a source or there is a problem
          userData.fullName = '';
          userData.email = '';
          userData.password = '';
      }
      */

      //create a default username if there is a fullname
      if (userData.fullName.length){
        var username = '';
        var names = userData.fullName.split(' ');
        _.forEach(names, function(name){
          username += name.toLowerCase();
        });
        userData.username = username;
      } else {
        userData.username = '';
      }

      register(userData, function(e, o){
        console.log("registered", e, o);
        if (e) {
          //handle registration errors
        } else {
          res.redirect('/');
        }
      });

      
    },



    validateRegistration: function(req, res){

    },

    invite: function(req, res){

      var userData = req.body;
      userData.currUser = req.session.appId;
      userData.password = tempPassword();
     
      //the fromUser is the current user
      //the email and fullName from the form are the toUser

      //register the toUser
    },

    setAppValues: function(req, res){
      var appId = req.params.appId
        , vals = req.body.vals;

      App.set(appId, vals, function(e, o){
        console.log("updated app", e, o);
        res.end();
      });
    }

  };

  return Users;
};

module.exports = UsersController;