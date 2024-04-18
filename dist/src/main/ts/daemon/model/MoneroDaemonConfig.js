"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _MoneroRpcConnection = _interopRequireDefault(require("../../common/MoneroRpcConnection"));

/**
 * Configuration to connect to monerod.
 */
class MoneroDaemonConfig {

  /** Server config to monerod. */


  /** Proxy requests to monerod to a worker (default true). */


  /** Command to start monerod as a child process. */


  /** Interval in milliseconds to poll the daemon for updates (default 20000). */


  /**
   * Construct a configuration to open or create a wallet.
   * 
   * @param {Partial<MoneroDaemonConfig>} [config] - MoneroDaemonConfig to construct from (optional)
   * @param {string|Partial<MoneroRpcConnection>} [config.server] - uri or MoneroRpcConnection to the daemon (optional)
   * @param {boolean} [config.proxyToWorker] - proxy daemon requests to a worker (default true)
   * @param {string[]} [config.cmd] - command to start monerod (optional)
   * @param {number} [config.pollInterval] - interval in milliseconds to poll the daemon for updates (default 20000)
   */
  constructor(config) {
    Object.assign(this, config);
    if (this.server) this.setServer(this.server);
    this.setProxyToWorker(this.proxyToWorker);
  }

  copy() {
    return new MoneroDaemonConfig(this);
  }

  toJson() {
    let json = Object.assign({}, this);
    if (json.server) json.server = json.server.toJson();
    return json;
  }

  getServer() {
    return this.server;
  }

  setServer(server) {
    if (server && !(server instanceof _MoneroRpcConnection.default)) server = new _MoneroRpcConnection.default(server);
    this.server = server;
    return this;
  }

  getProxyToWorker() {
    return this.proxyToWorker;
  }

  setProxyToWorker(proxyToWorker) {
    this.proxyToWorker = proxyToWorker;
    return this;
  }

  getCmd() {
    return this.cmd;
  }

  setCmd(cmd) {
    this.cmd = cmd;
    return this;
  }

  getPollInterval() {
    return this.pollInterval;
  }

