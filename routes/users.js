
var md5 = require('MD5')
  , Account = require('../models/account');

exports.show = function(req, res){
  console.log("users showing");
  //the user is logged in
  var obj = {};
  var user = req.session.currentUser;
  obj.menu = 'user';

  var hash = md5(user.email);
  obj.title = 'Coordel',
  obj.token = res.locals.token;
  obj.appId = user.appId;
  obj.email = user.email;
  obj.firstName = user.firstName;
  obj.lastName = user.lastName;
  obj.username = user.username;
  obj.imageUrl = 'http://www.gravatar.com/avatar/' + hash + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png');
  obj.user = req.params.username;

  //appId, email, username, firstName and lastName are in the session
  Account.getCounts(user.appId, function(e, results){
    console.log('results', results);
    obj.counts = results.counts;
    obj.ideas = results.lists.ideas;
    obj.contacts = results.lists.contacts;
    console.log('object', obj);
    res.render('user', obj);
  });
  //need to get the feedback
  //need to get the profile (ideasCount, supportingCount, contactCount)

  
};