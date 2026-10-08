module.exports = {
  status: 'partial',
  getStatus: () => ({ provider: 'AgeChecker.Net', status: 'partial', note: 'Public docs show popup flow; merchant login required for full API wiring.' }),
  popupUrl: 'https://agechecker.net/verify',
  verify: () => true
};
