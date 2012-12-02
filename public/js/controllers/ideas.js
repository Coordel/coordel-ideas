var IdeasController = {
    init: function(args) {
        console.log("Controller init", args);
        this.model = new models.AppIdeasModel();

        //set the incoming data
        this.model.user.set(args.user);

        //this.model.ideas.refresh(args.ideas);


        this.profileView = new MiniProfileView({model: this.model.user});


        /*

        get nav

        get mini profile

        get ideas



        */

        /*
        this.socket = new io.Socket(null, {port: 8000});
        var mysocket = this.socket;

        
        this.view = new AppIdeasView({model: this.model, socket: this.socket, el: $('#content')});
        var view = this.view;

        this.socket.on('message', function(msg) {view.msgReceived(msg);});
        this.socket.connect();

        this.view.render();

        return this;
        */
    }
};
