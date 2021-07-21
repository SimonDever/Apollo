import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { Entry } from '../../library/store/entry.model';
import * as Datastore from 'nedb';
import { ElectronService } from 'ngx-electron';

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
			this.config.update(
				{ id: 'config' },
				{ $set: { ...configItems } },
				{ upsert: true },
				(err, numberOfUpdated) => {
					if (err) {
						subscriber.error(err);
					} else {
						//console.log('number of items updated: ', numberOfUpdated);
						subscriber.next(numberOfUpdated);
					}
				}
			);
		});
	}

	deleteAllEntries(): Observable<number> {
		console.log(`StorageService - deleteAllEntries - entry`);
		return new Observable(subscriber => {
			this.datastore.remove({}, { multi: true }, function (err, countRemoved) {
				if (err) {
					subscriber.error(err);
				} else {
					subscriber.next(countRemoved);
				}
				console.log('StorageService - deleteAllEntries - complete');
			});
		})
	}


	getEntries(): Observable<Entry[]> {
		return new Observable(subscriber => {
			this.datastore.find({}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				}
				//console.log('getEntries()', entries);
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
				}

				genreList = genreList.map(genre => {
					return genre.toLowerCase().trim();
				});

				genreList = Array.from(new Set(genreList));

				console.log('genreList:', genreList);

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
					//console.log('getEntry(id)', entry);
					subscriber.next(entry);
				}
			});
		});
	}

	updateEntry(id: string, entry: Entry): Observable<Entry> {

		const valuesToRemove = {};
		Object.entries(entry).forEach(([k, v]) => {
			if (v == null || v === 'null') {
				delete entry[k];
				valuesToRemove[k] = true;
			}
		});

		return new Observable(subscriber => {
			this.datastore.update({ id: id }, {
				$set: { ...entry },
				$unset: { ...valuesToRemove }
			}, { upsert: true }, ((err, numberOfUpdated) => {
				if (err) {
					subscriber.error(err);
				} else {
					//console.log('number of items updated: ', numberOfUpdated);
					subscriber.next(entry);
				}
			}).bind(this));
		});
	}

	getAllEntries(): Observable<Entry[]> {
		//console.log(`StorageService - load - this.datastore.filename: ${this.datastore.filename}`);
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
		const parts = input.split(':');
		if (parts.length === 2) {
			const toFind = {};
			let field = parts[0].toLowerCase();
			if (field === 'genre') {
				field = 'genres';
			}
			const keyword = { $regex: new RegExp(parts[1], 'i')};
			toFind[field] = keyword;
			// console.log(toFind);
			return new Observable(subscriber => {
				this.datastore.find(toFind, (err, entries) => {
					if (err) {
						subscriber.error(err);
					} else {
						// console.log(`searchEntry(${input}) results:`);
						// console.log(entries);
						subscriber.next(entries);
					}
				});
			});
		} else {
			const keyword = new RegExp(parts[0], 'i');
			return new Observable(subscriber => {
				this.datastore.find({
					// This doesn't take into account custom fields
					$or: [
						{overview: keyword},
						{release_date: keyword},
						{original_title: keyword},
						{media_type: keyword},
						{original_language: keyword},
						{title: keyword},
						{origin_country: keyword},
						{name: keyword},
						{original_name: keyword},
						{known_for: keyword},
						{belongs_to_collection: keyword},
						{genres: keyword},
						{production_companies: keyword},
						{production_countries: keyword},
						{spoken_languages: keyword},
						{tagline: keyword}
					],
				}, (err, entries) => {
					if (err) {
						subscriber.error(err);
					} else {
						// console.log(`searchEntry(${input}) results:`);
						// console.log(entries);
						subscriber.next(entries);
					}
				});
			});
		}
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
						//console.debug('cleanArrays - updating entries', entries);

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
									console.debug('cleanArray - new entries after insert ('+numAffected+'):', affectedDocuments);
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

	changeAllPathsTo(): Observable<Entry> {

		const newPath = `\\\\Synology\\Movies\\`;
		//console.log(`Changing all movie file paths to ${newPath}`);

		return new Observable(subscriber => {
			//console.log('finding entries');
			this.datastore.find({}, (err, entries) => {
				if (err) {
					subscriber.error(err);
				} else {
					//console.log(`found ${entries.length} entries`);

					const newEntries = [];
					for(const entry of entries) {
						let newFileValue = entry.file;
						entry.files = undefined;
						entry.path = undefined;
						newFileValue = this.getFileFromPath(newFileValue);
						newFileValue = newPath + newFileValue;
						//console.log(`changed ${entry.file} to ${newFileValue}`);
						entry.file = newFileValue;
						newEntries.push(entry);
					}

					//console.log('all new entries', entries);

					this.datastore.remove({}, { multi: true}, (err, numRemoved) => {
						if (err) {
							console.error('error', err);
						}
						//console.log('number removed:', numRemoved);
						//console.log('updating entries', newEntries);
						this.datastore.insert(newEntries, (err, entriesOut) => {
							if (err) {
								subscriber.error(err);
							}
							//console.log('new entries after insert: ', entriesOut);
							subscriber.next(entriesOut);
						});
					});
				}
			});
		})
	}

	exists(file: string): Observable<Entry> {
		return new Observable(subscriber => {
			this.datastore.find({ file: new RegExp(file, 'i') }, (err, exists) => {
				if (err) {
					//console.log(`exists(${file}) error:`, err);
					subscriber.error(err);
				}
				//console.log(`exists(${file})`, exists);
				subscriber.next(exists);
			});
		});
	}

	addEntry(newEntry: Entry): Observable<Entry> {
		console.log('storageService - addEntry - entry');
		return new Observable(subscriber => {
			this.datastore.insert(newEntry, (err, entry) => {
				if (err) {
					subscriber.error(err);
					console.log('storageService - addEntry - err', err);
				}
				console.log('storageService - addEntry - newEntry', entry);
				subscriber.next(entry);
			});
		});
	}

	removeEntry(id: string): Observable<number> {
		//console.log('attempting to removeEntry(id)');
		//console.log(id);
		return new Observable(subscriber => {
			this.datastore.remove({ id: id }, {}, (err, numRemoved) => {
				if (err) {
					subscriber.error(err);
				}
				//console.log('removeEntry(id)');
				//console.log(numRemoved);
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
			//console.log('no cigar');
		}
		return result;
	}
}
