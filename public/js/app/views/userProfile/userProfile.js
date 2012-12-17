define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/userProfile.html",
    "dojo/text!./templates/feedbackTip.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/request"
], function(declare, _WidgetBase, _TemplatedMixin, template, tipHtml, on, domClass, topic, request) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    localCurrency: "USD",

    miniProfile: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;
      console.log("self.user", self.miniProfile);

      if (self.user.app.localCurrency){
        self.localCurrency = self.user.app.localCurrency;
      }

      self.profileImage.src = self.user.imageUrl;
      self.fullName.innerHTML = self.user.fullName;
      self.username.innerHTML = self.user.username;
      self.bio.innerHTML = self.user.bio || "";
      domClass.add(self.other, "hide");
      if (self.user.location || self.user.url){
        domClass.remove(self.other, "hide");
        self.location.innerHTML = self.user.location || "";
        self.url.innerHTML = "";
        if (self.user.url){
          self.url.innerHTML = self.user.ur;
        }
      }

      if (self.miniProfile.feedback){
        if (self.miniProfile.feedback.avg > 0){
          self.feedbackAvg.innerHTML = self.miniProfile.feedback.avg;
        } else {
          domClass.add(self.feedbackImage, "hide");
        }
      }

      self.setAccount();

      $(self.feedbackScore).tooltip({
        title: tipHtml,
        placement: "right",
        html: true
      });

      topic.subscribe("coordel/addIdea", function(idea){
        if (self.user.appId === idea.creator){
          var count = parseInt(self.ideas.innerHTML, 10) + 1;
          self.ideas.innerHTML = count.toString();
        }
      });

      topic.subscribe("coordel/supportIdea", function(num){
        num = parseInt(num, 10);
        var count = parseInt(self.supporting.innerHTML, 10) + num;
        self.supporting.innerHTML = count.toString();
      });
    },

    setAccount: function(){
      var self = this;
      request('/bitcoin/prices', {handleAs: "json"}).then(function(prices){
        self.bitcoinPrices = prices;
        var account = self.user.account;
        self.moneyPledged.innerHTML = self.getLocalAmount(account.pledged);
        self.moneyProxied.innerHTML = self.getLocalAmount(account.proxied);
        self.moneyAllocated.innerHTML = self.getLocalAmount(account.allocated);
        self.timePledged.innerHTML = account.pledgedTime + " hours";
        self.timeReported.innerHTML = account.reportedTime || "0" + " hours";

      });
    },

    getLocalAmount: function(btcAmount){
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var symbol = self.bitcoinPrices[self.localCurrency].symbol;
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      if (symbol){
        newValue = symbol + newValue;
      } else {
        newValue = newValue + " " + self.localCurrency;
      }
      return newValue;
    }
  });
});