import path from 'path';
import util from 'util';
import { default as express } from 'express';
import { default as passport } from 'passport';
import { default as passportLocal } from 'passport-local';
const LocalStrategy = passportLocal.Strategy;

import passportGoogle from 'passport-google-oauth20';
const GoogleStrategy = passportGoogle.Strategy;

import { default as config } from '../config/social.mjs';

import { sessionCookieName } from '../app.mjs';

export const router = express.Router();

export function initPassport(app) {
  app.use(passport.initialize());
  app.use(passport.session());
}

// テスト用のユーザーを作成
var userList = [
  {id: 0, provider: 'original', plid: 0, username: 'me', password: '&&&me123', accessToken: '', refreshToken:''},
  {id: 1, provider: 'original', plid: 1, username: 'you', password: '***you123', accessToken:'', refreshToken:''},
];

// 該当ユーザーパスワードチェック
// ローカルのサイトで作ったユーザーのみ
function passCheckUser(username, password) {
  for(let person of userList) {
    if(person.username === username && person.password === password)
    return { id: person.id, username: person.username };
  }
  return undefined;
}

// 該当ユーザー名がいるかチェックする
function findLocalUser(username) {
  for(let person of userList) {
    if(person.username === username)
    return { id: person.id, username: person.username };
  }
  return undefined
}

// ローカルで作成したユーザー追加
function addLocalUser(username, password) {

  // 同じユーザー名追加は失敗する
  if(findLocalUser(username)) {
    return undefined;
  }
  else {
    userList.push({
      id: userList.length, // idは連番でつけていく
      provider: 'original', // ローカルで作成したユーザーの場合はoriginal、Googleの場合はgoogle
      plid: userList.length, // platform idはローカルの場合はidと同じ
      username: username, // ローカルで作成したユーザーにはユーザー名（GoogleアカウントならdisplayNameを保存）
      password: password, // ローカルで作成したユーザーにはパスワードあり
      accessToken:'', // ローカルで作成したユーザーはaccessTokenなし
      refreshToken:'' // ローカルで作成したユーザーはrefreshTokenなし
    });
    return findLocalUser(username);
  }
}

// Providerの該当ユーザーがいるかチェックする
function findProviderUser(platform, plid, username, accessToken, refreshToken) {

  console.log('findProviderUser called with following params');
  console.log(platform, plid, username, accessToken, refreshToken);

  for(var i=0; i<userList.length; i++) {
    if(userList[i].provider === platform && userList[i].plid == plid)
    {
      // displayName、accessToken, refreshTokenが更新されているかチェック
      if(userList[i].username !== username)
      userList[i].username = username;

      if(userList[i].accessToken !== accessToken)
      userList[i].accessToken = accessToken;

      if(userList[i].refreshToken !== refreshToken)
      userList[i].refreshToken = refreshToken;

      return { id: userList[i].id, username: userList[i].username };
    }
  }
  return undefined;
}


// ログイン、サインアップ用ストラテジー
passport.use(new LocalStrategy({
  passReqToCallback: true
  },
  async (req, username, password, done) => {
    console.log(req.session);
    console.log(`username = ${username}, passowrd = ${password}`);
    try {
      // ログインの処理
      if(req.session.state === 'login') {
        // そもそも登録済みユーザー？
        if(!findLocalUser(username)) {
          req.session.notice = '登録されていないユーザー名です';
          return done(null, false);
        }
        // パスワードが一致するか？
        const result = passCheckUser(username, password);
        console.log(`result=${result}`);
        if (result != undefined) {
          return done(null, { id: result.id, username: result.username});
        } else {
          req.session.notice = 'パスワードが間違っています';
          return done(null, false);
        }
      }
      // サインアップ処理
      else if(req.session.state === 'signup') {
        // 同じ名前なら失敗
        if(findLocalUser(username)) {
          req.session.notice = '同じユーザー名が存在します';
          return done(null, false);
        }
        else {
          const result = addLocalUser(username, password);
          console.log(`result=${result}`);
          if (result != undefined) {
            return done(null, { id: result.id, username: result.username});
          }
          else {
            req.session.notice = 'ユーザー作成に失敗しました';
            return done(null, false);
          }
        }
      }
      else {
        req.session.notice = '定義されていない処理です';
        return done(null, false);
      }
    } catch (e) { done(e); }
  }
));


