import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { Entry } from '../../library/store/entry.model';
import * as Datastore from 'nedb';
import { ElectronService } from 'ngx-electron';

const uuid = require('uuid/v4');

@Injectable({
  providedIn: 'root'
})
export class StorageService {

	datastore;
	config;

	constructor(private electronService: ElectronService) {
		this.datastore = new Datastore({
			filename: `${this.electronService.remote.app.getPath('userData')}\\library-database.json`,
			autoload: true
		});

		this.config = new Datastore({
			filename: `${this.electronService.remote.app.getPath('userData')}\\library-config.json`,
			autoload: true
		});
	}

	backup() {
		this.datastore.find({}, (readError, entries) => {
			if (readError) {
				console.log(readError);
				return;
			} else {
				this.electronService.remote.require('fs')
					.writeFile(`${this.electronService.remote.app.getPath('userData')}\\library-database-backup.json`, JSON.stringify(entries), 'utf8', writeError => {
						if (writeError) {
							console.error(writeError);
							return;
						}
						//console.log('StorageService - backup() - Backup file written to disk');
					});
			}
		});
	}

	getConfig() {
		//console.log(`StorageService - getConfig() - database:`, this.config);
		return new Observable(subscriber => {
			this.config.find({ id: 'config' }, (err, configItems) => {
				if (err) {
					subscriber.error(err);
				} else {
					//console.log('StorageService - getConfig() - items:', configItems[0]);
					subscriber.next(configItems[0]);
				}
			});
		});
	}

	setConfig(configItems: any): Observable<any> {
		return new Observable(subscriber => {
			/*
			this.config.find({id: 'config'}, (err, configItems) => {
				if (err) {
					subscriber.error(err);
				}

				if(!configItems || Array.isArray(configItems) && configItems.length === 0) {
					this.config.insert...
					subscriber.next(configItems)
				}
			});
			*/
			this.config.update({ id: 'config' },
				{ $set: { ...configItems } },
				{ upsert: true, returnUpdatedDocs: true },
				(err, numberOfUpdated, config) => {
					if (err) {
						subscriber.error(err);
					} else {
						console.debug('configuration has been updated in storage', config);
						subscriber.next(config);
					}
				}
			);
		});
	}

	deleteAllEntries(): Observable<number> {
		console.debug(`deleteAllEntries() - entry`);
		return new Observable(subscriber => {
			this.datastore.remove({}, { multi: true }, function (err, countRemoved) {
				if (err) {
					subscriber.error(err);
				} else {
					subscriber.next(countRemoved);
				}
				console.debug('deleteAllEntries() - complete');
			});
		});
	}