  setPollInterval(pollInterval) {
    this.pollInterval = pollInterval;
    return this;
  }
}exports.default = MoneroDaemonConfig;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfTW9uZXJvUnBjQ29ubmVjdGlvbiIsIl9pbnRlcm9wUmVxdWlyZURlZmF1bHQiLCJyZXF1aXJlIiwiTW9uZXJvRGFlbW9uQ29uZmlnIiwiY29uc3RydWN0b3IiLCJjb25maWciLCJPYmplY3QiLCJhc3NpZ24iLCJzZXJ2ZXIiLCJzZXRTZXJ2ZXIiLCJzZXRQcm94eVRvV29ya2VyIiwicHJveHlUb1dvcmtlciIsImNvcHkiLCJ0b0pzb24iLCJqc29uIiwiZ2V0U2VydmVyIiwiTW9uZXJvUnBjQ29ubmVjdGlvbiIsImdldFByb3h5VG9Xb3JrZXIiLCJnZXRDbWQiLCJjbWQiLCJzZXRDbWQiLCJnZXRQb2xsSW50ZXJ2YWwiLCJwb2xsSW50ZXJ2YWwiLCJzZXRQb2xsSW50ZXJ2YWwiLCJleHBvcnRzIiwiZGVmYXVsdCJdLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tYWluL3RzL2RhZW1vbi9tb2RlbC9Nb25lcm9EYWVtb25Db25maWcudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE1vbmVyb1JwY0Nvbm5lY3Rpb24gZnJvbSBcIi4uLy4uL2NvbW1vbi9Nb25lcm9ScGNDb25uZWN0aW9uXCI7XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiB0byBjb25uZWN0IHRvIG1vbmVyb2QuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vbmVyb0RhZW1vbkNvbmZpZyB7XG5cbiAgLyoqIFNlcnZlciBjb25maWcgdG8gbW9uZXJvZC4gKi9cbiAgc2VydmVyOiBzdHJpbmcgfCBQYXJ0aWFsPE1vbmVyb1JwY0Nvbm5lY3Rpb24+O1xuXG4gIC8qKiBQcm94eSByZXF1ZXN0cyB0byBtb25lcm9kIHRvIGEgd29ya2VyIChkZWZhdWx0IHRydWUpLiAqL1xuICBwcm94eVRvV29ya2VyOiBib29sZWFuO1xuXG4gIC8qKiBDb21tYW5kIHRvIHN0YXJ0IG1vbmVyb2QgYXMgYSBjaGlsZCBwcm9jZXNzLiAqL1xuICBjbWQ6IHN0cmluZ1tdO1xuXG4gIC8qKiBJbnRlcnZhbCBpbiBtaWxsaXNlY29uZHMgdG8gcG9sbCB0aGUgZGFlbW9uIGZvciB1cGRhdGVzIChkZWZhdWx0IDIwMDAwKS4gKi9cbiAgcG9sbEludGVydmFsOiBudW1iZXI7XG4gIFxuICAvKipcbiAgICogQ29uc3RydWN0IGEgY29uZmlndXJhdGlvbiB0byBvcGVuIG9yIGNyZWF0ZSBhIHdhbGxldC5cbiAgICogXG4gICAqIEBwYXJhbSB7UGFydGlhbDxNb25lcm9EYWVtb25Db25maWc+fSBbY29uZmlnXSAtIE1vbmVyb0RhZW1vbkNvbmZpZyB0byBjb25zdHJ1Y3QgZnJvbSAob3B0aW9uYWwpXG4gICAqIEBwYXJhbSB7c3RyaW5nfFBhcnRpYWw8TW9uZXJvUnBjQ29ubmVjdGlvbj59IFtjb25maWcuc2VydmVyXSAtIHVyaSBvciBNb25lcm9ScGNDb25uZWN0aW9uIHRvIHRoZSBkYWVtb24gKG9wdGlvbmFsKVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcucHJveHlUb1dvcmtlcl0gLSBwcm94eSBkYWVtb24gcmVxdWVzdHMgdG8gYSB3b3JrZXIgKGRlZmF1bHQgdHJ1ZSlcbiAgICogQHBhcmFtIHtzdHJpbmdbXX0gW2NvbmZpZy5jbWRdIC0gY29tbWFuZCB0byBzdGFydCBtb25lcm9kIChvcHRpb25hbClcbiAgICogQHBhcmFtIHtudW1iZXJ9IFtjb25maWcucG9sbEludGVydmFsXSAtIGludGVydmFsIGluIG1pbGxpc2Vjb25kcyB0byBwb2xsIHRoZSBkYWVtb24gZm9yIHVwZGF0ZXMgKGRlZmF1bHQgMjAwMDApXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc/OiBQYXJ0aWFsPE1vbmVyb0RhZW1vbkNvbmZpZz4pIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGNvbmZpZyk7XG4gICAgaWYgKHRoaXMuc2VydmVyKSB0aGlzLnNldFNlcnZlcih0aGlzLnNlcnZlcik7XG4gICAgdGhpcy5zZXRQcm94eVRvV29ya2VyKHRoaXMucHJveHlUb1dvcmtlcik7XG4gIH1cblxuICBjb3B5KCk6IE1vbmVyb0RhZW1vbkNvbmZpZyB7XG4gICAgcmV0dXJuIG5ldyBNb25lcm9EYWVtb25Db25maWcodGhpcyk7XG4gIH1cbiAgXG4gIHRvSnNvbigpOiBhbnkge1xuICAgIGxldCBqc29uOiBhbnkgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzKTtcbiAgICBpZiAoanNvbi5zZXJ2ZXIpIGpzb24uc2VydmVyID0ganNvbi5zZXJ2ZXIudG9Kc29uKCk7XG4gICAgcmV0dXJuIGpzb247XG4gIH1cbiAgXG4gIGdldFNlcnZlcigpOiBNb25lcm9ScGNDb25uZWN0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2ZXIgYXMgTW9uZXJvUnBjQ29ubmVjdGlvbjtcbiAgfVxuICBcbiAgc2V0U2VydmVyKHNlcnZlcjogUGFydGlhbDxNb25lcm9ScGNDb25uZWN0aW9uPiB8IHN0cmluZyk6IE1vbmVyb0RhZW1vbkNvbmZpZyB7XG4gICAgaWYgKHNlcnZlciAmJiAhKHNlcnZlciBpbnN0YW5jZW9mIE1vbmVyb1JwY0Nvbm5lY3Rpb24pKSBzZXJ2ZXIgPSBuZXcgTW9uZXJvUnBjQ29ubmVjdGlvbihzZXJ2ZXIpO1xuICAgIHRoaXMuc2VydmVyID0gc2VydmVyIGFzIE1vbmVyb1JwY0Nvbm5lY3Rpb247XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgXG4gIGdldFByb3h5VG9Xb3JrZXIoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucHJveHlUb1dvcmtlcjtcbiAgfVxuICBcbiAgc2V0UHJveHlUb1dvcmtlcihwcm94eVRvV29ya2VyOiBib29sZWFuKTogTW9uZXJvRGFlbW9uQ29uZmlnIHtcbiAgICB0aGlzLnByb3h5VG9Xb3JrZXIgPSBwcm94eVRvV29ya2VyO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZ2V0Q21kKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5jbWQ7XG4gIH1cblxuICBzZXRDbWQoY21kOiBzdHJpbmdbXSk6IE1vbmVyb0RhZW1vbkNvbmZpZyB7XG4gICAgdGhpcy5jbWQgPSBjbWQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBnZXRQb2xsSW50ZXJ2YWwoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5wb2xsSW50ZXJ2YWw7XG4gIH1cblxuICBzZXRQb2xsSW50ZXJ2YWwocG9sbEludGVydmFsOiBudW1iZXIpOiBNb25lcm9EYWVtb25Db25maWcge1xuICAgIHRoaXMucG9sbEludGVydmFsID0gcG9sbEludGVydmFsO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59Il0sIm1hcHBpbmdzIjoieUxBQUEsSUFBQUEsb0JBQUEsR0FBQUMsc0JBQUEsQ0FBQUMsT0FBQTs7QUFFQTtBQUNBO0FBQ0E7QUFDZSxNQUFNQyxrQkFBa0IsQ0FBQzs7RUFFdEM7OztFQUdBOzs7RUFHQTs7O0VBR0E7OztFQUdBO0FBQ0Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtFQUNFQyxXQUFXQSxDQUFDQyxNQUFvQyxFQUFFO0lBQ2hEQyxNQUFNLENBQUNDLE1BQU0sQ0FBQyxJQUFJLEVBQUVGLE1BQU0sQ0FBQztJQUMzQixJQUFJLElBQUksQ0FBQ0csTUFBTSxFQUFFLElBQUksQ0FBQ0MsU0FBUyxDQUFDLElBQUksQ0FBQ0QsTUFBTSxDQUFDO0lBQzVDLElBQUksQ0FBQ0UsZ0JBQWdCLENBQUMsSUFBSSxDQUFDQyxhQUFhLENBQUM7RUFDM0M7O0VBRUFDLElBQUlBLENBQUEsRUFBdUI7SUFDekIsT0FBTyxJQUFJVCxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7RUFDckM7O0VBRUFVLE1BQU1BLENBQUEsRUFBUTtJQUNaLElBQUlDLElBQVMsR0FBR1IsTUFBTSxDQUFDQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO0lBQ3ZDLElBQUlPLElBQUksQ0FBQ04sTUFBTSxFQUFFTSxJQUFJLENBQUNOLE1BQU0sR0FBR00sSUFBSSxDQUFDTixNQUFNLENBQUNLLE1BQU0sQ0FBQyxDQUFDO0lBQ25ELE9BQU9DLElBQUk7RUFDYjs7RUFFQUMsU0FBU0EsQ0FBQSxFQUF3QjtJQUMvQixPQUFPLElBQUksQ0FBQ1AsTUFBTTtFQUNwQjs7RUFFQUMsU0FBU0EsQ0FBQ0QsTUFBNkMsRUFBc0I7SUFDM0UsSUFBSUEsTUFBTSxJQUFJLEVBQUVBLE1BQU0sWUFBWVEsNEJBQW1CLENBQUMsRUFBRVIsTUFBTSxHQUFHLElBQUlRLDRCQUFtQixDQUFDUixNQUFNLENBQUM7SUFDaEcsSUFBSSxDQUFDQSxNQUFNLEdBQUdBLE1BQTZCO0lBQzNDLE9BQU8sSUFBSTtFQUNiOztFQUVBUyxnQkFBZ0JBLENBQUEsRUFBWTtJQUMxQixPQUFPLElBQUksQ0FBQ04sYUFBYTtFQUMzQjs7RUFFQUQsZ0JBQWdCQSxDQUFDQyxhQUFzQixFQUFzQjtJQUMzRCxJQUFJLENBQUNBLGFBQWEsR0FBR0EsYUFBYTtJQUNsQyxPQUFPLElBQUk7RUFDYjs7RUFFQU8sTUFBTUEsQ0FBQSxFQUFhO0lBQ2pCLE9BQU8sSUFBSSxDQUFDQyxHQUFHO0VBQ2pCOztFQUVBQyxNQUFNQSxDQUFDRCxHQUFhLEVBQXNCO0lBQ3hDLElBQUksQ0FBQ0EsR0FBRyxHQUFHQSxHQUFHO0lBQ2QsT0FBTyxJQUFJO0VBQ2I7O0VBRUFFLGVBQWVBLENBQUEsRUFBVztJQUN4QixPQUFPLElBQUksQ0FBQ0MsWUFBWTtFQUMxQjs7RUFFQUMsZUFBZUEsQ0FBQ0QsWUFBb0IsRUFBc0I7SUFDeEQsSUFBSSxDQUFDQSxZQUFZLEdBQUdBLFlBQVk7SUFDaEMsT0FBTyxJQUFJO0VBQ2I7QUFDRixDQUFDRSxPQUFBLENBQUFDLE9BQUEsR0FBQXRCLGtCQUFBIiwiaWdub3JlTGlzdCI6W119