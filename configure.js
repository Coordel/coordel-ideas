
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
      'app.coordel.com:8090',
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


  function logErrors(err, req, res, next) {
    console.error(err.stack);
    next(err);
  }

  function errorHandler(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
  }

  

  //configure express
  app.configure(function(){
    app.set('port', process.env.PORT || 8443);
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
    app.use(express.errorHandler());
  });

  


};
