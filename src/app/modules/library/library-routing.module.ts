import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditEntryComponent } from './components/edit-entry/edit-entry.component';
import { EntryListComponent } from './components/entry-list/entry-list.component';
import { LibraryComponent } from './components/library/library.component';
import { MetadataComponent } from './components/metadata/metadata.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';

const routes: Routes = [{
	path: '',
	data: { title: 'Library', shouldReuse: false },
	component: LibraryComponent,
	children: [
		{ path: '', data: { title: 'Entry List', shouldReuse: false }, component: EntryListComponent },
		{ path: 'edit', data: { title: 'Edit Entry', shouldReuse: false }, component: EditEntryComponent,
			children: [
				{ path: 'metadata',	data: { title: 'Metadata Search Results', shouldReuse: false },	component: MetadataComponent}
			]
		},
		{ path: 'search', data: { title: 'Search Results', shouldReuse: false }, component: SearchResultsComponent },
	]
}];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule]
})
export class LibraryRoutingModule { }

