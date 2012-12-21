define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/miniProfile.html",
    "dojo/text!./templates/feedbackTip.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/lang"
], function(declare, _WidgetBase, _TemplatedMixin, template, tipHtml, on, domClass, topic, lang) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    user: null,

    miniProfile: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this
        , user = this.user;

      //image and link
      self.profileImage.src = user.imageUrl;
      self.profileName.innerHTML = user.fullName;
      self.profileName.href = "/" + user.username;

      //miniProfile and feedback
      self.ideasLink.href = '/'+user.username;
      self.setProfile();


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

      topic.subscribe("coordel/miniProfile", function(mini){
        console.log("miniProfile got new profile", mini);
        self.miniProfile = mini;
        self.setProfile();
      });
    },

    setProfile: function(){
      var self = this
        , profile = self.miniProfile;

      self.ideas.innerHTML = profile.ideas;
      self.supporting.innerHTML = profile.supporting;
      self.time.innerHTML = profile.supportingTypes.withTime;
      self.money.innerHTML = profile.supportingTypes.withMoney;

      if (profile.feedback){
        
        if (profile.feedback.avg > 0){
          //set the average
          self.feedbackAvg.innerHTML = profile.feedback.avg;
          //tooltip
          var tipValues = {
            coordination: Math.round(self.miniProfile.feedback.coordination.avg),
            performance: Math.round(self.miniProfile.feedback.performance.avg)
          };

          console.log("setting miniProfile", tipValues);

          $(self.feedbackAvg).tooltip("destroy");

          $(self.feedbackAvg).tooltip({
            title: lang.replace(tipHtml, tipValues),
            placement: "bottom",
            html: true
          });

        } else {
          //hide the feedback graphic
          domClass.add(self.feedbackImage, "hide");
        }
      }

    }
  });
});