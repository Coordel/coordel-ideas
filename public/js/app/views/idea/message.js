define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/message.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/array",
    "app/util/parse"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, domClass, topic, array, parse) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    message: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;
      //console.log('message', this.message, this.message.isTweet);

      var user = self.getUser(self.message.actor.id);

      //console.log("message user", user);
      this.ideaLink.href = "/ideas/"+this.idea._id;
      this.ideaLink.title = moment(this.message.created).format('h:mm A - D MMM YY');
      this.ideaLink.innerHTML = moment(this.message.created).fromNow();
      this.userImage.src = user.imageUrl;
      this.userImage.alt = this.message.actor.name;
      this.userNameLink.href = '/'+user.username;
      this.userNameLink.innerHTML = this.message.actor.name;
      //this.usernameLink.innerHTML = user.username;

      var msg = parse.url(this.message.body);
          msg = parse.pointer(msg);

      //console.log("msg", msg);

      this.messageBody.innerHTML = msg;

      //$(this.messageBody).linkify({target: '_blank'});
      
      if (this.message.isTweet){
        domClass.remove(this.tweetIcon, "hide");
      }
      //console.log("message created");
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