'use strict';

const Homey = require('homey');
const https = require('https');

// Two independent providers, so one company's hiccup is not read as an outage.
const PROBES = [
  { name: 'google', host: 'connectivitycheck.gstatic.com', path: '/generate_204' },
  { name: 'cloudflare', host: '1.1.1.1', path: '/cdn-cgi/trace' },
];

const CHECK_INTERVAL_MS = 30 * 1000;
const PROBE_TIMEOUT_MS = 8000;
// Only call it an outage after this many consecutive failed rounds, so a
// single dropped packet does not wake the whole house.
const FAILURES_BEFORE_DOWN = 2;

class InternetDevice extends Homey.Device {

  async onInit() {
    this._failures = 0;
    this._down = false;
    this._downSince = null;
    this._diagnosis = null;

    if (!this.hasCapability('measure_outages_7d')) {
      await this.addCapability('measure_outages_7d').catch(this.error);
    }
    this._updateOutageCount();

    this._tick = this._tick.bind(this);
    this._timer = this.homey.setInterval(this._tick, CHECK_INTERVAL_MS);
    this._tick();

    this.log('Internet watchdog started');
  }

  async onUninit() {
    if (this._timer) this.homey.clearInterval(this._timer);
  }

  /** Resolve to the round-trip time in ms, or null when the probe fails. */
  probe({ host, path }) {
    return new Promise(resolve => {
      const started = Date.now();
      const request = https.request(
        { host, path, method: 'GET', timeout: PROBE_TIMEOUT_MS, servername: host },
        response => {
          response.resume(); // drain, we only care that it answered
          response.on('end', () => resolve(
            response.statusCode < 500 ? Date.now() - started : null,
          ));
        },
      );
      request.on('timeout', () => { request.destroy(); resolve(null); });
      request.on('error', () => resolve(null));
      request.end();
    });
  }

  async _tick() {
    const results = await Promise.all(PROBES.map(p => this.probe(p)));
    const successes = results.filter(ms => ms !== null);

    if (successes.length > 0) {
      const latency = Math.round(Math.min(...successes));
      this.setCapabilityValue('measure_latency', latency).catch(this.error);
      this._failures = 0;
      if (this._down) await this._markRestored();
      return;
    }

    this._failures += 1;
    if (!this._down && this._failures >= FAILURES_BEFORE_DOWN) await this._markDown();
  }

  async _markDown() {
    this._down = true;
    this._downSince = Date.now();
    await this.setCapabilityValue('alarm_internet', true).catch(this.error);
    await this.setCapabilityValue('measure_latency', 0).catch(this.error);

    // Ask the gateway what it sees while the outage is happening — afterwards
    // the evidence is gone.
    const { diagnosis, isp } = await this.homey.app.diagnose();
    this._diagnosis = diagnosis;
    this.log(`Internet unreachable — ${diagnosis}`);

    this.homey.flow.getDeviceTriggerCard('internet_lost')
      .trigger(this, { diagnosis, isp: isp || '' })
      .catch(this.error);
  }

  async _markRestored() {
    const startedAt = this._downSince;
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    const diagnosis = this._diagnosis || '';
    this._down = false;
    this._downSince = null;
    this._diagnosis = null;

    this.log(`Internet is back after ${seconds}s`);
    await this.setCapabilityValue('alarm_internet', false).catch(this.error);

    this.homey.app.recordOutage({
      start: new Date(startedAt).toISOString(),
      end: new Date().toISOString(),
      seconds,
      diagnosis,
    });
    this._updateOutageCount();

    this.homey.flow.getDeviceTriggerCard('internet_restored')
      .trigger(this, {
        minutes: Math.round(seconds / 60),
        human: this.constructor.humanDuration(seconds),
        diagnosis,
      })
      .catch(this.error);
  }

  _updateOutageCount() {
    this.setCapabilityValue('measure_outages_7d', this.homey.app.countOutagesSince(7))
      .catch(this.error);
  }

  static humanDuration(seconds) {
    if (seconds < 60) return `${seconds} seconden`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} minuten`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} uur en ${rest} minuten` : `${hours} uur`;
  }

  get isDown() {
    return this._down;
  }
}

module.exports = InternetDevice;
