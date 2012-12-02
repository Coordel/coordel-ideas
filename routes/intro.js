exports.index = function(req, res){
  res.render('intro/index', {token: res.locals.token, title: 'Coordel', menu: 'ideas'});
};

exports.app = function(req, res){
  res.render('intro/app', {token: res.locals.token, title: 'Coordel', menu: 'app'});
}