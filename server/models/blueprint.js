/* Blueprint
  
*/
module.exports = function(store) {

  Blueprint = {

    findBlueprint: function(id, fn){
      //get the user
    },

    create: function(blueprint, fn){
      //args.blueprint, args.appId
      //couchdb post blueprint
      var t = blueprint;
        
      //get rid of _id, _rev, default and public
      delete t._id;
      delete t._rev;
      delete t.isPublic;
      delete t.isDefault;
      //add the username and flag as user template
      t.isUserTemplate = true;
      t.isActive = true;
      //console.log("username", db.username(), "template", t);
      store.couch.db.save(t, function(e, o){
        if (e){
          fn(e);
        } else {
          t._id = o.id;
          t._rev = o.rev;
          fn(null, t);
        }
      });
    },

    save: function(blueprint, fn){
      //couchdb put blueprint
    },

    remove: function(blueprint, fn){
      //couchdb delete blueprint
    }

  };

  return Blueprint;

};