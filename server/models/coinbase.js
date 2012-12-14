/* Coinbase api
  A pledge tracks what someone who pleges money gives
*/
exports.module = function() {

  Coinbase = {

    findUser: function(email, fn){
      //get the user
    },

    findByIdea: function(idea, fn){
      //couchdb view ideaPledges startkey[idea._id] endkey[idea._id, {}]
    },

    findByUser: function(user, fn){
      //couchdb view userPledges startkey[user.user] endkey[user.user, {}]
    },

    create: function(pledge, fn){
      //couchdb post pledge
    },

    save: function(pledge, fn){
      //couchdb put pledge
    },

    remove: function(pledge, fn){
      //couchdb delet pledge
    }

  };

  return Pledge;

};