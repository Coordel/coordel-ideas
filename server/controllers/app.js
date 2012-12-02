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
        user = escape(JSON.stringify(req.session.currentUser));

        //prepare the profile
        var profile = escape(JSON.stringify(results.profile));

        //console.log("ideas and user", ideas, user);
        res.render('index', {
          token: res.locals.token,
          title: 'Coordel',
          menu: 'ideas',
          ideas: ideas,
          contacts: contactList,
          user: user,
          profile: profile,
          username: req.session.username,
          _csrf: req.session._csrf
        });
      });
    }
  };

  return App;
};

module.exports = AppController;