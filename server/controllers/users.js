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
      
      console.log("register userData", userData);

      //in the original app, firstName and lastName were used. in the latest version, that was replaced with fullname
      //to maintain compatibility, need to try and create the first and last names from the fullname given
      //all the types of names, this is iffy, which is way it was changed to fullName
      var names = userData.fullName.split(' ');
      if (names.length >= 2){
        //this makes the assumption that the first name and the last name of 3 or more name parts is first and last
        userData.firstName = names[0];
        userData.lastName = names[names.length - 1];
      } else if (names.length > 1 && names.length < 2){
        //assumes that first given is first and last is last (might not fit with all cultures)
        userData.firstName = names[0];
        userData.lastName = names[1];
      } else if (names.length === 1){
        //makes the first name the only given name if one only
        userData.firstName = names[0];
        userData.lastName = "";
      }

      console.log("userdata after name check", userData);

      async.parallel({
        user: function(cb){
          User.create(userData, function(e, o){
            console.log("user created", e, o);
             
            cb(null, o);
          });
        },
        userApp: function(cb){
          App.create(userData, function(e, o){
            console.log("app created", e, o);
            cb(null, o);
          });
        }
      },
      function(e, results) {
        if (e){
          fn(e);
        } else {
          fn(null, results);
        }
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
        userData.email = req.body['signup-email'].toLowerCase();
        userData.password = req.body['signup-password'];
        userData.username = '';
        break;
      case 'signup':
        //this came from the intro homepage
        userData.fullName = req.body['fullname'].trim();
        userData.email = req.body['email'].toLowerCase();
        userData.password = req.body['password'];
        userData.username = req.body['username'].toLowerCase();
        break;
      case 'redeem':
        //comes from when an invite is send from the app to a user
        userData.fullName = req.body['fullname'].trim();
        userData.email = req.body['email'].toLowerCase();
        userData.password = '';
        userData.username = '';
        break;
      default:
        //this is here in case there isn't a source or there is a problem
        userData.fullName = '';
        userData.email = '';
        userData.password = '';
        userData.username = '';
    }

    return userData;
  }

  function login (req, res, username, password){
    User.login(username, password, function(e, o){
      console.log("back from login", e, o);

      if (e){
        console.log("redirecting to login");
        //fail, redirect to signin
        res.redirect('/login');

      } else if (o === null ){
        //fail, redirect to signin
        res.redirect('/login');

      } else {
        //console.log("login okay, user is good", o);
        req.session.username = o.username;
        req.session.currentUser = o;
        console.log("body", req.body);
        // Remember me
        if (req.body.remember_me) {
          //console.log("remember this user");
          var token = Token.generate(o.username);
          //console.log("token", Token);
          res.cookie('logintoken', JSON.stringify(token), { expires: new Date(Date.now() + 2 * 604800000), path: '/' , domain: '.coordel.com'});
        }
        res.redirect('/');
      }
      
    });
  }

  function startRegistration(req, res, userData){
    console.log("userdata", userData);

    if (userData.email && userData.email.length){
      var key = 'registration-starts';

      //only save the email and fullname if submitted
      var val = {
        email: userData.email.toLowerCase(),
        created: moment().format(store.timeFormat)
      };

      if (userData.fullName && userData.fullName.length){
        val.fullName = userData.fullName;
      }

      console.log('started registrations', val);

      store.redis.sadd(key, JSON.stringify(val));
    }

    res.render('user/signup', userData);
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

    forgotPassword: function(req, res){
      res.render('user/resendPassword');
    },

    resetPassword: function(req, res){
      var username = req.body.username.trim()
        , email = req.body.email.trim()
        , key = 'users:';


      console.log("resetting password", username, email, key);

      if (!username.length && !email.length){
        res.json({
          success: false,
          errors: "Submit e-mail OR username."
        });
        return;
      }

      if (username.length && email.length){
        //error the user gave both
        res.json({
          success: false,
          errors: "Submit e-mail OR username, not both."
        });
        return;
      }

      if (email.length){
        //reset by email
        key = key + email;
      } else if (username.length){
        //reset by username
        key = key + username;
      }

      console.log("key", key);

      User.resetPassword(key, function(e, user){
        if (e){
          res.json({
            success: false,
            errors: "Incorrect e-mail or username."
          });
        } else {
          //send the email with the hash in the link
          var mailOptions = {
            to: {
              fullName: user.fullName,
              email: user.email,
              username: user.username
            },
            from: {
              fullName: "Coordel",
              email: "noreply@coordel.com",
              username: ""
            },
            subject: "Your password has been reset",
            resetUrl: store.coordelUrl + '/resets?h=' + encodeURIComponent(user.hash)
          };

          console.log("mail options", mailOptions);

          store.email.send('passwordReset', mailOptions);
          res.json({
            success: true,
            message: "Your password has been reset. Check your e-mail for a link to complete the reset process."
          });
        }
      });
    },

    loadResetPassword: function(req, res){
      var hash = req.query.h;

      res.render('user/completeReset', {hash: hash});
    },

    completeResetPassword: function(req, res){
      var newPass = req.body.newPass
        , hash = req.body.hash;

      //console.log("newPass", newPass, "hash", hash);

      store.redis.get('reset:'+hash, function(e, reset){
        if (e){
          //error
        } else {
          //console.log('reset', reset);
          reset = JSON.parse(reset);
          //console.log("reset", reset);
          var key = 'users:'+reset.userId;
         // console.log("key", key);
          store.redis.hgetall(key , function(e, user){
           // console.log('got the user', e, user);
            if (e){
              //error
            } else {
              //first make sure that the password matches from the hash
              //console.log("user.password", user.password, "reset.password", reset.pass, "new pass", newPass);
              if (user.password === reset.pass){
                //go ahead and set the new password to the new password
                User.completeResetPassword(reset.userId, newPass, function(e, o){
                  console.log("updated", e, o);

                  req.session.username = o.username;
                  req.session.currentUser = o;
                  var token = Token.generate(o.username);
                  res.cookie('logintoken', JSON.stringify(token), { expires: new Date(Date.now() + 2 * 604800000), path: '/' , domain: '.coordel.com'});
                  res.json({
                    success: true
                  });
                });
              } else {
                //error
              }
            }
          });
        }
      });
    },

    updatePassword: function(req, res){
      var current = req.body.current
        , newPass = req.body.newPass;

      var args = {
        id: req.session.currentUser.id,
        current: req.body.current,
        newPass: req.body.newPass
      };

      console.log("args to send to updatePassword", args);

      User.updatePassword(args, function(e, text){
        if (e){
          res.json({
            success: false,
            errors: [e]
          });
        } else {
          res.json({
            success: true,
            message: text
          });
        }
      });

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

    saveProfile: function(req, res){
      var id = req.session.currentUser.id
        , data = req.body;

      console.log('saving profile', id, data);

      User.save(id, data, function(e, user){
        if (e){
          res.json({
            success: false,
            errors: [e]
          });
        } else {
          req.session.currentUser = user;
          res.json({
            success: true,
            user: user
          });
        }
      });
    },

    saveAccount: function(req, res){
      var id = req.session.currentUser.id
        , data = req.body;

      console.log('saving account', id, data);

      User.save(id, data, function(e, user){
        if (e){
          res.json({
            success: false,
            errors: [e]
          });
        } else {
          req.session.currentUser = user;
          res.json({
            success: true,
            user: user
          });
        }
      });
    },

    disconnectTwitter: function(req, res){
      App.disconnectTwitter(req.session.currentUser.appId, function(e, app){
        console.log(app, req.session.currentUser.app);
        //req.session.currentUser.app = app;
      });
    },

    disconnectCoinbase: function(req, res){
      App.disconnectCoinbase(req.session.currentUser.appId, function(e, app){
        console.log(app, req.session.currentUser.app);
        //req.session.currentUser.app = app;
      });
    },

    manualLogin: function(req, res){
      console.log("doing manual login");
      var username = req.body['login-username'];
      var password = req.body['login-password'];
   
      login(req, res, username, password);

    },

    logout: function(req, res){
      if (req.session) {
        var username = req.session.username;
       
        
        res.clearCookie('logintoken');

        
        req.session.destroy(function() {});
        
        if (username){
          Token.remove(username, function(e, o){
           
          });
          
        }
      }

      res.redirect('/');
    },

    requestInvite: function(req, res){
      var user = {
        fullname: req.body.fullname,
        email: req.body.email
      };
      console.log("user", user);
      User.requestInvite(user, function(e, o){
        console.log("inviterequest", e, o);
        if (e){
          res.json({
            success: false,
            errors: [e]
          });
        } else {
          res.json({
            success: true
          });
        }
      });
    },
    
    checkEmail: function(req, res){
      var redis = store.redis
        , email = req.query.email.toLowerCase();

      var v = validator.validate({email: email}, Schema);

      if (!v.valid){
        res.json({success: false, error: 'invalid-email', report: v.errors});
      } else {
        //this checks if this email is available in user:[email];
        redis.get('users:'+ email, function(e, o){
          var message = 'This email is already registered!';
          console.log("get email", e,o);
          if (e) {
            console.log("error with user email");
            res.json(message);
          } else if (o !== null){
            console.log("user wasn't null, all bad");
            res.json(message);
          } else {
            console.log("user ok");
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
        redis.get('users:' + username, function(e, o){
          var message = 'This username is already taken!';
          console.log("get username", e, o);
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

      startRegistration(req,res,userData);
    },

    completeRegistration: function(req, res){

      var userData = {}
        , origin= req.body.origin;

      userData = getData(req, origin);
      if (origin === 'redeem'){

      } else {
        register(userData, function(e, o){
          console.log("registered", e, o);
          if (e) {
            console.log("registration errors", e, o);
            //handle registration errors
          } else {
            login(req, res, o.userApp.username, o.userApp.password);
          }
        });
      }
    },

    invite: function(req, res){
      var invite = req.body;
      console.log("invite body", invite);

      //first we need to make a lookup for the invite so when the user comes back
      //create a hash of the invite id that can be used for lookup in the redeem call
      //use the inviteid to create the hash and then store the id as the value
      //then use the id to find the started app in redeem

      //this user has been created in the invite process in the app, need to make the new
      //lookup entry for it

      store.redis.set('users:'+invite.to.email.trim().toLowerCase(), invite.userId);

      //inviteId will be in the invite
      var b = new Buffer(invite.userId.toString())
        , hash = b.toString('base64')
        , key = 'invite-hashes:' + hash;

      console.log("hash", hash);

      invite.hash = encodeURIComponent(hash);
   
      //need to make it possible to find the user by the hash
      store.redis.set(key, invite.to.email, function(e, o){
        if (e){
          res.json(500, {
            success: false,
            errors: [e]
          });
        } else {

          var template = 'invite';
          if (invite.data.docType){
            template = 'taskInvite';
          }

          var mailOptions = invite;

          mailOptions.to.fullName = mailOptions.to.firstName + ' ' + mailOptions.to.lastName;
          mailOptions.from.fullName = mailOptions.from.firstName + ' ' + mailOptions.from.lastName + ' via Coordel';
          mailOptions.subject = invite.subject;

          //send email invite
          store.email.send(template, mailOptions);
          
          res.json(200, {
            success: true
          });
        }
      });
    },

    startRedeem: function(req, res){

      var hash = false
        , redis = store.redis
        , i = req.query.i;

      //if there's an i parameter
      if (i){
        hash = decodeURIComponent(i);
      }

      
      //if there are any errors, just render the default signup page
      var defaultData = {
            fullName : '',
            email : '',
            password : '',
            username : ''
          };
      if (hash){

        redis.get('invite-hashes:'+hash, function(e, id){

          console.log("hash", e, hash, id);

          if (id){
            //load the user with the userid
            var key = 'user:' + id;
            console.log("USER GET KEY", key);
            redis.hgetall(key, function(e, user){
              console.log("USER", e, user);
              if (e){
                //console.log("couldn't load existing user from store",err);
                fn('user-not-found');
              } else {
                user.hash = hash;

                //console.log("found the user", user);
                if (!user.fullName){
                  if (user.firstName && user.lastName){
                    user.fullName = user.firstName + ' ' + user.lastName;
                  } else {
                    user.fullName = '';
                  }
                }

                if (!user.username){
                  user.username = '';
                }

                //blank the temp password so the user can enter a new one
                user.password = '';

                res.render('user/redeem', user);
              }
            });
          } else {
            //no user, start registration
            startRegistration(req, res, defaultData);
          }
    
          

          //now we have the id of the user load the user

          /*
          redis.sismember(['coordel-invites', 'invite:' + id], function(err, reply) {
            console.log("after testing  sismember", err, reply);
            if (err){
              //problem with getting invite
              //console.log("error getting invite from store", err);
              startRegistration(req, res, defaultData);
            } else if (!reply){
              //console.log("invite didn't exist");
              startRegistration(req, res, defaultData);
            } else if (reply) {
              //console.log("invite existed, loading");
              var key = 'invite:' + id;
              console.log("key for get", key);
              redis.hgetall(key, function(err, invite){
                if (err){
                  //console.log("couldn't load existing invite from store",err);
                  startRegistration(req, res, defaultData);
                } else {
                  console.log("found the invite", invite);
                  var data = {};
                  if (invite.firstName && invite.lastName){
                    data.fullName = invite.firstName + ' ' + invite.lastName; // create the full name okay because user can change it
                  } else {
                    data.fullName = '';
                  }
                  data.email = invite.to;
                  data.password = '';
                  data.username = '';
                  data.origin = 'redeem';
                  //post the data '/signup' to complete registration
                  startRegistration(req, res, data);
                }
              });
            }
          });
          */
        });
      } else {
        startRegistration(req, res, defaultData);
      }
    },

    completeRedeem: function(req, res){
      //this updates the in app invite process...when the user invite is created, a hash is created that provides
      //the key (invite-hashes:hash) to get the user's email. from the email, it's possible to get both the user and userApp
      //records that were created. Each needs to be updated with the user's username and password
      var hash = req.body.hash
        , fullName = req.body.fullname
        , username = req.body.username
        , password = req.body.password
        , remember = req.body.remember_me;

      if (hash){
        var redis = store.redis
          , hashkey = 'invite-hashes:' + hash;

        //from the has we can get to the email of the user that is used to access the user:email record created by the app
        redis.get(hashkey, function(e, email){
          if (e){
            //error
          } else {
            //get the user created by the app
            var userkey = 'user:' + email;

            redis.hgetall(userkey, function(e, user){
              if (e){
                //error
              } else {
                //now update the user set created by the app and call redeem to come online with new registration
                user.fullName = fullName;
                user.username = username;
                user.password = password;
                User.redeem(user, function(e, redeemed){
                  if (e){
                    //error
                  } else {
                    //the redeemed user can that be used to login to the app
                    login(req, res, redeemed.username, redeemed.password);
                  }
                });
              }
            });
          }
        });
      }

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