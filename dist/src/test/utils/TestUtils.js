"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _assert = _interopRequireDefault(require("assert"));
var _WalletSyncPrinter = _interopRequireDefault(require("./WalletSyncPrinter"));
var _WalletTxTracker = _interopRequireDefault(require("./WalletTxTracker"));
var _index = require("../../../index");function _getRequireWildcardCache(nodeInterop) {if (typeof WeakMap !== "function") return null;var cacheBabelInterop = new WeakMap();var cacheNodeInterop = new WeakMap();return (_getRequireWildcardCache = function (nodeInterop) {return nodeInterop ? cacheNodeInterop : cacheBabelInterop;})(nodeInterop);}function _interopRequireWildcard(obj, nodeInterop) {if (!nodeInterop && obj && obj.__esModule) {return obj;}if (obj === null || typeof obj !== "object" && typeof obj !== "function") {return { default: obj };}var cache = _getRequireWildcardCache(nodeInterop);if (cache && cache.has(obj)) {return cache.get(obj);}var newObj = {};var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;for (var key in obj) {if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;if (desc && (desc.get || desc.set)) {Object.defineProperty(newObj, key, desc);} else {newObj[key] = obj[key];}}}newObj.default = obj;if (cache) {cache.set(obj, newObj);}return newObj;}














/**
 * Collection of test utilities and configurations.
 */
class TestUtils {

  // classes to test





  // common config
  static PROXY_TO_WORKER = true;
  static MONERO_BINS_DIR = ""; // directory with monero binaries to test (monerod and monero-wallet-rpc)
  static SYNC_PERIOD_IN_MS = 5000; // period between wallet syncs in milliseconds
  static OFFLINE_SERVER_URI = "offline_server_uri"; // dummy server uri to remain offline because wallet2 connects to default if not given
  static AUTO_CONNECT_TIMEOUT_MS = 2000;

  // wallet config
  static NETWORK_TYPE = _index.MoneroNetworkType.TESTNET;
  static SEED = "silk mocked cucumber lettuce hope adrenalin aching lush roles fuel revamp baptism wrist long tender teardrop midst pastry pigment equip frying inbound pinched ravine frying";
  static ADDRESS = "A1y9sbVt8nqhZAVm3me1U18rUVXcjeNKuBd1oE2cTs8biA9cozPMeyYLhe77nPv12JA3ejJN3qprmREriit2fi6tJDi99RR";
  static FIRST_RECEIVE_HEIGHT = 171; // NOTE: this value must be the height of the wallet's first tx for tests
  static WALLET_NAME = "test_wallet_1";
  static WALLET_PASSWORD = "supersecretpassword123";
  static TEST_WALLETS_DIR = "./test_wallets";
  static WALLET_FULL_PATH = TestUtils.TEST_WALLETS_DIR + "/" + TestUtils.WALLET_NAME;
  static WALLET_RPC_PORT_START = 28084;
  static WALLET_PORT_OFFSETS = {};
  static WALLET_RPC_LOCAL_PATH = TestUtils.MONERO_BINS_DIR + "/monero-wallet-rpc";
  static WALLET_RPC_LOCAL_WALLET_DIR = TestUtils.MONERO_BINS_DIR;
  static WALLET_RPC_ACCESS_CONTROL_ORIGINS = "http://localhost:8080"; // cors access from web browser
  static MAX_FEE = 7500000n * 10000n;
  static WALLET_TX_TRACKER = new _WalletTxTracker.default(); // used to track wallet txs for tests
  static WALLET_RPC_CONFIG = {
    uri: "localhost:28084",
    username: "rpc_user",
    password: "abc123",
    rejectUnauthorized: true // reject self-signed certificates if true
  };

  // daemon config
  static DAEMON_LOCAL_PATH = TestUtils.MONERO_BINS_DIR + "/monerod";
  static DAEMON_RPC_CONFIG = {
    uri: "localhost:28081",
    username: "",
    password: "",
    rejectUnauthorized: true // reject self-signed certificates if true
  };

  /**
   * Get a default file system.  Uses an in-memory file system if running in the browser.
   * 
   * @return {any} nodejs-compatible file system
   */
  static async getDefaultFs() {
    return _index.GenUtils.isBrowser() ? (await Promise.resolve().then(() => _interopRequireWildcard(require('memfs')))).fs : await Promise.resolve().then(() => _interopRequireWildcard(require('fs')));
  }

  /**
   * Get a singleton daemon RPC instance shared among tests.
   * 
   * @return {Promise<MoneroDaemonRpc>} a daemon RPC instance
   */
  static async getDaemonRpc() {
    if (TestUtils.daemonRpc === undefined) TestUtils.daemonRpc = await (0, _index.connectToDaemonRpc)(Object.assign({ proxyToWorker: TestUtils.PROXY_TO_WORKER }, TestUtils.DAEMON_RPC_CONFIG));
    return TestUtils.daemonRpc;
  }

  /**
   * Get a singleton instance of a monerod client.
   */
  static getDaemonRpcConnection() {
    return new _index.MoneroRpcConnection(TestUtils.DAEMON_RPC_CONFIG);
  }

  /**
   * Get a singleton instance of a monero-wallet-rpc client.
   * 
   * @return {Promise<MoneroWalletRpc>} a wallet RPC instance
   */
  static async getWalletRpc() {
    if (TestUtils.walletRpc === undefined) {

      // construct wallet rpc instance with daemon connection
      TestUtils.walletRpc = await (0, _index.connectToWalletRpc)(TestUtils.WALLET_RPC_CONFIG);
    }

    // attempt to open test wallet
    try {
      await TestUtils.walletRpc.openWallet({ path: TestUtils.WALLET_NAME, password: TestUtils.WALLET_PASSWORD });
    } catch (e) {
      if (!(e instanceof _index.MoneroRpcError)) throw e;

      console.log(e);

      // -1 returned when wallet does not exist or fails to open e.g. it's already open by another application
      if (e.getCode() === -1) {

        // create wallet
        console.log("Creating wallet!");
        await TestUtils.walletRpc.createWallet({ path: TestUtils.WALLET_NAME, password: TestUtils.WALLET_PASSWORD, seed: TestUtils.SEED, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT });
      } else {
        throw e;
      }
    }

    // ensure we're testing the right wallet
    _assert.default.equal(await TestUtils.walletRpc.getSeed(), TestUtils.SEED);
    _assert.default.equal(await TestUtils.walletRpc.getPrimaryAddress(), TestUtils.ADDRESS);

    // sync and save wallet
    await TestUtils.walletRpc.sync();
    await TestUtils.walletRpc.save();
    await TestUtils.walletRpc.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);

