
module.exports = function(app, express, passport){

  var RedisStore = require('connect-redis')(express)
  , settings = require('./config/settings').settings("settings", "./config")
  , redisOpts = settings.config.redisOptions
  , path = require('path')
  , TwitterStrategy = require('passport-twitter').Strategy
  , OAuth2Strategy = require('passport-oauth').OAuth2Strategy;


  //express redis store options
  var options = {
    client: require('redis').createClient(redisOpts.port, redisOpts.host),
    db: redisOpts.db,
    prefix: redisOpts.expressSessionPrefix
  };

  //authorize the redis client
  options.client.auth(redisOpts.auth);

  //configure cross domain authorization
  var allowCrossDomain = function(req, res, next) {
    // Add other domains you want the server to give access to
    // WARNING - Be careful with what origins you give access to
    var allowedHost = [
      'app.coordel.com',
      'dev.coordel.com',
      'dev.coordel.com:8080',
      'work.coordel.com:8443'
    ];
    
    if(allowedHost.indexOf(req.headers.host) !== -1) {
      res.header('Access-Control-Allow-Credentials', true);
      res.header('Access-Control-Allow-Origin', req.headers.host);
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
      next();
    } else {
      res.send({auth: false});
    }
  };

  //configure passport
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
  app.configure(function(){
    app.set('port', process.env.PORT || 8443);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.logger('dev'));
    app.use(express.cookieParser());
    app.use(express.session({
      secret: 'c00rd3lsecretpa$$word',
      store: new RedisStore(options)
    }));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(allowCrossDomain);
    app.use(express.csrf());

    app.use(function(req, res, next){
      res.locals.token = req.session._csrf;
      next();
    });

    app.use(express.favicon(__dirname + '/public/img/favicon.ico'));

    // Initialize Passport!  Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    app.use(passport.initialize());

    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
  });

  app.configure('development', function(){
    app.use(express.errorHandler());
  });

};
