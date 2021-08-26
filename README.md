# Apollo

Electron and angular app to manage a local video collection with movie database search support.

Features:

- Searching and loading metadata from [MovieDB](https://themoviedb.org) using [themoviedb-javascript-library](https://github.com/cavestri/themoviedb-javascript-library).
- Sort and filter entries by metadata fields
- JavaScript only embedded persistent database
- Resizable and responsive interface with borderless mode

## Dependencies

- [Electron](https://github.com/electron/electron)
- [Angular](https://github.com/angular)
- [NGRX](https://github.com/ngrx)
- [NeDB](https://github.com/louischatriot/nedb)
- [Bootstrap](https://github.com/twbs/bootstrap)
- [ngx-electron](https://github.com/ThorstenHans/ngx-electron)
- [octicons](https://github.com/primer/octicons)

## Developing and Testing

```
npm install
npm start
```

## Building and Publishing

Setup [code signing certificate](https://www.electron.build/code-signing) and environment variables.

```powershell
New-SelfSignedCertificate -Type Custom -Subject "CN=<product-name>, O=<product-author>, C=AU" -KeyUsage DigitalSignature -FriendlyName "<product-name>" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
Export-PfxCertificate -cert Cert:\CurrentUser\My\<thumbprint> -FilePath <pfx-path> -Password (ConvertTo-SecureString -String <password> -Force -AsPlainText)
```

```
npm install
npm run package
```
