/**
 * Monero integrated address model.
 */
class MoneroIntegratedAddress {
  
  constructor(standardAddress, paymentId, integratedAddress) {
    this.json = {};
    this.json.standardAddress = standardAddress;
    this.json.paymentId = paymentId;
    this.json.integratedAddress = integratedAddress;
  }

  getStandardAddress() {
    return this.json.standardAddress;
  }
  
  setStandardAddress(standardAddress) {
    this.json.standardAddress = standardAddress;
    return this;
  }
  
  getPaymentId() {
    return this.json.paymentId;
  }
  
  setPaymentId(paymentId) {
    this.json.paymentId = this.json.paymentId;
    return this;
  }
  
  getIntegratedAddress() {
    return this.json.integratedAddress;
  }
  
  setIntegratedAddress(integratedAddress) {
    this.json.integratedAddress = integratedAddress;
    return this;
  }
  
  toString() {
    return this.json.integratedAddress;
  }
}

module.exports = MoneroIntegratedAddress;