import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { fadeInOut } from '../../../shared/animations/animations';
import { LibraryService } from '../../../shared/services/library.service';
import { NavigationService } from '../../../shared/services/navigation.service';
import { Entry } from '../../store/entry.model';
import * as fromLibrary from '../../store/index';

@Component({
	selector: 'app-search-results',
	templateUrl: './search-results.component.html',
	styleUrls: ['./search-results.component.css'],
	animations: [ fadeInOut ]
})
export class SearchResultsComponent implements OnInit, OnDestroy {

	config: any;
	config$: Observable<any>;
	entries$: Observable<Entry[]>;
	searchTerms: string;
	selectedEntry: Entry;
	selectedEntryId: string;
	subs: Subscription;

	constructor(
		private libraryService: LibraryService,
		private navigationService: NavigationService,
		private store: Store<fromLibrary.LibraryState>,
	) {}

	ngOnInit() {
		this.subs = this.store.pipe(select(fromLibrary.getConfig),
			map(config => this.config = config)).subscribe();

		this.entries$ = this.store.pipe(
			select(fromLibrary.getSearchResults),
			withLatestFrom(this.libraryService.sorting$),
			map(([entries, sorting]) => {
				console.debug('entries$ subscription - Sorting', sorting);
				const sortedEntries = this.libraryService.sortBy(entries.slice(), sorting);
				return sortedEntries;
			})
		);

		this.subs.add(this.store.pipe(
			select(fromLibrary.getSearchTerms),
			map(searchTerms => this.searchTerms = searchTerms.replace(':', ': '))
		).subscribe());

		this.subs.add(this.store.pipe(
			select(fromLibrary.getSelectedEntryId),
			map(id => this.selectedEntryId = id)
		).subscribe());
	}

	close() {
		this.navigationService.closeSearchResults();
	}

	closeDeleteModal(event: Event, reason: string) {
		this.libraryService.closeDeleteModal(event, reason);
	}

	ngOnDestroy() {
		this.subs ?	this.subs.unsubscribe() : {};
	}

	showDeleteConfirmation(event: Event, content: TemplateRef<any>, entry: any) {
		this.libraryService.showDeleteConfirmation(event, content, entry);
	}

	edit(event: Event, entry: any) {
		this.libraryService.edit(event, entry);
	}

	toggleActions(event: Event, entry: Entry) {
		this.libraryService.toggleActions(event, entry);
	}
	
	play(event: Event, entry: Entry) {
		this.libraryService.play(event, entry);
	}

	trackById(index, item) {
		return item.id;
	}

	trash() {
		this.libraryService.trash();
	}

	getPosterSrc(entry: Entry) {
		return this.libraryService.getPosterSrc(entry);
	}
}
