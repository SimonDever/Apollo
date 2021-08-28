import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConfigService } from './modules/shared/services/config.service';
import { SharedModule } from './modules/shared/shared.module';
import { NgCacheRouteReuseModule } from 'ng-cache-route-reuse';

@NgModule({
	declarations: [
		AppComponent,
	],
	imports: [
		CommonModule,
		BrowserModule,
		BrowserAnimationsModule,
		HttpClientModule,
		SharedModule.forRoot(),
		AppRoutingModule,
		NgCacheRouteReuseModule,
		StoreModule.forRoot({}),
		EffectsModule.forRoot([]),
		StoreDevtoolsModule.instrument({
			maxAge: 50
		})
	],
	providers: [
		{
			provide: APP_INITIALIZER, deps: [ConfigService], multi: true,
			useFactory: (configService: ConfigService) => () => configService.load()
		}
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
