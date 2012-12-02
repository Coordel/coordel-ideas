//this is the model for our ideas
define(["dojo/store/Memory",
  "dojo/store/JsonRest",
  "dojo/store/Cache",
  "dojo/store/Observable",
  "dojo/store/util/SimpleQueryEngine"], function(Memory, JsonRest, Cache, Observable, SimpleQueryEngine){
  var ideasStore = {

    init: function(){
      //creates the ideas store
      var remote = new JsonRest({
        target: "/api/v1/ideas/"
      });
      var memory = new Observable(new Memory({idProperty: "_id", queryEngine: SimpleQueryEngine}));
      return new Cache(remote, memory);
    },

    create: function(idea){
      //this will add the idea

      //it needs to see if ther are any hash tags and deal with them

      //it needs to see if the are any pointers and deal with them

      
    }

  };

  return ideasStore;
});