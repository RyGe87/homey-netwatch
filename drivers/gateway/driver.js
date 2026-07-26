'use strict';

const Homey = require('homey');

class GatewayDriver extends Homey.Driver {

  async onPairListDevices() {
    const unifi = this.homey.app.getUnifi();
    if (!unifi) {
      throw new Error('Stel eerst het IP-adres en de API-sleutel in bij de app-instellingen');
    }
    const summary = await unifi.summary();
    return [{
      name: summary.gatewayName ? `UniFi ${summary.gatewayName}` : 'UniFi-gateway',
      data: { id: `gateway-${this.homey.settings.get('host')}` },
    }];
  }
}

module.exports = GatewayDriver;
