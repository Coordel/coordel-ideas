define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/pledge.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/_base/array",
    "dojo/_base/lang"
], function(declare, _WidgetBase, _TemplatedMixin, template
    , on, domClass, topic, array, lang) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    pledge: null,

    currency: null,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      console.log("pledge post create", self.pledge.amount);

      self.pledgeType.innerHTML = self.pledge.type.toLowerCase();
      self.setProxiedBy(self.pledge.creator);
      self.setBtcAmount(self.pledge.amount);
      self.setLocalAmount(self.pledge.amount);
    },

    setProxiedBy: function(appId){
      var self = this
        , by = ""
        , imageUrl = "https://work.coordel.com/images/default_contact.png";

      array.forEach(self.contacts, function(item){
        if (item.appId === appId){
          by = item.fullName;
          imageUrl = item.imageUrl;
        }
      });

      self.proxiedBy.innerHTML = by;
      self.imageUrl.src = imageUrl;
      //console.log("proxied by", by);
    },

    setLocalAmount: function(btcAmount){
      /*
      console.log("local btcAmout", btcAmount);
      var self = this;
      var localValue = self.bitcoinPrices[self.localCurrency]["24h"];
      var newValue = btcAmount * localValue;
      newValue = accounting.formatNumber(newValue, [precision = 2], [thousand = ","], [decimal = "."]);
      */
      this.localAmount.innerHTML = this.currency.getSymbol() + this.currency.toLocal(btcAmount);
 
    },

    setBtcAmount: function(btcAmount){
      /*
      var self = this;

      console.log("btc btcAmout", btcAmount);
      var newValue = accounting.formatNumber(btcAmount, [precision = 4], [thousand = ","], [decimal = "."]);

      self.btcAmount.innerHTML = newValue;
      console.log("btcAmount", newValue);
      */
      this.btcAmount.innerHTML = this.currency.formatBtc(btcAmount);
    }
    
  });
});