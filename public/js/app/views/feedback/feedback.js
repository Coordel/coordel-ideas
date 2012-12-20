define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/feedback.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/array"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, domClass, topic, array) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    contacts: [],

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      console.log("contacts in feedback", self.contacts);

      self.contacts = array.filter(self.contacts, function(item){
        return item;
      });

      array.forEach(self.contacts, function(item){
        if (item.appId === self.feedback.from){
          self.from = item;
        }
      });

      console.log("feedback from ", self.from, self.feedback);



      self.userImage.src = self.from.imageUrl;
      self.userImage.alt = self.from.fullName;
      self.userNameLink.href = '/'+self.from.username;
      self.userNameLink.innerHTML = self.from.fullName;
      self.usernameLink.innerHTML = self.from.username;
      self.ideaName.innerHTML = self.feedback.name;
      self.feedbackDate.innerHTML = moment(self.feedback.created).format("h:mm A D MMM YY");

      if (self.feedback.comment){
        self.comment.innerHTML = self.feedback.comment;
      }

      self.coordinationAvg.innerHTML = self.feedback.coordination;
      self.performanceAvg.innerHTML = self.feedback.performance;
    
    }
  });
});