    // return cached wallet rpc
    return TestUtils.walletRpc;
  }

  /**
   * Create a monero-wallet-rpc process bound to the next available port.
   *
   * @param {boolean} [offline] - wallet is started in offline mode (default false)
   * @return {Promise<MoneroWalletRpc>} - client connected to an internal monero-wallet-rpc instance
   */
  static async startWalletRpcProcess(offline = false) {

    // get next available offset of ports to bind to
    let portOffset = 1;
    while (Object.keys(TestUtils.WALLET_PORT_OFFSETS).includes("" + portOffset)) portOffset++;
    TestUtils.WALLET_PORT_OFFSETS[portOffset] = undefined; // reserve port

    // create or connect to monero-wallet-rpc process
    let wallet;
    if (_index.GenUtils.isBrowser()) {
      let uri = TestUtils.WALLET_RPC_CONFIG.uri.substring(0, TestUtils.WALLET_RPC_CONFIG.uri.lastIndexOf(":")) + ":" + (TestUtils.WALLET_RPC_PORT_START + portOffset);
      wallet = await (0, _index.connectToWalletRpc)(uri, TestUtils.WALLET_RPC_CONFIG.username, TestUtils.WALLET_RPC_CONFIG.password);
    } else {

      // create command to start client with internal monero-wallet-rpc process
      let cmd = [
      TestUtils.WALLET_RPC_LOCAL_PATH,
      "--" + _index.GenUtils.getEnumKeyByValue(_index.MoneroNetworkType, TestUtils.NETWORK_TYPE).toLowerCase(),
      "--rpc-bind-port", "" + (TestUtils.WALLET_RPC_PORT_START + portOffset),
      "--rpc-login", TestUtils.WALLET_RPC_CONFIG.username + ":" + TestUtils.WALLET_RPC_CONFIG.password,
      "--wallet-dir", TestUtils.WALLET_RPC_LOCAL_WALLET_DIR,
      "--rpc-access-control-origins", TestUtils.WALLET_RPC_ACCESS_CONTROL_ORIGINS];

      if (offline) cmd.push("--offline");else
      cmd.push("--daemon-address", TestUtils.DAEMON_RPC_CONFIG.uri);
      if (TestUtils.DAEMON_RPC_CONFIG.username) cmd.push("--daemon-login", TestUtils.DAEMON_RPC_CONFIG.username + ":" + TestUtils.DAEMON_RPC_CONFIG.password);

      // TODO: include zmq params when supported and enabled

      // create and connect to monero-wallet-rpc process
      wallet = await (0, _index.connectToWalletRpc)(cmd);
    }

    // register wallet with port offset
    TestUtils.WALLET_PORT_OFFSETS[portOffset] = wallet;
    return wallet;
  }

  /**
   * Stop a monero-wallet-rpc process and release its port.
   * 
   * @param {MoneroWalletRpc} walletRpc - wallet created with internal monero-wallet-rpc process
   */
  static async stopWalletRpcProcess(walletRpc) {
    (0, _assert.default)(walletRpc instanceof _index.MoneroWalletRpc, "Must provide instance of MoneroWalletRpc to close");

    // get corresponding port
    let portOffset;
    for (const [key, value] of Object.entries(TestUtils.WALLET_PORT_OFFSETS)) {
      if (value === walletRpc) {
        portOffset = key;
        break;
      }
    }
    if (portOffset === undefined) throw new Error("Wallet not registered");

    // unregister wallet with port offset
    delete TestUtils.WALLET_PORT_OFFSETS[portOffset];
    if (!_index.GenUtils.isBrowser()) await walletRpc.stopProcess();
  }

  /**
   * Get a singleton instance of a wallet supported by WebAssembly bindings to monero-project's wallet2.
   * 
   * @return {MoneroWalletFull} a full wallet instance
   */
  static async getWalletFull() {
    if (!TestUtils.walletFull || (await TestUtils.walletFull.isClosed())) {

      // create wallet from seed phrase if it doesn't exist
      let fs = await TestUtils.getDefaultFs();
      if (!(await _index.MoneroWalletFull.walletExists(TestUtils.WALLET_FULL_PATH, fs))) {
        // create directory for test wallets if it doesn't exist
        fs.existsSync(TestUtils.TEST_WALLETS_DIR) || fs.mkdirSync(TestUtils.TEST_WALLETS_DIR);
        if (!fs.existsSync(TestUtils.TEST_WALLETS_DIR)) {
          if (!fs.existsSync(process.cwd())) fs.mkdirSync(process.cwd(), { recursive: true }); // create current process directory for relative paths which does not exist in memory fs
          fs.mkdirSync(TestUtils.TEST_WALLETS_DIR);
        }

        // create wallet with connection
        TestUtils.walletFull = await (0, _index.createWalletFull)({ path: TestUtils.WALLET_FULL_PATH, password: TestUtils.WALLET_PASSWORD, networkType: TestUtils.NETWORK_TYPE, seed: TestUtils.SEED, server: TestUtils.getDaemonRpcConnection(), restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT, proxyToWorker: TestUtils.PROXY_TO_WORKER, fs: fs });
        _assert.default.equal(await TestUtils.walletFull.getRestoreHeight(), TestUtils.FIRST_RECEIVE_HEIGHT);
        _assert.default.deepEqual(await TestUtils.walletFull.getDaemonConnection(), TestUtils.getDaemonRpcConnection());
      }

      // otherwise open existing wallet
      else {
        TestUtils.walletFull = await (0, _index.openWalletFull)({ path: TestUtils.WALLET_FULL_PATH, password: TestUtils.WALLET_PASSWORD, networkType: TestUtils.NETWORK_TYPE, server: TestUtils.getDaemonRpcConnection(), proxyToWorker: TestUtils.PROXY_TO_WORKER, fs: fs });
        await TestUtils.walletFull.setDaemonConnection(TestUtils.getDaemonRpcConnection());
      }
    }

    // sync and save wallet
    await TestUtils.walletFull.sync(new _WalletSyncPrinter.default());
    await TestUtils.walletFull.save();
    await TestUtils.walletFull.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);

    // ensure we're testing the right wallet
    _assert.default.equal(await TestUtils.walletFull.getSeed(), TestUtils.SEED);
    _assert.default.equal(await TestUtils.walletFull.getPrimaryAddress(), TestUtils.ADDRESS);
    return TestUtils.walletFull;
  }

  /**
   * Get a singleton keys-only wallet instance shared among tests.
   * 
   * @return {MoneroWalletKeys} a keys-only wallet instance
   */
  static async getWalletKeys() {
    if (TestUtils.walletKeys === undefined) {

      // create wallet from seed
      TestUtils.walletKeys = await (0, _index.createWalletKeys)({ networkType: TestUtils.NETWORK_TYPE, seed: TestUtils.SEED });
    }
    return TestUtils.walletKeys;
  }

  /**
   * Creates a new wallet considered to be "ground truth".
   * 
   * @param networkType - ground truth wallet's network type
   * @param seed - ground truth wallet's seed
   * @param startHeight - height to start syncing from
   * @param restoreHeight - ground truth wallet's restore height
   * @return {MoneroWalletFull} the created wallet
   */
  static async createWalletGroundTruth(networkType, seed, startHeight, restoreHeight) {

    // create directory for test wallets if it doesn't exist
    let fs = await TestUtils.getDefaultFs();
    if (!fs.existsSync(TestUtils.TEST_WALLETS_DIR)) {
      if (!fs.existsSync(process.cwd())) fs.mkdirSync(process.cwd(), { recursive: true }); // create current process directory for relative paths which does not exist in memory fs
      fs.mkdirSync(TestUtils.TEST_WALLETS_DIR);
    }

    // create ground truth wallet
    let daemonConnection = new _index.MoneroRpcConnection(TestUtils.DAEMON_RPC_CONFIG);
    let path = TestUtils.TEST_WALLETS_DIR + "/gt_wallet_" + new Date().getTime();
    let gtWallet = await (0, _index.createWalletFull)({
      path: path,
      password: TestUtils.WALLET_PASSWORD,
      networkType: networkType,
      seed: seed,
      server: daemonConnection,
      restoreHeight: restoreHeight,
      fs: fs
    });
    _assert.default.equal(await gtWallet.getRestoreHeight(), restoreHeight ? restoreHeight : 0);
    await gtWallet.sync(new _WalletSyncPrinter.default(), startHeight);
    await gtWallet.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);
    return gtWallet;
  }

  static testUnsignedBigInt(num, nonZero) {
    _assert.default.equal("bigint", typeof num);
    (0, _assert.default)(num >= 0n);
    if (nonZero === true) (0, _assert.default)(num > 0n);else
    if (nonZero === false) (0, _assert.default)(num === 0n);
  }

  static async getExternalWalletAddress() {
    let wallet = await (0, _index.createWalletKeys)({ networkType: TestUtils.NETWORK_TYPE });
    return await wallet.getAddress(0, 1); // subaddress
  }

  static txsMergeable(tx1, tx2) {
    try {
      let copy1 = tx1.copy();
      let copy2 = tx2.copy();
      if (copy1.getIsConfirmed()) copy1.setBlock(tx1.getBlock().copy().setTxs([copy1]));
      if (copy2.getIsConfirmed()) copy2.setBlock(tx2.getBlock().copy().setTxs([copy2]));
      copy1.merge(copy2);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}exports.default = TestUtils;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYXNzZXJ0IiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfV2FsbGV0U3luY1ByaW50ZXIiLCJfV2FsbGV0VHhUcmFja2VyIiwiX2luZGV4IiwiX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlIiwibm9kZUludGVyb3AiLCJXZWFrTWFwIiwiY2FjaGVCYWJlbEludGVyb3AiLCJjYWNoZU5vZGVJbnRlcm9wIiwiX2ludGVyb3BSZXF1aXJlV2lsZGNhcmQiLCJvYmoiLCJfX2VzTW9kdWxlIiwiZGVmYXVsdCIsImNhY2hlIiwiaGFzIiwiZ2V0IiwibmV3T2JqIiwiaGFzUHJvcGVydHlEZXNjcmlwdG9yIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJrZXkiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJkZXNjIiwic2V0IiwiVGVzdFV0aWxzIiwiUFJPWFlfVE9fV09SS0VSIiwiTU9ORVJPX0JJTlNfRElSIiwiU1lOQ19QRVJJT0RfSU5fTVMiLCJPRkZMSU5FX1NFUlZFUl9VUkkiLCJBVVRPX0NPTk5FQ1RfVElNRU9VVF9NUyIsIk5FVFdPUktfVFlQRSIsIk1vbmVyb05ldHdvcmtUeXBlIiwiVEVTVE5FVCIsIlNFRUQiLCJBRERSRVNTIiwiRklSU1RfUkVDRUlWRV9IRUlHSFQiLCJXQUxMRVRfTkFNRSIsIldBTExFVF9QQVNTV09SRCIsIlRFU1RfV0FMTEVUU19ESVIiLCJXQUxMRVRfRlVMTF9QQVRIIiwiV0FMTEVUX1JQQ19QT1JUX1NUQVJUIiwiV0FMTEVUX1BPUlRfT0ZGU0VUUyIsIldBTExFVF9SUENfTE9DQUxfUEFUSCIsIldBTExFVF9SUENfTE9DQUxfV0FMTEVUX0RJUiIsIldBTExFVF9SUENfQUNDRVNTX0NPTlRST0xfT1JJR0lOUyIsIk1BWF9GRUUiLCJXQUxMRVRfVFhfVFJBQ0tFUiIsIldhbGxldFR4VHJhY2tlciIsIldBTExFVF9SUENfQ09ORklHIiwidXJpIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInJlamVjdFVuYXV0aG9yaXplZCIsIkRBRU1PTl9MT0NBTF9QQVRIIiwiREFFTU9OX1JQQ19DT05GSUciLCJnZXREZWZhdWx0RnMiLCJHZW5VdGlscyIsImlzQnJvd3NlciIsIlByb21pc2UiLCJyZXNvbHZlIiwidGhlbiIsImZzIiwiZ2V0RGFlbW9uUnBjIiwiZGFlbW9uUnBjIiwidW5kZWZpbmVkIiwiY29ubmVjdFRvRGFlbW9uUnBjIiwiYXNzaWduIiwicHJveHlUb1dvcmtlciIsImdldERhZW1vblJwY0Nvbm5lY3Rpb24iLCJNb25lcm9ScGNDb25uZWN0aW9uIiwiZ2V0V2FsbGV0UnBjIiwid2FsbGV0UnBjIiwiY29ubmVjdFRvV2FsbGV0UnBjIiwib3BlbldhbGxldCIsInBhdGgiLCJlIiwiTW9uZXJvUnBjRXJyb3IiLCJjb25zb2xlIiwibG9nIiwiZ2V0Q29kZSIsImNyZWF0ZVdhbGxldCIsInNlZWQiLCJyZXN0b3JlSGVpZ2h0IiwiYXNzZXJ0IiwiZXF1YWwiLCJnZXRTZWVkIiwiZ2V0UHJpbWFyeUFkZHJlc3MiLCJzeW5jIiwic2F2ZSIsInN0YXJ0U3luY2luZyIsInN0YXJ0V2FsbGV0UnBjUHJvY2VzcyIsIm9mZmxpbmUiLCJwb3J0T2Zmc2V0Iiwia2V5cyIsImluY2x1ZGVzIiwid2FsbGV0Iiwic3Vic3RyaW5nIiwibGFzdEluZGV4T2YiLCJjbWQiLCJnZXRFbnVtS2V5QnlWYWx1ZSIsInRvTG93ZXJDYXNlIiwicHVzaCIsInN0b3BXYWxsZXRScGNQcm9jZXNzIiwiTW9uZXJvV2FsbGV0UnBjIiwidmFsdWUiLCJlbnRyaWVzIiwiRXJyb3IiLCJzdG9wUHJvY2VzcyIsImdldFdhbGxldEZ1bGwiLCJ3YWxsZXRGdWxsIiwiaXNDbG9zZWQiLCJNb25lcm9XYWxsZXRGdWxsIiwid2FsbGV0RXhpc3RzIiwiZXhpc3RzU3luYyIsIm1rZGlyU3luYyIsInByb2Nlc3MiLCJjd2QiLCJyZWN1cnNpdmUiLCJjcmVhdGVXYWxsZXRGdWxsIiwibmV0d29ya1R5cGUiLCJzZXJ2ZXIiLCJnZXRSZXN0b3JlSGVpZ2h0IiwiZGVlcEVxdWFsIiwiZ2V0RGFlbW9uQ29ubmVjdGlvbiIsIm9wZW5XYWxsZXRGdWxsIiwic2V0RGFlbW9uQ29ubmVjdGlvbiIsIldhbGxldFN5bmNQcmludGVyIiwiZ2V0V2FsbGV0S2V5cyIsIndhbGxldEtleXMiLCJjcmVhdGVXYWxsZXRLZXlzIiwiY3JlYXRlV2FsbGV0R3JvdW5kVHJ1dGgiLCJzdGFydEhlaWdodCIsImRhZW1vbkNvbm5lY3Rpb24iLCJEYXRlIiwiZ2V0VGltZSIsImd0V2FsbGV0IiwidGVzdFVuc2lnbmVkQmlnSW50IiwibnVtIiwibm9uWmVybyIsImdldEV4dGVybmFsV2FsbGV0QWRkcmVzcyIsImdldEFkZHJlc3MiLCJ0eHNNZXJnZWFibGUiLCJ0eDEiLCJ0eDIiLCJjb3B5MSIsImNvcHkiLCJjb3B5MiIsImdldElzQ29uZmlybWVkIiwic2V0QmxvY2siLCJnZXRCbG9jayIsInNldFR4cyIsIm1lcmdlIiwiZXJyb3IiLCJleHBvcnRzIl0sInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3Rlc3QvdXRpbHMvVGVzdFV0aWxzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhc3NlcnQgZnJvbSBcImFzc2VydFwiO1xuaW1wb3J0IFdhbGxldFN5bmNQcmludGVyIGZyb20gXCIuL1dhbGxldFN5bmNQcmludGVyXCI7XG5pbXBvcnQgV2FsbGV0VHhUcmFja2VyIGZyb20gXCIuL1dhbGxldFR4VHJhY2tlclwiO1xuaW1wb3J0IHtMaWJyYXJ5VXRpbHMsXG4gICAgICAgIEdlblV0aWxzLFxuICAgICAgICBNb25lcm9ScGNFcnJvcixcbiAgICAgICAgTW9uZXJvUnBjQ29ubmVjdGlvbixcbiAgICAgICAgTW9uZXJvTmV0d29ya1R5cGUsXG4gICAgICAgIE1vbmVyb0RhZW1vblJwYyxcbiAgICAgICAgTW9uZXJvV2FsbGV0UnBjLFxuICAgICAgICBjb25uZWN0VG9XYWxsZXRScGMsXG4gICAgICAgIGNvbm5lY3RUb0RhZW1vblJwYyxcbiAgICAgICAgb3BlbldhbGxldEZ1bGwsXG4gICAgICAgIGNyZWF0ZVdhbGxldEZ1bGwsXG4gICAgICAgIGNyZWF0ZVdhbGxldEtleXMsXG4gICAgICAgIE1vbmVyb1dhbGxldEZ1bGwsXG4gICAgICAgIE1vbmVyb1dhbGxldEtleXN9IGZyb20gXCIuLi8uLi8uLi9pbmRleFwiO1xuXG4vKipcbiAqIENvbGxlY3Rpb24gb2YgdGVzdCB1dGlsaXRpZXMgYW5kIGNvbmZpZ3VyYXRpb25zLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXN0VXRpbHMge1xuXG4gIC8vIGNsYXNzZXMgdG8gdGVzdFxuICBzdGF0aWMgZGFlbW9uUnBjOiBNb25lcm9EYWVtb25ScGM7XG4gIHN0YXRpYyB3YWxsZXRScGM6IE1vbmVyb1dhbGxldFJwYztcbiAgc3RhdGljIHdhbGxldEZ1bGw6IE1vbmVyb1dhbGxldEZ1bGw7XG4gIHN0YXRpYyB3YWxsZXRLZXlzOiBNb25lcm9XYWxsZXRLZXlzO1xuXG4gIC8vIGNvbW1vbiBjb25maWdcbiAgc3RhdGljIFBST1hZX1RPX1dPUktFUiA9IHRydWU7XG4gIHN0YXRpYyBNT05FUk9fQklOU19ESVIgPSBcIlwiOyAvLyBkaXJlY3Rvcnkgd2l0aCBtb25lcm8gYmluYXJpZXMgdG8gdGVzdCAobW9uZXJvZCBhbmQgbW9uZXJvLXdhbGxldC1ycGMpXG4gIHN0YXRpYyBTWU5DX1BFUklPRF9JTl9NUyA9IDUwMDA7IC8vIHBlcmlvZCBiZXR3ZWVuIHdhbGxldCBzeW5jcyBpbiBtaWxsaXNlY29uZHNcbiAgc3RhdGljIE9GRkxJTkVfU0VSVkVSX1VSSSA9IFwib2ZmbGluZV9zZXJ2ZXJfdXJpXCI7IC8vIGR1bW15IHNlcnZlciB1cmkgdG8gcmVtYWluIG9mZmxpbmUgYmVjYXVzZSB3YWxsZXQyIGNvbm5lY3RzIHRvIGRlZmF1bHQgaWYgbm90IGdpdmVuXG4gIHN0YXRpYyBBVVRPX0NPTk5FQ1RfVElNRU9VVF9NUyA9IDIwMDA7XG5cbiAgLy8gd2FsbGV0IGNvbmZpZ1xuICBzdGF0aWMgTkVUV09SS19UWVBFID0gTW9uZXJvTmV0d29ya1R5cGUuVEVTVE5FVDtcbiAgc3RhdGljIFNFRUQgPSBcInNpbGsgbW9ja2VkIGN1Y3VtYmVyIGxldHR1Y2UgaG9wZSBhZHJlbmFsaW4gYWNoaW5nIGx1c2ggcm9sZXMgZnVlbCByZXZhbXAgYmFwdGlzbSB3cmlzdCBsb25nIHRlbmRlciB0ZWFyZHJvcCBtaWRzdCBwYXN0cnkgcGlnbWVudCBlcXVpcCBmcnlpbmcgaW5ib3VuZCBwaW5jaGVkIHJhdmluZSBmcnlpbmdcIjtcbiAgc3RhdGljIEFERFJFU1MgPSBcIkExeTlzYlZ0OG5xaFpBVm0zbWUxVTE4clVWWGNqZU5LdUJkMW9FMmNUczhiaUE5Y296UE1leVlMaGU3N25QdjEySkEzZWpKTjNxcHJtUkVyaWl0MmZpNnRKRGk5OVJSXCI7XG4gIHN0YXRpYyBGSVJTVF9SRUNFSVZFX0hFSUdIVCA9IDE3MTsgLy8gTk9URTogdGhpcyB2YWx1ZSBtdXN0IGJlIHRoZSBoZWlnaHQgb2YgdGhlIHdhbGxldCdzIGZpcnN0IHR4IGZvciB0ZXN0c1xuICBzdGF0aWMgV0FMTEVUX05BTUUgPSBcInRlc3Rfd2FsbGV0XzFcIjtcbiAgc3RhdGljIFdBTExFVF9QQVNTV09SRCA9IFwic3VwZXJzZWNyZXRwYXNzd29yZDEyM1wiO1xuICBzdGF0aWMgVEVTVF9XQUxMRVRTX0RJUiA9IFwiLi90ZXN0X3dhbGxldHNcIjtcbiAgc3RhdGljIFdBTExFVF9GVUxMX1BBVEggPSBUZXN0VXRpbHMuVEVTVF9XQUxMRVRTX0RJUiArIFwiL1wiICsgVGVzdFV0aWxzLldBTExFVF9OQU1FO1xuICBzdGF0aWMgV0FMTEVUX1JQQ19QT1JUX1NUQVJUID0gMjgwODQ7XG4gIHN0YXRpYyBXQUxMRVRfUE9SVF9PRkZTRVRTID0ge307XG4gIHN0YXRpYyBXQUxMRVRfUlBDX0xPQ0FMX1BBVEggPSBUZXN0VXRpbHMuTU9ORVJPX0JJTlNfRElSICsgXCIvbW9uZXJvLXdhbGxldC1ycGNcIjtcbiAgc3RhdGljIFdBTExFVF9SUENfTE9DQUxfV0FMTEVUX0RJUiA9IFRlc3RVdGlscy5NT05FUk9fQklOU19ESVI7XG4gIHN0YXRpYyBXQUxMRVRfUlBDX0FDQ0VTU19DT05UUk9MX09SSUdJTlMgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MFwiOyAvLyBjb3JzIGFjY2VzcyBmcm9tIHdlYiBicm93c2VyXG4gIHN0YXRpYyBNQVhfRkVFID0gNzUwMDAwMG4gKiAxMDAwMG47XG4gIHN0YXRpYyBXQUxMRVRfVFhfVFJBQ0tFUiA9IG5ldyBXYWxsZXRUeFRyYWNrZXIoKTsgLy8gdXNlZCB0byB0cmFjayB3YWxsZXQgdHhzIGZvciB0ZXN0c1xuICBzdGF0aWMgV0FMTEVUX1JQQ19DT05GSUcgPSB7XG4gICAgdXJpOiBcImxvY2FsaG9zdDoyODA4NFwiLFxuICAgIHVzZXJuYW1lOiBcInJwY191c2VyXCIsXG4gICAgcGFzc3dvcmQ6IFwiYWJjMTIzXCIsXG4gICAgcmVqZWN0VW5hdXRob3JpemVkOiB0cnVlIC8vIHJlamVjdCBzZWxmLXNpZ25lZCBjZXJ0aWZpY2F0ZXMgaWYgdHJ1ZVxuICB9O1xuXG4gIC8vIGRhZW1vbiBjb25maWdcbiAgc3RhdGljIERBRU1PTl9MT0NBTF9QQVRIID0gVGVzdFV0aWxzLk1PTkVST19CSU5TX0RJUiArIFwiL21vbmVyb2RcIjtcbiAgc3RhdGljIERBRU1PTl9SUENfQ09ORklHID0ge1xuICAgIHVyaTogXCJsb2NhbGhvc3Q6MjgwODFcIixcbiAgICB1c2VybmFtZTogXCJcIixcbiAgICBwYXNzd29yZDogXCJcIixcbiAgICByZWplY3RVbmF1dGhvcml6ZWQ6IHRydWUgLy8gcmVqZWN0IHNlbGYtc2lnbmVkIGNlcnRpZmljYXRlcyBpZiB0cnVlXG4gIH07XG4gIFxuICAvKipcbiAgICogR2V0IGEgZGVmYXVsdCBmaWxlIHN5c3RlbS4gIFVzZXMgYW4gaW4tbWVtb3J5IGZpbGUgc3lzdGVtIGlmIHJ1bm5pbmcgaW4gdGhlIGJyb3dzZXIuXG4gICAqIFxuICAgKiBAcmV0dXJuIHthbnl9IG5vZGVqcy1jb21wYXRpYmxlIGZpbGUgc3lzdGVtXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgZ2V0RGVmYXVsdEZzKCk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIEdlblV0aWxzLmlzQnJvd3NlcigpID8gKGF3YWl0IGltcG9ydCgnbWVtZnMnKSkuZnMgOiBhd2FpdCBpbXBvcnQoJ2ZzJyk7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBHZXQgYSBzaW5nbGV0b24gZGFlbW9uIFJQQyBpbnN0YW5jZSBzaGFyZWQgYW1vbmcgdGVzdHMuXG4gICAqIFxuICAgKiBAcmV0dXJuIHtQcm9taXNlPE1vbmVyb0RhZW1vblJwYz59IGEgZGFlbW9uIFJQQyBpbnN0YW5jZVxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGdldERhZW1vblJwYygpOiBQcm9taXNlPE1vbmVyb0RhZW1vblJwYz4ge1xuICAgIGlmIChUZXN0VXRpbHMuZGFlbW9uUnBjID09PSB1bmRlZmluZWQpIFRlc3RVdGlscy5kYWVtb25ScGMgPSBhd2FpdCBjb25uZWN0VG9EYWVtb25ScGMoT2JqZWN0LmFzc2lnbih7cHJveHlUb1dvcmtlcjogVGVzdFV0aWxzLlBST1hZX1RPX1dPUktFUn0sIFRlc3RVdGlscy5EQUVNT05fUlBDX0NPTkZJRykpO1xuICAgIHJldHVybiBUZXN0VXRpbHMuZGFlbW9uUnBjO1xuICB9XG4gIFxuICAvKipcbiAgICogR2V0IGEgc2luZ2xldG9uIGluc3RhbmNlIG9mIGEgbW9uZXJvZCBjbGllbnQuXG4gICAqL1xuICBzdGF0aWMgZ2V0RGFlbW9uUnBjQ29ubmVjdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE1vbmVyb1JwY0Nvbm5lY3Rpb24oVGVzdFV0aWxzLkRBRU1PTl9SUENfQ09ORklHKTtcbiAgfVxuICBcbiAgLyoqXG4gICAqIEdldCBhIHNpbmdsZXRvbiBpbnN0YW5jZSBvZiBhIG1vbmVyby13YWxsZXQtcnBjIGNsaWVudC5cbiAgICogXG4gICAqIEByZXR1cm4ge1Byb21pc2U8TW9uZXJvV2FsbGV0UnBjPn0gYSB3YWxsZXQgUlBDIGluc3RhbmNlXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgZ2V0V2FsbGV0UnBjKCk6IFByb21pc2U8TW9uZXJvV2FsbGV0UnBjPiB7XG4gICAgaWYgKFRlc3RVdGlscy53YWxsZXRScGMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgXG4gICAgICAvLyBjb25zdHJ1Y3Qgd2FsbGV0IHJwYyBpbnN0YW5jZSB3aXRoIGRhZW1vbiBjb25uZWN0aW9uXG4gICAgICBUZXN0VXRpbHMud2FsbGV0UnBjID0gYXdhaXQgY29ubmVjdFRvV2FsbGV0UnBjKFRlc3RVdGlscy5XQUxMRVRfUlBDX0NPTkZJRyk7XG4gICAgfVxuICAgIFxuICAgIC8vIGF0dGVtcHQgdG8gb3BlbiB0ZXN0IHdhbGxldFxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBUZXN0VXRpbHMud2FsbGV0UnBjLm9wZW5XYWxsZXQoe3BhdGg6IFRlc3RVdGlscy5XQUxMRVRfTkFNRSwgcGFzc3dvcmQ6IFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkR9KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgTW9uZXJvUnBjRXJyb3IpKSB0aHJvdyBlO1xuXG4gICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIFxuICAgICAgLy8gLTEgcmV0dXJuZWQgd2hlbiB3YWxsZXQgZG9lcyBub3QgZXhpc3Qgb3IgZmFpbHMgdG8gb3BlbiBlLmcuIGl0J3MgYWxyZWFkeSBvcGVuIGJ5IGFub3RoZXIgYXBwbGljYXRpb25cbiAgICAgIGlmIChlLmdldENvZGUoKSA9PT0gLTEpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSB3YWxsZXRcbiAgICAgICAgY29uc29sZS5sb2coXCJDcmVhdGluZyB3YWxsZXQhXCIpO1xuICAgICAgICBhd2FpdCBUZXN0VXRpbHMud2FsbGV0UnBjLmNyZWF0ZVdhbGxldCh7cGF0aDogVGVzdFV0aWxzLldBTExFVF9OQU1FLCBwYXNzd29yZDogVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCwgc2VlZDogVGVzdFV0aWxzLlNFRUQsIHJlc3RvcmVIZWlnaHQ6IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gZW5zdXJlIHdlJ3JlIHRlc3RpbmcgdGhlIHJpZ2h0IHdhbGxldFxuICAgIGFzc2VydC5lcXVhbChhd2FpdCBUZXN0VXRpbHMud2FsbGV0UnBjLmdldFNlZWQoKSwgVGVzdFV0aWxzLlNFRUQpO1xuICAgIGFzc2VydC5lcXVhbChhd2FpdCBUZXN0VXRpbHMud2FsbGV0UnBjLmdldFByaW1hcnlBZGRyZXNzKCksIFRlc3RVdGlscy5BRERSRVNTKTtcbiAgICBcbiAgICAvLyBzeW5jIGFuZCBzYXZlIHdhbGxldFxuICAgIGF3YWl0IFRlc3RVdGlscy53YWxsZXRScGMuc3luYygpO1xuICAgIGF3YWl0IFRlc3RVdGlscy53YWxsZXRScGMuc2F2ZSgpO1xuICAgIGF3YWl0IFRlc3RVdGlscy53YWxsZXRScGMuc3RhcnRTeW5jaW5nKFRlc3RVdGlscy5TWU5DX1BFUklPRF9JTl9NUyk7XG4gICAgXG4gICAgLy8gcmV0dXJuIGNhY2hlZCB3YWxsZXQgcnBjXG4gICAgcmV0dXJuIFRlc3RVdGlscy53YWxsZXRScGM7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBtb25lcm8td2FsbGV0LXJwYyBwcm9jZXNzIGJvdW5kIHRvIHRoZSBuZXh0IGF2YWlsYWJsZSBwb3J0LlxuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvZmZsaW5lXSAtIHdhbGxldCBpcyBzdGFydGVkIGluIG9mZmxpbmUgbW9kZSAoZGVmYXVsdCBmYWxzZSlcbiAgICogQHJldHVybiB7UHJvbWlzZTxNb25lcm9XYWxsZXRScGM+fSAtIGNsaWVudCBjb25uZWN0ZWQgdG8gYW4gaW50ZXJuYWwgbW9uZXJvLXdhbGxldC1ycGMgaW5zdGFuY2VcbiAgICovXG4gIHN0YXRpYyBhc3luYyBzdGFydFdhbGxldFJwY1Byb2Nlc3Mob2ZmbGluZSA9IGZhbHNlKTogUHJvbWlzZTxNb25lcm9XYWxsZXRScGM+IHtcbiAgICBcbiAgICAvLyBnZXQgbmV4dCBhdmFpbGFibGUgb2Zmc2V0IG9mIHBvcnRzIHRvIGJpbmQgdG9cbiAgICBsZXQgcG9ydE9mZnNldCA9IDE7XG4gICAgd2hpbGUgKE9iamVjdC5rZXlzKFRlc3RVdGlscy5XQUxMRVRfUE9SVF9PRkZTRVRTKS5pbmNsdWRlcyhcIlwiICsgcG9ydE9mZnNldCkpIHBvcnRPZmZzZXQrKztcbiAgICBUZXN0VXRpbHMuV0FMTEVUX1BPUlRfT0ZGU0VUU1twb3J0T2Zmc2V0XSA9IHVuZGVmaW5lZDsgLy8gcmVzZXJ2ZSBwb3J0XG4gICAgXG4gICAgLy8gY3JlYXRlIG9yIGNvbm5lY3QgdG8gbW9uZXJvLXdhbGxldC1ycGMgcHJvY2Vzc1xuICAgIGxldCB3YWxsZXQ7XG4gICAgaWYgKEdlblV0aWxzLmlzQnJvd3NlcigpKSB7XG4gICAgICBsZXQgdXJpID0gVGVzdFV0aWxzLldBTExFVF9SUENfQ09ORklHLnVyaS5zdWJzdHJpbmcoMCwgVGVzdFV0aWxzLldBTExFVF9SUENfQ09ORklHLnVyaS5sYXN0SW5kZXhPZihcIjpcIikpICsgXCI6XCIgKyAoVGVzdFV0aWxzLldBTExFVF9SUENfUE9SVF9TVEFSVCArIHBvcnRPZmZzZXQpO1xuICAgICAgd2FsbGV0ID0gYXdhaXQgY29ubmVjdFRvV2FsbGV0UnBjKHVyaSwgVGVzdFV0aWxzLldBTExFVF9SUENfQ09ORklHLnVzZXJuYW1lLCBUZXN0VXRpbHMuV0FMTEVUX1JQQ19DT05GSUcucGFzc3dvcmQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIFxuICAgICAgLy8gY3JlYXRlIGNvbW1hbmQgdG8gc3RhcnQgY2xpZW50IHdpdGggaW50ZXJuYWwgbW9uZXJvLXdhbGxldC1ycGMgcHJvY2Vzc1xuICAgICAgbGV0IGNtZCA9IFtcbiAgICAgICAgICBUZXN0VXRpbHMuV0FMTEVUX1JQQ19MT0NBTF9QQVRILFxuICAgICAgICAgIFwiLS1cIiArIEdlblV0aWxzLmdldEVudW1LZXlCeVZhbHVlKE1vbmVyb05ldHdvcmtUeXBlLCBUZXN0VXRpbHMuTkVUV09SS19UWVBFKSEudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICBcIi0tcnBjLWJpbmQtcG9ydFwiLCBcIlwiICsgKFRlc3RVdGlscy5XQUxMRVRfUlBDX1BPUlRfU1RBUlQgKyBwb3J0T2Zmc2V0KSxcbiAgICAgICAgICBcIi0tcnBjLWxvZ2luXCIsIFRlc3RVdGlscy5XQUxMRVRfUlBDX0NPTkZJRy51c2VybmFtZSArIFwiOlwiICsgVGVzdFV0aWxzLldBTExFVF9SUENfQ09ORklHLnBhc3N3b3JkLFxuICAgICAgICAgIFwiLS13YWxsZXQtZGlyXCIsIFRlc3RVdGlscy5XQUxMRVRfUlBDX0xPQ0FMX1dBTExFVF9ESVIsXG4gICAgICAgICAgXCItLXJwYy1hY2Nlc3MtY29udHJvbC1vcmlnaW5zXCIsIFRlc3RVdGlscy5XQUxMRVRfUlBDX0FDQ0VTU19DT05UUk9MX09SSUdJTlNcbiAgICAgIF07XG4gICAgICBpZiAob2ZmbGluZSkgY21kLnB1c2goXCItLW9mZmxpbmVcIik7XG4gICAgICBlbHNlIGNtZC5wdXNoKFwiLS1kYWVtb24tYWRkcmVzc1wiLCBUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcudXJpKTtcbiAgICAgIGlmIChUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcudXNlcm5hbWUpIGNtZC5wdXNoKFwiLS1kYWVtb24tbG9naW5cIiwgVGVzdFV0aWxzLkRBRU1PTl9SUENfQ09ORklHLnVzZXJuYW1lICsgXCI6XCIgKyBUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcucGFzc3dvcmQpO1xuICAgICAgXG4gICAgICAvLyBUT0RPOiBpbmNsdWRlIHptcSBwYXJhbXMgd2hlbiBzdXBwb3J0ZWQgYW5kIGVuYWJsZWRcbiAgICAgIFxuICAgICAgLy8gY3JlYXRlIGFuZCBjb25uZWN0IHRvIG1vbmVyby13YWxsZXQtcnBjIHByb2Nlc3NcbiAgICAgIHdhbGxldCA9IGF3YWl0IGNvbm5lY3RUb1dhbGxldFJwYyhjbWQpO1xuICAgIH1cbiAgICBcbiAgICAvLyByZWdpc3RlciB3YWxsZXQgd2l0aCBwb3J0IG9mZnNldFxuICAgIFRlc3RVdGlscy5XQUxMRVRfUE9SVF9PRkZTRVRTW3BvcnRPZmZzZXRdID0gd2FsbGV0O1xuICAgIHJldHVybiB3YWxsZXQ7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBTdG9wIGEgbW9uZXJvLXdhbGxldC1ycGMgcHJvY2VzcyBhbmQgcmVsZWFzZSBpdHMgcG9ydC5cbiAgICogXG4gICAqIEBwYXJhbSB7TW9uZXJvV2FsbGV0UnBjfSB3YWxsZXRScGMgLSB3YWxsZXQgY3JlYXRlZCB3aXRoIGludGVybmFsIG1vbmVyby13YWxsZXQtcnBjIHByb2Nlc3NcbiAgICovXG4gIHN0YXRpYyBhc3luYyBzdG9wV2FsbGV0UnBjUHJvY2Vzcyh3YWxsZXRScGMpIHtcbiAgICBhc3NlcnQod2FsbGV0UnBjIGluc3RhbmNlb2YgTW9uZXJvV2FsbGV0UnBjLCBcIk11c3QgcHJvdmlkZSBpbnN0YW5jZSBvZiBNb25lcm9XYWxsZXRScGMgdG8gY2xvc2VcIik7XG4gICAgXG4gICAgLy8gZ2V0IGNvcnJlc3BvbmRpbmcgcG9ydFxuICAgIGxldCBwb3J0T2Zmc2V0O1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKFRlc3RVdGlscy5XQUxMRVRfUE9SVF9PRkZTRVRTKSkge1xuICAgICAgaWYgKHZhbHVlID09PSB3YWxsZXRScGMpIHtcbiAgICAgICAgcG9ydE9mZnNldCA9IGtleTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChwb3J0T2Zmc2V0ID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcihcIldhbGxldCBub3QgcmVnaXN0ZXJlZFwiKTtcbiAgICBcbiAgICAvLyB1bnJlZ2lzdGVyIHdhbGxldCB3aXRoIHBvcnQgb2Zmc2V0XG4gICAgZGVsZXRlIFRlc3RVdGlscy5XQUxMRVRfUE9SVF9PRkZTRVRTW3BvcnRPZmZzZXRdO1xuICAgIGlmICghR2VuVXRpbHMuaXNCcm93c2VyKCkpIGF3YWl0IHdhbGxldFJwYy5zdG9wUHJvY2VzcygpO1xuICB9XG4gIFxuICAvKipcbiAgICogR2V0IGEgc2luZ2xldG9uIGluc3RhbmNlIG9mIGEgd2FsbGV0IHN1cHBvcnRlZCBieSBXZWJBc3NlbWJseSBiaW5kaW5ncyB0byBtb25lcm8tcHJvamVjdCdzIHdhbGxldDIuXG4gICAqIFxuICAgKiBAcmV0dXJuIHtNb25lcm9XYWxsZXRGdWxsfSBhIGZ1bGwgd2FsbGV0IGluc3RhbmNlXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgZ2V0V2FsbGV0RnVsbCgpIHtcbiAgICBpZiAoIVRlc3RVdGlscy53YWxsZXRGdWxsIHx8IGF3YWl0IFRlc3RVdGlscy53YWxsZXRGdWxsLmlzQ2xvc2VkKCkpIHtcbiAgICAgIFxuICAgICAgLy8gY3JlYXRlIHdhbGxldCBmcm9tIHNlZWQgcGhyYXNlIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgIGxldCBmcyA9IGF3YWl0IFRlc3RVdGlscy5nZXREZWZhdWx0RnMoKTtcbiAgICAgIGlmICghYXdhaXQgTW9uZXJvV2FsbGV0RnVsbC53YWxsZXRFeGlzdHMoVGVzdFV0aWxzLldBTExFVF9GVUxMX1BBVEgsIGZzKSkge1xuICAgICAgICAvLyBjcmVhdGUgZGlyZWN0b3J5IGZvciB0ZXN0IHdhbGxldHMgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICBmcy5leGlzdHNTeW5jKFRlc3RVdGlscy5URVNUX1dBTExFVFNfRElSKSB8fCBmcy5ta2RpclN5bmMoVGVzdFV0aWxzLlRFU1RfV0FMTEVUU19ESVIpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoVGVzdFV0aWxzLlRFU1RfV0FMTEVUU19ESVIpKSB7XG4gICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHByb2Nlc3MuY3dkKCkpKSBmcy5ta2RpclN5bmMocHJvY2Vzcy5jd2QoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7ICAvLyBjcmVhdGUgY3VycmVudCBwcm9jZXNzIGRpcmVjdG9yeSBmb3IgcmVsYXRpdmUgcGF0aHMgd2hpY2ggZG9lcyBub3QgZXhpc3QgaW4gbWVtb3J5IGZzXG4gICAgICAgICAgZnMubWtkaXJTeW5jKFRlc3RVdGlscy5URVNUX1dBTExFVFNfRElSKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIHdhbGxldCB3aXRoIGNvbm5lY3Rpb25cbiAgICAgICAgVGVzdFV0aWxzLndhbGxldEZ1bGwgPSBhd2FpdCBjcmVhdGVXYWxsZXRGdWxsKHtwYXRoOiBUZXN0VXRpbHMuV0FMTEVUX0ZVTExfUEFUSCwgcGFzc3dvcmQ6IFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQsIG5ldHdvcmtUeXBlOiBUZXN0VXRpbHMuTkVUV09SS19UWVBFLCBzZWVkOiBUZXN0VXRpbHMuU0VFRCwgc2VydmVyOiBUZXN0VXRpbHMuZ2V0RGFlbW9uUnBjQ29ubmVjdGlvbigpLCByZXN0b3JlSGVpZ2h0OiBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQsIHByb3h5VG9Xb3JrZXI6IFRlc3RVdGlscy5QUk9YWV9UT19XT1JLRVIsIGZzOiBmc30pO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgVGVzdFV0aWxzLndhbGxldEZ1bGwuZ2V0UmVzdG9yZUhlaWdodCgpLCBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGF3YWl0IFRlc3RVdGlscy53YWxsZXRGdWxsLmdldERhZW1vbkNvbm5lY3Rpb24oKSwgVGVzdFV0aWxzLmdldERhZW1vblJwY0Nvbm5lY3Rpb24oKSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIG90aGVyd2lzZSBvcGVuIGV4aXN0aW5nIHdhbGxldFxuICAgICAgZWxzZSB7XG4gICAgICAgIFRlc3RVdGlscy53YWxsZXRGdWxsID0gYXdhaXQgb3BlbldhbGxldEZ1bGwoe3BhdGg6IFRlc3RVdGlscy5XQUxMRVRfRlVMTF9QQVRILCBwYXNzd29yZDogVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCwgbmV0d29ya1R5cGU6IFRlc3RVdGlscy5ORVRXT1JLX1RZUEUsIHNlcnZlcjogVGVzdFV0aWxzLmdldERhZW1vblJwY0Nvbm5lY3Rpb24oKSwgcHJveHlUb1dvcmtlcjogVGVzdFV0aWxzLlBST1hZX1RPX1dPUktFUiwgZnM6IGZzfSk7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy53YWxsZXRGdWxsLnNldERhZW1vbkNvbm5lY3Rpb24oVGVzdFV0aWxzLmdldERhZW1vblJwY0Nvbm5lY3Rpb24oKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gc3luYyBhbmQgc2F2ZSB3YWxsZXRcbiAgICBhd2FpdCBUZXN0VXRpbHMud2FsbGV0RnVsbC5zeW5jKG5ldyBXYWxsZXRTeW5jUHJpbnRlcigpKTtcbiAgICBhd2FpdCBUZXN0VXRpbHMud2FsbGV0RnVsbC5zYXZlKCk7XG4gICAgYXdhaXQgVGVzdFV0aWxzLndhbGxldEZ1bGwuc3RhcnRTeW5jaW5nKFRlc3RVdGlscy5TWU5DX1BFUklPRF9JTl9NUyk7XG4gICAgXG4gICAgLy8gZW5zdXJlIHdlJ3JlIHRlc3RpbmcgdGhlIHJpZ2h0IHdhbGxldFxuICAgIGFzc2VydC5lcXVhbChhd2FpdCBUZXN0VXRpbHMud2FsbGV0RnVsbC5nZXRTZWVkKCksIFRlc3RVdGlscy5TRUVEKTtcbiAgICBhc3NlcnQuZXF1YWwoYXdhaXQgVGVzdFV0aWxzLndhbGxldEZ1bGwuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgVGVzdFV0aWxzLkFERFJFU1MpO1xuICAgIHJldHVybiBUZXN0VXRpbHMud2FsbGV0RnVsbDtcbiAgfVxuICBcbiAgLyoqXG4gICAqIEdldCBhIHNpbmdsZXRvbiBrZXlzLW9ubHkgd2FsbGV0IGluc3RhbmNlIHNoYXJlZCBhbW9uZyB0ZXN0cy5cbiAgICogXG4gICAqIEByZXR1cm4ge01vbmVyb1dhbGxldEtleXN9IGEga2V5cy1vbmx5IHdhbGxldCBpbnN0YW5jZVxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGdldFdhbGxldEtleXMoKSB7XG4gICAgaWYgKFRlc3RVdGlscy53YWxsZXRLZXlzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIFxuICAgICAgLy8gY3JlYXRlIHdhbGxldCBmcm9tIHNlZWRcbiAgICAgIFRlc3RVdGlscy53YWxsZXRLZXlzID0gYXdhaXQgY3JlYXRlV2FsbGV0S2V5cyh7bmV0d29ya1R5cGU6IFRlc3RVdGlscy5ORVRXT1JLX1RZUEUsIHNlZWQ6IFRlc3RVdGlscy5TRUVEfSk7XG4gICAgfVxuICAgIHJldHVybiBUZXN0VXRpbHMud2FsbGV0S2V5cztcbiAgfVxuICBcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgd2FsbGV0IGNvbnNpZGVyZWQgdG8gYmUgXCJncm91bmQgdHJ1dGhcIi5cbiAgICogXG4gICAqIEBwYXJhbSBuZXR3b3JrVHlwZSAtIGdyb3VuZCB0cnV0aCB3YWxsZXQncyBuZXR3b3JrIHR5cGVcbiAgICogQHBhcmFtIHNlZWQgLSBncm91bmQgdHJ1dGggd2FsbGV0J3Mgc2VlZFxuICAgKiBAcGFyYW0gc3RhcnRIZWlnaHQgLSBoZWlnaHQgdG8gc3RhcnQgc3luY2luZyBmcm9tXG4gICAqIEBwYXJhbSByZXN0b3JlSGVpZ2h0IC0gZ3JvdW5kIHRydXRoIHdhbGxldCdzIHJlc3RvcmUgaGVpZ2h0XG4gICAqIEByZXR1cm4ge01vbmVyb1dhbGxldEZ1bGx9IHRoZSBjcmVhdGVkIHdhbGxldFxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGNyZWF0ZVdhbGxldEdyb3VuZFRydXRoKG5ldHdvcmtUeXBlLCBzZWVkLCBzdGFydEhlaWdodCwgcmVzdG9yZUhlaWdodCkge1xuXG4gICAgLy8gY3JlYXRlIGRpcmVjdG9yeSBmb3IgdGVzdCB3YWxsZXRzIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICBsZXQgZnMgPSBhd2FpdCBUZXN0VXRpbHMuZ2V0RGVmYXVsdEZzKCk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKFRlc3RVdGlscy5URVNUX1dBTExFVFNfRElSKSkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHByb2Nlc3MuY3dkKCkpKSBmcy5ta2RpclN5bmMocHJvY2Vzcy5jd2QoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7ICAvLyBjcmVhdGUgY3VycmVudCBwcm9jZXNzIGRpcmVjdG9yeSBmb3IgcmVsYXRpdmUgcGF0aHMgd2hpY2ggZG9lcyBub3QgZXhpc3QgaW4gbWVtb3J5IGZzXG4gICAgICBmcy5ta2RpclN5bmMoVGVzdFV0aWxzLlRFU1RfV0FMTEVUU19ESVIpO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBncm91bmQgdHJ1dGggd2FsbGV0XG4gICAgbGV0IGRhZW1vbkNvbm5lY3Rpb24gPSBuZXcgTW9uZXJvUnBjQ29ubmVjdGlvbihUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcpO1xuICAgIGxldCBwYXRoID0gVGVzdFV0aWxzLlRFU1RfV0FMTEVUU19ESVIgKyBcIi9ndF93YWxsZXRfXCIgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsZXQgZ3RXYWxsZXQgPSBhd2FpdCBjcmVhdGVXYWxsZXRGdWxsKHtcbiAgICAgIHBhdGg6IHBhdGgsXG4gICAgICBwYXNzd29yZDogVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCxcbiAgICAgIG5ldHdvcmtUeXBlOiBuZXR3b3JrVHlwZSxcbiAgICAgIHNlZWQ6IHNlZWQsXG4gICAgICBzZXJ2ZXI6IGRhZW1vbkNvbm5lY3Rpb24sXG4gICAgICByZXN0b3JlSGVpZ2h0OiByZXN0b3JlSGVpZ2h0LFxuICAgICAgZnM6IGZzXG4gICAgfSk7XG4gICAgYXNzZXJ0LmVxdWFsKGF3YWl0IGd0V2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSwgcmVzdG9yZUhlaWdodCA/IHJlc3RvcmVIZWlnaHQgOiAwKTtcbiAgICBhd2FpdCBndFdhbGxldC5zeW5jKG5ldyBXYWxsZXRTeW5jUHJpbnRlcigpLCBzdGFydEhlaWdodCk7XG4gICAgYXdhaXQgZ3RXYWxsZXQuc3RhcnRTeW5jaW5nKFRlc3RVdGlscy5TWU5DX1BFUklPRF9JTl9NUyk7XG4gICAgcmV0dXJuIGd0V2FsbGV0O1xuICB9XG4gIFxuICBzdGF0aWMgdGVzdFVuc2lnbmVkQmlnSW50KG51bSwgbm9uWmVybz8pIHtcbiAgICBhc3NlcnQuZXF1YWwoXCJiaWdpbnRcIiwgdHlwZW9mIG51bSk7XG4gICAgYXNzZXJ0KG51bSA+PSAwbik7XG4gICAgaWYgKG5vblplcm8gPT09IHRydWUpIGFzc2VydChudW0gPiAwbik7XG4gICAgZWxzZSBpZiAobm9uWmVybyA9PT0gZmFsc2UpIGFzc2VydChudW0gPT09IDBuKTtcbiAgfVxuICBcbiAgc3RhdGljIGFzeW5jIGdldEV4dGVybmFsV2FsbGV0QWRkcmVzcygpIHtcbiAgICBsZXQgd2FsbGV0ID0gYXdhaXQgY3JlYXRlV2FsbGV0S2V5cyh7bmV0d29ya1R5cGU6IFRlc3RVdGlscy5ORVRXT1JLX1RZUEV9KTtcbiAgICByZXR1cm4gYXdhaXQgd2FsbGV0LmdldEFkZHJlc3MoMCwgMSk7IC8vIHN1YmFkZHJlc3NcbiAgfVxuICBcbiAgc3RhdGljIHR4c01lcmdlYWJsZSh0eDEsIHR4Mikge1xuICAgIHRyeSB7XG4gICAgICBsZXQgY29weTEgPSB0eDEuY29weSgpO1xuICAgICAgbGV0IGNvcHkyID0gdHgyLmNvcHkoKTtcbiAgICAgIGlmIChjb3B5MS5nZXRJc0NvbmZpcm1lZCgpKSBjb3B5MS5zZXRCbG9jayh0eDEuZ2V0QmxvY2soKS5jb3B5KCkuc2V0VHhzKFtjb3B5MV0pKTtcbiAgICAgIGlmIChjb3B5Mi5nZXRJc0NvbmZpcm1lZCgpKSBjb3B5Mi5zZXRCbG9jayh0eDIuZ2V0QmxvY2soKS5jb3B5KCkuc2V0VHhzKFtjb3B5Ml0pKTtcbiAgICAgIGNvcHkxLm1lcmdlKGNvcHkyKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59Il0sIm1hcHBpbmdzIjoieUxBQUEs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