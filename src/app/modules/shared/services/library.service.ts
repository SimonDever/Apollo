import { Location } from '@angular/common';
import { Injectable, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as fromLibrary from '../../library/store';
import * as LibraryActions from '../../library/store/library.actions';
import { Store, select } from '@ngrx/store';
import { StorageService } from './storage.service';
import { ElectronService } from 'ngx-electron';
import { NavigationService } from './navigation.service';
import { take, map } from 'rxjs/operators';
import { Entry } from '../../library/store/entry.model';
import { Subject } from 'rxjs';

const uuid = require('uuid/v4');

@Injectable({
	providedIn: 'root',
})
export class LibraryService {
	selectedEntryId: any;
	userDataFolder: string;
	fs: any;
	entries;
	entries$;

	// Regular expression for image type:
	// This regular image extracts the "jpeg" from "image/jpeg"
	imageTypeRegularExpression = /\/(.*?)$/;

	sortingSubject = new Subject<{ field: string; direction: string }>();
	sorting$ = this.sortingSubject.asObservable();

	constructor(
		private router: Router,
		private location: Location,
		private zone: NgZone,
		private navigationService: NavigationService,
		private electronService: ElectronService,
		private storageService: StorageService,
		private store: Store<fromLibrary.State>,
		private activatedRoute: ActivatedRoute
	) {
		this.userDataFolder = this.electronService.remote.app.getPath('userData');
		this.fs = this.electronService.remote.require('fs');
		this.entries$ = this.store
			.pipe(
				select(fromLibrary.getAllEntries),
				map((entries: Array<Entry>) => {
					this.entries = entries;
				})
			)
			.subscribe();
	}

	setSelectedEntryId(id: any) {
		this.selectedEntryId = id;
	}

	getSelectedEntryId() {
		return this.selectedEntryId;
	}

	convertDataUri(entry: any) {
		const imageBuffer = this.decodeBase64Image(entry.poster_path);
		const imageTypeDetected = imageBuffer.type.match(
			this.imageTypeRegularExpression
		);
		const ext = imageTypeDetected[1];
		const path = `${this.userDataFolder}\\posters\\${uuid()}.${ext}`;
		entry.poster_path = path;
		this.writeImage(imageBuffer.data, path);
	}

	touch(event: Event, entry: any) {
		if (!entry.touched) {
			console.log('saving touch');
			entry.touched = true;
			this.saveEntry(entry);
			console.log('touch saved');
		} else {
			console.log('touch ignored');
		}
	}

	triggerSort(sorting: {field: string, direction: string}) {
		this.sortingSubject.next(sorting);
	}

	sortBy(entries: Entry[], sorting: { field: string; direction: string }) {
		console.log(`sorting by ${sorting.field}, ${sorting.direction}`);
		return entries.sort((a, b) => {
			let first, second;

			if (sorting.field === 'year') {
				if (a.year) {
					first = a.year;
				} else if (a.release_date) {
					first = (new Date(a.release_date)).getFullYear();
				}

				if (b.year) {
					second = b.year;
				} else if (b.release_date) {
					second = (new Date(b.release_date)).getFullYear();
				}

				console.log(`sorting first: ${first}, second: ${second}`);

				if (sorting.direction === 'asc') {
					if (first < second) {
						return -1;
					} else if (first === second) {
						return 0;
					} else {
						return 1;
					}
				} else {
					if (first < second) {
						return 1;
					} else if (first === second) {
						return 0;
					} else {
						return -1;
					}
				}

				/* 
				if (sorting.direction === 'asc' && first) {
					return second ? first > second : -1;
				} else if (second) {
					return first ? second > first : 1;
				}
				*/
			} else {
				first = a[sorting.field];
				second = b[sorting.field];
				if (sorting.direction === 'asc' && first) {
					return second ? first.localeCompare(second) : -1;
				} else if (second) {
					return first ? second.localeCompare(first) : 1;
				}
			}
		});
	}

	savePoster(entry: any) {
		console.log(
			'libraryService :: savePoster :: entry.poster_path',
			entry.poster_path
		);
		if (entry.poster_path) {
			if (entry.poster_path.startsWith('data:image')) {
				this.convertDataUri(entry);
			} else if (entry.poster_path.startsWith(this.userDataFolder)) {
				// image already saved locally
			} else if (entry.poster_path.startsWith('/')) {
				this.convertUrlPath(entry);
			}
		} else {
			// no image in entry
		}
	}

	createImageFile(data, path) {
		const reader = new FileReader();
		reader.addEventListener(
			'load',
			function () {
				const imageBuffer = this.decodeBase64Image(reader.result);
				this.writeImage(imageBuffer.data, path);
			}.bind(this),
			false
		);
		reader.readAsDataURL(data);
	}

	convertUrlPath(entry: any) {
		console.log('libraryService :: convertUrlPath :: entry');
		if (entry.poster_path) {
			const url = `http://image.tmdb.org/t/p/original${entry.poster_path}`;
			const filename = entry.poster_path.substring(1);
			const path = `${this.userDataFolder}\\posters\\${filename}`;
			entry.poster_path = path;
			fetch(url).then(
				((response) =>
					response
						.blob()
						.then((data) => this.createImageFile(data, path))).bind(this)
			);
		} else {
			console.log(
				'no poster_path field on entry found during request to convert'
			);
		}
	}

	saveEntry(entry: any) {
		this.savePoster(entry);
		this.store.dispatch(new LibraryActions.UpdateEntry({ entry: entry }));
	}

	createEntry(file) {
		console.log('libraryService :: createEntry :: entry');
		const tempTitle = file.name
			.replace(/\.[^/.]+$/, '')
			.replace(/\(\d{4}\)/, '')
			.split('-')[0]
			.trim();

		const entries = this.entries.filter((entry) => {
			const exists = file.path === entry.file;
			console.log(
				`libraryService :: createEntry :: file.path (${file.path}) === entry.file (${entry.file}): ${exists}`
			);
			return exists;
		});

		console.log(
			'libraryService :: createEntry :: entries.length',
			entries.length
		);

		const message = `Confirm adding possible duplicate with file
			path: ${file.path}. Existing titles: ${entries.map((e) => e.title).join(', ')};
			files: ${entries.map((e) => e.file).join(', ')}.`;
		if (entries.length > 0 && !confirm(message)) {
			return;
		}
		/* if (confirm(`Still want to add ${file.path} when you
				already have ${existingEntriesForFile.join(', ')}.`)) { */
		const newEntry = {
			id: uuid(),
			title: tempTitle,
			file: file.path,
		};
		console.log('libraryService :: createEntry :: newEntry', newEntry);
		this.store.dispatch(new LibraryActions.ImportEntry({ entry: newEntry }));

		/*	}
		 } else {
			this.store.dispatch(new LibraryActions.ImportEntry({ entry: {
				id: uuid(),
				title: tempTitle,
				file: file.path
			}}));
		} */
		/* 
		this.storageService.exists(file.path).pipe(take(1), map(files => {
			const exists = Array.isArray(files) && files.length > 0;
			// TODO: move this confirm option into settings page to allow duplicates
			if (!exists  || confirm(`Still want to add ${filename} when you already have ${files.join(', ')}.`)) {
				this.store.dispatch(new LibraryActions.ImportEntry({ entry: {
					id: uuid(),
					title: tempTitle,
					file: file.path
				}}));
			} else {
				console.log('Duplicate detected', file.path);
			}
		})).subscribe();
		*/
	}

	decodeBase64Image(dataString: string) {
		let matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
		let response: any = {};
		if (matches.length !== 3) {
			return new Error('Invalid input string');
		}

		response.type = matches[1];
		response.data = new Buffer(matches[2], 'base64');
		return response;
	}

	writeImage(data, path) {
		this.fs.writeFile(path, data, (err) => {
			console.debug('electronService remove writeFile - image updated');
			err ? console.log(err) : console.log('poster written to disk');
		});
	}
}
