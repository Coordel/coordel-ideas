//this is the model for contacts
define(["dojo/store/Memory",
  "dojo/store/JsonRest",
  "dojo/store/Cache",
  "dojo/store/Observable",
  "dojo/store/util/SimpleQueryEngine"], function(Memory, JsonRest, Cache, Observable, SimpleQueryEngine){
  var contactStore = {

    init: function(userid){
      //creates the contacts store
      var remote = new JsonRest({
        target: "/api/v1/users/" + userid + "/contacts"
      });
      var memory = new Observable(new Memory({idProperty: "_id", queryEngine: SimpleQueryEngine}));
      return new Cache(remote, memory);
    }

  };

  return contactStore;
});