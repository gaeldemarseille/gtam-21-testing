'use strict';
const speedcontrolBundle = 'nodecg-speedcontrol';
const runDataArray = nodecg.Replicant('runDataArray', speedcontrolBundle);
const runDataActiveRunSurrounding = nodecg.Replicant('runDataActiveRunSurrounding', speedcontrolBundle);
const timer = nodecg.Replicant('timer', speedcontrolBundle);
const marathonName = 'TEST6'

runDataActiveRunSurrounding.on('change', (newVal, oldVal) => {
    var button = document.getElementById('intermissionButton');
    var nextRun = runDataArray.value.find((run) => run.id === newVal.next);
    if (!nextRun) {
        button.textContent = 'No runs left ?\r\n😢😢😢';
    } else {
        button.textContent = 'Switch to Intermission\r\n' + nextRun.game + ' - ' + nextRun.category;
    }
});

timer.on('change', (newVal, oldVal) => {
    var button = document.getElementById('intermissionButton');
    button.disabled = ['running', 'paused'].includes(newVal.state);
});

function switchToIntermission() {
    var button = document.getElementById('intermissionButton');
    button.disabled = true;

    updateSchedule()
        .then(() => {
            importSchedule()
                .then(() => {
                    intermission();
                })
                .catch(error => {
                    log('ERROR', 'importSchedule failed : ' + error);
                    intermission();
                });
        })
        .catch(error => {
            log('ERROR', 'updateSchedule NOT OK : ' + error);
            intermission();
        });
}

function updateSchedule() {
    return nodecg.sendMessage('updateSchedule');
}

function importSchedule() {
    return nodecg.sendMessageToBundle('importOengusSchedule', speedcontrolBundle, { marathonShort: marathonName, useJapanese: false })
}

function intermission() {
    changeSceneInObs();

    nodecg.sendMessageToBundle('twitchStartCommercial', speedcontrolBundle, { duration: 180 })
        .catch(error => {
            log('ERROR', 'twitchStartCommercial failed : ', error);
        });

    nodecg.sendMessageToBundle('changeToNextRun', speedcontrolBundle)
        .catch(error => {
            log('ERROR', 'changeToNextRun failed : ', error);
        });

    var button = document.getElementById('intermissionButton');
    button.disabled = false;
}

var obsSettings = {
    address: "localhost:4444",
    password: 'password'
}

const obs = new OBSWebSocket();
var attempt = 0;
var obsButton = document.getElementById('obsButton');

function connectToObs() {
    var obsButton = document.getElementById('obsButton');
    obsButton.disabled = true;
    obsButton.textContent = 'Connecting ...';
    attempt++;
    obs.connect(obsSettings)
        .then(() => {
            attempt = 0;
            obsButton.textContent = 'OBS 🟢';
            button.disabled = true;
        })
        .catch((error) => { });
}

obs.on('ConnectionClosed', data => {
    var obsButton = document.getElementById('obsButton');
    if (attempt < 10) {
        obsButton.textContent = 'OBS 🔴';
        obsButton.disabled = true;
        log('WARN', 'OBS connection lost, retrying in 5 seconds');
        setTimeout(connectToObs, 5000);
    } else {
        obsButton.textContent = 'Connect to OBS';
        obsButton.disabled = false;
    }
});

// Error catching.
obs.on('error', error => {
    log('ERROR', 'OBS error: ' + error);
});

function changeSceneInObs() {
    obs.send('SetMute', {
        'source': 'Runner 1',
        'mute': true
    });
    obs.send('SetMute', {
        'source': 'Runner 2',
        'mute': true
    });

    obs.send('SetCurrentScene', {
        'scene-name': 'Intermission1'
    });
}



function log(level, message) {
    nodecg.sendMessage('logging', { dashboard: 'Intermission Dashboard', level: level, message: message })
        .catch(error => {
            nodecg.log.error('logging error');
            nodecg.log.error(error);
        });
}
