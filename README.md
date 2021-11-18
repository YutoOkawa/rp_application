# rp_application

## Environment
WebBLE APIを利用する関係上、Google Chromeを利用してください。

また、成否の情報はコンソール上に出しているためデベロッパーツールを開いておいてください。

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```
## Caution
### CertErrorについて
FIDOServerに対してhttps通信をしますが、オレオレ証明書のためCertErrorが出ます。

証明書が信頼できないとアクセスができませんが、一度GoogleChromeで
```bash
https://localhost:3000
```
にアクセスしていただいて、画面上で
```bash
this is unsafe
```
と打つとアクセスできるようになります。

ローカル上で動かすための暫定処理になります。

(FIDOはhttps通信が必須とされているためその部分に準拠しています。)


## Registration
ページ上部のRegisterをクリックしてください。[直リンク](http://localhost:8080/register)

1. 接続ボタンをクリックします。
2. 付近にある認証器を検索するので、登録処理を行う認証器を選択します。
3. 接続完了後、IDを入力し(デフォルト:test)、チェックボックスから鍵に付与する属性を選択します。
4. ControlPointボタンをクリックすると登録処理を開始します。
5. コンソール上に成功可否が表示されます。
6. 切断ボタンをクリックすると認証器との接続を解除します。登録以外の処理を行う場合は必ず解除してください。

## authentication
ページ上部のAuthenticateをクリックしてください。[直リンク](http://localhost:8080/auth)

1. 接続ボタンをクリックします。
2. 付近にある認証器を検索するので、認証処理に行う認証器を選択します。
3. 接続完了後、IDとPolicyを入力します。(デフォルト:test, USER | PARENTS)
4. ControlPointボタンをクリックすると認証処理を開始します。
5. コンソール上に成功可否が表示されます。
    1. 認証時には正しく値が送信できないエラー(おそらくCBORエラー)があり、その場合はコンソール上にエラーが表示されるのでもう一度ControlPointボタンをクリックしてください。
    2. エラーの内容は"UnexpectedDataError", "Uncaught Error"などです。
6. 切断ボタンをクリックすると認証器との接続を解除します。認証以外の処理を行う場合は必ず解除してください。

## delegated Register
ページ上部のDelegated Registerをクリックしてください。[直リンク](http://localhost:8080/delegated)

1. 接続ボタンをクリックします。
2. 付近にある認証器を検索するので、利用登録済みの代理人申請を行うユーザの認証器を選択します。
3. 接続完了後、代理人申請を行うユーザのID(username)、代理人として登録するユーザのID(delegated username)、代理登録する属性を選択します。
4. ControlPointボタンをクリックすると代理登録処理を開始します。
5. 代理人申請を行うユーザの署名が正しく送信されれば、接続ダイアログが出るので、代理人属性を登録する認証器を接続します。
6. 接続後、コンソールに成功可否が表示されます。
7. 接続ボタンをクリックすると認証器との接続を解除します。代理登録以外の処理を行う場合は必ず解除してください。