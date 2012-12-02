/* Coordel Token
  A token is used to manage hashtags and pointers
*/
module.exports = function(store) {

  var redis = store.redis;

  function addTag(tagSet, tag, id, fn){
    tag = tag.toLowerCase();
    var redis = store.redis;
    //the pointer is the parsed tag (>coordel.com) and the id is the object._id that has the tag

    //see if this pointer exists GET 'pointers:[pointer]' (returns id of pointer if exists)
    redis.get(tagSet +':'+tag, function(e, tagid){
      console.log("did get to " + tagSet + ':' + tag, e, tagid);
        if (e){
          fn(e);
        } else if (tagid === null){
          //pointer didn't exist, create it
          console.log("tag didn't exist");

          redis.incr(tagSet, function(e, tagid){

            var multi = redis.multi();
            console.log("after incr", e, tagid);
            var key = tagSet + ":" + tag;
            console.log('incremented tag and got key', key, tagid);
            multi.set(key, tagid);
            //create the search key for the tag
            var searchKey = 'search:' + tagSet + ':' + tagid;
            multi.sadd(searchKey, id);
            //create the search key for the object
            searchKey = 'search:' + tagSet + ':' + id;
            multi.sadd(searchKey, tagid);
            multi.exec(function(e, o){
              if (e){
                fn(e);
              } else {
                fn(null, o);
              }
            });
          });
        } else {
          var multi = redis.multi();
          //pointer exists, just make the search entry;
          console.log("tag existed");
          var searchKey = 'search:' + tagSet + ':' + tagid;
          multi.sadd(searchKey, id);
          //create the search key for the object
          searchKey = 'search:' + tagSet + ':' + id;
          multi.sadd(searchKey, tagid);
          multi.exec(function(e, o){
            if (e){
              fn(e);
            } else {
              fn(null, o);
            }
          });
        }
    });
  }

  Tags = {

    addPointer: function(pointer, id, fn){

      redis.del('hashtags');

      //the pointer will come in with the > symbol, but we trim that to store the keys
      pointer = pointer.split('>')[1].toLowerCase();

      //get rid of http://
      pointer = pointer.replace("http://", "");

      //if the user adds "/whatever" take everything before it
      pointer = pointer.split('/')[0];
      console.log("addPointer", pointer, id);
      addTag('pointers', pointer, id, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });

    },

    addHashtag: function(hashtag, id, fn){
      hashtag = hashtag.split('#')[1].toLowerCase();

      console.log("addHashtag", hashtag, id);
      addTag('hashtags', hashtag, id, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    }
  };

  return Tags;

};