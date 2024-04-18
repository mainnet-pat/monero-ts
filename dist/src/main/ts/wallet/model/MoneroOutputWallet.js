"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _assert = _interopRequireDefault(require("assert"));
var _GenUtils = _interopRequireDefault(require("../../common/GenUtils"));
var _MoneroError = _interopRequireDefault(require("../../common/MoneroError"));

var _MoneroOutput = _interopRequireDefault(require("../../daemon/model/MoneroOutput"));

var _MoneroTxWallet = _interopRequireDefault(require("./MoneroTxWallet"));

/**
 * Models a Monero output with wallet extensions.
 */
class MoneroOutputWallet extends _MoneroOutput.default {







  /**
   * Construct the model.
   * 
   * @param {MoneroOutputWallet} [output] is existing state to initialize from (optional)
   */
  constructor(output) {
    super(output);
  }

  getTx() {
    return super.getTx();
  }

  setTx(tx) {
    if (tx !== undefined && !(tx instanceof _MoneroTxWallet.default)) throw new _MoneroError.default("Wallet output's transaction must be of type MoneroTxWallet");
    super.setTx(tx);
    return this;
  }

  getAccountIndex() {
    return this.accountIndex;
  }

  setAccountIndex(accountIndex) {
    this.accountIndex = accountIndex;
    return this;
  }

  getSubaddressIndex() {
    return this.subaddressIndex;
  }

  setSubaddressIndex(subaddressIndex) {
    this.subaddressIndex = subaddressIndex;
    return this;
  }

  getIsSpent() {
    return this.isSpent;
  }

  setIsSpent(isSpent) {
    this.isSpent = isSpent;
    return this;
  }

  /**
   * Indicates if this output has been deemed 'malicious' and will therefore
   * not be spent by the wallet.
   * 
   * @return Boolean is whether or not this output is frozen
   */
  getIsFrozen() {
    return this.isFrozen;
  }

  setIsFrozen(isFrozen) {
    this.isFrozen = isFrozen;
    return this;
  }

  getIsLocked() {
    if (this.getTx() === undefined) return undefined;
    return this.getTx().getIsLocked();
  }

  copy() {
    return new MoneroOutputWallet(this.toJson());
  }

  toJson() {
    let json = Object.assign({}, this, super.toJson());
    delete json.tx;
    return json;
  }

  /**
   * Updates this output by merging the latest information from the given
   * output.
   * 
   * Merging can modify or build references to the output given so it
   * should not be re-used or it should be copied before calling this method.
   * 
   * @param output is the output to merge into this one
   */
  merge(output) {
    (0, _assert.default)(output instanceof MoneroOutputWallet);
    if (this === output) return;
    super.merge(output);
    this.setAccountIndex(_GenUtils.default.reconcile(this.getAccountIndex(), output.getAccountIndex()));
    this.setSubaddressIndex(_GenUtils.default.reconcile(this.getSubaddressIndex(), output.getSubaddressIndex()));
    this.setIsSpent(_GenUtils.default.reconcile(this.getIsSpent(), output.getIsSpent(), { resolveTrue: true })); // output can become spent
    this.setIsFrozen(_GenUtils.default.reconcile(this.getIsFrozen(), output.getIsFrozen()));
    return this;
  }

  toString(indent = 0) {
    let str = super.toString(indent) + "\n";
    str += _GenUtils.default.kvLine("Account index", this.getAccountIndex(), indent);
    str += _GenUtils.default.kvLine("Subaddress index", this.getSubaddressIndex(), indent);
    str += _GenUtils.default.kvLine("Is spent", this.getIsSpent(), indent);
    str += _GenUtils.default.kvLine("Is frozen", this.getIsFrozen(), indent);
    return str.slice(0, str.length - 1); // strip last newline
  }

  // -------------------- OVERRIDE COVARIANT RETURN TYPES ---------------------

  setKeyImage(keyImage) {
    super.setKeyImage(keyImage);
    return this;
  }

  setAmount(amount) {
    super.setAmount(amount);
    return this;
  }

  setIndex(index) {
    super.setIndex(index);
    return this;
  }

  setRingOutputIndices(ringOutputIndices) {
    super.setRingOutputIndices(ringOutputIndices);
    return this;
  }

