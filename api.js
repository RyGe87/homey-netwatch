'use strict';

module.exports = {
  async test({ homey }) {
    return homey.app.testConnection();
  },
};
