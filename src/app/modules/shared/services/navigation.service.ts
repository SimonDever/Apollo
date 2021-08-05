import { Location } from '@angular/common';
import { Injectable, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppComponent } from '../../../app.component';
import { EditEntryComponent } from '../../library/components/edit-entry/edit-entry.component';

import * as fromLibrary from '../../library/store';
import { select, Store } from '@ngrx/store';
import { FormBuilder } from '@angular/forms';
import { Subscription ,  Observable ,  of, Subject } from 'rxjs';
import { Entry } from '../../library/store/entry.model';

@Injectable({
	providedIn: 'root'
})
export class NavigationService {

	viewEntryParent: string;
	searchResultsParent: string;
	addEntryParent: string;
	editEntryParent: string;
	metadataParent: string;
	bookmarks: Map<string, Entry> = new Map();
	bookmarkSubject = new Subject();
	bookmark$ = this.bookmarkSubject.asObservable();

	constructor(private router: Router,
		private location: Location,
		private zone: NgZone,
		private formBuilder: FormBuilder,
		private store: Store<fromLibrary.State>,
		private activatedRoute: ActivatedRoute) {	}

	setViewEntryParent(viewEntryParent: string) {
		this.viewEntryParent = viewEntryParent;
	}

	setSearchResultsParent(searchResultsParent: string) {
		this.searchResultsParent = searchResultsParent;
	}

	setAddEntryParent(addEntryParent: string) {
		this.addEntryParent = addEntryParent;
	}

	setEditEntryParent(editEntryParent: string) {
		this.editEntryParent = editEntryParent;
	}

	setMetadataParent(metadataParent: string) {
		this.metadataParent = metadataParent;
	}

	closeEditEntry(id) {
		this.router.navigate(['/library']);
	}

	closeMetadata() {
		/* if (this.metadataParent != null) {
			this.zone.run(() => this.router.navigate([this.metadataParent]));
		} else {
			console.error('closeViewEntry() - editEntryParent is null. Rerouting to /library'); */
			this.zone.run(() => this.router.navigate(['/library']));
		/* } */
	}

	closeViewEntry() {
		if (this.viewEntryParent != null) {
			this.zone.run(() => this.router.navigate([this.viewEntryParent]));
			// clear viewEntryParent?
		} else {
			// console.error('closeViewEntry() - viewEntryParent is null. Rerouting to /library');
			this.zone.run(() => this.router.navigate(['/library']));
		}
	}

	closeSearchResults() {
		if (this.searchResultsParent != null) {
			this.zone.run(() => this.router.navigate([this.searchResultsParent]));
			// clear searchResultsParent?
		} else {
			// console.error('closeSearchResults() - searchResultsParent is null. Rerouting to /library');
			this.zone.run(() => this.router.navigate(['/library']));
		}
	}

	closeAddEntry() {
		if (this.addEntryParent != null) {
			this.zone.run(() => this.router.navigate([this.addEntryParent]));
			// clear addEntryParent?
		} else {
			// console.error('closeAddEntry() - addEntryParent is null. Rerouting to /library');
			this.zone.run(() => this.router.navigate(['/library']));
		}
	}

	goBack() {
		this.location.back();
	}

	gotoBookmark(char) {
		this.bookmarkSubject.next(char);
	}

	getBookmark(char: string): Entry {
		console.debug(`getBookmark(${char})`);
		let entry = this.bookmarks.get(char);
		if (!entry) {
			entry = this.getNextBookmark(char);
		}
		console.debug(`getBookmark(${char}) - entry:`, entry);
		return entry;
	}

	getNextBookmark(char: string): Entry {
		const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		let index = alphabet.indexOf(char);
		let entry;
		while (!entry && index < alphabet.length) {
			const nextChar = alphabet.charAt(index);
			entry = this.bookmarks.get(nextChar);
			console.debug(`getNextBookmark(${char}) - trying ${nextChar}) - entry:`, entry);
			index++;
		}
		if (!entry) {
			console.warn(`No bookmark entry found for ${char}.`);
		}
		return entry;
	}

	setBookmarks(data: Entry[]) {
		const charArray = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
		let start = 0;
		const end = data.length;
		for (const char of charArray) {
			for (let i = start; i < data.length; i++) {
				const isBookmark =
					(char === '#' && data[i].title && data[i].title && /(^\d)/.test(data[i].title)) ||
					(data[i].title && data[i].title.startsWith(char));

				if (isBookmark) {
					this.bookmarks.set(char, data[i]);
					console.debug(`setting bookmark, char: ${char}, item: ${data[i].title}`);
					start = i;
					i = data.length; // break inner for
				}
			}
		}

		console.debug(`setBookmarks(data)`, this.bookmarks);
	}
}
