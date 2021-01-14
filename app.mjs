import { default as express } from 'express';
import { default as hbs } from'hbs';
import * as path from'path';
import { default as logger } from'morgan';
import { default as cookieParser } from'cookie-parser';
import { default as bodyParser } from'body-parser';
import * as http from 'http';
import { approotdir } from './approotdir.mjs';
const __dirname = approotdir;
import {
    normalizePort, onError, onListening, handle404, basicErrorHandler
} from './appsupport.mjs';

import { router as indexRouter } from './routes/index.mjs';
import { router as usersRouter } from './routes/users.mjs';

export const app = express();

// Viewセットアップ
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerPartials(path.join(__dirname, 'partials'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// セッション設定
import session from 'express-session';
import sessionFileStore from 'session-file-store';
import { initPassport } from './routes/users.mjs';

const FileStore = sessionFileStore(session);
export const sessionCookieName = 'mycookie.sid';
const sessionSecret = 'keyboard hogehoge';
const sessionStore  = new FileStore({ path: "sessions" });

app.use(session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: sessionCookieName,
    cookie: {maxAge: 60*60*1000*24*7, secure: false}
}));
initPassport(app);

// ルーティング
app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(handle404);
app.use(basicErrorHandler);

export const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

export const server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
