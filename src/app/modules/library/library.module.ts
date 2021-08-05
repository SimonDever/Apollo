import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { DragulaModule } from 'ng2-dragula';
import { VirtualScrollerModule } from 'ngx-virtual-scroller';
import { SharedModule } from '../shared/shared.module';
import { EditEntryComponent } from './components/edit-entry/edit-entry.component';
import { EntryListComponent } from './components/entry-list/entry-list.component';
import { LibraryComponent } from './components/library/library.component';
import { MetadataComponent } from './components/metadata/metadata.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { LibraryRoutingModule } from './library-routing.module';
import { reducers } from './store';
import { LibraryEffects } from './store/library.effects';

@NgModule({
	imports: [
		CommonModule,
		SharedModule,
		VirtualScrollerModule,
		LibraryRoutingModule,
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
	],
	providers: [
		NgbModal
	]
})
export class LibraryModule { }
