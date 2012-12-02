
/*
 * GET home page.
 */

var md5 = require('MD5')
  , Account = require('../models/account');

exports.index = function(req, res){
  console.log("rendering index");
  //the user is logged in
  var obj = {};
  var user = req.session.currentUser;
  obj.menu = 'ideas';

  var hash = md5(user.email);
  obj.title = 'Coordel',
  obj.token = res.locals.token;
  obj.appId = user.appId;
  obj.email = user.email;
  obj.firstName = user.firstName;
  obj.lastName = user.lastName;
  obj.username = user.username;
  obj.imageUrl = 'http://www.gravatar.com/avatar/' + hash + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png');

  user.imageUrl = obj.imageUrl;
  
  console.log("user", user);
  //appId, email, username, firstName and lastName are in the session
  Account.getCounts(user.appId, function(e, results){
    console.log('results', results);
    obj.counts = results.counts;
    obj.ideas = results.lists.ideas;
    obj.contacts = results.lists.contacts;
    user.ideas = results.lists.ideas.length || 0;
    user.supporting = 0;
    user.contacts = results.lists.contacts.length || 0;
    obj.user = escape(JSON.stringify(user));
    console.log('object', obj);
    res.render('index', obj);
  });
  //need to get the feedback
  //need to get the profile (ideasCount, supportingCount, contactCount)

  
};