import { Injectable } from "@angular/core";
import { ElectronService } from "ngx-electron";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ConfigService {
  public fs: any;
  public apiKey: string;
  public userDataFolder: string;
  public filename: string;
  private log;

  constructor(private electronService: ElectronService) {
    this.fs = this.electronService.remote.require("fs");
    this.userDataFolder = this.electronService.remote.app.getPath("userData");
    this.filename = `${this.userDataFolder}\\api-key.txt`;
    this.log = console.log;
  }

  setupLogging() {
    /*
    const log = console.log.bind(console);
    console.log = (...args) => {
      this.electronService.ipcRenderer.send('log', args);
      log(...args);
    };
    
    const debug = console.debug.bind(console);
    console.debug = (...args) => {
      this.electronService.ipcRenderer.send('debug', args);
      debug(...args);
    };
    
    const error = console.error.bind(console);
    console.error = (...args) => {
      this.electronService.ipcRenderer.send('error', args);
      error(...args);
    };

    console.log('Finished setupLogging()');
    */
  }

  load() {
    this.setupLogging();

    if (this.fs.existsSync(this.filename)) {
      this.fs.readFile(this.filename, (error, data: string) => {
        if (error) {
          console.error(error);
        } else {
          // console.log(`ConfigService :: load() - API key obtained from file = ${data}`);
          this.apiKey = data;
        }
      });
    }
  }

  saveApiKey(apiKey: string) {
    if (this.fs.existsSync(this.filename)) {
      // console.log('ConfigService :: save() - Removing preexisting key');
      this.fs.unlinkSync(this.filename, (err) => console.log(err));
    }

    this.fs.writeFileSync(this.filename, apiKey, (err) => console.log(err));
    this.apiKey = apiKey;
    // console.log('ConfigService :: save() - API key saved to file');
  }
}
