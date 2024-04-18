"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _MoneroError = _interopRequireDefault(require("./MoneroError"));

/**
 * Error when interacting with Monero RPC.
 */
class MoneroRpcError extends _MoneroError.default {

  // instance variables



  /**
   * Constructs the error.
   * 
   * @param {string} rpcDescription is a description of the error from rpc
   * @param {number} rpcCode is the error code from rpc
   * @param {string} [rpcMethod] is the rpc method invoked
   * @param {object} [rpcParams] are parameters sent with the rpc request
   */
  constructor(rpcDescription, rpcCode, rpcMethod, rpcParams) {
    super(rpcDescription, rpcCode);
    this.rpcMethod = rpcMethod;
    this.rpcParams = rpcParams;
  }

  getRpcMethod() {
    return this.rpcMethod;
  }

  getRpcParams() {
    return this.rpcParams;
  }

  toString() {
    let str = super.toString();
    if (this.rpcMethod || this.rpcParams) str += "\nRequest: '" + this.rpcMethod + "' with params: " + (typeof this.rpcParams === "object" ? JSON.stringify(this.rpcParams) : this.rpcParams);
    return str;
  }
}exports.default = MoneroRpcError;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfTW9uZXJvRXJyb3IiLCJfaW50ZXJvcFJlcXVpcmVEZWZhdWx0IiwicmVxdWlyZSIsIk1vbmVyb1JwY0Vycm9yIiwiTW9uZXJvRXJyb3IiLCJjb25zdHJ1Y3RvciIsInJwY0Rlc2NyaXB0aW9uIiwicnBjQ29kZSIsInJwY01ldGhvZCIsInJwY1BhcmFtcyIsImdldFJwY01ldGhvZCIsImdldFJwY1BhcmFtcyIsInRvU3RyaW5nIiwic3RyIiwiSlNPTiIsInN0cmluZ2lmeSIsImV4cG9ydHMiLCJkZWZhdWx0Il0sInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL21haW4vdHMvY29tbW9uL01vbmVyb1JwY0Vycm9yLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBNb25lcm9FcnJvciBmcm9tIFwiLi9Nb25lcm9FcnJvclwiO1xuXG4vKipcbiAqIEVycm9yIHdoZW4gaW50ZXJhY3Rpbmcgd2l0aCBNb25lcm8gUlBDLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNb25lcm9ScGNFcnJvciBleHRlbmRzIE1vbmVyb0Vycm9yIHtcblxuICAvLyBpbnN0YW5jZSB2YXJpYWJsZXNcbiAgcHJvdGVjdGVkIHJwY01ldGhvZDogYW55O1xuICBwcm90ZWN0ZWQgcnBjUGFyYW1zOiBhbnk7XG4gIFxuICAvKipcbiAgICogQ29uc3RydWN0cyB0aGUgZXJyb3IuXG4gICAqIFxuICAgKiBAcGFyYW0ge3N0cmluZ30gcnBjRGVzY3JpcHRpb24gaXMgYSBkZXNjcmlwdGlvbiBvZiB0aGUgZXJyb3IgZnJvbSBycGNcbiAgICogQHBhcmFtIHtudW1iZXJ9IHJwY0NvZGUgaXMgdGhlIGVycm9yIGNvZGUgZnJvbSBycGNcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtycGNNZXRob2RdIGlzIHRoZSBycGMgbWV0aG9kIGludm9rZWRcbiAgICogQHBhcmFtIHtvYmplY3R9IFtycGNQYXJhbXNdIGFyZSBwYXJhbWV0ZXJzIHNlbnQgd2l0aCB0aGUgcnBjIHJlcXVlc3RcbiAgICovXG4gIGNvbnN0cnVjdG9yKHJwY0Rlc2NyaXB0aW9uLCBycGNDb2RlLCBycGNNZXRob2Q/LCBycGNQYXJhbXM/KSB7XG4gICAgc3VwZXIocnBjRGVzY3JpcHRpb24sIHJwY0NvZGUpO1xuICAgIHRoaXMucnBjTWV0aG9kID0gcnBjTWV0aG9kO1xuICAgIHRoaXMucnBjUGFyYW1zID0gcnBjUGFyYW1zO1xuICB9XG4gIFxuICBnZXRScGNNZXRob2QoKSB7XG4gICAgcmV0dXJuIHRoaXMucnBjTWV0aG9kO1xuICB9XG4gIFxuICBnZXRScGNQYXJhbXMoKSB7XG4gICAgcmV0dXJuIHRoaXMucnBjUGFyYW1zO1xuICB9XG4gIFxuICB0b1N0cmluZygpIHtcbiAgICBsZXQgc3RyID0gc3VwZXIudG9TdHJpbmcoKTtcbiAgICBpZiAodGhpcy5ycGNNZXRob2QgfHwgdGhpcy5ycGNQYXJhbXMpIHN0ciArPSBcIlxcblJlcXVlc3Q6ICdcIiArIHRoaXMucnBjTWV0aG9kICsgXCInIHdpdGggcGFyYW1zOiBcIiArICh0eXBlb2YgdGhpcy5ycGNQYXJhbXMgPT09IFwib2JqZWN0XCIgPyBKU09OLnN0cmluZ2lmeSh0aGlzLnJwY1BhcmFtcykgOiB0aGlzLnJwY1BhcmFtcyk7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuIl0sIm1hcHBpbmdzIjoieUxBQUEsSUFBQUEsWUFBQSxHQUFBQyxzQkFBQSxDQUFBQyxPQUFBOztBQUVBO0FBQ0E7QUFDQTtBQUNlLE1BQU1DLGNBQWMsU0FBU0Msb0JBQVcsQ0FBQzs7RUFFdEQ7Ozs7RUFJQTtBQUNGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0VBQ0VDLFdBQVdBLENBQUNDLGNBQWMsRUFBRUMsT0FBTyxFQUFFQyxTQUFVLEVBQUVDLFNBQVUsRUFBRTtJQUMzRCxLQUFLLENBQUNILGNBQWMsRUFBRUMsT0FBTyxDQUFDO0lBQzlCLElBQUksQ0FBQ0MsU0FBUyxHQUFHQSxTQUFTO0lBQzFCLElBQUksQ0FBQ0MsU0FBUyxHQUFHQSxTQUFTO0VBQzVCOztFQUVBQyxZQUFZQSxDQUFBLEVBQUc7SUFDYixPQUFPLElBQUksQ0FBQ0YsU0FBUztFQUN2Qjs7RUFFQUcsWUFBWUEsQ0FBQSxFQUFHO0lBQ2IsT0FBTyxJQUFJLENBQUNGLFNBQVM7RUFDdkI7O0VBRUFHLFFBQVFBLENBQUEsRUFBRztJQUNULElBQUlDLEdBQUcsR0FBRyxLQUFLLENBQUNELFFBQVEsQ0FBQyxDQUFDO0lBQzFCLElBQUksSUFBSSxDQUFDSixTQUFTLElBQUksSUFBSSxDQUFDQyxTQUFTLEVBQUVJLEdBQUcsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDTCxTQUFTLEdBQUcsaUJBQWlCLElBQUksT0FBTyxJQUFJLENBQUNDLFNBQVMsS0FBSyxRQUFRLEdBQUdLLElBQUksQ0FBQ0MsU0FBUyxDQUFDLElBQUksQ0FBQ04sU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDQSxTQUFTLENBQUM7SUFDekwsT0FBT0ksR0FBRztFQUNaO0FBQ0YsQ0FBQ0csT0FBQSxDQUFBQyxPQUFBLEdBQUFkLGNBQUEiLCJpZ25vcmVMaXN0IjpbXX0=