'use strict';

const Homey = require('homey');

class PresenceDriver extends Homey.Driver {

  async onPairListDevices() {
    const unifi = this.homey.app.getUnifi();
    if (!unifi) {
      throw new Error('Stel eerst het IP-adres en de API-sleutel in bij de app-instellingen');
    }
    const clients = await unifi.clients();
    // Most recently connected first: the phone you just used is at the top.
    clients.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    return clients.map(c => ({
      name: c.name,
      data: { id: c.mac },
      store: { mac: c.mac, vendor: c.vendor },
    }));
  }
}

module.exports = PresenceDriver;
