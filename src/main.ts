import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
const log = window.require('electron-log');

if (environment.production) {
	enableProdMode();
}

Object.assign(window.console, log.functions);

platformBrowserDynamic().bootstrapModule(AppModule);
