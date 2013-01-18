define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/contactPicker.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, build, topic) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    placeholder: false,

    value: null,

    currentContact: null,

    contacts: [],

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      
      var self = this;

      if (self.placeholder){
        self.inputControl.placeholder = self.placeholder;
      }

      $(self.inputControl).typeahead({
        source: function (query, process) {

          var labels=[];

          $.each(self.contacts, function (i, item) {
            labels.push(JSON.stringify(item));
          });

          process(labels);
        }
      , updater: function (item) {
          var newitem = JSON.parse(item);
          console.log("contact picker selected item", item);
          self.value = newitem.appId;
          self.currentContact = item;
          return newitem.fullName;
        }
      , highlighter: function(item){
          var newitem = JSON.parse(item);
          var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
          var fullName = newitem.fullName.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
            return '<strong>' + match + '</strong>';
          });
          return "<div><img class='img-typeahead' src='" + newitem.imageUrl + "'/>" + fullName + "</div>";
        }
      
      });
    }
  });
});