define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/ideaDetails.html",
    "dojo/text!./templates/file.html",
    "dojo/text!./templates/user.html",
    "dojo/text!./templates/giver.html",
    "dojo/text!./templates/reportEntry.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/store/JsonRest",
    "dojo/_base/array",
    "dojo/request",
    "app/models/currency",
    "app/views/makePaymentForm/makePaymentForm"
], function(declare, _WidgetBase, _TemplatedMixin, template, fileHtml, userHtml, giverHtml, reportHtml, on, domClass, topic, lang, build, JsonRest, array, request, currency, makePaymentForm) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    idea: null,

    localCurrency: "USD",

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      
      var self = this;

      this.store = new JsonRest({
        target: "/api/v1/ideas/"
      });
      
      self.showDetails();
  
    },

    showDetails: function(){
      var self = this;

      self.store.get(self.idea._id).then(function(details){

        //console.log("details", details);

        var idea = details.idea;

        self.account = details.account;
        self.supporting = details.supporting;
        self.gaveMoney = details.gaveMoney;
        self.gaveTime = details.gaveTime;

        self.setAccount();
       
        if (details.activity && (details.activity.tasks.length || details.activity.other.length)){
          self.showActivity(details.activity);
        }

        //NOTE: decided that files was about the app and didn't add value to share and support
        /*
        if (idea._attachments){
          self.showFiles(idea);
        }
        */
        
        //expanded info
        if (idea.purpose){
          self.purposeContainer.innerHTML = idea.purpose.replace(/\n/g, "<br>");
        } else {
          self.purposeContainer.innerHTML = '<em class="muted">Woops, purposeless!</em>';
        }
        $(self.purposeContainer).linkify({target: '_blank'});

        if (idea.deadline){
          self.deadlineContainer.innerHTML = moment(idea.deadline).format('h:mm A - D MMM YY');
        } else {
          domClass.add(self.deadlineContainer, 'hide');
        }

        
        if (self.account.balance > 0 && self.currentUser.appId === idea.responsible){
          
       
          currency.init(self.bitcoinPrices, self.currentUser.app.localCurrency);
          domClass.remove(self.paymentContainer, 'hide');
          self.paymentBtcAmount.innerHTML = currency.formatBtc(self.account.balance);
          self.paymentLocalAmount.innerHTML = currency.toLocal(self.account.balance);

          on(self.paymentButton, "click", function(){
            console.log("show payment form", self.account.balance, self.idea);
            makePaymentForm.show(self.idea, self.account.balance);
          });
        
        }
        
        self.purposeFooter.innerHTML = moment(idea.updated).format('h:mm A - D MMM YY');

        $('.idea-purpose-icon').tooltip({title: "Idea purpose", placement: "left"});
        $('.idea-deadline-icon').tooltip({title: "Idea deadline", placement:"left"});
        $('.idea-payment-icon').tooltip({title: "Idea available balance", placement:"left"});
      });
      
    },

    updateAccountBalance: function(btcAmount){

      var self = this;
      self.account.balance += btcAmount;
      self.paymentBtcAmount.innerHTML = currency.formatBtc(self.account.balance);
      self.paymentLocalAmount.innerHTML = currency.toLocal(self.account.balance);
    },

    setAccount: function(){
      var self = this;
      request('/bitcoin/prices', {handleAs: "json"}).then(function(prices){
        self.bitcoinPrices = prices;
        currency.init(prices, self.localCurrency);
        self.currency = currency;
        var account = self.account;
        self.peopleSupporting.innerHTML = self.supporting;
        if (parseInt(self.supporting,10) === 1){
          self.peopleLabel.innerHTML = "PERSON";
        }
        self.moneyPledged.innerHTML = self.getLocalAmount(account.pledged + account.proxied);
        self.moneyAllocated.innerHTML = self.getLocalAmount(account.allocated);
        self.timePledged.innerHTML = account.pledgedTime + " hrs";
        self.timeReported.innerHTML = account.reportedTime  + " hrs";

        if (self.gaveMoney.length || self.gaveTime.length){
          domClass.remove(self.gaveList, "hide");
          self.showGave();
        }

        $("[rel=tooltip]").tooltip({
          placement: "bottom",
          trigger: "hover"
        });

      });
    },

    getLocalAmount: function(btcAmount){
   
      var self = this;
      return self.currency.getSymbol() + self.currency.toLocal(btcAmount);
    },

    showActivity: function(activity){
      //console.log("showing activity", activity);
     
      var self = this
        , row;

      domClass.remove(self.activityContainer, "hide");
        
      if (activity.other.length){
        row = build.toDom("<h5>Activity</h5>");
        build.place(row, self.activityContainer);
        array.forEach(activity.other, function(item){
          row = build.toDom(lang.replace(reportHtml, item));
          build.place(row, self.activityContainer);
        });
      }

      if (activity.tasks.length){
        row = build.toDom("<h5>Task activity</h5>");
        build.place(row, self.activityContainer);
        array.forEach(activity.tasks, function(item){
          row = build.toDom(lang.replace(reportHtml, item));
          build.place(row, self.activityContainer);
        });
      }
    },

    showGave: function(){
      var self = this
        , img = {}
        , row;

      array.forEach(self.gaveTime, function(item){
        img.id=item.user.appId;
        img.imageUrl = item.user.imageUrl;
        img.fullName = item.user.fullName;
        img.amount = item.amount.toString() + 'hr';
        row = build.toDom(lang.replace(giverHtml, img));

        build.place(row, self.gaveTimeContainer);
      });

      array.forEach(self.gaveMoney, function(item){
        img.id=item.user.appId;
        img.imageUrl = item.user.imageUrl;
        img.fullName = item.user.fullName;
        img.amount = self.getLocalAmount(item.amount);
        row = build.toDom(lang.replace(giverHtml, img));

        build.place(row, self.gaveMoneyContainer);
      });

    },

    showUsers: function(users){
      var self = this
        , img = {}
        , row;

      domClass.remove(self.userImages, "hide");

      array.forEach(users, function(user){
        img.id=user.appId;
        img.imageUrl = user.imageUrl;
        img.fullName = user.fullName;
        row = build.toDom(lang.replace(userHtml, img));
        build.place(row, self.userImages);
      });
    },

    showFiles: function(idea){
      var self = this;
      domClass.remove(self.detailsFiles, "hide");
      Object.keys(idea._attachments).forEach(function(key) {
        var node = lang.replace(fileHtml, {filename: key});
        build.place(node, self.detailsFiles);
      });
    }
  });
});