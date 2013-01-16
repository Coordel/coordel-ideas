var should = require('should');

var store = {
  couch: require('../stores/couchdb').Store,
  redis: require('../stores/redis').Store,
  timeFormat: "YYYY-MM-DDTHH:mm:ss.SSSZ"
};

var Tags = require('../server/models/tags')(store);



describe('Pointer', function(){

  var purpose = "here is a purpose with a >pointer.com";
  store.redis.del('user:jeffgorder@coordel.com', function(e,o){
    console.log(e,o);
  });
  store.redis.del('user:jeffgorder', function(e,o){
    console.log(e, o);
  });


  store.redis.set('user:jeffgorder@coordel.com', 1, function(e,o){
    console.log(e,o);
  });
  store.redis.set('user:jeffgorder', 1, function(e,o){
    console.log(e, o);
  });
  
  describe('>pointer', function(){
    it('should add a pointer', function(done){
      Tags.addPointer('>coordelxxsssxx.es', "txxxxessstid2e", function(e, o){
  
        done();
      });
    });
  });

  describe('#hashtag', function(){
    it('should add a hashtag', function(done){
      Tags.addHashtag('#cooxxssssxxrdeld', "texxxsssxstd", function(e, o){
    
        done();
      });
    });
  });
  
});