define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/text.html",
    "dojo/text!./templates/contact.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/topic",
    "dojo/request",
    "dojo/_base/lang"
], function(declare, _WidgetBase, _TemplatedMixin, template, contactHtml, on, domClass, topic, request, lang) {
 
  return declare([_WidgetBase, _TemplatedMixin], {

    templateString: template,

    rows: 4,

    maxchars: 140,

    contacts: [],

    placeholder: "",

    isContact: false,

    //  your custom code goes here
    postCreate: function(){
      this.inherited(arguments);
      var self = this;

      on(self.textContainer, "keyup", function(e){
        //if this is the @ symbol then show the contacts in a dropdown below the text area

        //if the last word starts with a @ then show the filtered contacts

        //if this is a > symbol then look up domains that it might point to and show in dropdown below text area

        //if the last word starts with a > then show the filter domains

        //if this is a # symbol then look up hashtags that it might point to and show in dropdown below text area

        //if we're looking for a contact (isContact) and the key is a space then clear the dropdown and disconnect
      });
    },

    detectSpecial: function(string, char){
      //splits the strings and detects if the last word starts with the char
      var isSpecial = false;

      //split string into words
      var words = string.split(" ");


      if (words.length === 1){
        //if there's only one word, then test if it can be split using the special char
        isSpecial = (words[0].split(char).length > 1);
      } else if (words.length > 1) {
         //if there's more than one word, then test if the last word can be split using the special char
        isSpecial = (words[words.length -1].split(char).length > 1);
      }

      return isSpecial;
    },

    showChoices: function(show){
      if (show){
        domClass.remove(self.choicesContainer, "hide");
      } else {
        domClass.add(self.choicesContainer, "hide");
      }
    },

    showFilteredContacts: function(filter){
      var self = this;
      //filter the fullname of the contact based on the incoming filter
      var show = array.filter(self.contacts, function(item){
        return item.fullName.indexOf(filter) > 0;
      });

      if (show.length){
        showChoices(true);
        //show the filtered list
        array.forEach(show, function(item){
          //add a contact node to the dropdown container
        });
      }
    }
  });
});