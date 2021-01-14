# Node.jsでPassportによるOAuth2認証Googleログイン

https://github.com/hugodeblog/node-passport
で作ったPassportログイン認証のサンプルをGoogle OAuth2に対応させたサンプルである。

本サンプルではGoogle OAuth2をPassport上で扱うためにpassport-google-oauth20を利用している。

本リポジトリのサンプルを動かすにはGCP上でプロジェクトを作り、clientID、clientSecretを取得する必要がある。

その上で値をconfig/social.mjsに記述する必要がある。

```txt
export default
{
    "Google": {
        "clientID": "GCPで取得clientIDを入れる",
        "clientSecret": "GCPで取得clientSecretを入れる"
    }
}
```

## 実行手順

```txt
$ npm run start

> node-passport-google@0.0.0 start
> node ./app.mjs

Listening on port 3000
```

実際の動作状況は以下のようになる。
