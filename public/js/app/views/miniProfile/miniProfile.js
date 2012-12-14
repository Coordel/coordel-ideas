define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/miniProfile.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, build, topic) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    user: null,

    miniProfile: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this
        , user = this.user
        , profile = this.miniProfile;

      this.profileImage.src = user.imageUrl;
      this.profileName.innerHTML = user.fullName;
      this.profileName.href = "/" + user.username;


      //miniProfile
      this.ideas.innerHTML = profile.ideas;
      this.ideasLink.href = '/'+user.username;
      this.supporting.innerHTML = profile.supporting;
      this.contacts.innerHTML = profile.contacts;

      topic.subscribe("coordel/addIdea", function(idea){
        if (self.user.appId === idea.creator){
          var count = parseInt(self.ideas.innerHTML, 10) + 1;
          self.ideas.innerHTML = count.toString();
        }
      });

      topic.subscribe("coordel/supportIdea", function(num){
        num = parseInt(num, 10);
        var count = parseInt(self.supporting.innerHTML, 10) + num;
        self.supporting.innerHTML = count.toString();
      });
    }
  });
});