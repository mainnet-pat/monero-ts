"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _index = require("../../../index");

/**
 * Print sync progress every X blocks.
 */
class WalletSyncPrinter extends _index.MoneroWalletListener {




  constructor(syncResolution) {
    super();
    this.nextIncrement = 0;
    this.syncResolution = syncResolution ? syncResolution : .05;
  }

  async onSyncProgress(height, startHeight, endHeight, percentDone, message) {
    if (percentDone === 1 || percentDone >= this.nextIncrement) {
      console.log("onSyncProgress(" + height + ", " + startHeight + ", " + endHeight + ", " + percentDone + ", " + message + ")");
      this.nextIncrement += this.syncResolution;
    }
  }
}exports.default = WalletSyncPrinter;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfaW5kZXgiLCJyZXF1aXJlIiwiV2FsbGV0U3luY1ByaW50ZXIiLCJNb25lcm9XYWxsZXRMaXN0ZW5lciIsImNvbnN0cnVjdG9yIiwic3luY1Jlc29sdXRpb24iLCJuZXh0SW5jcmVtZW50Iiwib25TeW5jUHJvZ3Jlc3MiLCJoZWlnaHQiLCJzdGFydEhlaWdodCIsImVuZEhlaWdodCIsInBlcmNlbnREb25lIiwibWVzc2FnZSIsImNvbnNvbGUiLCJsb2ciLCJleHBvcnRzIiwiZGVmYXVsdCJdLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy90ZXN0L3V0aWxzL1dhbGxldFN5bmNQcmludGVyLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1vbmVyb1dhbGxldExpc3RlbmVyIH0gZnJvbSBcIi4uLy4uLy4uL2luZGV4XCI7XG5cbi8qKlxuICogUHJpbnQgc3luYyBwcm9ncmVzcyBldmVyeSBYIGJsb2Nrcy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV2FsbGV0U3luY1ByaW50ZXIgZXh0ZW5kcyBNb25lcm9XYWxsZXRMaXN0ZW5lciB7XG5cbiAgbmV4dEluY3JlbWVudDogbnVtYmVyO1xuICBzeW5jUmVzb2x1dGlvbjogbnVtYmVyO1xuICBcbiAgY29uc3RydWN0b3Ioc3luY1Jlc29sdXRpb24/OiBudW1iZXIpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMubmV4dEluY3JlbWVudCA9IDA7XG4gICAgdGhpcy5zeW5jUmVzb2x1dGlvbiA9IHN5bmNSZXNvbHV0aW9uID8gc3luY1Jlc29sdXRpb24gOiAuMDU7XG4gIH1cbiAgXG4gIGFzeW5jIG9uU3luY1Byb2dyZXNzKGhlaWdodCwgc3RhcnRIZWlnaHQsIGVuZEhlaWdodCwgcGVyY2VudERvbmUsIG1lc3NhZ2UpIHtcbiAgICBpZiAocGVyY2VudERvbmUgPT09IDEgfHwgcGVyY2VudERvbmUgPj0gdGhpcy5uZXh0SW5jcmVtZW50KSB7XG4gICAgICBjb25zb2xlLmxvZyhcIm9uU3luY1Byb2dyZXNzKFwiICsgaGVpZ2h0ICsgXCIsIFwiICsgc3RhcnRIZWlnaHQgKyBcIiwgXCIgKyBlbmRIZWlnaHQgKyBcIiwgXCIgKyBwZXJjZW50RG9uZSArIFwiLCBcIiArIG1lc3NhZ2UgKyBcIilcIik7XG4gICAgICB0aGlzLm5leHRJbmNyZW1lbnQgKz0gdGhpcy5zeW5jUmVzb2x1dGlvbjtcbiAgICB9XG4gIH1cbn1cbiJdLCJtYXBwaW5ncyI6Im9HQUFBLElBQUFBLE1BQUEsR0FBQUMsT0FBQTs7QUFFQTtBQUNBO0FBQ0E7QUFDZSxNQUFNQyxpQkFBaUIsU0FBU0MsMkJBQW9CLENBQUM7Ozs7O0VBS2xFQyxXQUFXQSxDQUFDQyxjQUF1QixFQUFFO0lBQ25DLEtBQUssQ0FBQyxDQUFDO0lBQ1AsSUFBSSxDQUFDQyxhQUFhLEdBQUcsQ0FBQztJQUN0QixJQUFJLENBQUNELGNBQWMsR0FBR0EsY0FBYyxHQUFHQSxjQUFjLEdBQUcsR0FBRztFQUM3RDs7RUFFQSxNQUFNRSxjQUFjQSxDQUFDQyxNQUFNLEVBQUVDLFdBQVcsRUFBRUMsU0FBUyxFQUFFQyxXQUFXLEVBQUVDLE9BQU8sRUFBRTtJQUN6RSxJQUFJRCxXQUFXLEtBQUssQ0FBQyxJQUFJQSxXQUFXLElBQUksSUFBSSxDQUFDTCxhQUFhLEVBQUU7TUFDMURPLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDLGlCQUFpQixHQUFHTixNQUFNLEdBQUcsSUFBSSxHQUFHQyxXQUFXLEdBQUcsSUFBSSxHQUFHQyxTQUFTLEdBQUcsSUFBSSxHQUFHQyxXQUFXLEdBQUcsSUFBSSxHQUFHQyxPQUFPLEdBQUcsR0FBRyxDQUFDO01BQzNILElBQUksQ0FBQ04sYUFBYSxJQUFJLElBQUksQ0FBQ0QsY0FBYztJQUMzQztFQUNGO0FBQ0YsQ0FBQ1UsT0FBQSxDQUFBQyxPQUFBLEdBQUFkLGlCQUFBIn0=