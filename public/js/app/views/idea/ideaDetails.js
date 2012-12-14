define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/ideaDetails.html",
    "dojo/text!./templates/file.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/store/JsonRest"
], function(declare, _WidgetBase, _TemplatedMixin, template, fileHtml, on, domClass, topic, lang, build, JsonRest) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    idea: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      
      var self = this;

      this.store = new JsonRest({
        target: "/api/v1/ideas/"
      });

      console.log("idea", self.idea.name, self.idea);

      
      self.showDetails();
  
    },

    showDetails: function(){
      var self = this;

      self.store.get(self.idea._id).then(function(details){

        console.log("fresh idea", details);
        var idea = details.idea;
        //expanded info
        self.purposeContainer.innerHTML = idea.purpose;
        self.purposeFooter.innerHTML = moment(idea.created).format('h:mm A - D MMM YY');


        if (idea._attachments){
          console.log("attachments" , idea._attachments);
          self.showFiles(idea);
        }

        //profile
        self.supporting.innerHTML = details.supporting;
        self.invited.innerHTML = details.invited;
        self.following.innerHTML = details.following;
        self.participating.innerHTML = details.participating;


      });



      
    },

    showFiles: function(idea){
      var self = this;
      console.log("showing files", idea._attachments);
      Object.keys(idea._attachments).forEach(function(key) {
        console.log("key", key);
        var node = lang.replace(fileHtml, {filename: key});
        console.log("file node", node);
        build.place(node, self.detailsFiles);
      });
    }
  });
});