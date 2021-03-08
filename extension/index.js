'use strict';
const speedcontrolBundle = 'nodecg-speedcontrol';
const marathonName = 'TEST6';
module.exports = function (nodecg) {
  nodecg.listenFor('updateSchedule', async (value, ack) => {
    updateSchedule()
      .then(() => {
        if (ack && !ack.handled) {
          nodecg.log.info('updateSchedule OK');
          processAck(ack, null);
        }
      })
      .catch(error => {
        nodecg.log.warn(error);
        nodecg.log.info('UPDATE FAILED');
        processAck(ack, error);
      });
  });

  nodecg.listenFor('logging', async (data, ack) => {
    if (!data) {
      nodecg.log.error('could not log message from dashboard because of invalid data');
      processAck(ack, 'could not log message from dashboard because of invalid data');
    } else {
      var message = '[' + data.dashboard + '] ' + data.message;
      if (data.level == 'INFO') {
        nodecg.log.info(message)
      } else if (data.level == 'WARN') {
        nodecg.log.warn(message);
      } else {
        nodecg.log.error(message);
      }
      processAck(ack,null);
    }
  });

  function updateSchedule() {
    var runFinishTimes = nodecg.readReplicant('runFinishTimes', speedcontrolBundle);
    var runDataActiveRun = nodecg.readReplicant('runDataActiveRun', speedcontrolBundle);

    if (!runDataActiveRun) {
      return Promise.reject('no active run');
    }
    if (!runDataActiveRun.externalID) {
      return Promise.reject('no externalID');
    }

    if (!runDataActiveRun.scheduledS) {
      return Promise.reject('no scheduledS');
    }

    if (!runFinishTimes[runDataActiveRun.id]) {
      return Promise.reject('run not finished');
    }

    var activeRunFinishedTimeInSeconds = Math.floor(runFinishTimes[runDataActiveRun.id].milliseconds / 1000);
    var finish = Math.floor(Date.now() / 1000);

    if (runDataActiveRun.scheduledS > finish) {
      return Promise.reject('start>finish');
    }
    var activeRunSetupTimeInSeconds = finish - runDataActiveRun.scheduledS - activeRunFinishedTimeInSeconds;
    if (activeRunSetupTimeInSeconds < 0) {
      return Promise.reject('setupTimeInSeconds<0');
    }

    var data = {
      marathonName: marathonName,
      schedule: {
        id: 0,
        lines: [
          {
            id: parseInt(runDataActiveRun.externalID),
            estimate: 'PT' + activeRunFinishedTimeInSeconds + 'S',
            setupTime: 'PT' + activeRunSetupTimeInSeconds + 'S',
          }
        ]
      }
    }

    const speedcontrol = nodecg.extensions[speedcontrolBundle];
    return speedcontrol.sendMessage('updateOengusSchedule', data)
  }
}

function processAck(ack, error) {
  if (ack && !ack.handled) {
    ack(error);
  }
}
