var _       = require('underscore')
  , utils   = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log     = console.log
  , md5     = require('MD5')
  , async   = require('async')
  , IntroController;

AppController = function(store) {

  var Idea = require('../models/idea')(store);
  var Profile = require('../models/profile')(store);
  var UserApp = require('../models/userApp')(store);

  var App = {

    index: function(req, res){

      async.parallel({
        profile: function(cb){
          Profile.findMiniProfile(req.session.currentUser, function(e, o){
            if (e){
              cb('error' + e);
            } else {
              cb(null, o);
            }
          });
        },
        userApp: function(cb){
          UserApp.findById(req.session.currentUser.appId, function(e, o){
            if (e){
              cb('error' + e);
            } else {
              cb(null, o);
            }
          });
        },
        supportAccount: function(cb){
          Profile.findSupportAccount(req.session.currentUser, function(e, o){
            if (e){
              console.log("error", e);
              cb('error' + e);
            } else {
              cb(null, o);
            }
          });
        },
        timeline: function(cb){
           Idea.timeline(function(e, o){
            if (e){
              cb('error' +e);
            } else {
              cb(null, o);
            }
          });
        },
        contacts: function(cb){
          UserApp.findContacts(req.session.currentUser, function(e, o){
            if (e){
              cb('error'+e );
            } else {
              cb(null, o);
            }
          });
        }
      },
      function(e, results) {

        var ideas = [];
        _.each(results.timeline, function(i){
          //since the project was stored as a string, we need to parse it before returning it.
          ideas.push(JSON.parse(i));
        });

        var contactList = [];
        _.each(results.contacts, function(c){

          contactList.push(c);
        });

        //now we need to stringify and escape the objects for tranfer
        ideas = escape(JSON.stringify(ideas));
        contactList = escape(JSON.stringify(contactList));

        //console.log("contactList", contactList);

        //update the user
        var user = req.session.currentUser;
        user.imageUrl = 'http://www.gravatar.com/avatar/' + md5(user.email) + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png');
        user.app = results.userApp;
        user.account = results.supportAccount;
        user = escape(JSON.stringify(user));


        //prepare the profile
        var profile = escape(JSON.stringify(results.profile));

        //console.log("ideas and user", ideas, user);
        res.render('index', {
          token: res.locals.token,
          title: 'Coordel',
          menu: '#menuIdeas',
          ideas: ideas,
          contacts: contactList,
          user: user,
          profile: profile,
          username: req.session.username,
          _csrf: req.session._csrf
        });
      });
    },

    contacts: function(req, res){
      var user = req.session.currentUser;

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        }
      },
      function(e, results) {

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);
        
        res.render('user', {
          token: res.locals.token,
          title: req.session.currentUser.fullName,
          menu: '#menuMe',
          subNav: 'contacts',
          user: ext.user,
          ideas: compress([]),
          profile: ext.profile,
          contacts: ext.contacts,
          username: req.session.username,
          _csrf: req.session._csrf
        });
      });
    },

    blueprints: function(req, res){
      res.render('blueprints.ejs', {
        token: res.locals.token,
        title: 'Coordel Blueprints',
        username: req.session.username,
        _csrf: req.session._csrf
      });
    },

    moneyPledged: function(req, res){
      var user = req.session.currentUser;

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        },
        ideas: function(cb){
          Profile.findSupportAccount(req.session.currentUser, function(e, o){
            if (e){
              console.log("error", e);
             
            } else {
              console.log('account', o);
              var batch = _.union(o.pledgedIdeas, o.proxiedIdeas, o.recurringAllocatedPledges);
              Idea.findBatch(batch, function(e, o){
                if (e){
                  cb('error '+e);
                } else {
                  cb(null, o);
                }
              });
            }
          });
        }
      },
      function(e, results) {

        _.each(results.ideas, function(item){
          item.pledgeType="money";
        });

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);
        
        res.render('user', {
          token: res.locals.token,
          title: req.session.currentUser.fullName,
          menu: '#menuMe',
          subNav: 'moneyPledged',
          user: ext.user,
          ideas: compress(results.ideas),
          profile: ext.profile,
          contacts: ext.contacts,
          username: req.session.username,
          _csrf: req.session._csrf
        });
      });
    },

    timePledged: function(req, res){
      var user = req.session.currentUser;

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        },
        ideas: function(cb){
          Profile.findSupportAccount(req.session.currentUser, function(e, o){
            if (e){
              console.log("error", e);
             
            } else {
              console.log('account', o);
              Idea.findBatch(o.pledgedTimeIdeas, function(e, o){
                if (e){
                  cb('error '+e);
                } else {
                  cb(null, o);
                }
              });
            }
          });
        }
      },
      function(e, results) {

        _.each(results.ideas, function(item){
          item.pledgeType="time";
        });

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);
        
        res.render('user', {
          token: res.locals.token,
          title: req.session.currentUser.fullName,
          menu: '#menuMe',
          subNav: 'timePledged',
          user: ext.user,
          ideas: compress(results.ideas),
          profile: ext.profile,
          contacts: ext.contacts,
          username: req.session.username,
          _csrf: req.session._csrf
        });
      });
    },

    supporting: function(req, res){
      var user = req.session.currentUser;

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        },
        ideas: function(cb){
          Idea.findUserSupporting(user.appId, function(e, o){
            if (e){
              cb('error '+e);
            } else {
              cb(null, o);
            }
          });
          
        }
      },
      function(e, results) {

        //console.log("ideas", results.ideas);

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);
        
        res.render('user', {
          token: res.locals.token,
          title: req.session.currentUser.fullName,
          menu: '#menuMe',
          subNav: 'supporting',
          user: ext.user,
          ideas: compress(results.ideas),
          profile: ext.profile,
          contacts: ext.contacts,
          username: req.session.username,
          _csrf: req.session._csrf
        });
      });
    },

    ideas: function(req, res){
      var user = req.session.currentUser;

      async.parallel({
        extendedUser: function(cb){
          extendUser(req.session.currentUser, function(e, ext){
            cb(null,ext);
          });
        },
        ideas: function(cb){
          store.couch.db.view('coordel/userOpportunities', {startkey: [user.appId], endkey: [user.appId, {}]}, function(e, opps){
            if (e){
              cb('error '+e);
            } else {
              cb(null, opps);
            }
          });
        }
      },
      function(e, results) {

        var ideas = _.map(results.ideas, function(item){
          return item.value;
        });

        //console.log("ideas", ideas);

        //compress the user
        var ext = compressExtendedUser(results.extendedUser);
        
        res.render('user', {
          token: res.locals.token,
          title: req.session.currentUser.fullName,
          menu: '#menuMe',
          subNav: 'ideas',
          user: ext.user,
          ideas: compress(ideas),
          profile: ext.profile,
          contacts: ext.contacts,
          username: req.session.username,
          _csrf: req.session._csrf
        });
      });
    }
  };

  //compresses a json object into a format for trasmission into ejs templates
  function compress(json){
    return escape(JSON.stringify(json));
  }

  //compresses the extended user for transmission into an ejs template
  function compressExtendedUser(extendedUser){
    return {
      user: compress(extendedUser.user),
      contacts: compress(extendedUser.contacts),
      profile: compress(extendedUser.profile)
    };
  }

  //user is the user object (either req.session.currentUser or a loaded user)
  function extendUser(user, fn){

    async.parallel({
      profile: function(cb){
        Profile.findMiniProfile(user, function(e, o){
          if (e){
            console.log("mini profile error", e);
            cb('error' + e);
          } else {
            console.log("mini profile", o);
            cb(null, o);
          }
        });
      },
      userApp: function(cb){
        UserApp.findById(user.appId, function(e, o){
          if (e){
            cb('error' + e);
          } else {
            cb(null, o);
          }
        });
      },
      supportAccount: function(cb){
        Profile.findSupportAccount(user, function(e, o){
          if (e){
            console.log("error", e);
            cb('error' + e);
          } else {
            cb(null, o);
          }
        });
      },
      contacts: function(cb){
        UserApp.findContacts(user, function(e, o){
          if (e){
            cb('error'+e );
          } else {
            cb(null, o);
          }
        });
      }
    },
    function(e, results) {

      var ext = {};

      //update the user
      user.imageUrl = 'http://www.gravatar.com/avatar/' + md5(user.email) + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png');
      user.app = results.userApp;
      user.account = results.supportAccount;

      //put the user into the extension
      ext.user = user;
   
      var contacts = [];
      _.each(results.contacts, function(c){
        contacts.push(c);
      });

      //add the contacts to the extension
      ext.contacts = contacts;

      console.log("profile", results.profile);

      //add the profile to the extension
      ext.profile = results.profile;

      //return the extendedUser
      fn(null, ext);
    });
  }

  return App;
};

module.exports = AppController;