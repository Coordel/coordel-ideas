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

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;
      
    }
  });
});