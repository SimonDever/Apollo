import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { PageNotFoundComponent } from './modules/shared/components/page-not-found/page-not-found.component';

const routes: Routes = [{
	path: 'library',
	loadChildren: () => import('../app/modules/library/library.module').then(m => m.LibraryModule),
	data: { shouldReuse: false }
}, {
	path: 'settings',
	loadChildren: () => import('../app/modules/settings/settings.module').then(m => m.SettingsModule),
	data: { shouldReuse: false }
}, {
	path: '',
	redirectTo: '/library',
	pathMatch: 'full'
}, {
	path: '**',
	component: PageNotFoundComponent
}];

@NgModule({
	imports: [RouterModule.forRoot(routes, {
		useHash: true,
		preloadingStrategy: PreloadAllModules,
		enableTracing: false
	})],
	/* providers: [{ provide: RouteReuseStrategy, useClass: CustomRouteReuseStategy }], */
	exports: [RouterModule]
})
export class AppRoutingModule { }
