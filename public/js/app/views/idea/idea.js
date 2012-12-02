define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/text!./templates/idea.html",
    "dojo/text!./templates/reply.html",
    "dojo/text!./templates/invite.html",
    "dojo/text!./templates/share.html",
    "dojo/on",
    "dojo/dom-class",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/request",
    "dojo/topic",
    "app/views/paymentForm/paymentForm"
], function(declare, _WidgetBase, _TemplatedMixin, template, replyHtml,inviteHtml, shareHtml, on, build, lang, dom, request, topic) {

    return declare([_WidgetBase, _TemplatedMixin], {

        templateString: template,

        idea: null,

        user: null,

        currentUser: null,

        doingAction: false,

        collapsed: true,

        //  your custom code goes here
        postCreate: function(){
          this.inherited(arguments);
          var self = this;

          function connect(){
            window.open('/connect/twitter', 'mywin','left=20,top=20,width=500,height=500,toolbar=1,resizable=0');
            return false;
          }

          this.user = this.idea.creatorDetails;

          this.name.innerHTML = this.idea.name;
          this.ideaLink.href = "/ideas/"+this.idea._id;

          //get the dates
          this.ideaLink.title = moment(this.idea.created).format('h:mm A - D MMM YY');
          this.ideaLink.innerHTML = moment(this.idea.created).fromNow();

          //user details
          this.userDetails.href = '/'+this.user.username;
          this.userDetails['data-userid'] = this.user.appId;
          this.userImage.src = this.user.imageUrl;
          this.userImage.alt = this.user.fullName;
          this.userNameLink.href = '/'+this.user.username;
          this.userNameLink.innerHTML = this.user.fullName;

          this.usernameLink.innerHTML = this.user.username;

          //expanded info
          this.purposeContainer.innerHTML = this.idea.purpose;
          this.purposeFooter.innerHTML = moment(this.idea.created).format('h:mm A - D MMM YY');

          //files
           console.log("name", this.idea.name, this.idea._attachments);
          if (this.idea._attachments){

            for (var name in this.idea._attachments){

              build.create("a", {href: "/coordel-dev/"+this.idea._id + "/" + name, target:"_blank", "class": "attachment", innerHTML:name}, this.detailsFiles);
            }
          }

          //sharing
          /*
          on(this.shareEmail, "click", function(){


            dom.byId("shareEmailMessage").innerHTML = lang.replace(
              shareEmailTemplate,
              {
                name: self.idea.name,
                purpose: self.idea.purpose,
                created: moment(self.idea.created).format('h:mm A - D MMM YY'),
                link: "http://coordel.com/ideas/" + self.idea._id
              });

              dom.byId("shareEmailSubject").value = self.currentUser.fullName + " shared a great idea from Coordel";

              $("#shareEmailAddress").focus();
          });

          on(this.shareTwitter, "click", function(){
            dom.byId("shareTwitterMessage").innerHTML = lang.replace(
              shareTwitterTemplate,
              {
                username: self.currentUser.fullName,
                name: self.idea.name,
                link: 'http://coordel.com/ideas/'+self.idea._id
              }
            );
          });
          */




          $("#payment-form").submit(function(event) {
            // disable the submit button to prevent repeated clicks
            $('#payment-submit-button').attr("disabled", "disabled");

            Stripe.createToken({
                number: $('#card-number').val(),
                cvc: $('#card-cvc').val(),
                exp_month: $('#card-expiry-month').val(),
                exp_year: $('#card-expiry-year').val()
            }, stripeResponseHandler);

            // prevent the form from submitting with the default action
            return false;
          });


          on(this.domNode, 'mouseover', function(e){
            //console.log("self currentUser", self.currentUser);
            if (self.currentUser){
              build.remove(self.ideaActions, 'hide');
            }
          });

          on(this.domNode, 'mouseout', function(e){
            if (self.currentUser && !self.doingInvite && !self.doingReply && !self.doingShare){
              build.add(self.ideaActions, 'hide');
            }
          });

          on(this.toggler, 'click', function(e){
            if (self.collapsed){
              //open
              console.log("open");
              build.remove(self.detailsContainer, "hide");
              this.innerHTML = "collapse";
              self.collapsed = false;
            } else {
              //close
              console.log("close");
              build.add(self.detailsContainer, "hide");
              this.innerHTML = "expand";
              self.collapsed = true;
            }
          });

          $(self.doReply).popover({
            placement: 'bottom',
            html: true,
            content: replyHtml
          });

          $(self.doInvite).popover({
            placement: 'bottom',
            html: true,
            content: inviteHtml
          });

          $(self.doShare).popover({
            placement: 'bottom',
            html: true,
            content: lang.replace(
              shareHtml,
              {
                tweet: 'Check out this great idea--'+self.idea.name,
                url: 'http://coordel.com/ideas/'+self.idea._id
              })
            });

          on(this.doReply, 'click', function(e){
            if (self.doingInvite){
              $(self.doInvite).popover('hide');
              self.doingInvite = false;
            }
            if (self.doingShare){
              $(self.doShare).popover('hide');
              self.doingShare = false;
            }
            self.doingReply = !self.doingReply;
            console.log("reply clicked");

          });

          on(this.doInvite, 'click', function(e){
            if (self.doingReply){
              $(self.doReply).popover('hide');
              self.doingReply = false;
            }
            if (self.doingShare){
              $(self.doShare).popover('hide');
              self.doingShare = false;
            }

            self.doingInvite = !self.doingInvite;
            console.log("invite clicked", self.inviteContact);

            $(self.inviteContact).typeahead({

              source: ["foo", "bar"],

              updater:function (item) {
                console.log("type ahead", item);
                //item = selected item
                //do your stuff.

                //dont forget to return the item to reflect them into input
                return item;
              }
            });
          });

          on(this.doShare, 'click', function(e){
            if (self.doingReply){
              $(self.doReply).popover('hide');
              self.doingReply = false;
            }
            if (self.doingInvite){
              $(self.doInvite).popover('hide');
              self.doingInvite = false;
            }
            IN.parse(self.domNode);
            self.doingShare = !self.doingShare;
            console.log("share clicked");
          });

          //pledge support
          on(this.pledgeSupport, 'click', function(e){
            request.post("/ideas/" + self.idea._id + "/supported", {
                data: {
                  userid: self.currentUser.id,
                  id: self.idea._id
                },
                headers: {
                  "X-CSRF-Token": dom.byId('mainCsrf').innerHTML
                }
            }).then(function(res){
              //update supporting
              res = JSON.parse(res);
              console.log("The server returned: ", res.success);
              if (res.success){
                console.log("success", res.success);
                topic.publish("coordel/supportIdea", res.success);
              }
                
            });
          });

          //pledge time
          on(this.pledgeTime, 'click', function(e){
            //need to set the value of the idea for submission
            dom.byId("supportTimeIdea").value = self.idea._id;
          });
        }
    });

});