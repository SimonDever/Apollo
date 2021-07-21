import { AfterViewInit, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterStateSnapshot } from '@angular/router';
import { ModalDismissReasons, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { select, Store } from '@ngrx/store';
import { ElectronService } from 'ngx-electron';
import { VirtualScrollerComponent } from 'ngx-virtual-scroller';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
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

	routerState: RouterStateSnapshot;
	entries$: Observable<Entry[]>;
	entries: Entry[];
	closeResult;
	modalRef: NgbModalRef;
	selectedEntryId: string;
	subs: Subscription;
	entriesSub: Subscription;
	selected = [];
	config$;
	config
	fragment: string;
	selectedEntry: Entry;

	@ViewChild(VirtualScrollerComponent, { static: false })
	private virtualScroller: VirtualScrollerComponent;

	constructor(private store: Store<fromLibrary.LibraryState>,
		private navigationService: NavigationService,
		private zone: NgZone,
		private cdRef: ChangeDetectorRef,
		private modalService: NgbModal,
		private libraryService: LibraryService,
		private sanitizer: DomSanitizer,
		private electronService: ElectronService,
		private route: ActivatedRoute,
		private router: Router) {
		this.routerState = router.routerState.snapshot;
		this.fragment = router.routerState.snapshot.root.fragment;
	}

	ngOnInit() {

		this.entries$ = this.store.pipe(select(fromLibrary.getAllEntries),
			map((entries: Array<Entry>) => {
				this.entries = entries.sort((a, b) => {
					if (a.title == null) { return -1; }
					if (a.title === b.title) {
						return a.id < b.id ? -1 : 1
					}
					return a.title < b.title ? -1 : 1;
				});

				this.navigationService.setBookmarks(this.entries);
				return entries;
			})
		);

		this.subs = this.store.pipe(select(fromLibrary.getConfig),
			map(config => this.config = config)).subscribe();

		this.subs.add(this.store.pipe(select(fromLibrary.getNeedEntries),
			map(needEntries => {
				console.log('entryListComponent :: needEntries', needEntries);
				if (needEntries) {
					this.store.dispatch(new LibraryActions.Load());
				}
			})
		).subscribe());

		this.subs.add(this.store.pipe(select(fromLibrary.getSelectedEntry),
			map(selectedEntry => this.selectedEntry = selectedEntry)).subscribe());

		this.subs.add(this.store.pipe(select(fromLibrary.getSelectedEntryId),
			map((id: string) => this.selectedEntryId = id)).subscribe());

		this.cdRef.detectChanges();
	}

	ngAfterViewInit() {
		if (!this.config.tableFormat) {
			this.subs.add(this.navigationService.bookmark$.pipe(map((char: string) => {
				this.virtualScroller.scrollInto(this.navigationService.getBookmark(char));
			})).subscribe());

			// TODO: either this or the one above
			this.scrollToSelectedEntry();
		} else {
			// TODO: scroll to selected entry in table format
		}

		this.subs.add(this.libraryService.sorting$.pipe(
			map((sorting: {field: string, direction: string}) => {
			//if (sorting.field) {
				this.entries = this.libraryService.sortBy(this.entries, sorting);
			//}
		})).subscribe());
	}

	scrollToSelectedEntry(): void {
		if (this.selectedEntryId != null) {
			// console.log(`scrollTo - about to scroll to selectedEntryId ${this.selectedEntryId}`);
			// TODO: Don't call if entry is already fully visible to prevent animation trigger
			this.virtualScroller.scrollInto(this.selectedEntry);
		}
	}

	closeDeleteModal(reason) {
		console.log('searchResults :: closeModal :: reason:', reason);
		if (reason === 'delete') {
			console.log('searchResults :: closeModal :: trashing');
			this.trash();
		}
		this.modalRef.dismiss('close');
	}

	ngOnDestroy() {
		if (this.subs) {
			this.subs.unsubscribe();
		}
	}

	showDeleteConfirmation(event: Event, content: TemplateRef<any>, entry: any) {
		if (entry) {
			this.store.dispatch(new LibraryActions.SelectEntry({ id: entry.id }));
		}
		event.stopPropagation();
		this.modalRef = this.modalService.open(content);
		this.modalRef.result.then((result) => {
			this.closeResult = `Closed with: ${result}`;
			console.log('showDeleteConfirmation :: this.closeResult :: ', this.closeResult);
		}, (reason) => {
			this.closeResult = `Dismissed with: ${this.getDismissReason(reason)}`;
			console.log('showDeleteConfirmation :: this.closeResult :: ', this.closeResult);
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

	edit(event: Event, entry: any) {
		event.stopPropagation();

		if (entry) {
			this.store.dispatch(new LibraryActions.SelectEntry({ id: entry.id }));
		}

		// console.log(`entry-list.edit() - selectedEntryId: ${this.selectedEntryId}`);
		this.navigationService.setEditEntryParent(this.routerState.url);
		this.zone.run(() => this.router.navigate(['/library/edit']));
	}

	play(event: Event, file: string) {
		event.stopPropagation();
		// console.log('file:', file);
		this.electronService.ipcRenderer.send('play-video', file);
	}

	trackById(index, item) {
		return item.id;
	}

	trash() {
		this.store.dispatch(new LibraryActions.RemoveEntry({ id: this.selectedEntryId }));
	}

	undecorate(entryBox: HTMLDivElement) {
		const poster = entryBox.querySelector('.entry-poster') as HTMLImageElement;
		const posterPreview = entryBox.querySelector('.poster-preview') as HTMLDivElement;
		const entryActions = entryBox.querySelector('.entry-actions') as HTMLDivElement;
		poster ? poster.style['opacity'] = '1.0' : {};
		posterPreview.style['background-color'] = 'var(--grid-item-shadow-color)';
		entryActions ? entryActions.style['display'] = 'none': {};
	}
	
	decorate(entryBox: HTMLDivElement) {
		const poster = entryBox.querySelector('.entry-poster') as HTMLImageElement;
		const posterPreview = entryBox.querySelector('.poster-preview') as HTMLDivElement;
		const entryActions = entryBox.querySelector('.entry-actions') as HTMLDivElement;
		poster ? poster.style['opacity'] = '0.2' : {};
		posterPreview.style['background-color'] = 'transparent';
		entryActions ? entryActions.style['display'] = 'flex' : {};
	}

	touch(event, entry) {
		this.libraryService.touch(event, entry);
	}

	toggleActions(event: Event, entry: any) {
		event.preventDefault();
		this.touch(event, entry);
		const entryBox = event.currentTarget as HTMLDivElement;
		const selectedIndex = this.selected.indexOf(entryBox);
		if (selectedIndex > -1) {
			this.selected.splice(selectedIndex, 1);
			this.undecorate(entryBox);
			this.store.dispatch(new LibraryActions.DeselectEntry());
		} else {
			this.selected.forEach(e => this.undecorate(e));
			this.selected = [entryBox];
			this.decorate(entryBox);
			this.store.dispatch(new LibraryActions.SelectEntry({ id: entry.id }));
		}
	}

	posterUrl(path: string) {
		if (path) {
			if (path.toLowerCase().startsWith('c:\\')) {
				return this.sanitizer.bypassSecurityTrustResourceUrl('file://' + path);
			} else if (path.startsWith('data:image')) {
				return path;
			}
		} else {
			//console.log('Missing poster', path);
			//return '';
			return path;
		}
	}

}
