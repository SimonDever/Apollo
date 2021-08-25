import { AfterViewInit, Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { fadeInOut } from '../../../shared/animations/animations';
import { LibraryService } from '../../../shared/services/library.service';
import { NavigationService } from '../../../shared/services/navigation.service';
import * as fromLibrary from '../../store';
import { Entry } from '../../store/entry.model';
import * as LibraryActions from '../../store/library.actions';

@Component({
	selector: 'app-entry-list',
	templateUrl: './entry-list.component.html',
	styleUrls: ['./entry-list.component.css'],
	animations: [ fadeInOut ]
})
export class EntryListComponent implements OnInit, OnDestroy, AfterViewInit {

	config: any;
	config$: Observable<any>;
	entries$: Observable<Entry[]>;
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
			select(fromLibrary.getAllEntries),
			withLatestFrom(this.libraryService.sorting$),
			map(([entries, sorting]) => {
				console.debug('entries$ subscription - Sorting', sorting);
				const sortedEntries = this.libraryService.sortBy(entries, sorting);
				console.debug('entries$ subscription - Setting bookmarks');
				this.navigationService.setBookmarks(sortedEntries);
				return sortedEntries;
			})
		);

		/* 
		this.subs.add(
			this.libraryService.sortingSubject.asObservable().pipe(
				tap((v) => console.log('sorting sub, bv:',v)),
				withLatestFrom(this.store.pipe(select(fromLibrary.getAllEntries))),
				map(([sorting, entries]) => {
				this.entries = this.libraryService.sortBy(entries, sorting);
				this.navigationService.setBookmarks(this.entries);
				console.log('entry list get entries and sort - forkJoin - entries', entries, sorting);
			})).subscribe()
		);
		*/

		this.subs.add(this.store.pipe(
			select(fromLibrary.getNeedEntries),
			map(needEntries => {
				console.log('entryListComponent :: needEntries', needEntries);
				if (needEntries) {
					this.store.dispatch(new LibraryActions.Load());
				}
			})
		).subscribe());

		this.subs.add(this.store.pipe(
			select(fromLibrary.getSelectedEntry),
			map(selectedEntry => this.selectedEntry = selectedEntry)
		).subscribe());

		this.subs.add(this.store.pipe(
			select(fromLibrary.getSelectedEntryId),
			map(id => this.selectedEntryId = id)
		).subscribe());
	}

	ngAfterViewInit() {
		if (!this.config.tableFormat) {
			this.subs.add(this.navigationService.bookmark$.pipe(map((char: string) => {
				const entry = this.navigationService.getBookmark(char);
				if (entry) {
					document.querySelector(`#entry-${entry.id}`).scrollIntoView({ behavior: 'smooth' });
				} else {
					console.warn('Could not find any entry close to bookmark');
					window.scrollTo(0, 0);
				}
			})).subscribe());

			setTimeout(() => this.scrollToSelectedEntry());
		}
	}

	/* setPosterCache(entries: Entry[]): Entry[] {
		const start = Date.now();
		console.debug('entries$ subscription - Starting to preload images');
		entries.map(e => {
			const newPoster = new Image();
			newPoster.src = e.poster_path;
			this.posterCache.set(e.poster_path, newPoster);
		});
		console.debug('entries$ subscription - Finished preloading images', Date.now() - start + 'ms');
		return entries;
	} */

	scrollToSelectedEntry() {
		console.log('scrollToSelectedEntry', this.selectedEntryId, this.selectedEntry);
		if (this.selectedEntryId != null) {
			const box = document.querySelector(`#entry-${this.selectedEntryId}`);
			box.scrollIntoView({ behavior: 'smooth' });
		}
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
