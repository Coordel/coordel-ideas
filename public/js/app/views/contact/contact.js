define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/contact.html",
    "dojo/text!./templates/reportEntry.html",
    "dojo/text!./templates/feedbackTip.html",
    "dojo/text!./templates/proxyTip.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/request",
    "dojo/_base/array",
    "dojo/_base/lang"
], function(declare, _WidgetBase, _TemplatedMixin, template, reportHtml, tipHtml, proxyTipHtml, on, domClass, build, request, array, lang) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    contact: null,

    isOpen: false,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this
        , info = self.contact.info;

      console.log("contact", self.contact);

      this.userImage.src = this.contact.imageUrl;
      
      if (this.contact.fullName){
        this.userImage.alt = this.contact.fullName;
        this.userNameLink.innerHTML = this.contact.fullName;
      } else if (this.contact.firstName && this.contact.lastName){
        this.userImage.alt = this.contact.firstName + " " + this.contact.lastName;
        this.userNameLink.innerHTML = this.contact.firstName + " " + this.contact.lastName;
      }

     if (info.bio){
        self.bio.innerHTML = info.bio;
      } else {
        domClass.add(self.bio, 'hide');
      }

      if (info.personalLink){
        self.personalLink.innerHTML = info.personalLink;
        self.personalLink.href = info.personalLink;
      } else {
        domClass.add(self.personalLink, 'hide');
      }

      if (info.location){
        self.location.innerHTML = info.location;
      } else {
        domClass.add(self.location, 'hide');
      }

      if (info.location && info.personalLink){
        domClass.remove(self.dividerBullet, 'hide');
      }

      if (this.contact.username){
        this.userNameLink.href = '/'+this.contact.username;
      } else {
        this.userNameLink.href = "#";
      }
      
      //this.usernameLink.innerHTML = this.contact.username;

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

      console.log("contact before load", self.contact);

      request("/contacts/" + self.contact.appId + "/profile", {handleAs:"json"}).then(function(profile){
        console.log('contact profile', profile);

        var proxies = profile.proxies
        , sum = profile.proxies.ideas + profile.proxies.people;

        if (sum > 0){
          if (sum > 9999){
            sum = Math.round(sum/1000);
            sum = sum.toString() + 'k';
            domClass.add(self.proxySum, "profile-small-text");
          } else if (sum > 999 && sum <= 9999 ){
            sum = Math.round((sum/1000)* 10)/10;
            sum = sum.toString() + 'k';
            domClass.add(self.proxySum, "profile-small-text");
          }

          self.proxySum.innerHTML = sum;

          $(self.proxySum).tooltip("destroy");

          $(self.proxySum).tooltip({
            title: lang.replace(proxyTipHtml, proxies),
            placement: "bottom",
            html: true
          });

          domClass.remove(self.proxySum, "hide");
          domClass.remove(self.proxiesImage, "hide");
          
        }



        if (profile.feedback.avg > 0){
          //set the average
          self.feedbackAvg.innerHTML = profile.feedback.avg;
          //tooltip
          var tipValues = {
            coordination: Math.round(profile.feedback.coordination.avg),
            performance: Math.round(profile.feedback.performance.avg)
          };

          $(self.feedbackAvg).tooltip("destroy");

          $(self.feedbackAvg).tooltip({
            title: lang.replace(tipHtml, tipValues),
            placement: "bottom",
            html: true
          });
          domClass.remove(self.feedbackImage, "hide");
          domClass.remove(self.feedbackAvg, "hide");

        } else {
          //hide the feedback graphic
          
        }


        
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
          row = build.toDom("<h5>Activity</h5>");
          build.place(row, self.activityContainer);
          array.forEach(profile.activity.other, function(item){
            row = build.toDom(lang.replace(reportHtml, item));
            build.place(row, self.activityContainer);
          });
        }

        if (profile.activity.tasks.length){
          row = build.toDom("<h5>Task activity</h5>");
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