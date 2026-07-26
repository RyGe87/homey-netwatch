'use strict';

const Homey = require('homey');
const UnifiClient = require('./lib/UnifiClient');

// Keep enough history to spot a pattern, not enough to bloat the settings.
const MAX_OUTAGES = 100;

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

  // -------------------------------------------------------------------
  // Outage forensics
  // -------------------------------------------------------------------

  /**
   * Ask the gateway what it sees at the moment the internet is unreachable.
   * The answer separates "our line is down" from "the provider is broken"
   * from "something inside the house" — exactly what you need on the phone
   * with your ISP.
   */
  async diagnose() {
    const unifi = this.getUnifi();
    if (!unifi) {
      return { diagnosis: 'Geen gateway ingesteld, dus geen diagnose', isp: '' };
    }

    let summary;
    try {
      summary = await unifi.summary();
    } catch (err) {
      return {
        diagnosis: 'De gateway is zelf niet bereikbaar — probleem in huis, of de router herstart',
        isp: '',
      };
    }

    const isp = summary.isp || '';
    if (!summary.wanOk) {
      return {
        diagnosis: `De WAN-verbinding is down — kabel, modem of de lijn van ${isp || 'de provider'}`,
        isp,
        summary,
      };
    }
    if (!summary.wwwOk) {
      return {
        diagnosis: `De lijn staat, maar er komt geen internet door — vermoedelijk een storing bij ${isp || 'de provider'}`,
        isp,
        summary,
      };
    }
    return {
      diagnosis: 'De gateway ziet geen probleem — mogelijk DNS of een gedeeltelijke storing verderop',
      isp,
      summary,
    };
  }

  getOutages() {
    return this.homey.settings.get('outages') || [];
  }

  /** Append a finished outage to the log, newest first. */
  recordOutage(entry) {
    const outages = [entry, ...this.getOutages()].slice(0, MAX_OUTAGES);
    this.homey.settings.set('outages', outages);
    return outages;
  }

  countOutagesSince(days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.getOutages().filter(o => Date.parse(o.start) >= cutoff).length;
  }
}

module.exports = NetworkWatchApp;
