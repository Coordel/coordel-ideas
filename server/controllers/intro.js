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
        console.log("ideas", ideas);
        res.render('intro/index', {token: res.locals.token, title: 'Coordel', menu: 'ideas', ideas: ideas});
      });
    }
  };

  return Intro;
};

module.exports = IntroController;