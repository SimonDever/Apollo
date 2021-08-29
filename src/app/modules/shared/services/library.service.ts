import { Location } from '@angular/common';
import { Injectable, NgZone, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as fromLibrary from '../../library/store';
import * as LibraryActions from '../../library/store/library.actions';
import { Store, select } from '@ngrx/store';
import { StorageService } from './storage.service';
import { ElectronService } from 'ngx-electron';
import { NavigationService } from './navigation.service';
import { take, map } from 'rxjs/operators';
import { Entry } from '../../library/store/entry.model';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { Sorting } from '../models/sorting.model';
import { DomSanitizer } from '@angular/platform-browser';
import { ModalDismissReasons, NgbModalRef, NgbModal } from '@ng-bootstrap/ng-bootstrap';

const uuid = require('uuid/v4');

@Injectable({
	providedIn: 'root',
})
export class LibraryService {
	selectedEntry: any;
	selectedEntryId: any;
	userDataFolder: string;
	fs: any;
	entries: Entry[];
	entries$: Observable<Entry[]>;
	sorting$: Observable<Sorting>;
	modalRef: NgbModalRef;

	// Regular expression for image type:
	// This regular image extracts the "jpeg" from "image/jpeg"
	imageTypeRegularExpression = /\/(.*?)$/;

	public sortingSubject = new BehaviorSubject<Sorting>({field: 'title', direction: 'asc'});

	constructor(
		private router: Router,
		private location: Location,
		private zone: NgZone,
		private modalService: NgbModal,
		private domSanitizer: DomSanitizer,
		private navigationService: NavigationService,
		private electronService: ElectronService,
		private storageService: StorageService,
		private store: Store<fromLibrary.State>,
		private activatedRoute: ActivatedRoute
	) {
		this.sorting$ = this.sortingSubject.asObservable();
		this.userDataFolder = this.electronService.remote.app.getPath('userData');
		this.fs = this.electronService.remote.require('fs');
		
		this.entries$ = this.store.pipe(select(fromLibrary.getAllEntries));
		this.entries$.pipe(map((entries: Entry[]) => {
			this.entries = entries;
		})).subscribe();

		this.store.pipe(select(fromLibrary.getSelectedEntry),
			map(selectedEntry => this.selectedEntry = selectedEntry)).subscribe();

		this.store.pipe(select(fromLibrary.getSelectedEntryId),
			map((id: string) => this.selectedEntryId = id)).subscribe();
	}

	setSelectedEntryId(id: any) {
		this.selectedEntryId = id;
	}

	getSelectedEntryId() {
		return this.selectedEntryId;
	}

	triggerSort(sorting: Sorting) {
		this.sortingSubject.next(sorting);
	}

	sortBy(entries: Entry[], sorting: { field: string; direction: string }) {
		console.debug(`sorting by ${sorting.field}, ${sorting.direction}`);
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

				if (sorting.direction === 'asc') {
					if (first < second) {
						return -1;
					} else if (first === second) {
						return a.id.localeCompare(b.id);
					} else {
						return 1;
					}
				} else {
					if (first < second) {
						return 1;
					} else if (first === second) {
						return a.id.localeCompare(b.id);
					} else {
						return -1;
					}
				}
			} else {
				first = a[sorting.field];
				second = b[sorting.field];
				if (sorting.direction === 'asc' && first) {
					if (first === second) {
						return a.id.localeCompare(b.id);
					}
					return second ? first.localeCompare(second) : -1;
				} else if (second) {
					if (first === second) {
						return b.id.localeCompare(a.id);
					}
					return first ? second.localeCompare(first) : 1;
				}
			}
		});
	}

	savePoster(entry: any) {
		if (entry.poster_path) {
			if (entry.poster_path.startsWith(this.userDataFolder)) {
				// image already saved locally
			} else if (entry.poster_path.startsWith('data:image')) {
				console.debug(`savePoster - convertDataUri(${entry.poster_path})`);
				this.convertDataUri(entry);
			} else if (entry.poster_path.startsWith('/')) {
				console.debug(`savePoster - convertUrlPath(${entry.poster_path})`);
				this.convertUrlPath(entry);
			}
		}
	}

	createImageFile(data, path) {
		const reader = new FileReader();
		reader.addEventListener('load', function () {
			const imageBuffer = this.decodeBase64Image(reader.result);
			this.writeImage(imageBuffer.data, path);
		}.bind(this),	false);
		reader.readAsDataURL(data);
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
	
	convertUrlPath(entry: any) {
		console.debug('libraryService :: convertUrlPath :: entry');
		if (entry.poster_path) {
			const url = `http://image.tmdb.org/t/p/original${entry.poster_path}`;
			const filename = entry.poster_path.substring(1);
			const path = `${this.userDataFolder}\\posters\\${filename}`;
			entry.poster_path = path;
			fetch(url).then((
				(response) => response.blob().then(
					(data) => this.createImageFile(data, path)
				)
			).bind(this));
		} else {
			console.warn('no poster_path field on entry found during request to convert');
		}
	}

	saveEntry(entry: any) {
		const newPosterPath = this.savePoster(entry);
		const newEntry = {...entry};
		if (entry.poster_path !== newPosterPath) {
			newEntry.poster_path = newPosterPath;
		}
		this.store.dispatch(new LibraryActions.UpdateEntry({ entry: newEntry }));
	}

	createEntry(file) {
		console.debug('libraryService :: createEntry :: entry');
		const tempTitle = file.name
			.replace(/\.[^/.]+$/, '')
			.replace(/\(\d{4}\)/, '')
			.split('-')[0]
			.trim();

		const entries: Entry[] = this.entries.filter((entry) => {
			const exists = file.path === entry.file;
			console.debug(`createEntry :: file.path (${file.path}) === entry.file (${entry.file}): ${exists}`);
			return exists;
		});

		console.debug('libraryService :: createEntry :: entries.length', entries.length);
		const duplicates = entries.map((e: Entry) => `
			Title: ${e.title}
			Path: ${e.path}
		`).join('\n\n');

		if (entries.length > 0 && !confirm('Possible duplicate detected ' + duplicates)) {
			return;
		}

		const newEntry = {
			id: uuid(),
			title: tempTitle,
			file: file.path,
		};
		console.debug('libraryService :: createEntry :: newEntry', newEntry);
		this.store.dispatch(new LibraryActions.ImportEntry({ entry: newEntry }));
	}

	toggleActions(event: Event, entry: any) {
		event.preventDefault();
		this.touch(event, entry);
		if (this.selectedEntryId === entry.id) {
			this.store.dispatch(new LibraryActions.DeselectEntry());
		} else {
			this.store.dispatch(new LibraryActions.SelectEntry({ id: entry.id, scrollTo: false },));
		}
	}

	edit(event: Event, entry: any) {
		event.stopPropagation();
		console.debug('edit', event, entry);
		if (entry && !this.selectedEntryId) {
			this.store.dispatch(new LibraryActions.SelectEntry({ id: entry.id, scrollTo: false }));
		}
		this.zone.run(() => this.router.navigate(['/library/edit']));
	}

	play(event: Event, entry: Entry) {
		event.stopPropagation();
		console.debug('play - file:', entry.file);
		this.electronService.ipcRenderer.send('play-video', entry.file);
	}

	touch(event: Event, entry: any) {
		if (!entry.touched) {
			const newEntry = {...entry, touched: true };
			this.saveEntry(newEntry);
			console.debug('touch saved', entry);
		}
	}

	trash() {
		console.debug('searchResult :: trash :: this.selectedEntryId:', this.selectedEntryId);
		this.store.dispatch(new LibraryActions.RemoveEntry({ id: this.selectedEntryId }));
	}

	getPosterSrc(entry: Entry) {
		if (entry.poster_path) {
			if (entry.poster_path.toLowerCase().startsWith('c:\\')) {
				return this.domSanitizer.bypassSecurityTrustResourceUrl('file://' + entry.poster_path);
			} else if (entry.poster_path.startsWith('data:image')) {
				return entry.poster_path;
			}
		} else {
			console.warn('Missing poster', entry);
			return '';
		}
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
			console.debug('electronService remove writeFile - image updated', path);
			err ? console.log(err) : console.log('poster written to disk');
		});
	}

	getDismissReason(reason: any): string {
		if (reason === ModalDismissReasons.ESC) {
			return 'by pressing ESC';
		} else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
			return 'by clicking on a backdrop';
		} else if (reason === 'close') {
			return 'by pressing x on the modal';
		} else {
			return `with: ${reason}`;
		}
	}

	scrollTo(entryId: string) {
		console.log('scrollTo', entryId);
		if (entryId) {
			const box = document.querySelector(`#entry-${entryId}`);
			box.scrollIntoView({ behavior: 'smooth' });
		}
	}
	
	showDeleteConfirmation(event: Event, content: TemplateRef<any>, entry: any) {
		event.stopPropagation();
		if (entry && !this.selectedEntryId) {
			this.store.dispatch(new LibraryActions.SelectEntry({ id: entry.id, scrollTo: false }));
		}
		this.modalRef = this.modalService.open(content);
	}

	closeDeleteModal(event: Event, reason: string) {
		console.debug('closeDeleteModal ::', event, reason);
		if (reason === 'delete') {
			console.debug('closeDeleteModal :: trashing');
			this.trash();
			this.modalRef.close('delete');
		} else {
			this.modalRef.close('cancel');
		}
	}
}