	getEntries(): Observable<Entry[]> {
		return new Observable(subscriber => {
			this.datastore.find({}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				}
				console.debug('getEntries()', entries);
				subscriber.next(entries);
			});
		});
	}

	getAllGenres(): Observable<any[]> {
		return new Observable(subscriber => {
			this.datastore.find({}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				}

				let genreList = [];
				for (const entry of entries) {
					if (entry.genres) {
						if (Array.isArray(entry.genres)) {
							genreList = [...genreList, ...entry.genres.map(genre => genre.name)];
						} else if (typeof entry.genres === 'object') {
							genreList = [...genreList, ...[entry.genres.name]];
						} else {
							genreList = [...genreList, ...entry.genres.split(',')];
						}
					}
					if (entry.genre) {
						if (Array.isArray(entry.genre)) {
							genreList = [...genreList, ...entry.genre.map(genre => genre.name)];
						} else if (typeof entry.genre === 'object') {
							genreList = [...genreList, ...[entry.genre.name]];
						} else {
							genreList = [...genreList, ...entry.genre.split(',')];
						}
					}
				}

				genreList = genreList.map(genre => {
					return genre.toLowerCase().trim();
				});

				genreList = Array.from(new Set(genreList)).sort();

				console.debug('genreList:', genreList);

				subscriber.next(genreList);
			});
		});
	}

	getEntry(id: string): Observable<Entry> {
		return new Observable(subscriber => {
			this.datastore.find({ id: id }, (err, entry) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.debug('getEntry(id)', entry);
					subscriber.next(entry);
				}
			});
		});
	}

	removeAllFields(fieldsToRemove: any): Observable<Entry[]> {
		return new Observable(subscriber => {
			console.debug(`removeAllFields - attempting to remove:`, fieldsToRemove);
			this.datastore.update({}, {
				$unset: { ...fieldsToRemove }
			}, { multi: true, returnUpdatedDocs: true }, ((err, numberOfUpdated, entries) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.debug('items updated: ', numberOfUpdated, entries);
					subscriber.next(entries);
				}
			}).bind(this));
		});
	}

	updateEntry(id: string, entry: Entry): Observable<Entry> {
		console.debug(`updateEntry() entry`);

		const valuesToRemove = {};
		Object.entries(entry).forEach(([k, v]) => {
			if (v == null || v === 'null') {
				delete entry[k];
				valuesToRemove[k] = true;
			}
		});

		return new Observable(subscriber => {
			console.debug(`updateEntry attempting update datastore`, entry);
			this.datastore.update({ id: id }, {
				$set: { ...entry },
				$unset: { ...valuesToRemove }
			}, { upsert: false }, ((err, numberOfUpdated) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.debug('number of items updated: ', numberOfUpdated);
					subscriber.next(entry);
				}
			}).bind(this));
		});
	}

	getAllEntries(): Observable<Entry[]> {
		console.debug(`StorageService - load - this.datastore.filename: ${this.datastore.filename}`);
		return new Observable(subscriber => {
			this.datastore.find({}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.log('getAllEntries - entries', entries);
					subscriber.next(entries);
				}
			});
		});
	}
	
	searchEntry(input: string): Observable<Entry[]> {
		if (input.includes(':')) {
			const parts = input.split(':');
			if (parts.length === 2) {
				const field = parts[0] ? parts[0].trim().toLowerCase() : '';
				const value = parts[1] ? parts[1].trim().toLowerCase() : '';
				console.log(`searchEntry field:value = ${field}:${value}`);
				const toFind = {};
				if (field === 'genre' || field === 'genres') {
					console.log('looking up genres');
					return this.searchGenres(value);
				} else if (field === 'starring' || field === 'stars' || field === 'actors' || field === 'cast') {
					console.log('looking up actors');
					return this.searchActors(value);
				}
				const keyword = { $regex: new RegExp(value, 'i')};
				toFind[field] = keyword;
				console.log('toFind', toFind);
				return new Observable(subscriber => {
					this.datastore.find(toFind, (err, entries) => {
						if (err) {
							subscriber.error(err);
						} else {
							console.log(`searchEntry(${input}) results:`);
							console.log(entries);
							subscriber.next(entries);
						}
					});
				});
			}
		} else {
			return this.searchAll(input);
		}
	}

	searchActors(value): Observable<Entry[]> {
		const keyword = new RegExp(value, 'i');
		return new Observable(subscriber => {
			this.datastore.find({
				$or: [
					{actors: keyword},
					{stars: keyword},
					{starring: keyword},
					{cast: keyword},
				],
			}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.log(`searchActors(${value}) results:`, entries);
					subscriber.next(entries);
				}
			});
		});
	}

	searchGenres(value): Observable<Entry[]> {
		const keyword = new RegExp(value, 'i');
		return new Observable(subscriber => {
			this.datastore.find({
				// This doesn't take into account custom fields
				$or: [
					{genre: keyword},
					{genres: keyword},
				],
			}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.log(`searchGenres(${value}) results:`, entries);
					subscriber.next(entries);
				}
			});
		});
	}

	searchAll(input): Observable<Entry[]> {
		const keyword = new RegExp(input, 'i');
		return new Observable(subscriber => {
			this.datastore.find({
				// This doesn't take into account custom fields
				$or: [
					{overview: keyword},
					{release_date: keyword},
					{year: keyword},
					{released: keyword},
					{original_title: keyword},
					{media_type: keyword},
					{original_language: keyword},
					{title: keyword},
					{origin_country: keyword},
					{name: keyword},
					{original_name: keyword},
					{known_for: keyword},
					{belongs_to_collection: keyword},
					{genre: keyword},
					{genres: keyword},
					{actors: keyword},
					{stars: keyword},
					{starring: keyword},
					{cast: keyword},
					{director: keyword},
					{production_companies: keyword},
					{production_countries: keyword},
					{spoken_languages: keyword},
					{tagline: keyword}
				],
			}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.log(`searchAll(${input}) results:`, entries);
					subscriber.next(entries);
				}
			});
		});
	}

	getFileFromPath(file: string) {
		const forwardSlash = file.lastIndexOf('/');
		const backwardSlash = file.lastIndexOf('\\');
		let separator = forwardSlash, newTitle;
		if (forwardSlash === -1) {
			separator = backwardSlash;
		}
		newTitle = file.substring(separator + 1);
		return newTitle;
	}

	cleanArrays(): Observable<Entry[]> {
		console.debug('storageService.cleanArrays - function entry');
		return new Observable(subscriber => {
			this.datastore.find({}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.debug('storageService.cleanArrays - entries before clean', entries);
					for (const entry of entries) {
						for (const prop in entry) {
							if (prop !== 'sort_order' && entry[prop] != null) {
								if (Array.isArray(entry[prop])) {
									console.debug('storageService.cleanArrays - found an array - converting');
									console.debug(`storageService.cleanArrays - before conversion`, entry[prop]);
									entry[prop] = entry[prop].map(e => e.name).join(', ');
									console.debug(`storageService.cleanArrays - after conversion`, entry[prop]);
								} else if (typeof entry[prop] === 'object') {
									console.debug('storageService.cleanArrays - typeof entry[prop] is object');
									console.debug(`storageService.cleanArrays - before conversion`, entry[prop]);
									entry[prop] = entry[prop].name;
									console.debug(`storageService.cleanArrays - after conversion`, entry[prop]);
								}
							} else {
								console.debug('storageService.cleanArrays - entry[prop] is null, prop is ' + prop);
							}
						}
					}

					console.debug('cleanArrays - entries after clean', entries);

					/* this.datastore.remove({}, { multi: true}, (err, numRemoved) => {
						if (err) {
							console.error('error', err);
						}
						console.debug('number removed:', numRemoved); */
						// console.debug('cleanArrays - updating entries', entries);

						/* this.datastore.insert(entries, (err, entriesOut) => {
							if (err) {
								console.error('cleanArray - error inserting after cleaning');
								subscriber.error(err);
							}
							console.debug('cleanArray - new entries after insert: ', entriesOut);
							subscriber.next(entriesOut);
						}); */

						const cleanEntries = [];
						console.debug('cleanArray - entries.length:', entries.length);
						let i = 0;
						for (const entry of entries) {
							cleanEntries.push(new Observable(subscriber => {
								this.datastore.update({ _id: entry._id }, entry, { returnUpdatedDocs: true }, (err, numAffected, affectedDocuments) => {
									if (err) {
										console.error('cleanArray - error inserting after cleaning');
										subscriber.error(err);
									}
									console.debug('cleanArray - new entries after insert (' + numAffected + '):', affectedDocuments);
									console.debug('cleanArray - ', ++i);
									subscriber.next(affectedDocuments);
								});
							}));
						}

						forkJoin(cleanEntries).subscribe(entries => {
							console.debug('cleanArray - forkJoin - entries.length', entries.length);
							console.debug('cleanArray - forkJoin - entries', entries);
							subscriber.next(entries);
						});
						
					/* }); */
				}
			});
		});
	}

	changeAllPathsTo(path: string): Observable<Entry[]> {

		const newPath = path;
		console.debug(`Changing all movie file paths to ${newPath}`);

		return new Observable(subscriber => {
			console.debug('finding entries');
			this.datastore.find({}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.debug(`found ${entries.length} entries`);

					const newEntries = [];
					for (const entry of entries) {
						let newFileValue = entry.file;
						entry.files = undefined;
						entry.path = undefined;
						newFileValue = this.getFileFromPath(newFileValue);
						newFileValue = newPath + newFileValue;
						console.debug(`changed ${entry.file} to ${newFileValue}`);
						entry.file = newFileValue;
						newEntries.push(entry);
					}

					console.debug('all new entries', entries);

					this.datastore.remove({}, { multi: true}, (err1, numRemoved) => {
						if (err1) {
							console.error('error', err1);
						}
						console.debug('number removed:', numRemoved);
						console.debug('updating entries', newEntries);
						this.datastore.insert(newEntries, (err2, entriesOut) => {
							if (err2) {
								subscriber.error(err2);
							}
							console.debug('new entries after insert: ', entriesOut);
							subscriber.next(entriesOut);
						});
					});
				}
			});
		});
	}

	touchAll(): Observable<number> {
		console.debug(`touchAll - attempting to touch all movies`);
		return new Observable(subscriber => {
			this.datastore.update({ }, {
				$set: { touched: true }
			}, { multi: true }, ((err, numUpdated) => {
				if (err) {
					subscriber.error(err);
				} else {
					console.log('number of items updated: ', numUpdated);
					subscriber.next(numUpdated);
				}
			}).bind(this));
		});
	}

	exists(file: string): Observable<Entry> {
		return new Observable(subscriber => {
			this.datastore.find({ file: new RegExp(file, 'i') }, (err, exists) => {
				if (err) {
					console.debug(`exists(${file}) error:`, err);
					subscriber.error(err);
				}
				console.debug(`exists(${file})`, exists);
				subscriber.next(exists);
			});
		});
	}

	addEntry(newEntry: Entry): Observable<Entry> {
		
		console.debug('storageService - addEntry - entry', newEntry);
		return new Observable(subscriber => {
			this.datastore.insert(newEntry, (err, entry) => {
				if (err) {
					subscriber.error(err);
					console.debug('storageService - addEntry - err', err);
				}
				console.debug('storageService - addEntry - new entry added', entry);
				subscriber.next(entry);
			});
		});
	}

	removeEntry(id: string): Observable<number> {
		console.debug(`removeEntry(${id}) - attempting to remove record`);
		return new Observable(subscriber => {
			this.datastore.remove({ id: id }, {}, (err, numRemoved) => {
				if (err) {
					subscriber.error(err);
				}
				console.debug(`removeEntry(${id}) - records removed: ${numRemoved}`);
				subscriber.next(numRemoved);
			});
		});
	}

	base64MimeType(encoded) {
		let result = null;
		if (typeof encoded !== 'string') {
			return result;
		}
		const parts = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)/);
		if (parts && parts.length) {
			result = { mime: parts[1], data: parts[2] };
		} else {
			//console.debug('no cigar');
		}
		return result;
	}
}
