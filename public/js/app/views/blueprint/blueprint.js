define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/blueprint.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/array",
    "dojo/request"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, domClass, topic, array, request) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      self.nameContainer.innerHTML = self.name;
      if (self.purpose){
        self.purposeContainer.innerHTML = self.purpose;
      } else {
        domClass.add(self.purposeDiv, "hide");
      }

      $(".copy-blueprint").tooltip({
        placement: "bottom",
        trigger: "hover"
      });

      on(self.copyBlueprint, "click", function(){
        var url = "/users/" + self.user.appId + '/blueprints';
        request.post(url, {
          data: {
            blueprint: JSON.stringify(self.blueprint),
            _csrf: self._csrf
          },
          handleAs: "json"
        }).then(function(resp){
          fn(resp);
          //the login won't work for sure because we don't have a password
          //but we can go through the error to see if the email already exists
        });
      });
    
    },

    baseClass: "blueprint"

  });
});