import {
	Component,
	OnInit,
	NgZone,
	ViewChild,
	KeyValueDiffers,
	ChangeDetectorRef,
	DoCheck,
} from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import * as fromLibrary from '../../../library/store/index';
import * as LibraryActions from '../../../library/store/library.actions';
import { NavigationService } from '../../services/navigation.service';
import { LibraryService } from '../../services/library.service';
import { ElectronService } from 'ngx-electron';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer } from '@angular/platform-browser';
import { StorageService } from '../../services/storage.service';
import { Subscription, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { initialState } from '../../../library/store/search.reducer';
import * as packageJson from '../../../../../../package.json';

@Component({
	selector: 'app-menu',
	templateUrl: './menu.component.html',
	styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit, DoCheck {
	alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	appTitle: string;
	appVersion: string;
	navbarCollapsed: boolean;
	routerState: RouterStateSnapshot;
	title: string;
	searchForm: FormGroup;
	config: any;
	config$: Observable<any>;
	genres$: Observable<any>;
	entryCount$: Observable<number>;
	genres: string[];
	public configForm: FormGroup;
	subs: Subscription;
	differ: any;
	borderStyles: string[];
	sorting: {field: string, direction: string};

	constructor(
		private formBuilder: FormBuilder,
		private storageService: StorageService,
		private router: Router,
		private sanitizer: DomSanitizer,
		private libraryService: LibraryService,
		private cdRef: ChangeDetectorRef,
		private modalService: NgbModal,
		private store: Store<fromLibrary.LibraryState>,
		private electronService: ElectronService,
		private differs: KeyValueDiffers,
		private activatedRoute: ActivatedRoute,
		private navigationService: NavigationService,
		private zone: NgZone
	) {
		this.appTitle = 'Apollo';
		this.appVersion = packageJson.version;
		this.routerState = this.router.routerState.snapshot;
		this.navbarCollapsed = true;
		this.title = '';
		this.sorting = {field: 'title', direction: 'asc'};
		this.genres = [];
		this.configForm = new FormGroup({});
	}

	ngOnInit() {
		this.searchForm = this.formBuilder.group({ title: '' });
		this.differ = this.differs.find([]).create();

		this.entryCount$ = this.store.select(fromLibrary.getTotalEntries);

		this.store.dispatch(new LibraryActions.GetConfig());
		this.config$ = this.store.select(fromLibrary.getConfig);
		this.subs = this.config$
			.pipe(
				map((config) => {
					const configFormGroup = {};
					const defaultConfig = initialState.config;
					config = { ...defaultConfig, ...(config || {}) };
					Object.entries(config).forEach(([key, value]) => {
						if (this.isKeyEnumerable(key)) {
							configFormGroup[key] = new FormControl(value);
						}
					});
					this.configForm = this.formBuilder.group(configFormGroup);
					this.config = config;
					this.cdRef.detectChanges();
				})
			)
			.subscribe();

		this.genres$ = this.store.select(fromLibrary.getGenres);
		this.subs.add(
			this.genres$
				.pipe(
					map((genres) => {
						this.genres = genres;
					})
				)
				.subscribe()
		);
	}

	sortBy(field: string) {
		if (this.sorting.field === field) {
			if (this.sorting.direction === 'asc') {
				this.sorting.direction = 'desc';
			} else {
				this.sorting.direction = 'asc';
			}
		} else {
			this.sorting.direction = 'asc';
		}

		this.sorting.field = field;
		this.libraryService.triggerSort(this.sorting);
	}

	goto(char: string) {
		this.navigationService.gotoBookmark(char);
	}

	quit() {
		console.debug('quit');
		this.electronService.ipcRenderer.send('quit');
	}

	maximize() {
		console.debug('maximize');
		this.electronService.ipcRenderer.send('maximize');
	}

	minimize() {
		console.debug('minimize');
		this.electronService.ipcRenderer.send('minimize');
	}

	gotoGenre(genre: string) {
		this.navigationService.setSearchResultsParent(this.routerState.url);
		this.store.dispatch(
			new LibraryActions.SearchEntries({
				searchTerms: `genres:${genre}`,
			})
		);
	}

	search() {
		this.navbarCollapsed = true;
		this.navigationService.setSearchResultsParent(this.routerState.url);
		this.store.dispatch(
			new LibraryActions.SearchEntries({
				searchTerms: this.searchForm.value.title,
			})
		);
	}

	ngDoCheck(): void {
		if (this.differ.diff(this.config)) {
			this.configForm.patchValue(this.config);
		}
	}

	save() {
		this.store.dispatch(
			new LibraryActions.GotConfig({ config: this.configForm.value })
		);
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

	clearInput() {
		console.log('menuComponent :: clearInput :: entry');
	}

	addEntries(event) {
		console.log('menuComponent :: addEntries :: entry');
		const fileList: FileList = event.target.files;
		Array.from(fileList)
			.filter((file: File) => !file.name.startsWith('.'))
			.map((file) => {
				console.log('menuComponent :: addEntries :: file', file);
				this.libraryService.createEntry(file);
			});
	}

	showEntryList() {
		this.navbarCollapsed = true;
		this.navigationService.setSearchResultsParent(undefined);
		this.navigationService.setViewEntryParent(undefined);
		this.zone.run(() => this.router.navigate(['/library']));
	}

	showSettings() {
		this.navbarCollapsed = true;
		this.navigationService.setSearchResultsParent(undefined);
		this.navigationService.setViewEntryParent(undefined);
		this.zone.run(() => this.router.navigate(['/settings']));
	}
}
