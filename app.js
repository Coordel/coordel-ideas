//server support
var express = require('express')
  , http = require('http')
  , fs = require('fs')
  , stripe = require('stripe')('E165dyefezzTaQwOZs0146cQRYCfNA1G')
  , moment = require('moment')
  , serverConfig = false;

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
  , sendgridOpts = settings.config.sendgridOptions
  , moment = require('moment')
  , passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy
  , OAuth2Strategy = require('passport-oauth').OAuth2Strategy
  , v1 = '/api/v1';


//get the cookie domain
function getCookieDomain(){
  //get the cookie domain
  var parts = settings.coordelUrl.split('.')
    , host1 = parts[parts.length - 2]
    , host2 = parts[parts.length - 1]
    , domain;

  if (host2.split(":").length > 1){
    host2 = host2.split(":")[0];
  }
  
  domain = '.' + host1 + '.' + host2;
  return ".coordel.com";
}

//setup the stores
var store = {
  couch: require('./stores/couchdb').Store,
  redis: require('./stores/redis').Store,
  bitcoin: require('./stores/bitcoin').Store,
  email: require('./stores/email').Store,
  coinbase: settings.auth.coinbase,
  timeFormat: "YYYY-MM-DDTHH:mm:ss.SSSZ",
  bitly: settings.auth.bitly,
  twitter: settings.auth.twitter,
  sendgrid: sendgridOpts,
  coordelUrl: settings.coordelUrl,
  workspaceUrl: settings.workspaceUrl,
  cookieDomain: getCookieDomain()
};

//start the payments method
var payments = require('./server/util/payments');
payments.start(store);


//configure express
var app = express();
require('./configure')(app, express, passport);


function configureServer(req, res, next){

    //make sure the server config is in place
    store.couch.db.get(settings.serverConfigKey, function(e, config){
      if (e){
        //create the doc with the key
        var doc = settings.serverDefaultConfig;
        doc._id = settings.serverConfigKey;
        store.couch.db.save(doc, function(e, o){
          if (e){
            //console.log("ERROR: server doesn't have a default config");
          } else {
            doc._rev = o.rev;
            //console.log("SERVER CONFIGURED");
            serverConfig = doc;
            req.session.serverConfig = doc;
            next();
          }
        });
      } else {
        //console.log("SERVER CONFIGURED");
        serverConfig = config;
        req.session.serverConfig = config;
        next();
      }
    });

  
}




