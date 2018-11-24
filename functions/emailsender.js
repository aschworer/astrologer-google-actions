const sendgridemail = require('@sendgrid/mail');
let PropertiesReader = require('properties-reader');
let properties = PropertiesReader('servicekeys.file');
const sendgrid_key = properties.get('sendrid.api.key');
sendgridemail.setApiKey(sendgrid_key);
module.exports = {
    sendEmail: function (to, subj, text) {
        sendgridemail.send({
            to: to,
            from: 'info@astrologersdesk.com',
            subject: subj,
            text: text
        }).then((response) => {
            // console.log(response);
            console.log('email sent');
        }).catch(function (error) {
            console.error('error: ', error);
        });
    }
};