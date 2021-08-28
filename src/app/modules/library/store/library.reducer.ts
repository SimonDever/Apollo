import { createEntityAdapter, EntityAdapter, EntityState, Update } from '@ngrx/entity';
import { Entry } from './entry.model';
import * as LibraryActions from './library.actions';

export interface State extends EntityState<Entry> { }

export const adapter: EntityAdapter<Entry> = createEntityAdapter<Entry>();

export const initialState: State = adapter.getInitialState({});

export function reducer(state = initialState, action: LibraryActions.All): State {
	switch (action.type) {

		case LibraryActions.LOADED: {
			return adapter.addAll(action.payload.entries, state);
		}

		case LibraryActions.UPDATE_ENTRY: {
			console.log('item before update', state.entities[action.payload.entry.id]);
			console.log('updated item: ', action.payload.entry);
			const newState = adapter.removeOne(action.payload.entry.id, state);
			//console.log('new state', newState);
			const newerState = adapter.addOne(action.payload.entry, newState);
			//console.log('newer state', newerState);
			return newerState;
		}

		case LibraryActions.ADD_ENTRY: {
			return adapter.addOne(action.payload.entry, state);
		}

		case LibraryActions.REMOVE_ENTRY: {
			return adapter.removeOne(action.payload.id, state);
		}

		case LibraryActions.DELETE_ALL_ENTRIES: {
			return adapter.removeAll(state);
		}

		case LibraryActions.RELOAD: {
			adapter.removeAll(state);
			return adapter.addAll(action.payload.entries, state);
		}

		default: {
			return state;
		}
	}
}

export const {
	selectIds,
	selectEntities,
	selectAll,
	selectTotal
} = adapter.getSelectors();
