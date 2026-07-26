'use strict';

const Homey = require('homey');

const POLL_INTERVAL_MS = 60 * 1000;

class PresenceDevice extends Homey.Device {

  async onInit() {
    this._mac = (this.getStore().mac || this.getData().id || '').toLowerCase();
    this._home = null;
    this._lastSeenAt = Date.now();

    this._poll = this._poll.bind(this);
    this._timer = this.homey.setInterval(this._poll, POLL_INTERVAL_MS);
    this._poll();

    this.log(`Presence watcher started for ${this._mac}`);
  }

  async onUninit() {
    if (this._timer) this.homey.clearInterval(this._timer);
  }

  async _poll() {
    let clients;
    try {
      clients = await this.homey.app.getClients();
    } catch (err) {
      this.error(`Kon de clientlijst niet ophalen: ${err.message}`);
      await this.setUnavailable(err.message).catch(this.error);
      return;
    }
    await this.setAvailable().catch(this.error);

    const seen = clients.some(c => (c.mac || '').toLowerCase() === this._mac);
    if (seen) this._lastSeenAt = Date.now();

    // A phone drops off wifi for a moment all the time. Only call it away
    // once it has been missing for the configured patience.
    const awayMinutes = this.getSetting('away_minutes') || 10;
    const goneFor = (Date.now() - this._lastSeenAt) / 60000;
    const home = seen || goneFor < awayMinutes;

    if (home === this._home) return;

    const first = this._home === null;
    this._home = home;
    await this.setCapabilityValue('is_home', home).catch(this.error);
    if (first) return; // do not fire flows just because Homey restarted

    this.log(home ? 'is thuisgekomen' : 'is vertrokken');
    this.homey.flow.getDeviceTriggerCard(home ? 'came_home' : 'left_home')
      .trigger(this)
      .catch(this.error);
  }

  get isHome() {
    return this._home === true;
  }
}

module.exports = PresenceDevice;
