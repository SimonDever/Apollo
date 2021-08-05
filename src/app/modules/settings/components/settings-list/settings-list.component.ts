import { animate, style, transition, trigger } from '@angular/animations';
import {
	ChangeDetectorRef,
	Component,
	OnDestroy,
	OnInit,
	TemplateRef,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
	ModalDismissReasons,
	NgbModal,
	NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngrx/store';
import { ElectronService } from 'ngx-electron';
import { Observable, Subscription } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import * as fromLibrary from '../../../library/store';
import { Entry } from '../../../library/store/entry.model';
import * as LibraryActions from '../../../library/store/library.actions';
import { LibraryService } from '../../../shared/services/library.service';
import { StorageService } from '../../../shared/services/storage.service';
import { REMOVABLE_FIELDS } from '../../../shared/models/metadata-fields';

const uuid = require('uuid/v4');

@Component({
	selector: 'app-settings-list',
	templateUrl: './settings-list.component.html',
	styleUrls: ['./settings-list.component.css'],
	animations: [
		trigger('fadeInOut', [
			transition(':enter', [
				style({ opacity: 0 }),
				animate('.5s ease-out', style({ opacity: 1 })),
			]),
			transition(':leave', [
				style({ opacity: 1 }),
				animate('.5s ease-in', style({ opacity: 0 })),
			]),
		]),
	],
})
export class SettingsListComponent
	implements OnInit, /* DoCheck,  */ OnDestroy {
	mode:
		| ''
		| 'Deleting library'
		| 'Parsing library'
		| 'Import complete'
		| 'Importing library'
		| 'Adding entries'
		| 'Loading posters'
		| 'Reading file';

	subs: Subscription;
	interval: any;
	updater;
	updateAvailable;
	fs: any;
	path: any;
	userDataFolder: String;
	closeResult: string;
	modalRef: NgbModalRef;
	apiKeyForm: FormGroup;
	changePathForm: FormGroup;
	selected: boolean;
	entryCount$: Observable<number>;
	importCount: number;
	deletedCount: number;
	posterCount: number;
	estimatedCount: number;
	parsedCount: number;
	config: any;
	config$: Observable<any>;

	removeFieldsData: any;
	removeFieldsOptions: string[];

	constructor(
		private formBuilder: FormBuilder,
		private storageService: StorageService,
		private router: Router,
		private sanitizer: DomSanitizer,
		private libraryService: LibraryService,
		private cdRef: ChangeDetectorRef,
		private modalService: NgbModal,
		private store: Store<fromLibrary.LibraryState>,
		private electronService: ElectronService
	) {
		this.fs = this.electronService.remote.require('fs');
		this.path = this.electronService.remote.require('path');
		this.userDataFolder = this.electronService.remote.app.getPath('userData');
		this.apiKeyForm = this.formBuilder.group({ apiKey: '' });
		this.changePathForm = this.formBuilder.group({ filepath: '' });
		this.entryCount$ = this.store.select(fromLibrary.getTotalEntries);
		this.removeFieldsData = {};
		this.removeFieldsOptions = REMOVABLE_FIELDS;
	}

	ngOnInit() {
		this.importCount = 0;
		this.deletedCount = 0;
		this.posterCount = 0;
		this.estimatedCount = 0;
		this.parsedCount = 0;
		this.selected = false;
		
		this.config$ = this.store.select(fromLibrary.getConfig);
		this.subs = this.config$.pipe(map((config) => this.config = config)).subscribe();
	}

	length(removeFieldsData) {
		return Object.keys(removeFieldsData).length;
	}

	checkRemoveFieldOption(event: Event, option: string) {
		event.preventDefault();
		event.stopImmediatePropagation();
		if (this.removeFieldsData[option] != null) {
			delete this.removeFieldsData[option];
		} else {
			this.removeFieldsData[option] = true;
		}
		
		console.log('checkRemoveFieldOption - fields to remove:', this.removeFieldsData);
	}

	toggleActions(event: Event) {
		event.preventDefault();
		this.selected = !this.selected;
	}

	ngOnDestroy() {
		this.cdRef.detach();
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	removeAllFields() {
		this.subs.add(this.storageService.removeAllFields(this.removeFieldsData).pipe(
			map((entries: Entry[]) => {
				console.debug('removeAllFields - Deleting all entries from store ready to load ', entries);
				this.store.dispatch(new LibraryActions.DeleteAllEntries());
				this.store.dispatch(new LibraryActions.NeedEntries());
			})
		).subscribe());
	}

	isKeyEnumerable(key: string) {
		return (
			key !== 'id' &&
			key !== '_id' &&
			key !== 'poster_path' &&
			key !== 'file' &&
			key !== 'touched' &&
			key !== 'gotDetails'
		);
	}

	close() {
		this.router.navigate(['/library']);
	}

	progressStyle() {
		const progressStyle = 'width:' + this.progressPercentage() + '%';
		console.log('progressStyle ::', style);
		return this.sanitizer.bypassSecurityTrustStyle(progressStyle);
	}

	saveApiKey() {
		this.store.dispatch(
			new LibraryActions.SaveApiKey({
				apiKey: this.apiKeyForm.value.apiKey,
			})
		);
		this.modalRef.close('save');
	}

	showApiKeyDialog(content) {
		this.modalRef = this.modalService.open(content);
		this.modalRef.result.then(
			(result) => {
				this.closeResult = `Closed with: ${result}`;
			},
			(reason) => {
				this.closeResult = `Dismissed with: ${this.getDismissReason(reason)}`;
			}
		);
	}

	showChangePathDialog(content) {
		this.modalRef = this.modalService.open(content);
		this.modalRef.result.then(
			(result) => this.closeResult = `Closed with: ${result}`,
			(reason) => this.closeResult = `Dismissed with: ${this.getDismissReason(reason)}`
		);
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

	closeModal() {
		this.modalRef.dismiss('close');
	}

	progressPercentage() {
		if (this.estimatedCount === 0) {
			return 0;
		}

		switch (this.mode) {
			case 'Deleting library': {
				console.debug(
					`progress ::
						estimatedCount=${this.estimatedCount}
						deletedCount=${this.deletedCount}`
				);
				return Math.ceil((this.deletedCount / this.estimatedCount) * 100);
			}
			case 'Importing library' || 'Adding entries': {
				console.debug(
					`progress ::
						estimatedCount=${this.estimatedCount}
						importCount=${this.importCount}`
				);
				return Math.ceil((this.importCount / this.estimatedCount) * 100);
			}
			case 'Parsing library': {
				console.debug(
					`progress ::
						estimatedCount=${this.estimatedCount}
						parsedCount=${this.parsedCount}`
				);
				return Math.ceil((this.parsedCount / this.estimatedCount) * 100);
			}
			case 'Loading posters': {
				console.debug(
					`progress ::
						estimatedCount=${this.estimatedCount}
						posterCount=${this.posterCount}`
				);
				return Math.ceil((this.posterCount / this.estimatedCount) * 100);
			}
			case 'Import complete': {
				return 100;
			}
			case 'Reading file': {
				return 50;
			}
			default: {
				return 0;
			}
		}
	}

	deleteLibrary() {
		this.mode = 'Deleting library';
		this.deletedCount = 0;
		this.cdRef.detectChanges();
		this.subs.add(
			this.store
				.select(fromLibrary.getTotalEntries)
				.pipe(
					take(1),
					mergeMap((count) => {
						console.log('DeleteLibrary :: estimatedCount=', count);
						this.estimatedCount = count;
						this.cdRef.detectChanges();
						console.log('DeleteLibrary :: Deleting from database');
						return this.storageService.deleteAllEntries();
					}),
					map((countRemoved) => {
						console.log('DeleteLibrary :: countRemoved=', countRemoved);
						console.log('DeleteLibrary :: Deleting from NGRX Store');
						this.store.dispatch(new LibraryActions.DeleteAllEntries());
						console.log('DeleteLibrary :: Deleting posters from file system');
						const posterFolder = `${this.userDataFolder}\\posters`;
						this.fs.readdir(posterFolder, (err, files) => {
							if (err) {
								console.error(err);
								throw err;
							}
							this.estimatedCount = files.length;
							for (const file of files) {
								this.fs.unlink(this.path.join(posterFolder, file), (err) => {
									if (err) {
										console.error(err);
										throw err;
									}
									this.deletedCount++;
									this.cdRef.detectChanges();
								});
							}
						});
					})
				)
				.subscribe()
		);
	}

	touchAll() {
		this.subs.add(
			this.storageService
				.touchAll()
				.pipe(
					map(() => {
						console.debug(
							`touchAll - Update complete. Clearing store ready for loading.`
						);
						this.store.dispatch(new LibraryActions.DeleteAllEntries());
						this.store.dispatch(new LibraryActions.NeedEntries());
					})
				)
				.subscribe()
		);
	}

	importJSON(event) {
		this.mode = 'Reading file';
		console.log('importSave :: entry. file:', event.target.files[0]);
		const reader = new FileReader();
		reader.onload = (function (f) {
			return function (e) {
				f.onReaderLoad(e);
			};
		})(this);
		reader.readAsText(event.target.files[0]);
	}

	addEntries(event) {
		this.mode = 'Adding entries';
		this.importCount = 0;
		console.log('addEntries :: entry. files:', event.target.files);
		const files = event.target.files;
		this.estimatedCount = files.length;
		for (const file of files) {
			this.libraryService.createEntry(file);
			this.importCount++;
			this.cdRef.detectChanges();
		}
		console.log('addEntries :: finished raising all actions');
	}

	changeAllFilePaths() {
		this.modalRef.close('save');
		const filepath = this.changePathForm.value.filepath;
		if (filepath) {
			console.debug(`changeAllFilePaths to ${filepath}`);
			this.subs.add(this.storageService
				.changeAllPathsTo(filepath)
				.pipe(
					map((entries) => {
						console.debug(
							`changeAllFilePaths to ${filepath}. entries:`,
							entries
						);
						this.store.dispatch(new LibraryActions.Reload({ entries }));
					})
				)
				.subscribe()
			);
		}
	}

	update() {
		this.electronService.ipcRenderer.send('update');
	}

	cleanArrays() {
		this.subs.add(this.storageService
			.cleanArrays()
			.pipe(
				map((done) => {
					console.log('cleanArrays sub result', done);
					this.store.dispatch(new LibraryActions.DeleteAllEntries());
					this.store.dispatch(new LibraryActions.NeedEntries());
				})
			)
			.subscribe()
		);
	}

	onReaderLoad(event) {
		this.mode = 'Parsing library';
		this.parsedCount = 0;
		const obj = JSON.parse(event.target.result);
		this.estimatedCount = Object.keys(obj).length;
		console.log('onReaderLoad :: obj: ', obj);
		const newEntries = [];
		const postersToWrite = [];
		for (const data of obj) {
			console.log('data:', data);
			const out: Entry = {
				id: uuid(),
			};
			if (data.files) {
				out.files = [];
				data.files.forEach((element, index) => {
					if (index === 0) {
						out.file = element.path;
					}
					if (element.path !== '') {
						out.files.push(element.path);
					}
				});
			}
			if (data.currentMatch == null) {
				console.log('could not find current match number');
				data.currentMatch = 0;
			}

			const match = data.matches[data.currentMatch];
			if (match) {
				if (match.Title) {
					out.title = match.Title;
				}
				if (match.Plot) {
					out.overview = match.Plot;
				}
				if (match.Poster) {
					const poster: string = match.Poster;
					if (poster.startsWith('data:image')) {
						console.log('starts with base64 stuff');
						const matchData = poster.replace(/^data:image\/[a-z]+;base64,/, '');
						const poster_path = `${this.electronService.remote.app.getPath(
							'userData'
						)}\\posters\\${out.id}.png`;
						console.log('attempting to write poster to ');
						console.log(poster_path);
						postersToWrite.push({ poster_path, matchData });
						out.poster_path = poster_path;
					} else {
						console.log('not base64 poster, just going to save whatever it is');
						out.poster_path = match.Poster;
					}
				}
			}
			if (match.Year) {
				out.year = match.Year;
			}
			if (match.Rated) {
				out.rated = match.Rated;
			}
			if (match.Released) {
				out.released = match.Released;
			}
			if (match.Runtime) {
				out.runtime = match.Runtime;
			}
			if (match.Genre) {
				out.genre = match.Genre;
			}
			if (match.Director) {
				out.director = match.Director;
			}
			if (match.Writer) {
				out.writer = match.Writer;
			}
			if (match.Actors) {
				out.actors = match.Actors;
			}
			if (match.Language) {
				out.language = match.Language;
			}
			if (match.Country) {
				out.country = match.Country;
			}
			if (match.Awards) {
				out.awards = match.Awards;
			}
			if (match.Metascore) {
				out.metascore = match.Metascore;
			}
			if (match.imdbRating) {
				out.imdbRating = match.imdbRating;
			}
			if (match.imdbVotes) {
				out.imdbVotes = match.imdbVotes;
			}
			if (match.imdbID) {
				out.imdbID = match.imdbID;
			}
			if (match.Type) {
				out.type = match.Type;
			}

			console.log('finished one: ', out);
			newEntries.push(out);
			this.parsedCount++;
			this.cdRef.detectChanges();
		}

		this.mode = 'Importing library';
		this.importCount = 0;
		this.cdRef.detectChanges();
		this.estimatedCount = newEntries.length;
		for (const entry of newEntries) {
			this.store.dispatch(new LibraryActions.ImportEntry({ entry: entry }));
			this.importCount++;
			this.cdRef.detectChanges();
		}

		this.mode = 'Loading posters';
		this.posterCount = 0;
		this.cdRef.detectChanges();
		this.estimatedCount = postersToWrite.length;
		for (const poster of postersToWrite) {
			this.fs.writeFile(
				poster.poster_path,
				poster.matchData,
				'base64',
				(err) => {
					err ? console.log(err) : console.log('poster written to disk');
					this.posterCount++;
					this.cdRef.detectChanges();
				}
			);
		}

		this.mode = 'Import complete';

		console.log('finished all');
	}
}
