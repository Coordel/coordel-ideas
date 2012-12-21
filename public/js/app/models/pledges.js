//this is the model for our ideas
define(["dojo/store/Memory",
  "dojo/store/JsonRest",
  "dojo/store/Cache",
  "dojo/store/Observable",
  "dojo/store/util/SimpleQueryEngine"], function(Memory, JsonRest, Cache, Observable, SimpleQueryEngine){
  var pledgesStore = {

    timeStore: function(){
      return this._getStore("/api/v1/pledges/time/");
    },

    moneyStore: function(){
      return this._getStore("/api/v1/pledges/money/");
    },

    allocStore: function(){
      return this._getStore("/api/v1/allocations/");
    },

    _getStore: function(target){
      var _csrf = $('#addIdea_csrf').val();
      //console.log("csrf in pledges store", _csrf);
      var remote = new JsonRest({
        target: target,
        idProperty : "_id",
        headers: {'X-CSRF-Token':_csrf}
      });
      var memory = new Observable(new Memory({idProperty: "_id", queryEngine: SimpleQueryEngine}));
      return new Cache(remote, memory);
    }

  };

  return pledgesStore;
});