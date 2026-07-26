'use strict';

const https = require('https');

/**
 * Minimal client for a local UniFi OS console, authenticated with a locally
 * created API key. Deliberately local-only: a cloud key cannot answer
 * questions about an outage, because during an outage the cloud is exactly
 * what you cannot reach.
 */
class UnifiClient {

  constructor({ host, apiKey, site = 'default' }) {
    this.host = host;
    this.apiKey = apiKey;
    this.site = site;
  }

  get(path) {
    return new Promise((resolve, reject) => {
      const request = https.request(
        {
          host: this.host,
          path,
          method: 'GET',
          timeout: 10000,
          // UniFi consoles serve a self-signed certificate on the LAN.
          rejectUnauthorized: false,
          headers: { 'X-API-KEY': this.apiKey, Accept: 'application/json' },
        },
        response => {
          let body = '';
          response.on('data', chunk => { body += chunk; });
          response.on('end', () => {
            if (response.statusCode === 401 || response.statusCode === 403) {
              return reject(new Error('UniFi rejected the API key'));
            }
            if (response.statusCode >= 400) {
              return reject(new Error(`UniFi returned HTTP ${response.statusCode}`));
            }
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(new Error('UniFi returned no readable JSON'));
            }
          });
        },
      );
      request.on('timeout', () => { request.destroy(); reject(new Error('UniFi did not respond')); });
      request.on('error', reject);
      request.end();
    });
  }

  /** Raw health subsystems, keyed by subsystem name. */
  async health() {
    const result = await this.get(`/proxy/network/api/s/${this.site}/stat/health`);
    const subsystems = {};
    for (const entry of result.data || []) {
      subsystems[entry.subsystem] = entry;
    }
    return subsystems;
  }

  /** Every client the gateway currently knows, normalised. */
  async clients() {
    const result = await this.get(`/proxy/network/api/s/${this.site}/stat/sta`);
    return (result.data || []).map(c => ({
      mac: c.mac,
      name: c.name || c.hostname || c.oui || c.mac,
      ip: c.ip || null,
      wired: Boolean(c.is_wired),
      uptime: typeof c.uptime === 'number' ? c.uptime : null,
      lastSeen: typeof c.last_seen === 'number' ? c.last_seen : null,
      vendor: c.oui || null,
    }));
  }

  /** The numbers worth putting on a dashboard, flattened and named. */
  async summary() {
    const health = await this.health();
    const wan = health.wan || {};
    const www = health.www || {};
    const lan = health.lan || {};

    return {
      wanOk: wan.status === 'ok',
      wwwOk: www.status === 'ok',
      publicIp: wan.wan_ip || null,
      isp: wan.isp_name || null,
      gatewayName: wan.gw_name || null,
      latency: typeof www.latency === 'number' ? www.latency : null,
      // Seconds the WAN link has been up: a fresh, low value means it
      // recently dropped, even if nobody was watching at the time.
      wanUptime: typeof www.uptime === 'number' ? www.uptime : null,
      drops: typeof www.drops === 'number' ? www.drops : null,
      speedDown: typeof www.xput_down === 'number' ? www.xput_down : null,
      speedUp: typeof www.xput_up === 'number' ? www.xput_up : null,
      speedtestPing: typeof www.speedtest_ping === 'number' ? www.speedtest_ping : null,
      speedtestAt: typeof www.speedtest_lastrun === 'number' ? www.speedtest_lastrun : null,
      clients: typeof lan.num_user === 'number' ? lan.num_user : null,
      guests: typeof lan.num_guest === 'number' ? lan.num_guest : null,
      iot: typeof lan.num_iot === 'number' ? lan.num_iot : null,
    };
  }
}

module.exports = UnifiClient;
