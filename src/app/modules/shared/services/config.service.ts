import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root',
})
export class ConfigService {
	public fs: any;
	public apiKey: string;
	public userDataFolder: string;
	public filename: string;
	private log;

	constructor(private electronService: ElectronService) {
		this.fs = this.electronService.remote.require('fs');
		this.userDataFolder = this.electronService.remote.app.getPath('userData');
		this.filename = `${this.userDataFolder}\\api-key.txt`;
	}

	load() {
		if (this.fs.existsSync(this.filename)) {
			this.fs.readFile(this.filename, (error, data: string) => {
				if (error) {
					console.error(error);
				} else {
					console.debug(`ConfigService :: load() - API key obtained from file = ${data}`);
					this.apiKey = data;
				}
			});
		}
	}

	saveApiKey(apiKey: string) {
		if (this.fs.existsSync(this.filename)) {
			console.debug('ConfigService :: save() - Removing preexisting key');
			this.fs.unlinkSync(this.filename, (err) => console.log(err));
		}

		this.fs.writeFileSync(this.filename, apiKey, (err) => console.log(err));
		this.apiKey = apiKey;
		console.debug('ConfigService :: save() - API key saved to file', apiKey);
	}
}
