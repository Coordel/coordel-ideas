define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/contact.html",
    "dojo/text!./templates/reportEntry.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/request",
    "dojo/_base/array",
    "dojo/_base/lang"
], function(declare, _WidgetBase, _TemplatedMixin, template, reportHtml, on, domClass, build, request, array, lang) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    contact: null,

    isOpen: false,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      this.userImage.src = this.contact.imageUrl;
      this.userImage.alt = this.contact.fullName;
      this.userNameLink.href = '/'+this.contact.username;
      this.userNameLink.innerHTML = this.contact.fullName;
      this.usernameLink.innerHTML = this.contact.username;

      on(self.toggler, "click", function(e){
        if (self.isOpen){
          self.isOpen = false;
          domClass.add(self.activityContainer, "hide");
          self.toggleLabel.innerHTML = "show activity";
        } else {
          self.isOpen = true;
          domClass.remove(self.activityContainer, "hide");
          self.toggleLabel.innerHTML = "hide activity";
        }
      });

      request("/contacts/" + self.contact.appId + "/profile", {handleAs:"json"}).then(function(profile){
        self.coord.innerHTML = Math.round(profile.feedback.coordination.avg);
        self.perf.innerHTML = Math.round(profile.feedback.performance.avg);
        
        var row;
        var mini = [
          {name: "IDEAS", value: profile.ideas},
          {name: "SUPPORTING", value: profile.supporting},
          {name: "WITH TIME", value: profile.supportingTypes.withTime},
          {name: "WITH MONEY", value: profile.supportingTypes.withMoney}
        ];

        //here is the mini profile info first
        array.forEach(mini, function(item){
          row = build.toDom(lang.replace(reportHtml, item));
          build.place(row, self.activityContainer);
        });
        
        if (profile.activity.other.length){
          array.forEach(profile.activity.other, function(item){
            row = build.toDom(lang.replace(reportHtml, item));
            build.place(row, self.activityContainer);
          });
        }

        if (profile.activity.tasks.length){
          row = build.toDom("<h5>Tasks</h5>");
          build.place(row, self.activityContainer);
          array.forEach(profile.activity.tasks, function(item){
            row = build.toDom(lang.replace(reportHtml, item));
            build.place(row, self.activityContainer);
          });
        }
      });

    }
  });
});