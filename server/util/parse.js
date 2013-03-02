var jsdom = require('jsdom')
  , _ = require('underscore')
  , url = require('url')
  , base64 = require('./base64');


module.exports = function(store){


  String.prototype.parseHashtag = function() {
    return this.replace(/[#]+[A-Za-z0-9-_]+/g, function(t) {
       var tag = t.replace('#','%23');
       return t.link('/search?q='+tag);
    });
  };

  String.prototype.parseURL = function() {
    return this.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(url) {
      return url.link(url);
    });
  };

  String.prototype.parseUsername = function() {
    return this.replace(/[@]+[A-Za-z0-9-_]+/g, function(u) {
      var username = u.replace('@','');
      return u.link('/'+username);
    });
  };

  String.prototype.parsePointer = function() {
    return this.replace(/[~]+[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(p) {
      //link = ~coordel.com
      var link = p;
      if (link.split('/').length > 1){
        link = link.split('/')[0];
      }
      var pointer = link.replace('~', '%7E');
      return p.link('/search?'+pointer);
    });
  };

  function handlePointer(pointer, objectId){
    //pointer will be something like ~coordel.com, objectId will be the idea/project id

    var p = pointer.substring(1);

    function addPointer(){
      store.redis.incr('pointerKeys', function(e, pointerId){
        if (e){
          //console.log("error getting pointer id");
        } else {
          //console.log("got new pointerId", pointerId);
          setPointer(pointerId);
        }
      });
    }

    function setPointer(pointerId){
      //console.log('setting pointer');

      var protocol = 'http://';
      if (p.indexOf('coordel') > -1){
        protocol = 'https://';
      }

      var link = protocol + p
        , obj = {
            pointer: pointer,
            link: link,
            fav: 'https://getfavicon.appspot.com' + link + '?defaulticon=' + store.coordelUrl + '/img/pointer_icon.png'
          };

      //convert the pointerId to a string because redis set has to be a string
      pointerId = pointerId.toString();

      //add the new pointer's idea lookup
      var key = 'coordel-pointers:' + p
        , hash = base64.encode(pointerId);
      
      store.redis.set(key, pointerId);

      //finalize the pointer object getting the title, description
      jsdom.env(
        obj.link,
        ['http://code.jquery.com/jquery.js'],
        function (errors, window) {
          if (errors) {
            //console.log("error getting info", errors);
            addPointerRelationships(pointerId);
            //don't update the timeline because this pointer doesn't go to a valid url
          } else {
            //get the name of the site
            obj.name = window.$('title').text().trim();

            //get the description if there is one
            var desc = window.$('meta[name="description"]').attr('content');
            if (desc && desc.length){
              obj.description = desc;
            } else {
              obj.description = false;
            }

            obj.hash = hash;
            obj.url = store.coordelUrl + '/p/'+hash;
            //console.log("pointer to save", pointerId, obj);
            //save the pointer
            var pointerKey = 'pointers:'+pointerId;
            var value = JSON.stringify(obj);
            store.redis.set(pointerKey, value, function(e, o){
              if (e){
                //console.log("failed to save the pointer", e);
                store.redis.del(pointerKey);
              } else {
                //console.log("saved the pointer", o);
              }
            });
          }

          //associate the pointer with the idea
          addPointerRelationships(pointerId);

          //update the pointer timeline
          updatePointerTimeline(pointerId);
          
        });
    }

    function addPointerRelationships(pointerId){
      //creates entries so this relationship can be found with the pointer or with the idea
      //console.log("associating pointer with idea", pointerId, objectId);
      var pointerKey = 'pointer-ideas:' + pointerId
        , ideaKey = 'idea-pointers:' + objectId;

      store.redis.sadd(pointerKey, objectId, function(e, o){
        if (e){
          //console.log("failed to associate idea with pointer", e);
        } else {
          //console.log("associated idea with pointer", o);
        }
      });

      store.redis.sadd(ideaKey, pointerId, function(e, o){
        if (e){
          //console.log("failed to associate pointer with idea", e);
        } else {
          //console.log("associated pointer with idea", o);
        }
      });
    }

    function updatePointerTimeline(pointerId){
      //console.log("updating pointer timeline", pointerId);

      var key = 'pointer-timeline'
        , multi = store.redis.multi();

      multi.lpush(key, pointerId);
      multi.ltrim(key, 0, 1000);

      multi.exec(function(e, o){
        if (e){
          //console.log("error updating pointer timeline", e);
        } else {
          //console.log("updated pointer timeline", o);
        }
      });
    }

    //get the key
    var key = 'coordel-pointers:' + p;
    //console.log("getting pointer", key);
    //store.redis.del(key);
    
    
    store.redis.get(key, function(e, pointerId){
      if (e){
        //console.log("error getting pointer", e);
        store.redis.del(key, function(e, o){
          //console.log("removed key",key, e, o);
        });
      } else if (!e && !pointerId){
        //need to create a new id and save the pointer
        //console.log("no error, pointer didn't exist");
        addPointer();
      } else if (!e && pointerId) {
        //console.log("pointerId existed", pointerId);
        setPointer(pointerId);
      }
    });
  }

  function getPointers(pointerArray, fn){
      //pointerList is an arry of pointerids
      var multi = store.redis.multi();
      _.each(pointerArray, function(item){
        var pointerKey = 'pointers:'+item;
        //console.log("pointer key", pointerKey);
        multi.get(pointerKey);
      });

      multi.exec(function(e, o){
        if (e){
          fn(e);
          //console.log('error getting pointers', e);
        } else {
          //console.log("returned from multi", o);
          var pointers = [];
          _.each(o, function(item){
            pointers.push(JSON.parse(item));
          });
          fn(null, pointers);
        }
      });
    }


  var parse = {

    clearKeys: function(){
      var timelineKey = 'pointer-timeline'
        , multi = store.redis.multi();
      store.redis.lrange(timelineKey, 0, -1, function(e, list){
        
        _.each(list, function(item){

          var pointerKey = 'pointers:'+ item;
          multi.del(pointerKey);

          var coordelKey = 'coordel-pointers:' + item;
          multi.del(coordelKey);

          var pointerIdeasKey = 'pointer-ideas' + item;
          multi.del(pointerIdeasKey);
        });

      });

      multi.del(timelineKey);
      multi.exec(function(e, o){
        //console.log("keys cleared", e, o);
      });
    },


    detectPointers: function(text, objectId){
      //var text = '~coordel.com/test ~www.doghouse.co.uk';
      //pass the id of the idea/project to parse for pointers
      var all = text.match(/[~]+[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g);
      var pointers = [];
      //now trim any path that might have been included
      if (all && all.length){
        _.each(all, function(p){
          //console.log("p", p, p.split('/').length);
          if (p.split('/').length > 1){

            p = p.split('/')[0];
            //console.log("p", p);
            pointers.push(p);
          } else {
            pointers.push(p);
          }
        });

        _.each(pointers, function(item){
          handlePointer(item, objectId);
        });

      }
    },

    findPointerIdeas: function(pointer, fn){
      //console.log("finding ideas for pointer", pointer);
      var p = pointer.substring(1)
        , pointersKey = 'coordel-pointers:' + p;

      //get the pointer id
      store.redis.get(pointersKey, function(e, pointerId){
        if (e){
          //console.log("error getting pointerId", pointer);
          fn(e);
        } else {
          var key = 'pointer-ideas:' + pointerId;

          //console.log("getting ideas for pointer key", key);
          //get the ideaIds associated with this pointer
          store.redis.smembers(key, function(e, o){
            if (e){
              fn(e);
              //console.log("error getting ideaIds for pointer", pointer);
            } else {
              //console.log("got ideaIds for pointer", o);
              store.couch.db.get(o, function(e, ideas){
                if (e){
                  fn(e);
                } else {
                  var list = _.map(ideas, function(item){
                    return item.doc;
                  });
                  fn(null, list);
                }
              });
            }
          });
        }
      });
    },

    findIdeaPointers: function(ideaId, fn){
      var ideasKey = 'idea-pointers:'+ ideaId;
      store.redis.smembers(key, function(e, o){
        if (e){
          fn(e);
          //console.log("error getting pointers for idea", ideaId);
        } else {
          //console.log("got pointers for idea", o);
          if (o.length){
            getPointers(o, function(e, pointers){
              if (e){
                fn(e);
              } else {
                fn(null, pointers);
              }
            });
          } else {
            fn(null, o);
          }
        }
      });
    },


    findPointerTimeline: function(count, fn){
      var timelineKey = 'pointer-timeline';

      if (!count){
        count = 10;
      }

      //want to get the amount, so get extras to filter
      var longCount = count * 3;

      store.redis.lrange(timelineKey, 0, longCount, function(e, o){
        if (e){
          //console.log("error getting timeline", e);
          fn(e);
        } else {
          //console.log("got timeline", o);
          if (o.length){
            o = _.uniq(o);

            if (o.length > count){
              o = _.initial(o, count);
            }

            getPointers(o, function(e, pointers){
              if (e){
                fn(e);
              } else {
                fn(null, pointers);
              }
            });
          } else {
            fn(null, o);
          }
        }
      });
    }
  };

  return parse;
};