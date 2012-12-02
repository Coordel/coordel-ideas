//this is the model for our ideas
define(["dojo/store/Memory", "dojo/store/Observable", "dojo/store/util/SimpleQueryEngine"], function(Memory, Observable, SimpleQueryEngine){
  var timelineStore = {

    bootstrap: function(ideas){
      //this function builds the cache from the bootstrapped ideas timeline
      return new Observable(new Memory({idProperty: "_id", queryEngine: SimpleQueryEngine, data: ideas}));
    }

  };

  return timelineStore;
});