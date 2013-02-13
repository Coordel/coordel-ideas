define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/activity.html",
    "dojo/text!./templates/activity/feedback.html",
    "dojo/text!./templates/activity/postTask.html",
    "dojo/text!./templates/activity/raiseIssue.html",
    "dojo/text!./templates/activity/clearIssue.html",
    "dojo/text!./templates/activity/delegate.html",
    "dojo/text!./templates/activity/simple.html",
    "dojo/text!./verbs.json",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/array",
    "dojo/_base/lang"
], function(declare, _WidgetBase, _TemplatedMixin, template
    , feedback, postTask, raiseIssue, clearIssue, delegate, simple
    , verbList, on, domClass, topic, array, lang) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    activity: null,

    idea: null,

    users: [],

    activityMessage: "&nbsp;",

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;
      self.verbList = JSON.parse(verbList);
      var act = self.activity;

      var user = self.getUser(self.activity.actor.id);

      var message = self.getMessage(act);



      
      self.ideaLink.href = "/ideas/"+self.idea._id;
      self.ideaLink.title = moment(act.time).format('h:mm A - D MMM YY');

      self.ideaLink.innerHTML = moment(act.time).fromNow();

      self.userImage.src = user.imageUrl;
      self.userImage.alt = act.actor.name;
      self.userNameLink.href = '/'+ user.username;
      self.userNameLink.innerHTML = act.actor.name;
      self.messageBody.innerHTML = self.activityMessage;

      self.verb.innerHTML = message.verb;
      
    },

    getMessage: function(item){
      var self = this
        , verb = item.verb.toLowerCase();

      var message= {
        verb: '<span class="verb">' + self.verbList[verb].verb+ '</span>',
        body: "&nbsp;"
      };

      var vals, body;

      switch(verb){
        case "post":
          if (item.object.type ==="PROJECT"){
            message.verb = '<span class="verb">added idea</span>';
          } else if (item.object.type === "TASK"){
            message.verb = lang.replace(simple, {verb: "added task", name: item.object.name});
          }
        break;
        case "raise-issue":
          body = JSON.parse(item.body);
          vals = {verb: message.verb, name: item.object.name, issue: body.raiseIssue.issue, solution: body.raiseIssue.solution};
          message.verb = lang.replace(raiseIssue, vals);
        break;
        case "clear-issue":
          vals = {verb: message.verb, name: item.object.name, solution: item.body};
          message.verb = lang.replace(clearIssue, vals);
        break;
        case "feedback":
          
          if (item.target){
            var user = self.getUser(item.target.id);

            vals = {
              verb: "gave feedback to",
              fullName: item.target.name,
              username: user.username
            };

            vals.comment = "";
            vals.hideComment = "hide";
            if (item.body && item.body.comment){
              vals.comment = item.body.comment;
              vals.hideComment = "";
            }

            vals.hideTable = "hide";
            if (item.body && item.body.coordination && item.body.performance){
              vals.hideTable = "";
            }

            vals.coordination = "";
            if (item.body && item.body.coordination){
              vals.coordination = item.body.coordination;
            }

            vals.performance = "";
            if (item.body && item.body.performance){
              vals.performance = item.body.performance;
            }
        
            message.verb = lang.replace(feedback, vals);
           
          }
        break;
        case "follow":
          message.verb = '<span class="verb">followed idea</span>';
        break;
        default:
          vals = {verb: message.verb, name: item.object.name};
          message.verb = lang.replace(simple, vals);
  
      }

      return message;
    
    },

    getUser: function(appId){

      var self = this;
      var user = array.filter(self.users, function(item){
        return item.appId === appId;
      });

      if (user.length){
        return user[0];
      } else {
        return {
          imageUrl: "https://work.coordel.com/images/default_contact.png",
          username: ""
        };
      }
    }
  });
});