//server support
var express = require('express')
  , https = require('https')
  , fs = require('fs');

//certificates
var privateKey = fs.readFileSync('./ssl/private-key.pem').toString();
var certificate = fs.readFileSync('./ssl/public-cert.pem').toString();

var appOptions = {
  key : privateKey
, cert : certificate
};

var express = require('express')
//  , app = require('express')()
//  , server = require('http').createServer(app)
//  , io = require('socket.io').listen(server)
  , settings = require('./config/settings').settings("settings", "./config")
  , redisOpts = settings.config.redisOptions
  , couchOpts = settings.config.couchOptions
  , bitlyOpts = settings.config.bitlyOptions
  , twitterOpts = settings.config.twitter
 
  , moment = require('moment')
  , passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy
  , OAuth2Strategy = require('passport-oauth').OAuth2Strategy
  , v1 = '/api/v1';


//setup the stores
var store = {
  couch: require('./stores/couchdb').Store,
  redis: require('./stores/redis').Store,
  bitcoin: require('./stores/bitcoin').Store,
  timeFormat: "YYYY-MM-DDTHH:mm:ss.SSSZ",
  bitly: bitlyOpts,
  twitter: twitterOpts
};

//configure passport
var UserApp = require('./server/models/userApp')(store)
  , Account = require('./models/account');

