'use strict';

const Homey = require('homey');
const UnifiClient = require('./lib/UnifiClient');

class NetworkWatchApp extends Homey.App {

  async onInit() {
    this.homey.flow.getConditionCard('internet_available')
      .registerRunListener(async ({ device }) => !device.isDown);

    this.log('Network Watch app started');
  }

  /** A client built from the current settings, or null when not configured. */
  getUnifi() {
    const host = this.homey.settings.get('host');
    const apiKey = this.homey.settings.get('apikey');
    if (!host || !apiKey) return null;
    return new UnifiClient({ host, apiKey });
  }

  async testConnection() {
    const unifi = this.getUnifi();
    if (!unifi) throw new Error('Vul eerst een IP-adres en een API-sleutel in');
    return unifi.summary();
  }
}

module.exports = NetworkWatchApp;
