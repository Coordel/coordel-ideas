var _        = require('underscore')
  , utils    = require('../../lib/utils')
  , NotFound = utils.NotFound
  , checkErr = utils.checkErr
  , log      = console.log
  , IntroController;

IntroController = function(store) {

  var Idea = require('../models/idea')(store);

  var Intro = {

    index: function(req, res){
      Idea.timeline(function(e, o){
    
         var ideas = [];
        _.each(o, function(i){
          //since the project was stored as a string, we need to parse it before returning it.
          ideas.push(JSON.parse(i));
        });
        
        ideas = escape(JSON.stringify(ideas));
        //console.log("ideas", ideas);
        res.render('intro/index', {token: res.locals.token, title: 'Coordel', menu: "#menuIdeas", ideas: ideas});
      });
    },
    blueprints: function(req, res){
      res.render('intro/blueprints', {token: res.locals.token, title: 'Coordel', menu: '#menuBlueprints', ideas: JSON.stringify([])});
    },
    preview: function(req, res){
      res.render('intro/preview', {token: res.locals.token, title: "Coordel", menu: "#menuCoordel", ideas: JSON.stringify([])});
    },
    tos: function(req, res){
      res.render('other/tos', {token: res.locals.token, title: "Terms of Service"});
    },
    privacy: function(req, res){
      res.render('other/privacy', {token: res.locals.token, title: "Coordel Privacy Policy"});
    },
    about: function(req, res){
      res.render('other/about', {token: res.locals.token, title: "About Coordel"});
    }
  };

  return Intro;
};

module.exports = IntroController;