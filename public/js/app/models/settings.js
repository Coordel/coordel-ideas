///this is the model for our user's app settings
define(["dojo/store/Memory",
  "dojo/store/JsonRest",
  "dojo/store/Cache",
  "dojo/store/Observable",
  "dojo/store/util/SimpleQueryEngine",
  "dojo/Deferred",
  "dojo/_base/array",
  "app/models/app"], function(Memory, JsonRest, Cache, Observable, SimpleQueryEngine, Deferred, array, appModel){
  var settingsStore = {

    remote: null,

    memory: null,

    store: null,

    init: function(){

      this._csrf = $('#addIdea_csrf').val();
      //creates the appSettings store
      this.remote = new JsonRest({
        target: "/settings/"
      });
      this.memory = new Observable(new Memory({idProperty: "_id", queryEngine: SimpleQueryEngine}));
      this.store = new Cache(this.remote, this.memory);
      return this.store;
    },

    update: function(keys){
      var def = new Deferred()
        , updateKeys = [];

      array.forEach(keys, function(item, key){
        console.log("item", item, key);
        for (var name in item){
          updateKeys.push({
            name: name,
            value: item[name]
          });
        }
        
      });

      var update = {
        keys: updateKeys,
        _csrf: this._csrf
      };

      console.log("update", update);

      
      this.store.put(update).then(function(res){
        console.log("response from post to /settings  update", res);
        if (res.success){
          //update the user's app
          appModel.app = res.userApp;
          def.resolve({
            success: true,
             userApp: res.userApp
          });
        } else {
          def.resolve({
            success: false,
            errors: res.errors
          });
        }
      });

      return def.promise;
    }

  };

  return settingsStore;
});