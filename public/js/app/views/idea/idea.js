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
    "dojo/request/xhr",
    "dojo/topic",
    "app/views/idea/ideaDetails",
    "app/views/idea/ideaStream",
    "dijit/registry",
    "dojo/_base/array"

], function(declare, _WidgetBase, _TemplatedMixin, template, replyHtml,inviteHtml, shareHtml, on, domClass, lang, dom, xhr, topic, ideaDetails, ideaStream, registry, array) {

    return declare([_WidgetBase, _TemplatedMixin], {

        templateString: template,

        idea: null,

        user: null,

        currentUser: null,

        doingAction: false,

        collapsed: true,

        setState: function(user){
          var self = this
            , idea = self.idea;

          //if I'm the creator of this idea, then hide the support button
          if (user.app.id === idea.creator){
            domClass.add(self.pledgeSupportContainer, "hide");
          }

          //if I'm already supporting this idea, hide the support button
          if (array.indexOf(user.account.supportedIdeas, idea._id )>-1){
            domClass.add(self.pledgeSupportContainer, "hide");
          }

          //if i've already pledged meoney, remove pledge money;
          if (array.indexOf(user.account.pledgedIdeas, idea._id)>-1){
            domClass.add(self.pledgeMoneyContainer, "hide");
          }

          //if i've already pledged time, remove pledge time;
          if (array.indexOf(user.account.pledgedTimeIdeas, idea._id)>-1){
            domClass.add(self.pledgeTimeContainer, "hide");
            console.log("already pledged time", idea.name);
          }
        },

        //  your custom code goes here
        postCreate: function(){
          this.inherited(arguments);
          var self = this;

          var _csrf = $('#addIdea_csrf').val();

          function connect(){
            window.open('/connect/twitter', 'mywin','left=20,top=20,width=500,height=500,toolbar=1,resizable=0');
            return false;
          }


          if (this.idea.creatorDetails){
            this.user = this.idea.creatorDetails;
          }
          
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

          this.setState(this.currentUser);

          
          //if I'm supporting this idea, then hide the great idea button



          

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
            if (self.currentUser){
              domClass.remove(self.ideaActions, 'hide');
            }
          });

          on(this.domNode, 'mouseout', function(e){
            if (self.currentUser && !self.doingInvite && !self.doingReply && !self.doingShare){
              domClass.add(self.ideaActions, 'hide');
            }
          });

          on(this.toggler, 'click', function(e){
            if (self.collapsed){
              //open
              //domClass.remove(self.detailsContainer, "hide");
              this.innerHTML = "collapse";
              self.collapsed = false;
              //domClass.remove(self.activityContainer, "hide");
              ideaDetails({idea: self.idea}).placeAt(self.detailsContainer);
              ideaStream({idea:self.idea}).placeAt(self.streamContainer);

            } else {
              //close
              //domClass.add(self.detailsContainer, "hide");
              array.forEach(registry.findWidgets(self.detailsContainer), function(item){
                item.destroy();
              });
              array.forEach(registry.findWidgets(self.streamContainer), function(item){
                item.destroy();
              });
              //domClass.add(self.activityContainer, "hide");
              this.innerHTML = "expand";
              self.collapsed = true;
            
            }
          });

          $(self.doReply).popover({
            placement: 'bottom',
            html: true,
            content: lang.replace(
              replyHtml,
              {
                id: self.idea._id
              })
            });

          $(self.doInvite).popover({
            placement: 'bottom',
            html: true,
            content: lang.replace(
              inviteHtml,
              {
                id: self.idea._id
              })
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
            dom.byId("replyMessage-"+self.idea._id).focus();
            //reply
            var handle = on(dom.byId("submitReply-"+self.idea._id), "click", function(e){
              e.preventDefault();
              xhr.post('/ideas/'+self.idea._id + "/replies", {
                data: {
                  idea: JSON.stringify(self.idea),
                  message: dom.byId("replyMessage-"+self.idea._id).value,
                  _csrf: _csrf
                },
                handleAs: "json",
                headers: {
                  "X-CSRF-Token": _csrf
                }
              }).then(function(res){
                handle.remove();
                dom.byId("replyMessage-"+self.idea._id).value = "";
                $(self.doReply).popover('hide');
              });
            });
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
            dom.byId("inviteName-"+self.idea._id).focus();
            self.doingInvite = !self.doingInvite;
            var emailHandle = on(dom.byId("submitEmailInvite-"+self.idea._id), "click", function(e){
              e.preventDefault();
              xhr.post('/ideas/'+self.idea._id + "/invites", {
                data: {
                  idea: self.idea,
                  toName: dom.byId("inviteName-"+self.idea._id).value,
                  toEmail: dom.byId("inviteEmail-"+self.idea._id).value,
                  message: dom.byId("inviteMessage-"+self.idea._id).value,
                  _csrf: _csrf
                },
                headers: {
                  "X-CSRF-Token": _csrf
                }
              }).then(function(res){
                emailHandle.remove();
                dom.byId("inviteName-"+self.idea._id).value = "";
                dom.byId("inviteEmail-"+self.idea._id).value = "";
                dom.byId("inviteMessage-"+self.idea._id).value = "";
                $(self.doInvite).popover('hide');
              });
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
          });

          //pledge support
          on(this.pledgeSupport, 'click', function(e){
            xhr.post("/ideas/" + self.idea._id + "/supported", {
                data: {
                  userid: self.currentUser.id,
                  id: self.idea._id
                },
                headers: {
                  "X-CSRF-Token": _csrf
                }
            }).then(function(res){
              //update supporting
              res = JSON.parse(res);
              if (res.success){
                topic.publish("coordel/supportIdea", res.success);
              }
                
            });
          });

          //pledge time
          on(this.pledgeTime, 'click', function(e){
            //need to set the value of the idea for submission
            dom.byId("supportTimeIdea").value = self.idea._id;
          });

          //pledge money
          on(this.pledgeMoney, 'click', function(e){
            //need to set the value of the idea for submission
            dom.byId("supportMoneyIdea").value = self.idea._id;
          });

        }
    });

});