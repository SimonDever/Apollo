const electron = require('electron');
const process = require('process');
const { app, BrowserWindow, dialog, ipcMain, session } = electron;
const fs = require('fs');
//const loadDevtool = require('electron-load-devtool');
const updater = require('electron-simple-updater');
var vlc = require('./vlc');
const log = require('electron-log');
const { default: installExtension, REDUX_DEVTOOLS } = require('electron-devtools-installer');
let mainWindow = null;

setupLogging = () => {
	log.transports.file.level = true;
	log.transports.console.level = true;
	Object.assign(console, log.functions);
	/* log.catchErrors({
		showDialog: false,
		onError(error, versions, submitIssue) {
			electron.dialog.showMessageBox({
				title: 'An error occurred',
				message: error.message,
				detail: error.stack,
				type: 'error',
				buttons: ['Ignore', 'Report', 'Exit'],
			})
				.then((result) => {
					if (result.response === 1) {
						submitIssue('https://github.com/SimonDever/Apollo/issues/new', {
							title: `Error report for ${versions.app}`,
							body: 'Error:\n```' + error.stack + '\n```\n' + `OS: ${versions.os}`
						});
						return;
					}
				
					if (result.response === 2) {
						electron.app.quit();
					}
				});
		}
	}); */
};

setupVLC = () => {
	ipcMain.on('play-video', (event, arg) => {
		console.log('play-video action triggered, arg:', arg);
			const player = new vlc(arg);
			player.on('statuschange', (error, status) => {
				if (status) {
					console.debug('VLC - current time', status.time + 's')
				}
			});
	});
}

installReduxDevTools = () => {
	installExtension(REDUX_DEVTOOLS)
			.then((name) => console.log(`Added Extension:  ${name}`))
			.catch((err) => console.log('An error occurred: ', err));
}

setupMainWindow = () => {
	mainWindow = new BrowserWindow({
		// autoHideMenuBar: true,
		// titleBarStyle: 'hiddenInset',
		// setMenuBarVisibility: true,
		// transparent: true,
		// frame: false
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		},
		show: false
	});

	mainWindow.webContents.session.clearCache(function () { });
	
	/* const reduxDevToolsExtId = 'lmhkpmbekcpmknklioeibfkpmmfibljd';
	const path = `${app.getPath('userData')}\\extensions\\${reduxDevToolsExtId}`;
	console.log('load extension: ', path);
	session.defaultSession.loadExtension(path)
		.then((name) => console.log(`Added Extension:  ${name}`))
		.catch((err) => console.log('An error occurred: ', err)); */
		
	//mainWindow.webContents.openDevTools();

	mainWindow.webContents.on('devtools-opened', () => {
		setImmediate(() => {
			mainWindow.focus();
		});
	});
	
	//var { width, height } = electron.screen.getPrimaryDisplay().workAreaSize

	mainWindow.maximize();

	mainWindow.loadURL('file://' + __dirname + '/index.html');

	mainWindow.on('ready-to-show', () => {
		mainWindow.show();
		mainWindow.focus();
	});

	mainWindow.on('close', () => {
		mainWindow = null;
	});
}

setupEventHandlers = () => {
	setupVLC();

	app.on('second-instance', (event, commandLine, workingDirectory) => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) {
				mainWindow.restore();
			}
			mainWindow.focus();
		}
	});

	app.on('window-all-closed', (e) => {
		app.quit();
	});

	app.on('before-quit', () => {
		if (mainWindow) {
			mainWindow.close();
		}
	});

	app.on('ready', () => {
		setupMainWindow();
		installReduxDevTools();
		setupPosterFolder();
	});

	ipcMain.on('update', (event, args) => {
		console.log('Received update command from angular');
		//checkForUpdates();
	});
}

setupPosterFolder = () => {
	fs.exists(`${app.getPath('userData')}\\posters`, (exists) => {
		if (!exists) {
			console.log('Creating poster folder');
			fs.mkdir(`${app.getPath('userData')}\\posters`,
				(err) => err ? console.log(err) : {});
		}
	});
}
/* 
initializeUpdater = () => {
	console.log('initializeUpdater() running');

	updater.init({
		url: 'https://raw.githubusercontent.com/SimonDever/Apollo/master/updates/win32-x64-prod.json',
		checkUpdateOnStart: false,
		autoDownload: false,
		disabled: false
	});
	
	updater.on('update-available', (meta) => {
		console.log('onUpdateAvailable - meta', meta);

		const options = {
			type: 'question',
			buttons: ['Not now', 'Update'],
			defaultId: 3,
			title: 'Update available',
			message: 'Would you like to update to the latest version?'
		};

		dialog.showMessageBox(null, options, (response, checkboxChecked) => {
			console.log(response);
			console.log(checkboxChecked);
			updater.setOptions('autoDownload', checkboxChecked);
			if (buttons[response] === 'Not now') {
				console.log('Skipping update');
			} else if (buttons[response] === 'Update') {
				updater.downloadUpdate();
			}
		});
	});

	updater.on('update-downloading', () => {
		console.log('onUpdateDownloading');
	});

	updater.on('update-downloaded', () => {
		if (confirm('The update has finished downloading. Would you like to quit and install the update now?')) {
			updater.quitAndInstall();
		}
	});
} 

checkForUpdates = () => {
	console.log('checkForUpdate() running');
	updater.checkForUpdates();
}
*/
if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	setupLogging();
	setupEventHandlers();
	//initializeUpdater();
	//checkForUpdates();
}
