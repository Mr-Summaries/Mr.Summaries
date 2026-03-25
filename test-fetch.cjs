const https = require('https');
https.get('https://tikzjax-demo.think.somethingorotherwhatever.com/tikzjax.js', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("process_tikz found:", data.includes('process_tikz'));
  });
});
