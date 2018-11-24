const sendgridemail = require('@sendgrid/mail');
const MY_SENDGRID_API_KEY = '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';
sendgridemail.setApiKey(MY_SENDGRID_API_KEY);
module.exports = {
    sendEmail: function (to, subj, text) {
        sendgridemail.send({
            to: to,
            from: 'info@natalcharts.com',
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