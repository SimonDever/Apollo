import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import * as fromLibrary from '../../store';
import * as LibraryActions from '../../store/library.actions';

@Component({
	selector: 'app-library',
	templateUrl: './library.component.html',
	styleUrls: ['./library.component.css']
})
export class LibraryComponent implements OnInit, OnDestroy {

	config: any;
	subs: Subscription;
	
	constructor(
		private store: Store<fromLibrary.LibraryState>,
	) {}

	ngOnInit() {
		this.store.dispatch(new LibraryActions.GetConfig());
		this.subs = this.store.select(fromLibrary.getConfig).pipe(
			map(config => this.config = config)
		).subscribe();
	}

	ngOnDestroy() {
		this.subs ? this.subs.unsubscribe() : {};
	}
}
