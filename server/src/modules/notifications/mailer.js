const nodemailer = require('nodemailer');
const { smtp } = require('../../config/env');

let transport;

function getTransport() {
  if (!transport) {
    // Without SMTP settings (dev, demo) mails are rendered to JSON instead of sent.
    transport = smtp.host
      ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      })
      : nodemailer.createTransport({ jsonTransport: true });
  }
  return transport;
}

function sendMail({ to, subject, text }) {
  return getTransport().sendMail({ from: smtp.from, to, subject, text });
}

// Lets tests swap in a fake transport.
function setTransport(t) {
  transport = t;
}

module.exports = { sendMail, setTransport };
