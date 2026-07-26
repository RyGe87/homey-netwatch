'use strict';

const Homey = require('homey');

class NetworkWatchApp extends Homey.App {

  async onInit() {
    this.homey.flow.getConditionCard('internet_available')
      .registerRunListener(async ({ device }) => !device.isDown);

    this.log('Network Watch app started');
  }
}

module.exports = NetworkWatchApp;
