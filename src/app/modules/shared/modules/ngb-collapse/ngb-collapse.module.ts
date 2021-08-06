import { NgModule, ModuleWithProviders } from '@angular/core';
import { NGB_COLLAPSE_DIRECTIVES } from './ngb-collapse.directive';

@NgModule({
	declarations: NGB_COLLAPSE_DIRECTIVES,
	exports: NGB_COLLAPSE_DIRECTIVES
})
export class NgbCollapseModule {
	static forRoot(): ModuleWithProviders<NgbCollapseModule> {
		return {
			ngModule: NgbCollapseModule,
			providers: []
		};
	}
}
