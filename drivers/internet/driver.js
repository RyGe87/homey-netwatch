'use strict';

const Homey = require('homey');

class InternetDriver extends Homey.Driver {

  async onPairListDevices() {
    // Nothing to discover: there is exactly one internet connection.
    return [{
      name: this.homey.__('internet_connection'),
      data: { id: 'internet' },
    }];
  }
}

module.exports = InternetDriver;
