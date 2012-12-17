define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/miniProfile.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, domClass, topic) {
 
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
      this.time.innerHTML = user.account.pledgedTimeIdeas.length;
      this.money.innerHTML = user.account.pledgedIdeas.length + user.account.proxiedIdeas.length;

      console.log("in miniprofile", profile);

      if (profile.feedback){
        
        if (profile.feedback.avg > 0){
          //set the average
          self.feedbackAvg.innerHTML = profile.feedback.avg;
        } else {
          //hide the feedback graphic
          domClass.add(self.feedbackImage, "hide");
        }
      }

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