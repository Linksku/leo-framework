import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

import apiRoutes from 'routes/apiRoutes';
import sseRoute from 'routes/sseRoute';
import { HOME_URL, USE_SSL } from 'settings';

import 'services/knex';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: HOME_URL,
  optionsSuccessStatus: 200,
}));
app.disable('x-powered-by');

app.use('/api', apiRoutes);
app.use('/sse', sseRoute);

if (process.env.SERVER !== 'production') {
  app.use(express.static(
    path.resolve('./build/web'),
    { dotfiles: 'allow', redirect: false, index: false },
  ));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve('./build/web/index.html'));
  });
} else {
  app.all('*', (req, res, next) => {
    if (req.secure || !USE_SSL) {
      next();
    } else {
      res.redirect(`https://${req.hostname}${req.url}`);
    }
  });

  app.use(express.static(
    path.resolve('../web'),
    { dotfiles: 'allow', redirect: false, index: false },
  ));

  const indexFile = fs.readFileSync(path.resolve('../web/index.html')).toString();
  app.get('*', async (req, res) => {
    res.send(indexFile);
    res.end();
  });
}

export default app;
