define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/userProfile.html",
    "dojo/text!./templates/feedbackTip.html",
    "dojo/text!./templates/proxyTip.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/request",
    "dojo/_base/lang"
], function(declare, _WidgetBase, _TemplatedMixin, template, tipHtml, proxyTipHtml, on, domClass, topic, request, lang) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    localCurrency: "USD",

    miniProfile: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      if (self.user.localCurrency){
        self.localCurrency = self.user.localCurrency;
      }

      //console.log("userProfile", self.user);

      self.profileImage.src = self.user.imageUrl;
      self.fullName.innerHTML = self.user.fullName;
      self.username.innerHTML = self.user.username;
      self.bio.innerHTML = self.user.bio || "";
      domClass.add(self.other, "hide");
      if (self.user.location || self.user.url){
        domClass.remove(self.other, "hide");
        self.location.innerHTML = self.user.location || "";
        self.url.innerHTML = "";
        if (self.user.personalLink){
          self.url.innerHTML = self.user.personalLink;
          self.url.href = self.user.personalLink;
        }
      }

      self.setAccount();
      self.setProfile();
      self.setProxies();
      
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

      topic.subscribe("coordel/miniProfile", function(mini){
        self.miniProfile = mini;
        self.setProfile();
      });

      topic.subscribe("coordel/supportAccount", function(acct){
        self.user.account = acct;
        self.setAccount();
      });

    },

    setProxies: function(){
      var self = this
        , proxies = self.user.proxies
        , sum = self.user.proxies.ideas + self.user.proxies.people;

      console.log("proxies", proxies);
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
        
      } else {
        domClass.add(self.proxySum, "hide");
      }
    },

    setProfile: function(){
      var self = this
        , profile = this.miniProfile;

      if (profile.feedback){
        if (profile.feedback.avg > 0){

          self.feedbackAvg.innerHTML = profile.feedback.avg;

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

        } else {

          domClass.add(self.feedbackImage, "hide");

        }
      }
    },

    setAccount: function(){
      var self = this;
      request('/bitcoin/prices', {handleAs: "json"}).then(function(prices){
        self.bitcoinPrices = prices;
        var account = self.user.account;
        self.moneyPledged.innerHTML = self.getLocalAmount(account.pledged);
        self.moneyProxied.innerHTML = self.getLocalAmount(account.proxied);
        self.moneyAllocated.innerHTML = self.getLocalAmount(account.allocated);
        self.timePledged.innerHTML = account.pledgedTime + " hrs";
        self.timeReported.innerHTML = account.reportedTime  + " hrs";

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