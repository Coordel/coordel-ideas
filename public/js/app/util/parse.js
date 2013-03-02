define([], function(){

  var parse = {

   hashtag: function(text) {
      return text.replace(/[#]+[A-Za-z0-9-_]+/g, function(t) {
         var tag = t.replace('#','%23');
         return t.link('/search?q='+tag);
      });
    },

    url: function(text) {
      return text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(url) {
        var node = url.link(url);
        var strlength = node.length;
        strf = node.substr(0 , 2);
        strb = node.substr(2, strlength-2);
        return (strf + ' target="_blank"' + strb);
      });
    },

    username: function(text) {
      return text.replace(/[@]+[A-Za-z0-9-_]+/g, function(u) {
        var username = u.replace('@','');
        return u.link('/'+username);
      });
    },

    pointer: function(text) {
      return text.replace(/[~]+[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(p) {
        //link = ~coordel.com
        var link = p;
        if (link.split('/').length > 1){
          link = link.split('/')[0];
        }
        var pointer = link.replace('~', '%7E');
        return p.link('/search?q='+pointer);
      });
    }
  };
  return parse;
});