define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/contact.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, build, topic) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    contact: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      console.log("contact", self.contact);

      this.userImage.src = this.contact.imageUrl;
      this.userImage.alt = this.contact.fullName;
      this.userNameLink.href = '/'+this.contact.username;
      this.userNameLink.innerHTML = this.contact.fullName;
      this.usernameLink.innerHTML = this.contact.username;

    }
  });
});