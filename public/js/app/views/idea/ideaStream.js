define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/ideaStream.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/store/JsonRest",
    "dojo/_base/array",
    "app/views/idea/message"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, build, topic, JsonRest, array, message) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    idea: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      self.store = new JsonRest({
        target: "/api/v1/ideas/"+self.idea._id+"/stream"
      });

      self.store.query(null, {start: 0, count: 25}).then(function(stream){
        console.log("stream", stream);
        array.forEach(stream, function(item){
          if (item.docType && item.docType === "message"){
            //add a new message
            new message({idea: self.idea, message: item}).placeAt(self.domNode);
          }
        });
      });

      topic.subscribe("coordel/stream", function(item){
        if (item.project === self.idea._id){
          if (item.docType && item.docType === "message"){
            new message({idea: self.idea, message: item}).placeAt(self.domNode, "first");
          }
        }
      });
      
    }
  });
});