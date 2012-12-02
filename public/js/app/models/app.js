//contains all the models for the app
define(["app/models/ideas", "app/models/timeline"], function(ideasModel, timelineModel){

  var appModel= {

    timeline: null,

    ideas: null,

    stream: null,

    currentUser: null,

    miniProfile: null,

    init: function(args){
      //the timeline is in memory and bootstrapped from the server on load
      this.timeline = timelineModel.bootstrap(args.ideas);

      //the ideas store controls the store itself
      this.ideas = ideasModel.init();
     
      //if we're authenticated, a user object and miniProfile will be bootstrapped in
      if (args.user){
        this.appId = args.user.appId;
        this.currentUser = args.user;
        this.miniProfile = args.profile;
        this.contacts = args.contacts;
      }

      return this;
    }

  };

  return appModel;
});