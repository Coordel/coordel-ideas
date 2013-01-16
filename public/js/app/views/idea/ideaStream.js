define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/ideaStream.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/store/JsonRest",
    "dojo/store/Memory",
    "dojo/_base/array",
    "app/views/idea/message",
    "app/views/idea/activity"
], function(declare, _WidgetBase, _TemplatedMixin, template, on, build, topic, JsonRest, Memory, array, message, activity) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    idea: null,

    baseClass: "idea-stream",

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      self.store = new JsonRest({
        target: "/api/v1/ideas/"+self.idea._id+"/stream"
      });

      self.store.query(null, {start: 0, count: 25}).then(function(query){

        var stream = query.stream
          , users = query.users;

        var mem = new Memory({data: stream});

        var sorted = mem.query(null, {sort: [{attribute:"time", descending: false}]});

        array.forEach(sorted, function(item){
          console.log("item", item);
          if (item.docType && item.docType === "message"){
            //add a new message
            new message({idea: self.idea, message: item, users: users}).placeAt(self.domNode, "first");
          } else if (item.verb) {
            new activity({idea: self.idea, activity: item, users:users}).placeAt(self.domNode, "first");
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