'use strict';

module.exports = {
  async test({ homey }) {
    return homey.app.testConnection();
  },

  async outages({ homey }) {
    return homey.app.getOutages();
  },

  async testpush({ homey }) {
    return homey.app.push('Netwerkwacht: dit is een testmelding. Werkt hij, dan '
      + 'krijg je ook bericht zodra het internet terug is.');
  },
};
