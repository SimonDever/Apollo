import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxElectronModule } from 'ngx-electron';
import { MenuComponent } from './components/menu/menu.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { ToastComponent } from './components/toast/toast.component';
import { ContextMenuDirective } from './directives/context-menu.directive';
import { DivValueAccessorDirective } from './directives/div-value-accessor.directive';
import { OcticonDirective } from './directives/octicon.directive';
import { NgbCollapseModule } from './modules/ngb-collapse/ngb-collapse.module';
import { LibraryService } from './services/library.service';
import { NavigationService } from './services/navigation.service';
import { SearchService } from './services/search.service';
import { StorageService } from './services/storage.service';
import { ToastService } from './services/toast.service';
import { WindowRefService } from './services/window-ref.service';
import { OverrideCssVarDirective } from './directives/override-css-var.directive';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { reducers } from '../library/store';
import { LibraryEffects } from '../library/store/library.effects';


@NgModule({
	declarations: [
		MenuComponent,
		PageNotFoundComponent,
		ContextMenuDirective,
		DivValueAccessorDirective,
		OverrideCssVarDirective,
		OcticonDirective,
		ToastComponent
	],
	imports: [
		/* Third party */
		CommonModule,
		RouterModule,
		FormsModule,
		ReactiveFormsModule,
		NgbModule,
		NgxElectronModule,
		StoreModule.forFeature('library', reducers),
		EffectsModule.forFeature([LibraryEffects]),
		/* Custom */
		NgbCollapseModule
	],
	exports: [
		/* Third party */
		FormsModule,
		ReactiveFormsModule,
		NgbModule,
		NgxElectronModule,
		/* Custom */
		NgbCollapseModule,
		ContextMenuDirective,
		DivValueAccessorDirective,
		OverrideCssVarDirective,
		OcticonDirective,
		MenuComponent,
		PageNotFoundComponent,
		ToastComponent
	]
})
export class SharedModule {
	static forRoot(): ModuleWithProviders<SharedModule> {
		return {
			ngModule: SharedModule,
			providers: [
				NavigationService,
				SearchService,
				StorageService,
				ToastService,
				LibraryService,
				WindowRefService
			]
		};
	}
}