//authentication middleware
function authenticateFromLoginToken(req, res, next) {

  var cookie = JSON.parse(req.cookies.logintoken)
    , Token = require('./server/models/token')(store)
    , User = require('./server/models/user')(store)
    , domain = store.cookieDomain;

  Token.find(cookie.username, function(e, token){
   
    if (e){
      res.redirect('/intro');
    } else if (!token){
      res.redirect('/intro');
    } else if (!token.username) {
      res.redirect('/intro');
    } else {
      
      if (cookie.token === token.token && cookie.series === token.series){

        

        User.findByUsername(token.username, function(e, o) {
          //console.log("tried to do the account", e, o);
          if (o) {
            req.session.username = token.username;
            req.session.currentUser = o;
            token = Token.refresh(cookie);
            Token.save(token, function(){});
            console.log("domain app.js", domain);
            res.cookie('logintoken', JSON.stringify(token), {expires: new Date(Date.now() + 2 * 604800000), path: '/', domain: domain});
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

  if (oldLink){
    var url = '/intro';

    console.log("feature", req.query.f);

    if (req.query.f){
      url = '/preview?p='+req.query.p + '&f=' + req.query.f;
    }

    console.log('redirecting to' + url);
    res.redirect(url);

  } else {

    ////console.log("session variables", req.session.username, req.session.currentUser);
    if (req.session.username && req.session.currentUser) {
      //console.log('there is a session');
      next();
    } else if (req.cookies.logintoken) {
      //console.log('there is a logintoken');
      authenticateFromLoginToken(req, res, next);
    } else {
      
      console.log('redirecting to intro');
      res.redirect('/intro');
    }
  }
}


/*///////////////////////////*/
var server = http.createServer(app);
//var io = require('socket.io', {secure: true}).listen(server);
var io = require('socket.io', {secure: true}).listen(server);

//create the socket
io.set('log level', 1);
var socket = io.sockets.on('connection', function (client) {
});


//configure passport
var UserApp = require('./server/models/userApp')(store);

//use the OAuth2Strategy within Passport
passport.use('coinbase', new OAuth2Strategy({
    authorizationURL: 'https://www.coinbase.com/oauth/authorize',
    tokenURL: 'https://www.coinbase.com/oauth/token',
    clientID: settings.auth.coinbase.clientId,
    clientSecret: settings.auth.coinbase.clientSecret,
    callbackURL: settings.coordelUrl + '/connect/coinbase/callback',
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {

    var appId = req.session.currentUser.appId
      , expires = moment().add('s', 7200).format(store.timeFormat);

    var keys = [
      {
        name: "coinbaseAccessToken", value: accessToken
      },
      {
        name: "coinbaseRefreshToken", value: refreshToken
      },
      {
        name: "coinbaseTokenExpires", value: expires
      }
    ];

    socket.emit('coinbase:'+ appId, {
      coinbaseAccessToken: accessToken,
      coinbaseRefreshToken: refreshToken,
      coinbaseTokenExpires: expires
    });

    UserApp.set(appId, keys, function(err, app) {
      ////console.log("updated app with coinbase keys", app);
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
    callbackURL: settings.coordelUrl + "/connect/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    ////console.log("callback from twitter", token, tokenSecret, profile, done);
    //get this user with at twitter_auth entry
    //update the user with this value

    var act = {
      token: token,
      tokenSecret: tokenSecret
    };
    ////console.log("token to save", act);
    return done(null, act);
  }
));

//controllers
var App = require('./server/controllers/app')(store);
var Users = require('./server/controllers/users')(store);
var Ideas = require('./server/controllers/ideas')(store, socket);
var Intro = require('./server/controllers/intro')(store);
var Coinbase = require('./server/controllers/coinbase')();
var Bitcoin = require('./server/controllers/bitcoin')(store);
var Pledges = require('./server/controllers/pledges')(store, socket);

//client app routes
app.get('/intro', configureServer,  Intro.index);
app.get('/preview',  configureServer,  Intro.preview);
app.get('/login', Users.login);
app.get('/password', Users.forgotPassword);
app.post('/password/resets', loadUser, Users.resetPassword); //resets password and resends to user
app.get('/resets', Users.loadResetPassword);
app.post('/resets', Users.completeResetPassword);
app.post('/password', loadUser, Users.updatePassword);
app.get('/success', Intro.blueprints);
app.get('/tos', Intro.tos);
app.get('/privacy', Intro.privacy);
app.get('/about', Intro.about);


app.post('/sessions', Users.manualLogin); //set up as Login in analytics
app.post('/sessions/delete', loadUser, Users.logout);
app.get('/logout', loadUser, Users.logout);
app.post('/signup', configureServer, Users.startRegistration); //set up as Begin Registration goal in analytics
app.post('/register', configureServer, Users.completeRegistration); //set up as Complete Registration goal in analytics
app.post('/invite', loadUser, Users.invite); //set up as Invite to Join goal in analytics
app.get('/redeem', Users.startRedeem); //set up as Start Redeem Join Invite goal in analytics
app.post('/completeRedeem', Users.completeRedeem); //set up as Complete Redeem Join Invite goal in analytics
app.post('/requestInvite', Users.requestInvite);//set up as Request Registration Invite in analytics

//single idea
app.get('/ideas/:id', loadUser, App.showIdea);
app.get('/i/:hash', loadUser, App.showIdea);

//user's apps
app.put('/users/apps/:appId', loadUser, Users.setAppValues);
app.get('/contacts/:contactId/profile', loadUser, Users.getContactMiniProfile);

//user's blueprints
app.post('/users/:appId/blueprints', loadUser, Users.copyBlueprint);

//paging timeline and trending
app.get('/ideas/timeline/:page', Ideas.findTimeline);
app.get('/ideas/trending/:page', Ideas.findTrending);

//ideas client pages
app.post('/ideas', loadUser, Ideas.create); //set up as Add Idea in analytics
app.post('/ideas/:id/replies', loadUser, Ideas.reply);
app.post('/ideas/:id/invites', loadUser, Ideas.invite);
app.post('/ideas/:id/supported', loadUser, Ideas.support); //set up as Support Idea in analytics
app.del('/ideas/:id/supported', loadUser, Ideas.removeSupport);
//app.post('/ideas/:id/time', Ideas.supportTime);
//app.put('/ideas/:id/time');
//app.del('/ideas/:id/time/');
app.get('/ideas/:id/users', loadUser, Ideas.findUsers);
app.get('/ideas/:id/users/:appId/proxies/allocations', loadUser, Ideas.findUserProxyAllocationByIdea);
app.get('/ideas/:id/users/:appId/feedback', loadUser, Ideas.getUserFeedback);
app.post('/ideas/:id/users/:appId/feedback', loadUser, Ideas.addFeedback);
app.get('/ideas/:id/pledges/money', loadUser, Ideas.findMoneyPledges);
app.get('/ideas/:id/pledges/time', loadUser, Ideas.findTimePledges);
app.get('/ideas/:id/pledges/proxy', loadUser, Ideas.findProxyPledges);
app.get('/ideas/:id/proxies/allocations', loadUser, Ideas.findProxyAllocations);

//app.post('/ideas/:id/money', Ideas.supportMoney);
//app.put('/ideas/:id/money');
//app.del('/ideas/:id/money');
//app.post('/ideas/:id/shared/:service'); //set up as Share Idea in analytics (with third party services--twitter, app.net, etc)

app.get('/', loadUser, App.index);
app.get('/trending', loadUser, App.trending);
app.get('/blueprints', loadUser, App.blueprints);
app.get('/supporting', loadUser, App.supporting);
app.get('/contacts', loadUser, App.contacts);
app.get('/money', loadUser, App.moneyPledged);
app.get('/time', loadUser, App.timePledged);
app.get('/proxy', loadUser, App.proxiedToMe);
app.get('/feedback', loadUser, App.feedback);
app.get('/search', loadUser, App.search);
app.get('/:username', loadUser, App.ideas);

app.get('/:username/supporting', loadUser, App.supporting);
app.get('/:username/contacts', loadUser, App.contacts);
app.get('/:username/money', loadUser, App.moneyPledged);
app.get('/:username/time', loadUser, App.timePledged);
app.get('/:username/proxy', loadUser, App.proxiedToMe);
app.get('/:username/feedback', loadUser, App.feedback);


//settings
app.get('/settings/profile', loadUser, App.settings);

app.post('/settings/profile', loadUser, Users.saveProfile);
app.post('/settings/account', loadUser, Users.saveAccount);



app.post('/settings', loadUser, function(req, res){

  var appId = req.session.currentUser.appId
    , keys = req.body.keys;

  //console.log("keys for settings", keys);
  
  UserApp.set(appId, keys, function(e, app) {
    //console.log("updated app with the keys", app);
    if(e){
      res.json({
        success: false,
        errors: [e]
      });
    } else {
      //console.log("currentUser", req.session.currentUser);
      req.session.currentUser.app = app;
      res.json({
        success: true,
        userApp: app
      });
    }
  });
});

app.get('/settings/reset', loadUser, function(req, res){
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

//stripe
app.post('/connect/stripe/payments', function(req, res){
  var token = req.body.stripeToken
    , amount = req.body.submitAmount
    , description = req.body.description;

  //console.log("amount", amount);

  var charge = {
    amount: parseInt(amount, 10) * 100,
    currency: 'usd',
    card: token,
    description: description
  };

  //console.log("charge", charge);

  stripe.charges.create(charge, function(e, o){
    //console.log("from testing of charge", e, o);
  });

});

//coinbase
app.post('/coinbase/users', loadUser, Coinbase.createUser);


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
app.get('/connect/coinbase/callback', //set up in analytics as Coinbase Connection
  passport.authorize('coinbase', {failureRedirect: '/login' }), function(req, res){
    var code = req.query.code;
    //console.log("code", code);
    res.render('close');
  });

app.get('/disconnect/coinbase', loadUser, Users.disconnectCoinbase);


//twitter routes
// GET /connect/twitter
app.get('/connect/twitter',
  passport.authorize('twitter'),
  function(req, res){
    // The request will be redirected to Twitter for authentication, so this
    // function will not be called.
  });
app.get('/disconnect/twitter', Users.disconnectTwitter);

// GET /connect/twitter/callback
app.get('/connect/twitter/callback', //set up in analytics as Twitter Connection
  passport.authorize('twitter', { failureRedirect: '/intro' }),
  function(req, res) {
    var user = req.session.currentUser;
    var account = req.account;

    // Associate the Twitter account with the logged-in user.
    //account.userId = cur.id;

    ////console.log("should save the account for the user",user, account);
    res.render('close');
    
    var appId = req.session.currentUser.appId;

    socket.emit('twitter:'+appId, account);

    req.session.currentUser.app.twitterToken = account.token;
    req.session.currentUser.app.twitterTokenSecret = account.tokenSecret;

    var keys = [
      {
        name: "twitterToken", value: account.token
      },
      {
        name: "twitterTokenSecret", value: account.tokenSecret
      }
    ];

    ////console.log("keys for twitter", keys);
    
    UserApp.set(appId, keys, function(err, app) {
      ////console.log("updated app with twitter keys", app);
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

app.get(v1 + '/users/email/', Users.checkEmail); //checks if email exists, returns json object with error or success members
app.get(v1 + '/users/username/', Users.checkUsername); //checks if username exists, returns json object with error or success members

app.get(v1 + '/timeline', Ideas.timeline);
app.get(v1 + '/ideas/:id', Ideas.findDetails);
app.get(v1 + '/ideas/:id/stream', Ideas.findStream);

app.post(v1 + '/pledges/money', loadUser, Pledges.create); //set up as Pledge Money in analytics
app.put(v1 + '/pledges/money/:pledgeId', loadUser, Pledges.save);
app.post(v1 + '/pledges/allocations', loadUser, Pledges.allocate); //set up as Allocate Money in analytics
app.post(v1 + '/payments', loadUser, Ideas.makePayment);

app.post(v1 + '/pledges/timeReports', loadUser, Pledges.reportTime);
app.post(v1 + '/pledges/time', loadUser, Pledges.create); //set up as Pledge Time in analytics
app.put(v1 + '/pledges/time/:pledgeId', loadUser, Pledges.save);


app.post(v1 + '/proxies/allocations', loadUser, Pledges.proxyAllocate); //set up as Allocate Proxies in analytics
app.post(v1 + '/proxies/deallocations', loadUser, Pledges.proxyDeallocate);

///////********************************************************************//////
/*
server.listen(app.get('port'), function(){
  //console.log("Express server listening on port " + app.get('port'));
});
*/
server.listen(8080);
