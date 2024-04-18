"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _GenUtils = _interopRequireDefault(require("../../common/GenUtils"));

/**
 * Monero subaddress model.
 */
class MoneroSubaddress {











  constructor(subaddress) {
    Object.assign(this, subaddress);
    if (this.balance !== undefined && typeof this.balance !== "bigint") this.balance = BigInt(this.balance);
    if (this.unlockedBalance !== undefined && typeof this.unlockedBalance !== "bigint") this.unlockedBalance = BigInt(this.unlockedBalance);
  }

  toJson() {
    let json = Object.assign({}, this);
    if (json.balance !== undefined) json.balance = json.balance.toString();
    if (json.unlockedBalance !== undefined) json.unlockedBalance = json.unlockedBalance.toString();
    return json;
  }

  getAccountIndex() {
    return this.accountIndex;
  }

  setAccountIndex(accountIndex) {
    this.accountIndex = accountIndex;
    return this;
  }

  getIndex() {
    return this.index;
  }

  setIndex(index) {
    this.index = index;
    return this;
  }

  getAddress() {
    return this.address;
  }

  setAddress(address) {
    this.address = address;
    return this;
  }

  getLabel() {
    return this.label;
  }

  setLabel(label) {
    this.label = label;
    return this;
  }

  getBalance() {
    return this.balance;
  }

  setBalance(balance) {
    this.balance = balance;
    return this;
  }

  getUnlockedBalance() {
    return this.unlockedBalance;
  }

  setUnlockedBalance(unlockedBalance) {
    this.unlockedBalance = unlockedBalance;
    return this;
  }

  getNumUnspentOutputs() {
    return this.numUnspentOutputs;
  }

  setNumUnspentOutputs(numUnspentOutputs) {
    this.numUnspentOutputs = numUnspentOutputs;
    return this;
  }

  getIsUsed() {
    return this.isUsed;
  }

  setIsUsed(isUsed) {
    this.isUsed = isUsed;
    return this;
  }

  getNumBlocksToUnlock() {
    return this.numBlocksToUnlock;
  }

  setNumBlocksToUnlock(numBlocksToUnlock) {
    this.numBlocksToUnlock = numBlocksToUnlock;
    return this;
  }

