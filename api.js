'use strict';

module.exports = {
  async test({ homey }) {
    return homey.app.testConnection();
  },

  async outages({ homey }) {
    return homey.app.getOutages();
  },
};
