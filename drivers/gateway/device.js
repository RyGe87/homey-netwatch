'use strict';

const Homey = require('homey');

const POLL_INTERVAL_MS = 60 * 1000;

class GatewayDevice extends Homey.Device {

  async onInit() {
    this._wanOk = null;
    this._publicIp = null;
    this._speedtestAt = null;

    this._poll = this._poll.bind(this);
    this._timer = this.homey.setInterval(this._poll, POLL_INTERVAL_MS);
    this._poll();

    this.log('UniFi gateway watcher started');
  }

  async onUninit() {
    if (this._timer) this.homey.clearInterval(this._timer);
  }

  async _poll() {
    const unifi = this.homey.app.getUnifi();
    if (!unifi) {
      await this.setUnavailable('Geen API-sleutel ingesteld').catch(this.error);
      return;
    }

    let summary;
    try {
      summary = await unifi.summary();
    } catch (err) {
      this.error(`Kon de gateway niet uitlezen: ${err.message}`);
      await this.setUnavailable(err.message).catch(this.error);
      return;
    }
    await this.setAvailable().catch(this.error);

    const set = (capability, value) => {
      if (value === null || value === undefined) return;
      this.setCapabilityValue(capability, value).catch(this.error);
    };

    // The gateway calls WAN "ok" when the link is up; www reflects whether
    // traffic actually reaches the internet. Both must hold.
    const online = summary.wanOk && summary.wwwOk;
    set('alarm_wan', !online);
    set('measure_latency', summary.latency);
    set('measure_speed_down', summary.speedDown);
    set('measure_speed_up', summary.speedUp);
    set('measure_clients', summary.clients);

    if (this._wanOk !== null && online !== this._wanOk) {
      const card = online ? 'wan_up' : 'wan_down';
      this.log(`WAN ${online ? 'hersteld' : 'weggevallen'}`);
      this.homey.flow.getDeviceTriggerCard(card).trigger(this).catch(this.error);
    }
    this._wanOk = online;

    if (summary.publicIp && this._publicIp && summary.publicIp !== this._publicIp) {
      this.log(`Publiek IP gewijzigd: ${this._publicIp} -> ${summary.publicIp}`);
      this.homey.flow.getDeviceTriggerCard('public_ip_changed')
        .trigger(this, { ip: summary.publicIp, previous: this._publicIp })
        .catch(this.error);
    }
    if (summary.publicIp) this._publicIp = summary.publicIp;

    if (summary.speedtestAt && this._speedtestAt && summary.speedtestAt !== this._speedtestAt) {
      this.homey.flow.getDeviceTriggerCard('speedtest_updated')
        .trigger(this, {
          down: Math.round(summary.speedDown || 0),
          up: Math.round(summary.speedUp || 0),
          ping: Math.round(summary.speedtestPing || 0),
        })
        .catch(this.error);
    }
    if (summary.speedtestAt) this._speedtestAt = summary.speedtestAt;

    // Handy on the device page: who your provider is and what your public
    // address is, without needing a separate lookup.
    await this.setSettings({
      isp: summary.isp || '-',
      public_ip: summary.publicIp || '-',
    }).catch(() => {});
  }
}

module.exports = GatewayDevice;
