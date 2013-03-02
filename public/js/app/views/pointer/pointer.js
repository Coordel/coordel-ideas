define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/pointer.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/request",
    "dojo/_base/lang"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, domClass, topic, request, lang) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    pointer: null,

    baseClass: "pointer",

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;
      self.pointerImage.src = self.pointer.fav;
      self.pointerLink.href = '/search?q='+self.pointer.pointer.replace('~', '%7E');
      self.pointerLink.innerHTML = self.pointer.name;
    }
  });
});