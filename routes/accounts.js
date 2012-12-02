var Account = require('../models/account');
var Token = require('../models/token');

exports.show = function(req, res){
  res.render('signup', {token: res.locals.token});
};

exports.manualLogin = function(req, res){
  var username = req.body['login-username'];
  var password = req.body['login-password'];

  Account.manualLogin(username, password, function(e, o){
    if (e) {
      res.redirect('/login');
    } else {
      req.session.username = username;
      req.session.currentUser = {
        appId: o.appId,
        email: o.email,
        username: o.firstName.toLowerCase() + o.lastName.toLowerCase(),
        firstName: o.firstName,
        lastName: o.lastName
      };
      // Remember me
      if (req.body.remember_me) {
        var token = Token.generate(username);
        res.cookie('logintoken', JSON.stringify(token), { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
      }
      res.redirect('/');
    }
  });
};

exports.add = function(req, res){
  console.log("add user", req.body);
};

exports.remove = function(req, res){
  if (req.session) {
    var username = req.session.username;
    res.clearCookie('logintoken');
    req.session.destroy(function() {});
    if (username){
      Token.remove(username, function(){});
    }
  }
  res.redirect('/intro');
};