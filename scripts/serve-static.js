const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

app.use('/', express.static(path.resolve('./build/web')));

app.get('*', (req, res) => {
  res.send(fs.readFileSync(path.resolve('./build/web/index.html')).toString());
  res.end();
});

app.listen(6969, () => console.log('Server started'));
