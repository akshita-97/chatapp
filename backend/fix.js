const fs = require('fs');
let s = fs.readFileSync('D:/SDchatbox/backend/src/index.js','utf8');
s = s.replace(/"+\s*$/,'');
fs.writeFileSync('D:/SDchatbox/backend/src/index.js', s);
console.log(JSON.stringify(s.slice(-15)));