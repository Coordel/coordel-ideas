/* Coordel Pledge
  A pledge tracks who pledges money
*/
var _ = require('underscore');

module.exports = function(store) {

  var validator = require('revalidator')
    , MoneyPledge;

  var Schema = {
    properties: {
      // enter any properties required for validation here
    }
  };

  MoneyPledge = {

    findById: function(id, fn){
      //couchdb get id

    },

    findByIdea: function(ideaId, fn){
      //couchdb view ideaPledges startkey[idea._id] endkey[idea._id, {}]
      store.couch.db.view('coordel/ideaMoneyPledges', {startkey: [ideaId], endkey:[ideaId,{}], include_docs: true}, function(e, o){
        if (e){
          fn(e);
        } else {
          o = _.map(o, function(item){
            return item.doc;
          });
          fn(null, o);
        }
      });
    },

    findProxyAllocationsByIdea: function(ideaId, fn){
      store.couch.db.view('coordel/ideaProxyAllocations', {startkey: [ideaId], endkey:[ideaId, {}], include_docs: true}, function(e,o){
        if (e){
          fn(e);
        } else {
          o = _.map(o, function(item){
            return item.doc;
          });
          fn(null,o);
        }
      });
    },

    findUserProxyAllocationByIdea: function(appId, ideaId, fn){
      store.couch.db.view('coordel/userProxyAllocations', {startkey: [appId, ideaId], endkey:[appId, ideaId, {}], include_docs: true}, function(e,o){
        if (e){
          fn(e);
        } else {
          o = _.map(o, function(item){
            return item.doc;
          });
          fn(null,o);
        }
      });
    },

    findByUser: function(user, fn){
      //couchdb view userPledges startkey[user.user] endkey[user.user, {}]
    },

    create: function(pledge, fn){
      //couchdb post pledge
      store.couch.db.save(pledge, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    },

    allocate: function(alloc, fn){
      store.couch.db.save(alloc, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    },

    save: function(doc, fn){
      store.couch.db.save(doc, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    },

    update: function(doc, fn){
      store.couch.db.save(doc._id, doc._rev, doc, function(e, o){
        if (e){
          fn(e);
        } else {
          fn(null, o);
        }
      });
    },

    remove: function(pledge, fn){
      //couchdb delet pledge
    }

  };

  return MoneyPledge;

};