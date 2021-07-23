import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ElectronService } from 'ngx-electron';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css'],

})
export class AppComponent {
	
	constructor(private electronService: ElectronService) {
	}

	@HostListener('body:keydown', ['$event.key'])
	devToolsHotkeyListener(key: string) {
		switch (key) {
			case 'F12':
				this.electronService.ipcRenderer.send('devtools-hotkey');
				break;
		}
	}
}