// Googleログインサインアップ用ストラテジー
passport.use(new GoogleStrategy({
    clientID: config.Google.clientID,
    clientSecret: config.Google.clientSecret,
    callbackURL: "/users/auth/google/callback",
    passReqToCallback: true
  },
  (req, accessToken, refreshToken, profile, done) => {
    console.log(`req.query.state=${req.query.state}`);
    try {
      // ログインの場合
      if(req.query.state === 'login')
      {
        console.log(`accessToken = ${accessToken}`);
        console.log(`refreshToken = ${refreshToken}`);
        console.log(`profile = ${util.inspect(profile)}`);
        var result = findProviderUser(
          'google',
          profile.id,
          profile.displayName,
          accessToken,
          refreshToken
        );
        // 既存ユーザー
        if (result != undefined) {
          console.log({ id: result.id, username: result.username});
          return done(null,  { id: result.id, username: result.username});
        }
        else // 未登録ユーザー
        {
          req.session.notice = 'Googleユーザーが見つかりません';
          return done(null, false);
        }
      }
      // サインアップの場合
      else if (req.query.state === 'signup') {
        console.log(`accessToken = ${accessToken}`);
        console.log(`refreshToken = ${refreshToken}`);
        console.log(`profile = ${util.inspect(profile)}`);
        var result = findProviderUser(
          'google',
          profile.id,
          profile.displayName,
          accessToken,
          refreshToken
        );
        // 既存ユーザー
        if (result != undefined) {
          req.session.notice = 'すでに登録済みGoogleユーザーです';
          return done(null, false);
        }
        userList.push({
          id: userList.length,
          provider: 'google',
          plid: profile.id,
          username: profile.displayName,
          password: '',
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken
        });
        console.log(userList);
        result = findProviderUser(
          'google',
          profile.id,
          profile.displayName,
          accessToken,
          refreshToken
        );
        console.log('新規ユーザー');
        console.log({ id: result.id, username: result.username});
        return done(null,  { id: result.id, username: result.username });
      }
      // ここに来るはおかしい
      else {
        req.session.notice = '想定していない動作です';
        console.log('想定外のフロー');
        return done(null, false);
      }
    } catch(err) { console.log(err); done(err); }
  }
));

passport.serializeUser(function(user, done) {
  console.log(`serialized user=${user}`);
  try {
    done(null, user);
  } catch (e) { done(e); }
});

passport.deserializeUser(async (user, done) => {
  console.log(`deserialized user=${user}`);
  try {
    done(null, user);
  } catch(e) { done(e); }
});


// ログインを試す
router.get('/login/google', function(req, res, next){

  // ログイン前に前のセッションを削除する
  req.session.destroy();
  req.logout();
  res.clearCookie(sessionCookieName);

  passport.authenticate('google', {
    scope: ["profile", "email"],
    accessType: 'offline',
    prompt: 'consent',
    state: 'login'
  })(req, res, next);
});

// サインアップを試す
router.get('/signup/google', function(req, res, next){

  // サインアップ前に前のセッションを削除する
  req.session.destroy();
  req.logout();
  res.clearCookie(sessionCookieName);

  passport.authenticate('google', {
    scope: ["profile", "email"],
    accessType: 'offline',
    prompt: 'consent',
    state: 'signup'
  })(req, res, next);
});

// 成功時のログイン先
router.get('/auth/google/callback',passport.authenticate("google", {
  failureRedirect: '/users/login-failure'}),
  // Passport認証成功時は以下の処理
  function(req,res){
    if(req.query.state === 'login') {
      console.log('ログイン成功');
      res.redirect('/');
    }
    else if(req.query.state === 'signup') {
      console.log('サインアップ成功');
      res.redirect('/users/signup-success');
    }
    else {
      console.log('想定外の動作です');
      res.redirect('/');
    }
});


// 認証ログイン画面
router.get('/login', function(req, res, next) {
  try {
    res.render('login', {title: 'ログイン', user: req.user ? req.user : undefined});
  } catch (e) { next(e); }
});


// ローカルサイトアカウントでのログイン
router.post('/login', function(req, res, next) {
  req.session.state = 'login';
  passport.authenticate('local', {
    successRedirect: '/', // ログイン成功時
    failureRedirect: 'login-failure', // ログイン失敗時
  })(req, res, next);
});

// ローカルサイトアカウントでのサインアップ
router.post('/signup', function(req, res, next) {
  req.session.state = 'signup';
  passport.authenticate('local', {
    successRedirect: 'signup-success', // サインアップ成功時
    failureRedirect: 'signup-failure', // サインアップ失敗時
  })(req, res, next);
});


// ログイン失敗
router.get('/login-failure', function(req, res, next) {
  try {
    res.render('login-failure', {message: req.session.notice ? req.session.notice : undefined});
    req.session.notice = '';
  } catch (e) { next(e); }
});

// サインアップページ
router.get('/signup', function(req, res, next) {
  try {
    res.render('signup', {title: 'サインアップ', user: req.user ? req.user : undefined});
  } catch (e) { next(e); }
});

// サインアップ成功
router.get('/signup-success', function(req, res, next) {
  try {
    res.render('signup-success');
  } catch (e) { next(e); }
});

// サインアップ失敗
router.get('/signup-failure', function(req, res, next) {
  try {
    res.render('signup-failure', {message: req.session.notice ? req.session.notice : undefined});
    req.session.notice = '';
  } catch (e) { next(e); }
});

// 認証キャッシュを削除する
router.get('/logout', function(req, res, next) {
  try {
    req.session.destroy();
    req.logout();
    res.clearCookie(sessionCookieName);
    res.redirect('login');
  } catch (e) { next(e); }
});
