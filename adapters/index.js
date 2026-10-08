const Persona = require('./persona');
const Veriff = require('./veriff');
const AgeChecker = require('./agechecker');
const Payment = require('./payment');

module.exports = {
  persona: Persona,
  veriff: Veriff,
  agechecker: AgeChecker,
  payment: Payment,
  getAdapterStatus: () => Payment.getAdapterStatus(),
  status: 'verified'
};