  setStealthPublicKey(stealthPublicKey) {
    super.setStealthPublicKey(stealthPublicKey);
    return this;
  }
}exports.default = MoneroOutputWallet;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYXNzZXJ0IiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfR2VuVXRpbHMiLCJfTW9uZXJvRXJyb3IiLCJfTW9uZXJvT3V0cHV0IiwiX01vbmVyb1R4V2FsbGV0IiwiTW9uZXJvT3V0cHV0V2FsbGV0IiwiTW9uZXJvT3V0cHV0IiwiY29uc3RydWN0b3IiLCJvdXRwdXQiLCJnZXRUeCIsInNldFR4IiwidHgiLCJ1bmRlZmluZWQiLCJNb25lcm9UeFdhbGxldCIsIk1vbmVyb0Vycm9yIiwiZ2V0QWNjb3VudEluZGV4IiwiYWNjb3VudEluZGV4Iiwic2V0QWNjb3VudEluZGV4IiwiZ2V0U3ViYWRkcmVzc0luZGV4Iiwic3ViYWRkcmVzc0luZGV4Iiwic2V0U3ViYWRkcmVzc0luZGV4IiwiZ2V0SXNTcGVudCIsImlzU3BlbnQiLCJzZXRJc1NwZW50IiwiZ2V0SXNGcm96ZW4iLCJpc0Zyb3plbiIsInNldElzRnJvemVuIiwiZ2V0SXNMb2NrZWQiLCJjb3B5IiwidG9Kc29uIiwianNvbiIsIk9iamVjdCIsImFzc2lnbiIsIm1lcmdlIiwiYXNzZXJ0IiwiR2VuVXRpbHMiLCJyZWNvbmNpbGUiLCJyZXNvbHZlVHJ1ZSIsInRvU3RyaW5nIiwiaW5kZW50Iiwic3RyIiwia3ZMaW5lIiwic2xpY2UiLCJsZW5ndGgiLCJzZXRLZXlJbWFnZSIsImtleUltYWdlIiwic2V0QW1vdW50IiwiYW1vdW50Iiwic2V0SW5kZXgiLCJpbmRleCIsInNldFJpbmdPdXRwdXRJbmRpY2VzIiwicmluZ091dHB1dEluZGljZXMiLCJzZXRTdGVhbHRoUHVibGljS2V5Iiwic3RlYWx0aFB1YmxpY0tleSIsImV4cG9ydHMiLCJkZWZhdWx0Il0sInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21haW4vdHMvd2FsbGV0L21vZGVsL01vbmVyb091dHB1dFdhbGxldC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCBHZW5VdGlscyBmcm9tIFwiLi4vLi4vY29tbW9uL0dlblV0aWxzXCI7XG5pbXBvcnQgTW9uZXJvRXJyb3IgZnJvbSBcIi4uLy4uL2NvbW1vbi9Nb25lcm9FcnJvclwiO1xuaW1wb3J0IE1vbmVyb0tleUltYWdlIGZyb20gXCIuLi8uLi9kYWVtb24vbW9kZWwvTW9uZXJvS2V5SW1hZ2VcIjtcbmltcG9ydCBNb25lcm9PdXRwdXQgZnJvbSBcIi4uLy4uL2RhZW1vbi9tb2RlbC9Nb25lcm9PdXRwdXRcIjtcbmltcG9ydCBNb25lcm9UeCBmcm9tIFwiLi4vLi4vZGFlbW9uL21vZGVsL01vbmVyb1R4XCI7XG5pbXBvcnQgTW9uZXJvVHhXYWxsZXQgZnJvbSBcIi4vTW9uZXJvVHhXYWxsZXRcIjtcblxuLyoqXG4gKiBNb2RlbHMgYSBNb25lcm8gb3V0cHV0IHdpdGggd2FsbGV0IGV4dGVuc2lvbnMuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vbmVyb091dHB1dFdhbGxldCBleHRlbmRzIE1vbmVyb091dHB1dCB7XG5cbiAgYWNjb3VudEluZGV4OiBudW1iZXI7XG4gIHN1YmFkZHJlc3NJbmRleDogbnVtYmVyO1xuICBpc1NwZW50OiBib29sZWFuO1xuICBpc0Zyb3plbjogYm9vbGVhbjtcbiAgaXNMb2NrZWQ6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCB0aGUgbW9kZWwuXG4gICAqIFxuICAgKiBAcGFyYW0ge01vbmVyb091dHB1dFdhbGxldH0gW291dHB1dF0gaXMgZXhpc3Rpbmcgc3RhdGUgdG8gaW5pdGlhbGl6ZSBmcm9tIChvcHRpb25hbClcbiAgICovXG4gIGNvbnN0cnVjdG9yKG91dHB1dD86IFBhcnRpYWw8TW9uZXJvT3V0cHV0V2FsbGV0Pikge1xuICAgIHN1cGVyKG91dHB1dCk7XG4gIH1cblxuICBnZXRUeCgpOiBNb25lcm9UeFdhbGxldCB7XG4gICAgcmV0dXJuIHN1cGVyLmdldFR4KCkgYXMgTW9uZXJvVHhXYWxsZXQ7XG4gIH1cbiAgXG4gIHNldFR4KHR4OiBNb25lcm9UeCk6IE1vbmVyb091dHB1dFdhbGxldCB7XG4gICAgaWYgKHR4ICE9PSB1bmRlZmluZWQgJiYgISh0eCBpbnN0YW5jZW9mIE1vbmVyb1R4V2FsbGV0KSkgdGhyb3cgbmV3IE1vbmVyb0Vycm9yKFwiV2FsbGV0IG91dHB1dCdzIHRyYW5zYWN0aW9uIG11c3QgYmUgb2YgdHlwZSBNb25lcm9UeFdhbGxldFwiKTtcbiAgICBzdXBlci5zZXRUeCh0eCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIGdldEFjY291bnRJbmRleCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmFjY291bnRJbmRleDtcbiAgfVxuXG4gIHNldEFjY291bnRJbmRleChhY2NvdW50SW5kZXg6IG51bWJlcik6IE1vbmVyb091dHB1dFdhbGxldCB7XG4gICAgdGhpcy5hY2NvdW50SW5kZXggPSBhY2NvdW50SW5kZXg7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBnZXRTdWJhZGRyZXNzSW5kZXgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5zdWJhZGRyZXNzSW5kZXg7XG4gIH1cblxuICBzZXRTdWJhZGRyZXNzSW5kZXgoc3ViYWRkcmVzc0luZGV4OiBudW1iZXIpOiBNb25lcm9PdXRwdXRXYWxsZXQge1xuICAgIHRoaXMuc3ViYWRkcmVzc0luZGV4ID0gc3ViYWRkcmVzc0luZGV4O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICBnZXRJc1NwZW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzU3BlbnQ7XG4gIH1cblxuICBzZXRJc1NwZW50KGlzU3BlbnQ6IGJvb2xlYW4pOiBNb25lcm9PdXRwdXRXYWxsZXQge1xuICAgIHRoaXMuaXNTcGVudCA9IGlzU3BlbnQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgaWYgdGhpcyBvdXRwdXQgaGFzIGJlZW4gZGVlbWVkICdtYWxpY2lvdXMnIGFuZCB3aWxsIHRoZXJlZm9yZVxuICAgKiBub3QgYmUgc3BlbnQgYnkgdGhlIHdhbGxldC5cbiAgICogXG4gICAqIEByZXR1cm4gQm9vbGVhbiBpcyB3aGV0aGVyIG9yIG5vdCB0aGlzIG91dHB1dCBpcyBmcm96ZW5cbiAgICovXG4gIGdldElzRnJvemVuKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzRnJvemVuO1xuICB9XG5cbiAgc2V0SXNGcm96ZW4oaXNGcm96ZW46IGJvb2xlYW4pOiBNb25lcm9PdXRwdXRXYWxsZXQge1xuICAgIHRoaXMuaXNGcm96ZW4gPSBpc0Zyb3plbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBcbiAgZ2V0SXNMb2NrZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuZ2V0VHgoKSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiAodGhpcy5nZXRUeCgpIGFzIE1vbmVyb1R4V2FsbGV0KS5nZXRJc0xvY2tlZCgpO1xuICB9XG4gIFxuICBjb3B5KCk6IE1vbmVyb091dHB1dFdhbGxldCB7XG4gICAgcmV0dXJuIG5ldyBNb25lcm9PdXRwdXRXYWxsZXQodGhpcy50b0pzb24oKSk7XG4gIH1cbiAgXG4gIHRvSnNvbigpOiBhbnkge1xuICAgIGxldCBqc29uOiBhbnkgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLCBzdXBlci50b0pzb24oKSk7XG4gICAgZGVsZXRlIGpzb24udHg7XG4gICAgcmV0dXJuIGpzb247XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoaXMgb3V0cHV0IGJ5IG1lcmdpbmcgdGhlIGxhdGVzdCBpbmZvcm1hdGlvbiBmcm9tIHRoZSBnaXZlblxuICAgKiBvdXRwdXQuXG4gICAqIFxuICAgKiBNZXJnaW5nIGNhbiBtb2RpZnkgb3IgYnVpbGQgcmVmZXJlbmNlcyB0byB0aGUgb3V0cHV0IGdpdmVuIHNvIGl0XG4gICAqIHNob3VsZCBub3QgYmUgcmUtdXNlZCBvciBpdCBzaG91bGQgYmUgY29waWVkIGJlZm9yZSBjYWxsaW5nIHRoaXMgbWV0aG9kLlxuICAgKiBcbiAgICogQHBhcmFtIG91dHB1dCBpcyB0aGUgb3V0cHV0IHRvIG1lcmdlIGludG8gdGhpcyBvbmVcbiAgICovXG4gIG1lcmdlKG91dHB1dDogTW9uZXJvT3V0cHV0V2FsbGV0KTogTW9uZXJvT3V0cHV0V2FsbGV0IHtcbiAgICBhc3NlcnQob3V0cHV0IGluc3RhbmNlb2YgTW9uZXJvT3V0cHV0V2FsbGV0KTtcbiAgICBpZiAodGhpcyA9PT0gb3V0cHV0KSByZXR1cm47XG4gICAgc3VwZXIubWVyZ2Uob3V0cHV0KTtcbiAgICB0aGlzLnNldEFjY291bnRJbmRleChHZW5VdGlscy5yZWNvbmNpbGUodGhpcy5nZXRBY2NvdW50SW5kZXgoKSwgb3V0cHV0LmdldEFjY291bnRJbmRleCgpKSk7XG4gICAgdGhpcy5zZXRTdWJhZGRyZXNzSW5kZXgoR2VuVXRpbHMucmVjb25jaWxlKHRoaXMuZ2V0U3ViYWRkcmVzc0luZGV4KCksIG91dHB1dC5nZXRTdWJhZGRyZXNzSW5kZXgoKSkpO1xuICAgIHRoaXMuc2V0SXNTcGVudChHZW5VdGlscy5yZWNvbmNpbGUodGhpcy5nZXRJc1NwZW50KCksIG91dHB1dC5nZXRJc1NwZW50KCksIHtyZXNvbHZlVHJ1ZTogdHJ1ZX0pKTsgLy8gb3V0cHV0IGNhbiBiZWNvbWUgc3BlbnRcbiAgICB0aGlzLnNldElzRnJvemVuKEdlblV0aWxzLnJlY29uY2lsZSh0aGlzLmdldElzRnJvemVuKCksIG91dHB1dC5nZXRJc0Zyb3plbigpKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIHRvU3RyaW5nKGluZGVudCA9IDApOiBzdHJpbmcge1xuICAgIGxldCBzdHIgPSBzdXBlci50b1N0cmluZyhpbmRlbnQpICsgXCJcXG5cIlxuICAgIHN0ciArPSBHZW5VdGlscy5rdkxpbmUoXCJBY2NvdW50IGluZGV4XCIsIHRoaXMuZ2V0QWNjb3VudEluZGV4KCksIGluZGVudCk7XG4gICAgc3RyICs9IEdlblV0aWxzLmt2TGluZShcIlN1YmFkZHJlc3MgaW5kZXhcIiwgdGhpcy5nZXRTdWJhZGRyZXNzSW5kZXgoKSwgaW5kZW50KTtcbiAgICBzdHIgKz0gR2VuVXRpbHMua3ZMaW5lKFwiSXMgc3BlbnRcIiwgdGhpcy5nZXRJc1NwZW50KCksIGluZGVudCk7XG4gICAgc3RyICs9IEdlblV0aWxzLmt2TGluZShcIklzIGZyb3plblwiLCB0aGlzLmdldElzRnJvemVuKCksIGluZGVudCk7XG4gICAgcmV0dXJuIHN0ci5zbGljZSgwLCBzdHIubGVuZ3RoIC0gMSk7ICAvLyBzdHJpcCBsYXN0IG5ld2xpbmVcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tIE9WRVJSSURFIENPVkFSSUFOVCBSRVRVUk4gVFlQRVMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgc2V0S2V5SW1hZ2Uoa2V5SW1hZ2U6IE1vbmVyb0tleUltYWdlKTogTW9uZXJvT3V0cHV0V2FsbGV0IHtcbiAgICBzdXBlci5zZXRLZXlJbWFnZShrZXlJbWFnZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIHNldEFtb3VudChhbW91bnQ6IGJpZ2ludCk6IE1vbmVyb091dHB1dFdhbGxldCB7XG4gICAgc3VwZXIuc2V0QW1vdW50KGFtb3VudCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIHNldEluZGV4KGluZGV4OiBudW1iZXIpOiBNb25lcm9PdXRwdXRXYWxsZXQge1xuICAgIHN1cGVyLnNldEluZGV4KGluZGV4KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICBcbiAgc2V0UmluZ091dHB1dEluZGljZXMocmluZ091dHB1dEluZGljZXM6IG51bWJlcltdKTogTW9uZXJvT3V0cHV0V2FsbGV0IHtcbiAgICBzdXBlci5zZXRSaW5nT3V0cHV0SW5kaWNlcyhyaW5nT3V0cHV0SW5kaWNlcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIHNldFN0ZWFsdGhQdWJsaWNLZXkoc3RlYWx0aFB1YmxpY0tleTogc3RyaW5nKTogTW9uZXJvT3V0cHV0V2FsbGV0IHtcbiAgICBzdXBlci5zZXRTdGVhbHRoUHVibGljS2V5KHN0ZWFsdGhQdWJsaWNLZXkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59XG4iXSwibWFwcGluZ3MiOiJ5TEFBQSxJQUFBQSxPQUFBLEdBQUFDLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBQyxTQUFBLEdBQUFGLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBRSxZQUFBLEdBQUFILHNCQUFBLENBQUFDLE9BQUE7O0FBRUEsSUFBQUcsYUFBQSxHQUFBSixzQkFBQSxDQUFBQyxPQUFBOztBQUVBLElBQUFJLGVBQUEsR0FBQUwsc0JBQUEsQ0FBQUMsT0FBQTs7QUFFQTtBQUNBO0FBQ0E7QUFDZSxNQUFNSyxrQkFBa0IsU0FBU0MscUJBQVksQ0FBQzs7Ozs7Ozs7RUFRM0Q7QUFDRjtBQUNBO0FBQ0E7QUFDQTtFQUNFQyxXQUFXQSxDQUFDQyxNQUFvQyxFQUFFO0lBQ2hELEtBQUssQ0FBQ0EsTUFBTSxDQUFDO0VBQ2Y7O0VBRUFDLEtBQUtBLENBQUEsRUFBbUI7SUFDdEIsT0FBTyxLQUFLLENBQUNBLEtBQUssQ0FBQyxDQUFDO0VBQ3RCOztFQUVBQyxLQUFLQSxDQUFDQyxFQUFZLEVBQXNCO0lBQ3RDLElBQUlBLEVBQUUsS0FBS0MsU0FBUyxJQUFJLEVBQUVELEVBQUUsWUFBWUUsdUJBQWMsQ0FBQyxFQUFFLE1BQU0sSUFBSUMsb0JBQVcsQ0FBQyw0REFBNEQsQ0FBQztJQUM1SSxLQUFLLENBQUNKLEtBQUssQ0FBQ0MsRUFBRSxDQUFDO0lBQ2YsT0FBTyxJQUFJO0VBQ2I7O0VBRUFJLGVBQWVBLENBQUEsRUFBVztJQUN4QixPQUFPLElBQUksQ0FBQ0MsWUFBWTtFQUMxQjs7RUFFQUMsZUFBZUEsQ0FBQ0QsWUFBb0IsRUFBc0I7SUFDeEQsSUFBSSxDQUFDQSxZQUFZLEdBQUdBLFlBQVk7SUFDaEMsT0FBTyxJQUFJO0VBQ2I7O0VBRUFFLGtCQUFrQkEsQ0FBQSxFQUFXO0lBQzNCLE9BQU8sSUFBSSxDQUFDQyxlQUFlO0VBQzdCOztFQUVBQyxr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