//use the OAuth2Strategy within Passport
passport.use('coinbase', new OAuth2Strategy({
    authorizationURL: 'https://www.coinbase.com/oauth/authorize',
    tokenURL: 'https://www.coinbase.com/oauth/token',
    clientID: settings.auth.coinbase.clientId,
    clientSecret: settings.auth.coinbase.clientSecret,
    callbackURL: 'http://' + settings.coordelUrl + '/connect/coinbase/callback',
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {

    var appId = req.session.currentUser.appId;

    var keys = [
      {
        name: "coinbaseAccessToken", value: accessToken
      },
      {
        name: "coinbaseRefreshToken", value: refreshToken
      }
    ];

    console.log("keys for coinbase", keys);

    UserApp.set(appId, keys, function(err, app) {
      console.log("updated app with coinbase keys", app);
      done(err, app);
    });
  }
));

// Use the TwitterStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Twitter profile), and
//   invoke a callback with a user object.
passport.use(new TwitterStrategy({
    consumerKey: settings.auth.twitter.consumerKey,
    consumerSecret: settings.auth.twitter.consumerSecret,
    callbackURL: "http://" + settings.coordelUrl + "/connect/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    //console.log("callback from twitter", token, tokenSecret, profile, done);
    //get this user with at twitter_auth entry
    //update the user with this value

    var act = {
      token: token,
      tokenSecret: tokenSecret
    };
    //console.log("token to save", act);
    return done(null, act);
  }
));


//configure express
var app = express();
require('./configure')(app, express, passport);


//authentication middleware
function authenticateFromLoginToken(req, res, next) {
  var cookie = JSON.parse(req.cookies.logintoken)
    , Token = require('./server/models/token')(store);

  Token.find(cookie.username, function(e, token){
    if (e){
      res.redirect('/intro');
    } else if (!token){
      res.redirect('/intro');
    } else if (!token.username) {
      res.redirect('/intro');
    } else {
      if (cookie.token === token.token && cookie.series === token.series){
        Account.get(token.username, function(e, o) {
          if (o) {
            req.session.username = token.username;
            req.session.currentUser = o;
            token = Token.refresh(cookie);
            Token.save(token, function(){});
            res.cookie('logintoken', JSON.stringify(token), {expires: new Date(Date.now() + 2 * 604800000), path: '/'});
            next();
          } else {
            res.redirect('/intro');
          }
        });
      } else {
        res.redirect('/intro');
      }
    }
  });
}

function loadUser(req, res, next) {
  var oldLink = false;
  if (req.query.p){
    console.log("it's an old link");
    oldLink = true;
  }
  /*
  if (req.session) {
    var username = req.session.username;
    res.clearCookie('logintoken');
    req.session.destroy(function() {});
    
  }
  res.redirect('/intro');
  */
  //console.log("session variables", req.session.username, req.session.currentUser);
  if (req.session.username && req.session.currentUser) {
    console.log('there is a session');
    next();
  } else if (req.cookies.logintoken) {
    console.log('there is a logintoken');
    authenticateFromLoginToken(req, res, next);
  } else {
    if (oldLink){

      var url = '/'+req.query.p;
      if (req.query.f){
        url = url + '/'+req.query.f;
      }
      console.log('redirecting to' + url);
      res.redirect(url);
    } else {
      console.log('redirecting to intro');
      res.redirect('/intro');
    }
    
    
  }
}


/*///////////////////////////*/
var server = https.createServer(appOptions, app);
var io = require('socket.io', {secure: true}).listen(server);

//create the socket
io.set('log level', 1);
var socket = io.sockets.on('connection', function (client) {
});

//controllers
var App = require('./server/controllers/app')(store);
var Users = require('./server/controllers/users')(store);
var Ideas = require('./server/controllers/ideas')(store, socket);
var Intro = require('./server/controllers/intro')(store);
var Coinbase = require('./server/controllers/coinbase')();
var Bitcoin = require('./server/controllers/bitcoin')(store);
var Pledges = require('./server/controllers/pledges')(store, socket);

//client app routes
app.get('/intro', Intro.index);
app.get('/preview', Intro.preview);
app.get('/login', Users.login);
app.get('/password', Users.resetPassword);
app.get('/success', Intro.blueprints);
app.get('/tos', Intro.tos);
app.get('/privacy', Intro.privacy);
app.get('/about', Intro.about);


app.post('/sessions', Users.manualLogin); //set up as Login in analytics
app.post('/sessions/delete', loadUser, Users.logout); //set up as Logout in analytics
app.post('/signup', Users.startRegistration); //set up as Begin Registration goal in analytics
app.post('/register', Users.completeRegistration); //set up as Complete Registration goal in analytics
app.post('/invite'); //set up as Invite goal in analytics
app.post('/redeem'); //set up as Redeem Invite goal in alytics

//single idea
app.get('/ideas/:id', App.showIdea);
app.get('/i/:hash', App.showIdea);

//user's apps
app.put('/users/apps/:appId', Users.setAppValues);
app.get('/contacts/:contactId/profile', Users.getContactMiniProfile);

//user's blueprints
app.post('/users/:appId/blueprints', Users.copyBlueprint);


//ideas client pages
app.post('/ideas', Ideas.create); //set up as Add Idea in analytics
app.post('/ideas/:id/replies', Ideas.reply);
app.post('/ideas/:id/invites', Ideas.invite);
app.post('/ideas/:id/supported', Ideas.support); //set up as Support Idea in analytics
app.del('/ideas/:id/supported');
app.post('/ideas/:id/time', Ideas.supportTime); //set up as Support Time in analytics
app.put('/ideas/:id/time');
app.del('/ideas/:id/time/');
app.get('/ideas/:id/users', Ideas.findUsers);
app.get('/ideas/:id/users/:appId/proxies/allocations', Ideas.findUserProxyAllocationByIdea);
app.get('/ideas/:id/users/:appId/feedback', Ideas.getUserFeedback);
app.post('/ideas/:id/users/:appId/feedback', Ideas.addFeedback);
app.get('/ideas/:id/pledges/money', Ideas.findMoneyPledges);
app.get('/ideas/:id/pledges/time', Ideas.findTimePledges);
app.get('/ideas/:id/pledges/proxy', Ideas.findProxyPledges);
app.get('/ideas/:id/proxies/allocations', Ideas.findProxyAllocations);

app.post('/ideas/:id/money', Ideas.supportMoney); //set up as Support Money in analytics
app.put('/ideas/:id/money');
app.del('/ideas/:id/money');
app.post('/ideas/:id/shared/:service'); //set up as Share Idea in analytics (with third party services--twitter, app.net, etc)

app.get('/', loadUser, App.index);
app.get('/trending', App.trending);
app.get('/blueprints', App.blueprints);
app.get('/supporting', App.supporting);
app.get('/contacts', App.contacts);
app.get('/money', App.moneyPledged);
app.get('/time', App.timePledged);
app.get('/proxy', App.proxiedToMe);
app.get('/feedback', App.feedback);
app.get('/search', App.search);
app.get('/:username', App.ideas);

app.get('/:username/supporting', App.supporting);
app.get('/:username/contacts', App.contacts);
app.get('/:username/money', App.moneyPledged);
app.get('/:username/time', App.timePledged);
app.get('/:username/proxy', App.proxiedToMe);
app.get('/:username/feedback', App.feedback);


//settings
app.get('/settings/profile', function(req, res){});


app.post('/settings', function(req, res){

  
  var appId = req.session.currentUser.appId
    , keys = req.body.keys;

  console.log("keys for settings", keys);
  
  UserApp.set(appId, keys, function(e, app) {
    console.log("updated app with the keys", app);
    if(e){
      res.json({
        success: false,
        errors: [e]
      });
    } else {
      console.log("currentUser", req.session.currentUser);
      req.session.currentUser.app = app;
      res.json({
        success: true,
        userApp: app
      });
    }
  });
});

app.get('/settings/reset', function(req, res){
  var appId = req.session.currentUser.appId;
  UserApp.reset(appId, function(e, app){
    if(e){
      res.json({
        success: false,
        errors: [e]
      });
    } else {
      req.session.currentUser.app = app;
      res.json({
        success: true,
        userApp: app
      });
    }
  });
});


//coinbase
app.post('/coinbase/users', Coinbase.createUser);


//bitcoin
app.get('/bitcoin/prices', Bitcoin.getPrices);
app.get('/bitcoin/video', function(req, res){
  res.render('bitcoinVideo.ejs');
});


//coinbase routes
// Redirect the user to the OAuth 2.0 provider for authentication.  When
// complete, the provider will redirect the user back to the application at
//     /connect/coinbase/callback
app.get('/connect/coinbase', passport.authorize('coinbase'));

app.get('/connect/coinbase/error', function(req, res){
  res.render('coinbaseError.ejs');
});

//The OAuth 2.0 provider has redirected the user back to the application.
// Finish the authentication process by attempting to obtain an access
// token.  If authorization was granted, the user will be logged in.
// Otherwise, authentication has failed.
app.get('/connect/coinbase/callback',
  passport.authorize('coinbase', {failureRedirect: '/login' }), function(req, res){
    res.render('close');
  });


//twitter routes
// GET /connect/twitter
app.get('/connect/twitter',
  passport.authorize('twitter'),
  function(req, res){
    // The request will be redirected to Twitter for authentication, so this
    // function will not be called.
  });

// GET /connect/twitter/callback
app.get('/connect/twitter/callback',
  passport.authorize('twitter', { failureRedirect: '/intro' }),
  function(req, res) {
    var user = req.session.currentUser;
    var account = req.account;

    // Associate the Twitter account with the logged-in user.
    //account.userId = cur.id;

    console.log("should save the account for the user",user, account);
    res.render('close');
    
    var appId = req.session.currentUser.appId;

    req.session.currentUser.app.twitter = account;

    var keys = [
      {
        name: "twitterToken", value: account.token
      },
      {
        name: "twitterTokenSecret", value: account.tokenSecret
      }
    ];

    console.log("keys for twitter", keys);
    
    UserApp.set(appId, keys, function(err, app) {
      console.log("updated app with twitter keys", app);
    });
  });

/*
app.post('/ideas', loadUser, ideas.add);
app.get('/ideas', loadUser, ideas.getTimeline);
app.get('/ideas/trending', loadUser, ideas.getTrending);
app.get('/ideas/:username', loadUser, ideas.getUser);

app.get('/supporting', loadUser, supporting.show);
app.get('/:username', loadUser, users.show);
*/

//api
app.post(v1 + '/account');
app.put(v1 + '/account/password'); //resets password and resends to user
app.get(v1 + '/users/email/', Users.checkEmail); //checks if email exists, returns json object with error or success members
app.get(v1 + '/users/username/', Users.checkUsername); //checks if username exists, returns json object with error or success members

app.get(v1 + '/timeline', Ideas.timeline);
app.get(v1 + '/ideas/search');
app.get(v1 + '/ideas/:id', Ideas.findDetails);
app.post(v1 + '/ideas');
app.get(v1 + '/ideas/:id/stream', Ideas.findStream);

app.post(v1 + '/pledges/money', Pledges.create);
app.put(v1 + '/pledges/money/:pledgeId', Pledges.save);
app.post(v1 + '/pledges/allocations', Pledges.allocate);

app.post(v1 + '/pledges/timeReports', Pledges.reportTime);
app.post(v1 + '/pledges/time', Pledges.create);
app.put(v1 + '/pledges/time/:pledgeId', Pledges.save);


app.post(v1 + '/proxies/allocations', Pledges.proxyAllocate);
app.post(v1 + '/proxies/deallocations', Pledges.proxyDeallocate);


///////********************************************************************//////
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
