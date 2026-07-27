'use strict';

const Homey = require('homey');
const UnifiClient = require('./lib/UnifiClient');
const { HomeyAPI } = require('homey-api');

// Keep enough history to spot a pattern, not enough to bloat the settings.
const MAX_OUTAGES = 100;

class NetworkWatchApp extends Homey.App {

  async onInit() {
    this.homey.flow.getConditionCard('internet_available')
      .registerRunListener(async ({ device }) => !device.isDown);

    this.homey.flow.getConditionCard('is_home')
      .registerRunListener(async ({ device }) => device.isHome);

    this._api = await HomeyAPI.createAppAPI({ homey: this.homey }).catch(err => {
      this.error(`Kon de Homey-API niet openen: ${err.message}`);
      return null;
    });

    this.log('Network Watch app started');
  }

  /** A client built from the current settings, or null when not configured. */
  getUnifi() {
    const host = this.homey.settings.get('host');
    const apiKey = this.homey.settings.get('apikey');
    if (!host || !apiKey) return null;
    return new UnifiClient({ host, apiKey });
  }

  /** One shared, briefly cached client list: ten presence devices should not
   *  mean ten API calls a minute. */
  async getClients() {
    const now = Date.now();
    if (this._clients && now - this._clientsAt < 20000) return this._clients;

    const unifi = this.getUnifi();
    if (!unifi) throw new Error('Geen gateway ingesteld');
    this._clients = await unifi.clients();
    this._clientsAt = now;
    return this._clients;
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

  /** Write a line to Homey's timeline. Stored locally, so it survives an
   *  outage — unlike a push notification, which needs the very internet
   *  connection that just disappeared. */
  async notify(text) {
    if (this.homey.settings.get('notifications') === false) return;
    try {
      await this.homey.notifications.createNotification({ excerpt: text });
    } catch (err) {
      this.error(`Kon geen notificatie maken: ${err.message}`);
    }
  }

  /** Push to every household member. The mobile card needs the COMPLETE user
   *  object: give it only an id and it reports success while delivering
   *  nothing. A push cannot arrive during the outage itself — it travels via
   *  Athom's cloud — so this is used for the "back online" message, which is
   *  the one carrying the whole story anyway. */
  async push(text) {
    if (!this._api) throw new Error('Homey-API niet beschikbaar');
    const users = await this._api.users.getUsers();
    let verstuurd = 0;
    for (const user of Object.values(users)) {
      if (!user.enabled) continue;
      await this._api.flow.runFlowCardAction({
        uri: 'homey:manager:mobile',
        id: 'homey:manager:mobile:push_text',
        args: { user, text },
      });
      verstuurd += 1;
    }
    this.log(`Pushbericht naar ${verstuurd} gebruiker(s): ${text}`);
    return { verstuurd };
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
