
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
    var allowedHost = settings.allowedHosts;
    if(allowedHost.indexOf(req.headers.host) !== -1) {
      res.header('Access-Control-Allow-Credentials', true);
      res.header('Access-Control-Allow-Origin', req.headers.host);
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
      next();
    } else {
      res.redirect('https://coordel.com/intro');
    }
  };


  function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
  }

  function errorHandler(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
  }

  function httpsRedirect(req, res, next) {
    // see above
    //res.setHeader('Strict-Transport-Security', 'max-age=8640000; includeSubDomains');

    if (app.settings.env === "production" && req.headers['x-forwarded-proto'] !== 'https') {
      //console.log("not https", req.headers['x-forwarded-proto']);
      return res.redirect(301, 'https://' + req.headers.host + '/');
    }
    next();
  }

  function allowBrowsers(req, res, next){
    //the initial app only allows the latest browsers. not accepted browsers sees registration closed and a
    //a suggestion to get one that is allowed
    var r = require('ua-parser').parse(req.headers['user-agent']);

    var browser = r.userAgent.family
      , major = r.userAgent.major
      , minor = r.userAgent.minor;
    
    //console.log("browser", r.userAgent.toString(), browser, major, minor);
    next();
  }

  //configure express
  app.configure(function(){
    app.set('port', process.env.PORT || 8080);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.logger('dev'));
    app.use(express.cookieParser('c00rd3lsecretpa$$word'));
    app.use(express.session({
      secret: 'c00rd3lsecretpa$$word',
      store: new RedisStore(options)
    }));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    
    app.use(allowCrossDomain);
    app.use(httpsRedirect);
    app.use(allowBrowsers);
    
    //app.use(express.csrf());

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
    app.use(function(req, res, next){
      //res.send(404, 'Sorry cant find that!');

      // respond with html page
      if (req.accepts('html')) {
        res.render( 'error/404', { error: 'Not found', url: req.url });
        return;
      }

      // respond with json
      if (req.accepts('json')) {
        res.send({ success: false, error: 'Not found' });
        return;
      }

      // default to plain-text. send()
      res.type('txt').send('Not found');
    });
  });

  app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('production', function(){
    app.use(express.errorHandler());
    app.use(express.logger());
  });

};
