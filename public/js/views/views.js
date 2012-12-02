var IdeaView = Backbone.View.extend({
    tagName: 'li',

    initialize: function(options) {
        _.bindAll(this, 'render');
        this.model.bind('all', this.render);
    },

    render: function() {
        $(this.el).html(this.model.get("name") + ": " + this.model.get("text"));
        return this;
    }
});

var MiniProfileView = Backbone.View.extend({

  el: $('#profile-container'),

  initialize: function (options) {
     _.bindAll(this, 'render');
     this.render();
  },

  events: {

  },

  render: function () {
    // "ich" is ICanHaz.js magic
    $(this.el).append(ich.profile(this.model.toJSON()));
    return this;
  }

});

var AppIdeasView = Backbone.View.extend({
    el: $('#ideas-container'),

    initialize: function(options) {
        /*
        this.model.chats.bind('add', this.addChat);
        this.socket = options.socket;
        this.clientCountView = new ClientCountView({model: new models.ClientCountModel(), el: $('#client_count')});
        */
        _.bindAll(this, 'render');
        this.render();
    }

    , events: {
        
    }
    /*
    , addChat: function(chat) {
        var view = new ChatView({model: chat});
        $('#chat_list').append(view.render().el);
    }


    , msgReceived: function(message){
        switch(message.event) {
            case 'initial':
                this.model.mport(message.data);
                break;
            case 'chat':
                var newChatEntry = new models.ChatEntry();
                newChatEntry.mport(message.data);
                this.model.chats.add(newChatEntry);
                break;
            case 'update':
                this.clientCountView.model.updateClients(message.clients);
                break;
        }
    }

    , sendMessage: function(){
        var inputField = $('input[name=message]');
        var nameField = $('input[name=user_name]');
        var chatEntry = new models.ChatEntry({name: nameField.val(), text: inputField.val()});
        this.socket.send(chatEntry.xport());
        inputField.val('');
    }
    */

    , render: function () {
        // "ich" is ICanHaz.js magic
        console.log('loading ideasContainer', ich.ideasContainer, this.model);
        $(this.el).append(ich.ideasContainer(this.model.toJSON()));
        return this;
    }

});