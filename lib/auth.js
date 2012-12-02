var auth
  , noAuth = '/intro';

auth = function(req, res, next){

  var Token = require('../server/models/token')(store);

  function authenticateFromLoginToken(req, res, next) {

    var cookie = JSON.parse(req.cookies.logintoken);

    Token.find(cookie.username, function(e, token){
      if (e){
        res.redirect(noAuth);
      } else if (!token){
        res.redirect(noAuth);
      } else if (!token.username) {
        res.redirect(noAuth);
      } else {
        if (cookie.token === token.token && cookie.series === token.series){
          Account.get(token.username, function(e, o) {
            console.log("got account", e, o);
            if (o) {
              req.session.username = token.username;
              req.session.currentUser = o;
              token = Token.refresh(cookie);
              Token.save(token, function(){});
              res.cookie('logintoken', JSON.stringify(token), {expires: new Date(Date.now() + 2 * 604800000), path: '/'});
              next();
            } else {
              res.redirect(noAuth);
            }
          });
        } else {
          res.redirect(noAuth);
        }
      }
    });
  }

  function loadUser(req, res, next) {

    //console.log("session variables", req.session.username, req.session.currentUser);
    if (req.session.username && req.session.currentUser) {
      console.log('there is a session');
      next();
    } else if (req.cookies.logintoken) {
      console.log('there is a logintoken');
      authenticateFromLoginToken(req, res, next);
    } else {
      console.log('redirecting to intro');
      res.redirect(noAuth);
    }
  }
};

module.exports = auth;