import { ChangeDetectorRef, Component, DoCheck, KeyValueDiffers, NgZone, OnDestroy, OnInit, Renderer2, TemplateRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterStateSnapshot } from '@angular/router';
import { ModalDismissReasons, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { select, Store } from '@ngrx/store';
import { ElectronService } from 'ngx-electron';
import { Observable, Subscription, Subject } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';
import { fadeInOut } from '../../../shared/animations/animations';
import { LibraryService } from '../../../shared/services/library.service';
import { NavigationService } from '../../../shared/services/navigation.service';
import * as fromLibrary from '../../store';
import { Entry, InputField } from '../../store/entry.model';
import * as LibraryActions from '../../store/library.actions';
import { StorageService } from './../../../shared/services/storage.service';


const uuid = require('uuid/v4');

@Component({
	selector: 'app-edit-entry',
	templateUrl: './edit-entry.component.html',
	styleUrls: ['./edit-entry.component.css'],
	animations: [fadeInOut]
})
export class EditEntryComponent implements OnInit, OnDestroy {

	defaultFieldOrder = ['title', 'overview'];
	entry$: Observable<Entry>;
	metadataSearchResponse$: Observable<any>;
	metadataSearchResult: any;
	entryForm: FormGroup;
	searchForm: FormGroup;
	poster_path: string;
	file: string;
	files: File[];
	subs: Subscription;
	saved: boolean;
	entry: Entry;
	originalEntry: Entry;
	differ: any;
	modalRef: NgbModalRef;
	closeResult: string;
	inputList: InputField[];
	tempList: InputField[];
	routerState: RouterStateSnapshot;
	selectedEntryId: string;
	_id: string;
	fieldsRemoved: string[];
	dragList: any[];
	config;
	saveTrigger;
	isDirty;

	constructor(private formBuilder: FormBuilder,
		private zone: NgZone,
		private store: Store<fromLibrary.State>,
		private router: Router,
		private element: ElementRef,
		private libraryService: LibraryService,
		private electronService: ElectronService,
		private storageService: StorageService,
		private cdRef: ChangeDetectorRef,
		private modalService: NgbModal,
		private sanitizer: DomSanitizer,
		private navigationService: NavigationService,
		private differs: KeyValueDiffers,
		private renderer: Renderer2
	) { }

	ngOnInit() {
		console.debug('EditEntryComponent Init');
		this.differ = this.differs.find([]).create();
		this.inputList = [];
		this.tempList = [];
		this.fieldsRemoved = [];
		this.saveTrigger = new Subject();
		this.searchForm = this.formBuilder.group({ searchTerms: '' });
		this.entryForm = this.formBuilder.group({});
		this.entry$ = this.store.select(fromLibrary.getSelectedEntry);
		
		this.subs = this.entry$.pipe(map(entry => {
			console.debug('Edit - entry', entry);
			if (!entry) {
				//console.error('Entry is null');
			} else {
				console.debug('entry sub changed');
				this.entry = { ...entry };
				
				if (!entry.title) {
					this.entry.title = '';
				}
				if (!entry.poster_path) {
					this.entry.poster_path = '';
				}
				if (!entry.file) {
					this.entry.file = '';
				}
				this.poster_path = this.entry.poster_path;
				this.file = this.entry.file || '';

				this.inputList = [];
				Object.entries(this.entry).forEach(([key, value]) => {
					if (value !== null) {
						if (this.isKeyEnumerable(key)) {
							const field: InputField = {
								value: value || '',
								formControlName: key,
								label: key
							};
							this.inputList.push(field);
						}
					} else {
						console.warn('found nulls in entry setup');
						delete this.entry[key];
					}
				});

				this.refreshForm();
				this.cdRef.detectChanges();
			}
		})).subscribe();

		this.subs.add(this.store.select(fromLibrary.getConfig).pipe(
			map(config => this.config = config)
		).subscribe());

		this.store.select(fromLibrary.getSelectedEntryId)
			.pipe(map(id => this.selectedEntryId = id))
			.subscribe();

		this.metadataSearchResponse$ = this.store.pipe(select(fromLibrary.getMetadataSearchResults));
		this.subs.add(this.metadataSearchResponse$.subscribe(response => this.metadataSearchResult = response));
	}

	ngOnDestroy() {
		console.debug(`ngOnDestroy saving dirty entry before component destroy:`, this.isDirty);
		this.saveFormIfDirty(null);
		this.cdRef.detach();
		this.entry = null;
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	setDirty(e: Event) {
		console.debug(`setDirty`, e);
		this.isDirty = true;
	}

	removeInputField(event: Event, inputField: InputField) {
		this.saveFormIfDirty(event);
		const key = inputField.formControlName;
		console.warn(`removeInputField - click - fieldName: ${key}`);
		Object.entries(this.entry).forEach(([k, v]) => {
			if (k === key) {
				console.debug('removeInputField :: removing property:', key);
				this.isDirty = true;
				this.entry[key] = null;
				this.entryForm.removeControl(key);
			}
		});
		this.inputList = this.inputList.filter(field => field.formControlName !== key);
		this.refreshForm();
		this.saveFormIfDirty(null);
		console.log(`removeInputField - Removed ${key}:'' from `, this.entry);
		return true;
	}

	cancelDelete() {
		this.modalRef.dismiss('cancel click');
	}

	confirmDelete() {
		this.modalRef.close('Ok click');
	}
	
	saveFormIfDirty(event: Event) {
		event ? event.preventDefault() : {};
		console.debug('saveFormIfDirty - saveForm attempt', event);
		if (this.isDirty) {
			console.debug('saveFormIfDirty - saveForm allowed');
			this.libraryService.saveEntry({
				...this.entry,
				...this.entryForm.value,
			});
			this.isDirty = false;
		}
		return true;
	}

	toTitleCase(str) {
		return str.replace(
			/\w\S*/g,
			function(txt) {
				return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			}
		);
	}

	isKeyEnumerable(key: string) {
		return key !== 'sort_order' && 
			key !== 'id' &&
			key !== '_id' &&
			key !== 'poster_path' &&
			key !== 'gotDetails' &&
			key !== 'touched';
	}

	addNewField(fieldName) {
		console.debug(`addNewField - fieldName: ${fieldName}`);
		if (!fieldName || /(^\d)/.test(fieldName)) {
			console.warn('prevented making field starting with number, bad for database');
		} else {
			this.modalRef.close('newFieldAdded');
			this.isDirty = true;
			const newFormControlName = fieldName.toLowerCase().replace(' ', '_');
			const key = newFormControlName;
			const value = '';
			const newField: InputField = {
				formControlName: newFormControlName,
				label: this.toTitleCase(fieldName.replace('_', ' ')),
				value: value
			};
			if (this.inputList.some(input => input.formControlName === newFormControlName)) {
				console.warn(`addNewField - Field ${fieldName} has already been added to `, this.entry);
			} else {
				this.inputList.push(newField);
				this.refreshForm();
				this.libraryService.saveEntry({
					...this.entry,
					...{ [key]: value }
				});
				this.isDirty = false;
				console.debug(`addNewField - Added ${key}:'' to `, this.entry);
			}
		}
	}
	
	refreshForm() {
		console.debug('refreshForm - clearing entryForm. inputList:', this.inputList);
		this.entryForm = this.formBuilder.group({});
		this.inputList.forEach(input => {
			const newFormControl = this.formBuilder.control({ value: input.value, disabled: false });
			this.entryForm.addControl(input.formControlName, newFormControl);
		});
	}

	posterUrl(path) {
		if (path) {
			if (path.toLowerCase().startsWith('c:\\')) {
				return this.sanitizer.bypassSecurityTrustResourceUrl('file://' + path);
			} else if (path.startsWith('data:image')) {
				return path;
			}
		} else {
			return '';
		}
	}

	/* ngDoCheck() {
		if (this.differ.diff(this.entry)) {
			this.entryForm.patchValue(this.entry);
			if (this.poster_path == null && this.entry.poster_path != null) {
				this.poster_path = this.entry.poster_path;
			}
			if (this.file == null && this.entry.file != null) {
				this.file = this.entry.file;
			}
		}
	} */

	search() {
		this.modalRef.close('search');
		const searchTerms = this.searchForm.value.searchTerms;
		this.store.dispatch(new LibraryActions.SearchForMetadata({
			keywords: searchTerms,
			tempEntry: {
				...this.entry,
				...this.entryForm.value,
				...{
					id: this.selectedEntryId,
					file: this.file,
					poster_path: this.poster_path
				}
			}
		}));
	}

	closeModal() {
		this.modalRef.close();
	}

	showSearchDialog(event: Event, searchDialog: TemplateRef<any>) {
		this.saveFormIfDirty(event);
		let searchTerms = '';
		const titleControl = this.entryForm.get('title');
		if (titleControl) {
			searchTerms = titleControl.value;
		}

		this.searchForm.patchValue({ searchTerms: searchTerms });
		this.modalRef = this.modalService.open(searchDialog);
		(this.modalRef as any)._beforeDismiss = function () { return false; };
		this.modalRef.result.then((result) => {
			this.closeResult = `Closed with: ${result}`;
		}, (reason) => {
			this.closeResult = `Dismissed with: ${this.libraryService.getDismissReason(reason)}`;
		});
	}

	showNewFieldDialog(event: Event, newFieldDialog: TemplateRef<any>) {
		this.saveFormIfDirty(event);
		this.modalRef = this.modalService.open(newFieldDialog);
		(this.modalRef as any)._beforeDismiss = function () { return false; };
		this.modalRef.result.then((result) => {
			this.closeResult = `Closed with: ${result}`;
		}, (reason) => {
			this.closeResult = `Dismissed with: ${this.libraryService.getDismissReason(reason)}`;
		});
	}

	showDeleteConfirmation(event: Event, deleteDialog: TemplateRef<any>) {
		this.saveFormIfDirty(event);
		this.modalRef = this.modalService.open(deleteDialog);
		(this.modalRef as any)._beforeDismiss = function () { return false; };
		this.modalRef.result.then((result) => {
			this.closeResult = `Closed with: ${result}`;
			if (result === 'Ok click') {
				this.trash();
			}
		}, (reason) => {
			this.closeResult = `Dismissed with: ${this.libraryService.getDismissReason(reason)}`;
		});
	}

	posterChange(event) {
		this.saveFormIfDirty(event);
		const reader = new FileReader();
		const poster = event.target.files[0];
		reader.addEventListener('load', function () {
			this.poster_path = reader.result;
			console.debug('posterChange - saving poster_path');
			this.libraryService.saveEntry({
				...this.entry,
				...{ 
					poster_path: this.poster_path
				}
			});
			this.isDirty = false;
		}.bind(this), false);
		if (poster) {
			this.isDirty = true;
			reader.readAsDataURL(poster);
		}
	}

	posterIsFile(poster_path: string) {
		return poster_path && !poster_path.startsWith('data:image');
	}

	writeImage(data, filename, changes) {
		const remote = this.electronService.remote;
		const path = `${remote.app.getPath('userData')}\\posters\\${filename}`;
		remote.require('fs').writeFile(path, data, 'base64', (function (err) {
			changes.poster_path = path;
			console.debug('electronService remote writeFile - image updated');
			this.sendUpdateAction(changes);
			this.navigationService.closeEditEntry(this.selectedEntryId);
			err ? console.error(err) : console.debug('poster written to disk');
		}).bind(this));
	}

	fileChange(event) {
		this.saveFormIfDirty(event);
		const path = event.target.files[0].path;
		if (path == null) {
			console.warn(`Could not get full path to video file,
				may not be running in electron. You will not be able
				to play this file from within the application.`);
		}

		this.file = path || event.target.files[0].name;
		const title = this.entryForm.value.title;
		if (title == null || title === '') {

			const forwardSlash = this.file.lastIndexOf('/');
			const backwardSlash = this.file.lastIndexOf('\\');
			let separator = forwardSlash, newTitle;

			if (forwardSlash === -1) {
				separator = backwardSlash;
			}
			if (this.file.lastIndexOf('(') === -1) {
				newTitle = this.file.substring(separator + 1, this.file.lastIndexOf('.'));
			} else {
				newTitle = this.file.substring(separator + 1, this.file.lastIndexOf('('));
			}

			this.entryForm.get('title').setValue(newTitle);
		}

		this.isDirty = true;
		console.debug('fileChange - file path saved', this.file);
		this.libraryService.saveEntry({
			...this.entry,
			...{ 
				file: this.file,
				title: this.entryForm.value.title
			}
		});
		this.isDirty = false;
	}

	close(event: Event) {
		this.saveFormIfDirty(event);
		this.navigationService.closeEditEntry(this.selectedEntryId);
	}

	trash() {
		this.libraryService.trash();
	}
}
