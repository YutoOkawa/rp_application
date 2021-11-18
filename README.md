# rp_application

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

