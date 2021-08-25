import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { DragulaModule } from 'ng2-dragula';
import { SharedModule } from '../shared/shared.module';
import { EditEntryComponent } from './components/edit-entry/edit-entry.component';
import { EntryListComponent } from './components/entry-list/entry-list.component';
import { LibraryComponent } from './components/library/library.component';
import { MetadataComponent } from './components/metadata/metadata.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { LibraryRoutingModule } from './library-routing.module';
import { reducers } from './store';
import { LibraryEffects } from './store/library.effects';
import { EntryComponent } from './components/entry/entry.component';
import { UiScrollModule } from 'ngx-ui-scroll';
@NgModule({
	imports: [
		CommonModule,
		SharedModule,
		LibraryRoutingModule,
		UiScrollModule,
		DragulaModule.forRoot(),
		StoreModule.forFeature('library', reducers),
		EffectsModule.forFeature([LibraryEffects])
	],
	exports: [
		EditEntryComponent,
		EntryListComponent,
		LibraryComponent,
		MetadataComponent,
		SearchResultsComponent,
	],
	declarations: [
		EditEntryComponent,
		EntryListComponent,
		LibraryComponent,
		MetadataComponent,
		SearchResultsComponent,
		EntryComponent,
	],
	providers: [
		NgbModal
	]
})
export class LibraryModule { }
