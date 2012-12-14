define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/message.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, build, topic) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    message: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      console.log("message", self.message);

      this.ideaLink.href = "/ideas/"+this.idea._id;
      this.ideaLink.title = moment(this.message.created).format('h:mm A - D MMM YY');
      this.ideaLink.innerHTML = moment(this.message.created).fromNow();
      this.userImage.src = this.getImageUrl(this.message.actor.email);
      this.userImage.alt = this.message.actor.name;
      this.userNameLink.href = '/'+this.message.actor.username;
      this.userNameLink.innerHTML = this.message.actor.name;
      this.usernameLink.innerHTML = this.message.actor.username;

      this.messageBody.innerHTML = this.message.body;

    },

    getImageUrl: function(email){
      console.log("in getURL", email);
      var hash = hex_md5(email);
      var url = 'http://www.gravatar.com/avatar/' + hash + '?d=' + encodeURIComponent('http://coordel.com/images/default_contact.png');
      console.log("url", url);
      return url;
    }
  });
});