  toString(indent = 0) {
    let str = "";
    str += _GenUtils.default.kvLine("Account index", this.getAccountIndex(), indent);
    str += _GenUtils.default.kvLine("Subaddress index", this.getIndex(), indent);
    str += _GenUtils.default.kvLine("Address", this.getAddress(), indent);
    str += _GenUtils.default.kvLine("Label", this.getLabel(), indent);
    str += _GenUtils.default.kvLine("Balance", this.getBalance(), indent);
    str += _GenUtils.default.kvLine("Unlocked balance", this.getUnlockedBalance(), indent);
    str += _GenUtils.default.kvLine("Num unspent outputs", this.getNumUnspentOutputs(), indent);
    str += _GenUtils.default.kvLine("Is used", this.getIsUsed(), indent);
    str += _GenUtils.default.kvLine("Num blocks to unlock", this.getNumBlocksToUnlock(), indent);
    return str.slice(0, str.length - 1); // strip last newline
  }
}exports.default = MoneroSubaddress;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfR2VuVXRpbHMiLCJfaW50ZXJvcFJlcXVpcmVEZWZhdWx0IiwicmVxdWlyZSIsIk1vbmVyb1N1YmFkZHJlc3MiLCJjb25zdHJ1Y3RvciIsInN1YmFkZHJlc3MiLCJPYmplY3QiLCJhc3NpZ24iLCJiYWxhbmNlIiwidW5kZWZpbmVkIiwiQmlnSW50IiwidW5sb2NrZWRCYWxhbmNlIiwidG9Kc29uIiwianNvbiIsInRvU3RyaW5nIiwiZ2V0QWNjb3VudEluZGV4IiwiYWNjb3VudEluZGV4Iiwic2V0QWNjb3VudEluZGV4IiwiZ2V0SW5kZXgiLCJpbmRleCIsInNldEluZGV4IiwiZ2V0QWRkcmVzcyIsImFkZHJlc3MiLCJzZXRBZGRyZXNzIiwiZ2V0TGFiZWwiLCJsYWJlbCIsInNldExhYmVsIiwiZ2V0QmFsYW5jZSIsInNldEJhbGFuY2UiLCJnZXRVbmxvY2tlZEJhbGFuY2UiLCJzZXRVbmxvY2tlZEJhbGFuY2UiLCJnZXROdW1VbnNwZW50T3V0cHV0cyIsIm51bVVuc3BlbnRPdXRwdXRzIiwic2V0TnVtVW5zcGVudE91dHB1dHMiLCJnZXRJc1VzZWQiLCJpc1VzZWQiLCJzZXRJc1VzZWQiLCJnZXROdW1CbG9ja3NUb1VubG9jayIsIm51bUJsb2Nrc1RvVW5sb2NrIiwic2V0TnVtQmxvY2tzVG9VbmxvY2siLCJpbmRlbnQiLCJzdHIiLCJHZW5VdGlscyIsImt2TGluZSIsInNsaWNlIiwibGVuZ3RoIiwiZXhwb3J0cyIsImRlZmF1bHQiXSwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbWFpbi90cy93YWxsZXQvbW9kZWwvTW9uZXJvU3ViYWRkcmVzcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgR2VuVXRpbHMgZnJvbSBcIi4uLy4uL2NvbW1vbi9HZW5VdGlsc1wiO1xuXG4vKipcbiAqIE1vbmVybyBzdWJhZGRyZXNzIG1vZGVsLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNb25lcm9TdWJhZGRyZXNzIHtcblxuICBhY2NvdW50SW5kZXg6IG51bWJlcjtcbiAgaW5kZXg6IG51bWJlcjtcbiAgYWRkcmVzczogc3RyaW5nO1xuICBsYWJlbDogc3RyaW5nO1xuICBiYWxhbmNlOiBiaWdpbnQ7XG4gIHVubG9ja2VkQmFsYW5jZTogYmlnaW50O1xuICBudW1VbnNwZW50T3V0cHV0czogbnVtYmVyO1xuICBpc1VzZWQ6IGJvb2xlYW47XG4gIG51bUJsb2Nrc1RvVW5sb2NrOiBudW1iZXI7XG4gIFxuICBjb25zdHJ1Y3RvcihzdWJhZGRyZXNzPzogUGFydGlhbDxNb25lcm9TdWJhZGRyZXNzPikge1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgc3ViYWRkcmVzcyk7XG4gICAgaWYgKHRoaXMuYmFsYW5jZSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiB0aGlzLmJhbGFuY2UgIT09IFwiYmlnaW50XCIpIHRoaXMuYmFsYW5jZSA9IEJpZ0ludCh0aGlzLmJhbGFuY2UpO1xuICAgIGlmICh0aGlzLnVubG9ja2VkQmFsYW5jZSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiB0aGlzLnVubG9ja2VkQmFsYW5jZSAhPT0gXCJiaWdpbnRcIikgdGhpcy51bmxvY2tlZEJhbGFuY2UgPSBCaWdJbnQodGhpcy51bmxvY2tlZEJhbGFuY2UpO1xuICB9XG4gIFxuICB0b0pzb24oKTogYW55IHtcbiAgICBsZXQganNvbjogYW55ID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcyk7XG4gICAgaWYgKGpzb24uYmFsYW5jZSAhPT0gdW5kZWZpbmVkKSBqc29uLmJhbGFuY2UgPSBqc29uLmJhbGFuY2UudG9TdHJpbmcoKTtcbiAgICBpZiAoanNvbi51bmxvY2tlZEJhbGFuY2UgIT09IHVuZGVmaW5lZCkganNvbi51bmxvY2tlZEJhbGFuY2UgPSBqc29uLnVubG9ja2VkQmFsYW5jZS50b1N0cmluZygpO1xuICAgIHJldHVybiBqc29uO1xuICB9XG4gIFxuICBnZXRBY2NvdW50SW5kZXgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5hY2NvdW50SW5kZXg7XG4gIH1cblxuICBzZXRBY2NvdW50SW5kZXgoYWNjb3VudEluZGV4OiBudW1iZXIpOiBNb25lcm9TdWJhZGRyZXNzIHtcbiAgICB0aGlzLmFjY291bnRJbmRleCA9IGFjY291bnRJbmRleDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGdldEluZGV4KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuaW5kZXg7XG4gIH1cblxuICBzZXRJbmRleChpbmRleDogbnVtYmVyKTogTW9uZXJvU3ViYWRkcmVzcyB7XG4gICAgdGhpcy5pbmRleCA9IGluZGV4O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICBnZXRBZGRyZXNzKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYWRkcmVzcztcbiAgfVxuXG4gIHNldEFkZHJlc3MoYWRkcmVzczogc3RyaW5nKTogTW9uZXJvU3ViYWRkcmVzcyB7XG4gICAgdGhpcy5hZGRyZXNzID0gYWRkcmVzcztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGdldExhYmVsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMubGFiZWw7XG4gIH1cblxuICBzZXRMYWJlbChsYWJlbDogc3RyaW5nKTogTW9uZXJvU3ViYWRkcmVzcyB7XG4gICAgdGhpcy5sYWJlbCA9IGxhYmVsO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZ2V0QmFsYW5jZSgpOiBiaWdpbnQge1xuICAgIHJldHVybiB0aGlzLmJhbGFuY2U7XG4gIH1cblxuICBzZXRCYWxhbmNlKGJhbGFuY2U6IGJpZ2ludCk6IE1vbmVyb1N1YmFkZHJlc3Mge1xuICAgIHRoaXMuYmFsYW5jZSA9IGJhbGFuY2U7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBnZXRVbmxvY2tlZEJhbGFuY2UoKTogYmlnaW50IHtcbiAgICByZXR1cm4gdGhpcy51bmxvY2tlZEJhbGFuY2U7XG4gIH1cblxuICBzZXRVbmxvY2tlZEJhbGFuY2UodW5sb2NrZWRCYWxhbmNlOiBiaWdpbnQpOiBNb25lcm9TdWJhZGRyZXNzIHtcbiAgICB0aGlzLnVubG9ja2VkQmFsYW5jZSA9IHVubG9ja2VkQmFsYW5jZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGdldE51bVVuc3BlbnRPdXRwdXRzKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMubnVtVW5zcGVudE91dHB1dHM7XG4gIH1cblxuICBzZXROdW1VbnNwZW50T3V0cHV0cyhudW1VbnNwZW50T3V0cHV0czogbnVtYmVyKTogTW9uZXJvU3ViYWRkcmVzcyB7XG4gICAgdGhpcy5udW1VbnNwZW50T3V0cHV0cyA9IG51bVVuc3BlbnRPdXRwdXRzO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZ2V0SXNVc2VkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmlzVXNlZDtcbiAgfVxuXG4gIHNldElzVXNlZChpc1VzZWQ6IGJvb2xlYW4pOiBNb25lcm9TdWJhZGRyZXNzIHtcbiAgICB0aGlzLmlzVXNlZCA9IGlzVXNlZDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGdldE51bUJsb2Nrc1RvVW5sb2NrKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMubnVtQmxvY2tzVG9VbmxvY2s7XG4gIH1cblxuICBzZXROdW1CbG9ja3NUb1VubG9jayhudW1CbG9ja3NUb1VubG9jazogbnVtYmVyKTogTW9uZXJvU3ViYWRkcmVzcyB7XG4gICAgdGhpcy5udW1CbG9ja3NUb1VubG9jayA9IG51bUJsb2Nrc1RvVW5sb2NrO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIFxuICB0b1N0cmluZyhpbmRlbnQgPSAwKTogc3RyaW5nIHtcbiAgICBsZXQgc3RyID0gXCJcIjtcbiAgICBzdHIgKz0gR2VuVXRpbHMua3ZMaW5lKFwiQWNjb3VudCBpbmRleFwiLCB0aGlzLmdldEFjY291bnRJbmRleCgpLCBpbmRlbnQpO1xuICAgIHN0ciArPSBHZW5VdGlscy5rdkxpbmUoXCJTdWJhZGRyZXNzIGluZGV4XCIsIHRoaXMuZ2V0SW5kZXgoKSwgaW5kZW50KTtcbiAgICBzdHIgKz0gR2VuVXRpbHMua3ZMaW5lKFwiQWRkcmVzc1wiLCB0aGlzLmdldEFkZHJlc3MoKSwgaW5kZW50KTtcbiAgICBzdHIgKz0gR2VuVXRpbHMua3ZMaW5lKFwiTGFiZWxcIiwgdGhpcy5nZXRMYWJlbCgpLCBpbmRlbnQpO1xuICAgIHN0ciArPSBHZW5VdGlscy5rdkxpbmUoXCJCYWxhbmNlXCIsIHRoaXMuZ2V0QmFsYW5jZSgpLCBpbmRlbnQpO1xuICAgIHN0ciArPSBHZW5VdGlscy5rdkxpbmUoXCJVbmxvY2tlZCBiYWxhbmNlXCIsIHRoaXMuZ2V0VW5sb2NrZWRCYWxhbmNlKCksIGluZGVudCk7XG4gICAgc3RyICs9IEdlblV0aWxzLmt2TGluZShcIk51bSB1bnNwZW50IG91dHB1dHNcIiwgdGhpcy5nZXROdW1VbnNwZW50T3V0cHV0cygpLCBpbmRlbnQpO1xuICAgIHN0ciArPSBHZW5VdGlscy5rdkxpbmUoXCJJcyB1c2VkXCIsIHRoaXMuZ2V0SXNVc2VkKCksIGluZGVudCk7XG4gICAgc3RyICs9IEdlblV0aWxzLmt2TGluZShcIk51bSBibG9ja3MgdG8gdW5sb2NrXCIsIHRoaXMuZ2V0TnVtQmxvY2tzVG9VbmxvY2soKSwgaW5kZW50KTtcbiAgICByZXR1cm4gc3RyLnNsaWNlKDAsIHN0ci5sZW5ndGggLSAxKTsgIC8vIHN0cmlwIGxhc3QgbmV3bGluZVxuICB9XG59XG4iXSwibWFwcGluZ3MiOiJ5TEFBQSxJQUFBQSxTQUFBLEdBQUFDLHNCQUFBLENBQUFDLE9BQUE7O0FBRUE7QUFDQTtBQUNBO0FBQ2UsTUFBTUMsZ0JBQWdCLENBQUM7Ozs7Ozs7Ozs7OztFQVlwQ0MsV0FBV0EsQ0FBQ0MsVUFBc0MsRUFBRTtJQUNsREMsTUFBTSxDQUFDQyxNQUFNLENBQUMsSUFBSSxFQUFFRixVQUFVLENBQUM7SUFDL0IsSUFBSSxJQUFJLENBQUNHLE9BQU8sS0FBS0MsU0FBUyxJQUFJLE9BQU8sSUFBSSxDQUFDRCxPQUFPLEtBQUssUUFBUSxFQUFFLElBQUksQ0FBQ0EsT0FBTyxHQUFHRSxNQUFNLENB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