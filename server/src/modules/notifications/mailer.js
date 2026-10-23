const nodemailer = require('nodemailer');
const { smtp } = require('../../config/env');

let transport;

function getTransport() {
  if (!transport) {
    // without SMTP settings (dev, demo) mails are rendered to JSON instead of sent
    transport = smtp.host
      ? nodemailer.createTransport({ host: smtp.host, port: smtp.port, auth: { user: smtp.user, pass: smtp.pass } })
      : nodemailer.createTransport({ jsonTransport: true });
  }
  return transport;
}

function sendMail({ to, subject, text }) {
  return getTransport().sendMail({ from: smtp.from, to, subject, text });
}

// tests swap in a fake transport
function setTransport(t) {
  transport = t;
}

module.exports = { sendMail, setTransport };
