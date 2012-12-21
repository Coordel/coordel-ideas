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
    "dojo/topic", "dojo/fx/easing", "dojo/_base/fx",
    "app/views/idea/ideaDetails",
    "app/views/idea/ideaStream",
    "dijit/registry",
    "dojo/_base/array",
    "app/views/allocateForm/allocateForm",
    "app/views/addProxyForm/addProxyForm",
    "app/views/contactPicker/contactPicker",
    "app/views/cancelMoneyForm/cancelMoneyForm",
    "app/views/reportTimeForm/reportTimeForm",
    "app/views/cancelTimeForm/cancelTimeForm",
    "app/views/removeProxyForm/removeProxyForm",
    "app/views/feedbackForm/feedbackForm"

], function(declare, _WidgetBase, _TemplatedMixin, template, replyHtml,inviteHtml, shareHtml, on, domClass, lang, dom, xhr, topic, easing, fx, ideaDetails, ideaStream, registry, array, allocateForm, addProxyForm, contactPicker, cancelMoneyForm, reportTimeForm, cancelTimeForm, removeProxyForm, feedbackForm) {

    return declare([_WidgetBase, _TemplatedMixin], {

        templateString: template,

        showDogears: false,

        showFeedback: false,

        idea: null,

        contacts: null,

        subNavId: null,

        user: null,

        currentUser: null,

        doingAction: false,

        collapsed: true,

        resetState: function(){
          var self = this;

          domClass.remove(self.pledgeSupportContainer, "hide");
          domClass.remove(self.pledgeMoneyContainer, "hide");
          domClass.add(self.releaseMoneyContainer, "hide");
          domClass.add(self.addProxyContainer, "hide");
          domClass.add(self.removeProxyContainer, "hide");
          domClass.add(self.cancelMoneyContainer, "hide");
          domClass.remove(self.pledgeTimeContainer, "hide");
          domClass.add(self.reportTimeContainer, "hide");
          domClass.add(self.cancelTimeContainer, "hide");
          domClass.replace(self.dogear, "");
        },

        setState: function(user){
          var self = this
            , idea = self.idea;

          self.resetState();
        
          //if I'm the creator of this idea, then hide the support button
          if (user.app.id === idea.creator){
            domClass.add(self.pledgeSupportContainer, "hide");
          }

          //if I'm already supporting this idea, hide the support option
          if (array.indexOf(user.account.supportedIdeas, idea._id )>-1){
            domClass.add(self.pledgeSupportContainer, "hide");
          }

          //if i've already pledged money, remove pledge money;
          //show allocate edit and cancel
          if (array.indexOf(user.account.pledgedIdeas, idea._id)>-1){
            domClass.add(self.pledgeMoneyContainer, "hide");
            domClass.remove(self.releaseMoneyContainer, "hide");
            domClass.remove(self.addProxyContainer, "hide");
            //domClass.remove(self.editContainer, "hide"); not dealing with edit for first pass
            domClass.remove(self.cancelMoneyContainer, "hide");
          }

          //if i've already proxied money, remove pledge money, addProxy, show removeProxy;
          //show allocate edit and cancel
          if (array.indexOf(user.account.proxiedIdeas, idea._id)>-1){
            domClass.add(self.pledgeMoneyContainer, "hide");
            domClass.add(self.releaseMoneyContainer, "hide");
            domClass.add(self.addProxyContainer, "hide");
            domClass.remove(self.removeProxyContainer, "hide");
            //domClass.remove(self.editContainer, "hide"); not dealing with edit for first pass
            domClass.remove(self.cancelMoneyContainer, "hide");
          }


          //if this is a recurring pledge that i've allocated, give the option to deallocate or cancel the pledge
          if (array.indexOf(user.account.recurringAllocatedPledges, idea._id)>-1){
            domClass.add(self.pledgeMoneyContainer, "hide");
            domClass.add(self.releaseMoneyContainer, "hide");
            domClass.remove(self.addProxyContainer, "hide");
            //domClass.remove(self.editContainer, "hide"); not dealing with edit for first pass
            domClass.remove(self.cancelMoneyContainer, "hide");
          }

          //if i've already pledged time, remove pledge time;
          if (array.indexOf(user.account.pledgedTimeIdeas, idea._id)>-1){
            domClass.add(self.pledgeTimeContainer, "hide");
            domClass.remove(self.reportTimeContainer, "hide");
            domClass.remove(self.cancelTimeContainer, "hide");
          }

          //finally, if this is money, then hide idea related and vice-versa
          if (self.subNavId === "subNavMoney"){
            domClass.add(self.pledgeTimeContainer, "hide");
            domClass.add(self.reportTimeContainer, "hide");
            domClass.add(self.cancelTimeContainer, "hide");
          }

          if (self.subNavId === "subNavTime"){
            domClass.add(self.pledgeMoneyContainer, "hide");
            domClass.add(self.releaseMoneyContainer, "hide");
            domClass.add(self.addProxyContainer, "hide");
            domClass.add(self.cancelMoneyContainer, "hide");
          }

          //feedback
          if (self.showFeedback){
    
            //if I'm a participant in this idea, I can give feedback
            var has = array.filter(self.idea.assignments, function(assign){
              return (assign.status === "ACCEPTED" && assign.role !== "FOLLOWER" && assign.username === self.currentUser.appId);
            });

            if (has.length && self.idea.users.length > 1){
              domClass.remove(self.doFeedbackContainer, "hide");
            }
          }

  

          //DOGEARS
          if (self.showDogears){
            var recur = array.indexOf(user.account.recurringPledges, idea._id)>-1
              , recurAlloc = array.indexOf(user.account.recurringAllocatedPledges, idea._id)>-1
              , recurTime = array.indexOf(user.account.recurringTimePledges, idea._id) > -1
              , recurTimeAlloc = array.indexOf(user.account.recurringTimeAllocatedPledges, idea._id) > -1
              , proxy = array.indexOf(user.account.proxiedIdeas, idea._id)>-1;



            var showTip = false
              , tipText = "";



            //if both recur and proxy, show both, otherwise show the right one
            if (self.idea.pledgeType === "money"){
              if (recur && proxy){
                domClass.replace(self.dogear, "icon-dogear-both-stopped");
                tipText = "Proxied and recurring but not allocated";
                showTip = true;
              } else if (recurAlloc && proxy){
                domClass.replace(self.dogear, "icon-dogear-both");
                tipText = "Proxied, recurring and allocated";
                showTip = true;
              } else if (recur && !recurAlloc){
                domClass.replace(self.dogear, "icon-dogear-recurring-stopped");
                tipText = "Recurring not allocated";
                showTip = true;
              } else if (recurAlloc && !recur && !proxy){
                domClass.replace(self.dogear, "icon-dogear-recurring");
                tipText = "Recurring and allocated";
                showTip = true;
              } else if (proxy && !recur && !recurAlloc){
                domClass.replace(self.dogear, "icon-dogear-proxy");
                tipText = "Proxied";
                showTip = true;
              }
            } else if (self.idea.pledgeType === "time"){
              if (recurTime){
                 domClass.replace(self.dogear, "icon-dogear-recurring-stopped");
                 tipText = "Recurring but no time reported";
                 showTip = true;
               } else if(recurTimeAlloc){
                 domClass.replace(self.dogear, "icon-dogear-recurring");
                 tipText = "Recurring and time reported";
                 showTip = true;
               }
            }

            if (showTip){
              $(self.dogear).tooltip('destroy');
              $(self.dogear).tooltip({placement: 'right', title: tipText});
            }
            
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

          var sptHandle = topic.subscribe("coordel/supportAccount", function(acct){
            console.log("supportAccount", acct, self.currentUser.account);
  
            //self.currentUser.account = acct;
            if (self.currentUser.appId === self.idea.creator){
              self.user.account = acct;
            }

            self.setState(self.currentUser);
          });



          topic.subscribe("coordel/ideaAction", function(action, ideaId){
      
            if (self.idea._id === ideaId){
              console.log("ideaAction", action, ideaId, self.idea._id, self.subNavId);
              switch (action) {
                case "pledgeMoney":
                  //do a highlight to indicate something happened
                  $(self.domNode).delay(200).fadeOut().fadeIn('fast');
                  break;
                case "pledgeTime":
                  //do a highlight to indicate something happened
                  $(self.domNode).delay(200).fadeOut().fadeIn('fast');
                  break;
                case "addProxy":
                  //do a highlight to indicate something happened
                  $(self.domNode).delay(200).fadeOut().fadeIn('fast');
                  break;
                case "removeProxy":
                  //do a highlight to indicate something happened
                  $(self.domNode).delay(200).fadeOut().fadeIn('fast');
                  break;
                case "cancelMoney":
                  if (self.subNavId === "subNavMoney"){
                    console.log("should destroy");
                    sptHandle.remove();
                    self.destroy();
                  } else {
                    $(self.domNode).delay(200).fadeOut().fadeIn('fast');
                  }
                  break;
                case "cancelTime":
                  if (self.subNavId === "subNavTime"){
                    console.log("should destroy");
                    sptHandle.remove();
                    self.destroy();
                  } else {
                    $(self.domNode).delay(200).fadeOut().fadeIn('fast');
                  }
                  break;
                case "allocate":
                  if (self.subNavId === "subNavMoney"){
                    console.log("should destroy");
                    sptHandle.remove();
                    self.destroy();
                  } else {
                    $(self.domNode).delay(200).fadeOut().fadeIn('fast');
                  }
                  break;
              }
            }
            
          });

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

          if (this.currentUser){
            this.setState(this.currentUser);
          }
          

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
              domClass.add(self.domNode, "idea-spaced");
              //open
              //domClass.remove(self.detailsContainer, "hide");
              this.innerHTML = "collapse";
              self.collapsed = false;
              //domClass.remove(self.activityContainer, "hide");
              ideaDetails({idea: self.idea}).placeAt(self.detailsContainer);
              ideaStream({idea:self.idea}).placeAt(self.streamContainer);

            } else {
               domClass.remove(self.domNode, "idea-spaced");
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

          on(self.doReply, 'click', function(e){
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

          on(self.doInvite, 'click', function(e){
            if (self.doingReply){
              $(self.doReply).popover('hide');
              self.doingReply = false;
            }
            if (self.doingShare){
              $(self.doShare).popover('hide');
              self.doingShare = false;
            }

            var contactTab = dom.byId("inviteContactTab-"+self.idea._id)
            , emailTab = dom.byId("inviteEmailTab-"+self.idea._id)
            , contactTabContain = dom.byId("inviteContactTabContainer-"+self.idea._id)
            , emailTabContain = dom.byId("inviteEmailTabContainer-"+self.idea._id);

            on(emailTab, "click", function(e){
              domClass.add(emailTabContain, "active");
              domClass.remove(contactTabContain, "active");
              domClass.add(dom.byId("inviteContactPickerContainer-"+self.idea._id), "hide");
              domClass.remove(dom.byId("inviteEmailContainer-"+self.idea._id), "hide");
            });

            on(contactTab, "click", function(e){
              domClass.remove(emailTabContain, "active");
              domClass.add(contactTabContain, "active");
              domClass.remove(dom.byId("inviteContactPickerContainer-"+self.idea._id), "hide");
              domClass.add(dom.byId("inviteEmailContainer-"+self.idea._id), "hide");
            });

            //only show contacts that aren't already in the project
            var contactList = array.filter(self.contacts, function(item){
              return array.indexOf(self.idea.users, item.appId) === -1;
            });

            new contactPicker({contacts:contactList, placeholder: "Select contact"}).placeAt("inviteContactPickerContainer-"+self.idea._id);
            
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

          on(self.doShare, 'click', function(e){
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
          on(self.pledgeSupport, 'click', function(e){
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
          on(self.pledgeTime, 'click', function(e){
            //need to set the value of the idea for submission
            dom.byId("supportTimeIdea").value = self.idea._id;
          });

          //pledge money
          on(self.pledgeMoney, 'click', function(e){
            //need to set the value of the idea for submission
            dom.byId("supportMoneyIdea").value = self.idea._id;
          });

          //allocate money
          on(self.releaseMoney, 'click', function(e){
            //need to set the value of the idea for submission
            dom.byId("allocateIdea").value = self.idea._id;

            //get the pledges for this idea and find mine
            xhr('/ideas/' + self.idea._id + '/pledges/money', {handleAs: 'json'}).then(function(list){
          
              list = array.filter(list, function(item){
                return item.creator === self.currentUser.appId;
              });

              //
              var pledge = false;
              if (list.length){
                pledge = list[0];
              }
              
              if (pledge){
                allocateForm.showPledge(pledge);
              } else {
                allocateForm.showError();
              }

            });
          });

          //add proxy
          on(self.addProxy, 'click', function(e){
            //need to set the value of the idea for submission
            dom.byId("proxyIdea").value = self.idea._id;

            //get the pledges for this idea and find mine
            xhr('/ideas/' + self.idea._id + '/pledges/money', {handleAs: 'json'}).then(function(list){
          
              list = array.filter(list, function(item){
                return item.creator === self.currentUser.appId;
              });

              //
              var pledge = false;
              if (list.length){
                pledge = list[0];
              }
              
              if (pledge){
                addProxyForm.showPledge(pledge);
              } else {
                addProxyForm.showError();
              }

            });
          });

          on(self.cancelMoney, "click", function(e){
            dom.byId("cancelMoneyIdea").value = self.idea._id;
            //get the pledges for this idea and find mine
            xhr('/ideas/' + self.idea._id + '/pledges/money', {handleAs: 'json'}).then(function(list){
              
              list = array.filter(list, function(item){
                return item.creator === self.currentUser.appId;
              });

              //
              var pledge = false;
              if (list.length){
                pledge = list[0];
              }
    
              if (pledge){
                cancelMoneyForm.showPledge(pledge);
              } else {
                cancelMoneyForm.showError();
              }
            });
          });

          on(self.reportTime, "click", function(e){
            dom.byId("reportTimeIdea").value = self.idea._id;
            xhr('/ideas/' + self.idea._id + '/pledges/time', {handleAs: 'json'}).then(function(list){
              list = array.filter(list, function(item){
                return item.creator === self.currentUser.appId;
              });

              var pledge = false;
              if (list.length){
                pledge = list[0];
              }
    
              if (pledge){
                reportTimeForm.showPledge(pledge);
              } else {
                reportTimeForm.showError();
              }

            });
          });

          on(self.cancelTime, "click", function(e){
            dom.byId("cancelTimeIdea").value = self.idea._id;
            xhr('/ideas/' + self.idea._id + '/pledges/time', {handleAs: 'json'}).then(function(list){
              list = array.filter(list, function(item){
                return item.creator === self.currentUser.appId;
              });

              var pledge = false;
              if (list.length){
                pledge = list[0];
              }
    
              if (pledge){
                cancelTimeForm.showPledge(pledge);
              } else {
                cancelTimeForm.showError();
              }

            });
          });

          on(self.removeProxy, "click", function(e){
            dom.byId("removeProxyIdea").value = self.idea._id;
            xhr('/ideas/' + self.idea._id + '/pledges/money', {handleAs: 'json'}).then(function(list){
              list = array.filter(list, function(item){
                return item.creator === self.currentUser.appId;
              });

              var pledge = false;
              if (list.length){
                pledge = list[0];
              }
              
              if (pledge){
                removeProxyForm.showPledge(pledge);
              } else {
                removeProxyForm.showError();
              }

            });
          });

          on(self.doFeedback, "click", function(e){
         
            dom.byId("feedbackIdea").value = self.idea._id;
            xhr('/ideas/' + self.idea._id + '/users', {handleAs: 'json'}).then(function(list){
        
              list = array.filter(list, function(item){
                return item.appId !== self.currentUser.appId;
              });
  
              feedbackForm.showControls(list);

            });

          });
        }


    });

});