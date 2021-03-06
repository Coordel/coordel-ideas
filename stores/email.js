var settings = require('../config/settings').settings("settings", "./config")
  , sendgridOpts = settings.config.sendgridOptions;


var path           = require('path')
  , templatesDir   = path.resolve(__dirname, '..', 'templates')
  , emailTemplates = require('email-templates')
  , nodemailer     = require('nodemailer');

var email = {

  send: function(templateName, locals){
    locals.coordelUrl = settings.coordelUrl;
    emailTemplates(templatesDir, function(err, template) {

      /*
      locals = {
        from: {
          fullName: "Full Name",
          email: "name@email.com",
          username: "username"
        },
        to: {
          fullName: "Full Name",
          email: "some@email.com",
          username: "username1"
        },
        subject: "Check out this idea at Coordel"
      }
      */

      // ## Send a single email
      var transport = nodemailer.createTransport("SMTP", {
        service: "Sendgrid", // sets automatically host, port and connection security settings
        auth: {
            user: sendgridOpts.username,
            pass: sendgridOpts.password
        }
      });

      // Send a single email
      template(templateName, locals, function(err, html, text) {
        if (err) {
          console.log("error sending template" , err);
        } else {
          transport.sendMail({
            from: locals.from.fullName + '<' + locals.from.email + '>',
            to: locals.to.fullName + '<' + locals.to.email + '>',
            subject: locals.subject,
            html: html,
            generateTextFromHTML: true
          }, function(err, responseStatus) {
            if (err) {
              console.log(err);
            } else {
              console.log(responseStatus.message);
            }
          });
        }
      });
    });
  }
};

exports.Store = email;