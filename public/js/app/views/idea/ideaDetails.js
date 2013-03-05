define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/ideaDetails.html",
    "dojo/text!./templates/file.html",
    "dojo/text!./templates/user.html",
    "dojo/text!./templates/giver.html",
    "dojo/text!./templates/reportEntry.html",
    "dojo/text!./templates/userReportEntry.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/store/JsonRest",
    "dojo/_base/array",
    "dojo/request",
    "app/models/currency",
    "app/views/makePaymentForm/makePaymentForm",
    "app/util/parse"
], function(declare, _WidgetBase, _TemplatedMixin, template, fileHtml, userHtml, giverHtml, reportHtml, entryHtml, on, domClass, topic, lang, build, JsonRest, array, request, currency, makePaymentForm, parse) {

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

    findPointers: function(purpose, fn){
      purpose.replace(/[~]+[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(p) {
        //link = ~coordel.com
        var link = p;
        if (link.split('/').length > 1){
          link = link.split('/')[0];
        }
        var pointer = link.replace('~', '%7E');
        var toReturn = p.link('/search?q='+pointer);
        fn(toReturn);
      });
    },

    showDetails: function(){
      var self = this;

      self.store.get(self.idea._id).then(function(details){

        console.log("details", details);

        var idea = details.idea;

        self.account = details.account;
        self.supporting = details.supporting;
        self.gaveMoney = details.gaveMoney;
        self.gaveTime = details.gaveTime;
        self.userReport = details.userReport;

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
          var purp = parse.url(idea.purpose);
          purp = parse.pointer(purp);
          self.purposeContainer.innerHTML = purp;
          /*
          self.findPointers(idea.purpose, function(purp){
            console.log("purp", purp);
            self.purposeContainer.innerHTML = purp.replace(/\n/g, "<br>");
            $(self.purposeContainer).linkify({target: '_blank'});
          });
          */
        } else {
          self.purposeContainer.innerHTML = '<em class="muted">Woops, purposeless!</em>';
        }


        if (idea.deadline){
          self.deadlineContainer.innerHTML = moment(idea.deadline).format('h:mm A - D MMM YY');
        } else {
          domClass.add(self.deadlineContainer, 'hide');
        }

        if (idea.shortUrl){
          self.linkContainer.innerHTML = idea.shortUrl;
          self.linkContainer.href = idea.shortUrl;
        } else {
          domClass.add(self.linkContainer, 'hide');
        }

        if (self.account.balance > 0 && self.currentUser.appId === idea.responsible){


          currency.init(self.bitcoinPrices, self.currentUser.app.localCurrency);
          domClass.remove(self.paymentContainer, 'hide');
          self.paymentBtcAmount.innerHTML = currency.formatBtc(self.account.balance);
          self.paymentLocalAmount.innerHTML = currency.toLocal(self.account.balance);

          on(self.paymentButton, "click", function(){
            makePaymentForm.show(self.idea, self.account.balance);
          });

        }

        self.purposeFooter.innerHTML = moment(idea.updated).format('h:mm A - D MMM YY');

        $('.idea-purpose-icon').tooltip({title: "Idea purpose", placement: "left"});
        $('.idea-deadline-icon').tooltip({title: "Idea deadline", placement:"left"});
        $('.idea-payment-icon').tooltip({title: "Idea available balance", placement:"left"});
        $('.idea-link-icon').tooltip({title: "Idea short link", placement:"left"});
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
        self.moneyPledged.innerHTML = self.getLocalAmount(account.pledged, true);
        self.moneyProxied.innerHTML = self.getLocalAmount(account.proxied, true);
        self.moneyAllocated.innerHTML = self.getLocalAmount(account.allocated, true);
        self.timePledged.innerHTML = account.pledgedTime + " hrs";
        self.timeReported.innerHTML = account.reportedTime  + " hrs";

        /*
        if (self.gaveMoney.length || self.gaveTime.length){
          domClass.remove(self.gaveList, "hide");
          self.showGave();
        }
        */

        if (self.userReport.rows.length){
          self.showUserReport();
        }

        $("[rel=tooltip]").tooltip({
          placement: "bottom",
          trigger: "hover"
        });

      });
    },

    getLocalAmount: function(btcAmount, showSymbol){

      var self = this;
      if (showSymbol){
        return self.currency.getSymbol() + self.currency.toLocal(btcAmount);
      } else {
        return self.currency.toLocal(btcAmount);
      }
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

    showUserReport: function(){
      var self = this
        , entry = {}
        , row;

      array.forEach(self.userReport.rows, function(item){
        entry.id = item.user.appId;
        entry.imageUrl = item.user.imageUrl;
        entry.fullName = item.user.fullName;
        entry.userLink = "/" + item.user.username;
        if (item.time.pledged){
          entry.timePledged = item.time.pledged;
        } else {
          entry.timePledged = "";
        }
        if (item.time.reported){
          entry.timeReported = item.time.reported;
        } else {
          entry.timeReported = "";
        }
        if (item.money.pledged){
          entry.moneyPledged = self.getLocalAmount(item.money.pledged);
        } else {
          entry.moneyPledged = "";
        }
        if (item.money.proxied){
          if (item.money.proxied < 0){
            entry.proxyClass = "proxied";
            entry.moneyProxied = self.getLocalAmount(-item.money.proxied);
          } else {
            entry.proxyClass = "";
            entry.moneyProxied = self.getLocalAmount(item.money.proxied);
          }
        } else {
          entry.moneyProxied = "";
        }
        if (item.money.allocated){
          entry.moneyAllocated = self.getLocalAmount(item.money.allocated);
        } else {
          entry.moneyAllocated = "";
        }
        row = build.toDom(lang.replace(entryHtml, entry));
        build.place(row, self.userReportContainer);
      });
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