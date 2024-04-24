"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _assert = _interopRequireDefault(require("assert"));
var _TestUtils = _interopRequireDefault(require("./utils/TestUtils"));
var _TestMoneroWalletCommon = _interopRequireDefault(require("./TestMoneroWalletCommon"));
var _StartMining = _interopRequireDefault(require("./utils/StartMining"));
var _WalletSyncPrinter = _interopRequireDefault(require("./utils/WalletSyncPrinter"));
var _WalletEqualityUtils = _interopRequireDefault(require("./utils/WalletEqualityUtils"));
var _index = require("../../index");














/**
 * Tests a Monero wallet using WebAssembly to bridge to monero-project's wallet2.
 */
class TestMoneroWalletFull extends _TestMoneroWalletCommon.default {



  constructor(testConfig) {
    super(testConfig);
  }

  async beforeAll() {
    await super.beforeAll();
  }

  async beforeEach(currentTest) {
    await super.beforeEach(currentTest);
  }

  async afterAll() {
    await super.afterAll();
    TestMoneroWalletFull.FULL_TESTS_RUN = true;
  }

  async afterEach(currentTest) {
    await super.afterEach(currentTest);

    // print memory usage
    console.log("WASM memory usage: " + (await _index.LibraryUtils.getWasmMemoryUsed()));
    //console.log(process.memoryUsage());

    // remove non-whitelisted wallets
    let whitelist = [_TestUtils.default.WALLET_NAME, "ground_truth", "moved"];
    let items = (await _TestUtils.default.getDefaultFs()).readdirSync(_TestUtils.default.TEST_WALLETS_DIR, "buffer");
    for (let item of items) {
      item = item + ""; // get filename as string
      let found = false;
      for (let whitelisted of whitelist) {
        if (item === whitelisted || item === whitelisted + ".keys" || item === whitelisted + ".address.txt") {
          found = true;
          break;
        }
      }
      if (!found) (await _TestUtils.default.getDefaultFs()).unlinkSync(_TestUtils.default.TEST_WALLETS_DIR + "/" + item);
    }
  }

  async getTestWallet() {
    return await _TestUtils.default.getWalletFull();
  }

  async getTestDaemon() {
    return await _TestUtils.default.getDaemonRpc();
  }

  async openWallet(config, startSyncing) {

    // assign defaults
    config = new _index.MoneroWalletConfig(config);
    if (config.getPassword() === undefined) config.setPassword(_TestUtils.default.WALLET_PASSWORD);
    if (config.getNetworkType() === undefined) config.setNetworkType(_TestUtils.default.NETWORK_TYPE);
    if (config.getProxyToWorker() === undefined) config.setProxyToWorker(_TestUtils.default.PROXY_TO_WORKER);
    if (config.getServer() === undefined && !config.getConnectionManager()) config.setServer(_TestUtils.default.getDaemonRpcConnection());
    if (config.getFs() === undefined) config.setFs(await _TestUtils.default.getDefaultFs());

    // open wallet
    let wallet = await (0, _index.openWalletFull)(config);
    if (startSyncing !== false && (await wallet.isConnectedToDaemon())) await wallet.startSyncing(_TestUtils.default.SYNC_PERIOD_IN_MS);
    return wallet;
  }

  async createWallet(config, startSyncing) {

    // assign defaults
    config = new _index.MoneroWalletConfig(config);
    let random = config.getSeed() === undefined && config.getPrimaryAddress() === undefined;
    if (config.getPath() === undefined) config.setPath(_TestUtils.default.TEST_WALLETS_DIR + "/" + _index.GenUtils.getUUID());
    if (config.getPassword() === undefined) config.setPassword(_TestUtils.default.WALLET_PASSWORD);
    if (config.getNetworkType() === undefined) config.setNetworkType(_TestUtils.default.NETWORK_TYPE);
    if (!config.getRestoreHeight() && !random) config.setRestoreHeight(0);
    if (!config.getServer() && !config.getConnectionManager()) config.setServer(_TestUtils.default.getDaemonRpcConnection());
    if (config.getProxyToWorker() === undefined) config.setProxyToWorker(_TestUtils.default.PROXY_TO_WORKER);
    if (config.getFs() === undefined) config.setFs(await _TestUtils.default.getDefaultFs());

    // create wallet
    let wallet = await (0, _index.createWalletFull)(config);
    if (!random) _assert.default.equal(await wallet.getRestoreHeight(), config.getRestoreHeight() === undefined ? 0 : config.getRestoreHeight());
    if (startSyncing !== false && (await wallet.isConnectedToDaemon())) await wallet.startSyncing(_TestUtils.default.SYNC_PERIOD_IN_MS);
    return wallet;
  }

  async closeWallet(wallet, save) {
    await wallet.close(save);
  }

  async getSeedLanguages() {
    return await _index.MoneroWalletFull.getSeedLanguages();
  }

  // ------------------------------- BEGIN TESTS ------------------------------

  runTests() {
    let that = this;
    let testConfig = this.testConfig;
    describe("TEST MONERO WALLET FULL", function () {

      // register handlers to run before and after tests
      before(async function () {await that.beforeAll();});
      beforeEach(async function () {await that.beforeEach(this.currentTest);});
      after(async function () {await that.afterAll();});
      afterEach(async function () {await that.afterEach(this.currentTest);});

      // run tests specific to full wallet
      that.testWalletFull();

      // run common tests
      that.runCommonTests();
    });
  }

  testWalletFull() {
    let that = this;
    let testConfig = this.testConfig;
    describe("Tests specific to WebAssembly wallet", function () {

      if (false && testConfig.testNonRelays)
      it("Does not leak memory", async function () {
        let restoreHeight = _TestUtils.default.FIRST_RECEIVE_HEIGHT;
        //let wallet = await that.createWallet({seed: TestUtils.SEED, restoreHeight: restoreHeight}, false);
        for (let i = 0; i < 100; i++) {
          console.log(process.memoryUsage());
          await testSyncSeed(_TestUtils.default.FIRST_RECEIVE_HEIGHT, undefined, false, true);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get the daemon's height", async function () {
        (0, _assert.default)(await that.wallet.isConnectedToDaemon());
        let daemonHeight = await that.wallet.getDaemonHeight();
        (0, _assert.default)(daemonHeight > 0);
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can open, sync, and close wallets repeatedly", async function () {
        let wallets = [];
        for (let i = 0; i < 4; i++) {
          let wallet = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT });
          await wallet.startSyncing();
          wallets.push(wallet);
        }
        for (let wallet of wallets) await wallet.close();
      });

      if (testConfig.testNonRelays)
      it("Can get the daemon's max peer height", async function () {
        let height = await that.wallet.getDaemonMaxPeerHeight();
        (0, _assert.default)(height > 0);
      });

      if (testConfig.testNonRelays)
      it("Can create a random full wallet", async function () {

        // create unconnected random wallet
        let wallet = await that.createWallet({ networkType: _index.MoneroNetworkType.MAINNET, server: _TestUtils.default.OFFLINE_SERVER_URI });
        await _index.MoneroUtils.validateMnemonic(await wallet.getSeed());
        await _index.MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), _index.MoneroNetworkType.MAINNET);
        _assert.default.equal(await wallet.getNetworkType(), _index.MoneroNetworkType.MAINNET);
        _assert.default.deepEqual(await wallet.getDaemonConnection(), new _index.MoneroRpcConnection(_TestUtils.default.OFFLINE_SERVER_URI));
        (0, _assert.default)(!(await wallet.isConnectedToDaemon()));
        _assert.default.equal(await wallet.getSeedLanguage(), "English");
        (0, _assert.default)(!(await wallet.isSynced()));
        _assert.default.equal(await wallet.getHeight(), 1); // TODO monero-project: why does height of new unsynced wallet start at 1?
        (0, _assert.default)((await wallet.getRestoreHeight()) >= 0);

        // cannot get daemon chain height
        try {
          await wallet.getDaemonHeight();
        } catch (e) {
          _assert.default.equal(e.message, "Wallet is not connected to daemon");
        }

        // set daemon connection and check chain height
        await wallet.setDaemonConnection(await that.daemon.getRpcConnection());
        _assert.default.equal(await wallet.getDaemonHeight(), await that.daemon.getHeight());

        // close wallet which releases resources
        await wallet.close();

        // create random wallet with non defaults
        wallet = await that.createWallet({ networkType: _index.MoneroNetworkType.TESTNET, language: "Spanish" }, false);
        await _index.MoneroUtils.validateMnemonic(await wallet.getSeed());
        await _index.MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), _index.MoneroNetworkType.TESTNET);
        _assert.default.equal(await wallet.getNetworkType(), await _index.MoneroNetworkType.TESTNET);
        (0, _assert.default)(await wallet.getDaemonConnection());
        (0, _assert.default)((await that.daemon.getRpcConnection()).getConfig() !== (await wallet.getDaemonConnection()).getConfig()); // not same reference
        _assert.default.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
        _assert.default.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
        _assert.default.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
        (0, _assert.default)(await wallet.isConnectedToDaemon());
        _assert.default.equal(await wallet.getSeedLanguage(), "Spanish");
        (0, _assert.default)(!(await wallet.isSynced()));
        _assert.default.equal(await wallet.getHeight(), 1); // TODO monero-project: why is height of unsynced wallet 1?
        if (await that.daemon.isConnected()) _assert.default.equal(await wallet.getRestoreHeight(), await that.daemon.getHeight());else
        (0, _assert.default)((await wallet.getRestoreHeight()) >= 0);
        await wallet.close();
      });

      if (testConfig.testNonRelays)
      it("Can create a full wallet from seed", async function () {

        // create unconnected wallet with mnemonic
        let wallet = await that.createWallet({ seed: _TestUtils.default.SEED, server: _TestUtils.default.OFFLINE_SERVER_URI });
        _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED);
        _assert.default.equal(await wallet.getPrimaryAddress(), _TestUtils.default.ADDRESS);
        _assert.default.equal(await wallet.getNetworkType(), _TestUtils.default.NETWORK_TYPE);
        _assert.default.deepEqual(await wallet.getDaemonConnection(), new _index.MoneroRpcConnection(_TestUtils.default.OFFLINE_SERVER_URI));
        (0, _assert.default)(!(await wallet.isConnectedToDaemon()));
        _assert.default.equal(await wallet.getSeedLanguage(), "English");
        (0, _assert.default)(!(await wallet.isSynced()));
        _assert.default.equal(await wallet.getHeight(), 1);
        _assert.default.equal(await wallet.getRestoreHeight(), 0);
        try {await wallet.startSyncing();} catch (e) {_assert.default.equal(e.message, "Wallet is not connected to daemon");}
        await wallet.close();

        // create wallet without restore height
        wallet = await that.createWallet({ seed: _TestUtils.default.SEED }, false);
        _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED);
        _assert.default.equal(await wallet.getPrimaryAddress(), _TestUtils.default.ADDRESS);
        _assert.default.equal(_TestUtils.default.NETWORK_TYPE, await wallet.getNetworkType());
        (0, _assert.default)(await wallet.getDaemonConnection());
        (0, _assert.default)((await that.daemon.getRpcConnection()) != (await wallet.getDaemonConnection()));
        _assert.default.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
        _assert.default.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
        _assert.default.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
        (0, _assert.default)(await wallet.isConnectedToDaemon());
        _assert.default.equal(await wallet.getSeedLanguage(), "English");
        (0, _assert.default)(!(await wallet.isSynced()));
        _assert.default.equal(await wallet.getHeight(), 1); // TODO monero-project: why does height of new unsynced wallet start at 1?
        _assert.default.equal(await wallet.getRestoreHeight(), 0);
        await wallet.close();

        // create wallet with seed, no connection, and restore height
        let restoreHeight = 10000;
        wallet = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: restoreHeight, server: _TestUtils.default.OFFLINE_SERVER_URI });
        _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED);
        _assert.default.equal(await wallet.getPrimaryAddress(), _TestUtils.default.ADDRESS);
        _assert.default.equal(await wallet.getNetworkType(), _TestUtils.default.NETWORK_TYPE);
        _assert.default.deepEqual(await wallet.getDaemonConnection(), new _index.MoneroRpcConnection(_TestUtils.default.OFFLINE_SERVER_URI));
        (0, _assert.default)(!(await wallet.isConnectedToDaemon()));
        _assert.default.equal(await wallet.getSeedLanguage(), "English");
        _assert.default.equal(await wallet.getHeight(), 1); // TODO monero-project: why does height of new unsynced wallet start at 1?
        _assert.default.equal(await wallet.getRestoreHeight(), restoreHeight);
        let path = await wallet.getPath();
        await wallet.close(true);
        wallet = await that.openWallet({ path: path, server: _TestUtils.default.OFFLINE_SERVER_URI });
        (0, _assert.default)(!(await wallet.isConnectedToDaemon()));
        (0, _assert.default)(!(await wallet.isSynced()));
        _assert.default.equal(await wallet.getHeight(), 1);
        _assert.default.equal(await wallet.getRestoreHeight(), restoreHeight);
        await wallet.close();

        // create wallet with seed, connection, and restore height
        wallet = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: restoreHeight }, false);
        _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED);
        (0, _assert.default)(await wallet.getPrimaryAddress(), _TestUtils.default.ADDRESS);
        _assert.default.equal(await wallet.getNetworkType(), _TestUtils.default.NETWORK_TYPE);
        (0, _assert.default)(await wallet.getDaemonConnection());
        (0, _assert.default)((await that.daemon.getRpcConnection()) != wallet.getDaemonConnection());
        _assert.default.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
        _assert.default.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
        _assert.default.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
        (0, _assert.default)(await wallet.isConnectedToDaemon());
        _assert.default.equal(await wallet.getSeedLanguage(), "English");
        (0, _assert.default)(!(await wallet.isSynced()));
        _assert.default.equal(await wallet.getHeight(), 1); // TODO monero-project: why does height of new unsynced wallet start at 1?
        _assert.default.equal(await wallet.getRestoreHeight(), restoreHeight);
        await wallet.close();
      });

      if (testConfig.testNonRelays)
      it("Can create a full wallet from keys", async function () {

        // recreate test wallet from keys
        let wallet = that.wallet;
        let walletKeys = await that.createWallet({ server: _TestUtils.default.OFFLINE_SERVER_URI, networkType: await wallet.getNetworkType(), primaryAddress: await wallet.getPrimaryAddress(), privateViewKey: await wallet.getPrivateViewKey(), privateSpendKey: await wallet.getPrivateSpendKey(), restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT });
        let err;
        try {
          _assert.default.equal(await walletKeys.getSeed(), await wallet.getSeed());
          _assert.default.equal(await walletKeys.getPrimaryAddress(), await wallet.getPrimaryAddress());
          _assert.default.equal(await walletKeys.getPrivateViewKey(), await wallet.getPrivateViewKey());
          _assert.default.equal(await walletKeys.getPublicViewKey(), await wallet.getPublicViewKey());
          _assert.default.equal(await walletKeys.getPrivateSpendKey(), await wallet.getPrivateSpendKey());
          _assert.default.equal(await walletKeys.getPublicSpendKey(), await wallet.getPublicSpendKey());
          _assert.default.equal(await walletKeys.getRestoreHeight(), _TestUtils.default.FIRST_RECEIVE_HEIGHT);
          (0, _assert.default)(!(await walletKeys.isConnectedToDaemon()));
          (0, _assert.default)(!(await walletKeys.isSynced()));
        } catch (e) {
          err = e;
        }
        await walletKeys.close();
        if (err) throw err;
      });

      if (testConfig.testNonRelays && !_index.GenUtils.isBrowser())
      it("Is compatible with monero-wallet-rpc wallet files", async function () {

        // create wallet using monero-wallet-rpc
        let walletName = _index.GenUtils.getUUID();
        let walletRpc = await _TestUtils.default.getWalletRpc();
        await walletRpc.createWallet(new _index.MoneroWalletConfig().setPath(walletName).setPassword(_TestUtils.default.WALLET_PASSWORD).setSeed(_TestUtils.default.SEED).setRestoreHeight(_TestUtils.default.FIRST_RECEIVE_HEIGHT));
        await walletRpc.sync();
        let balance = await walletRpc.getBalance();
        let outputsHex = await walletRpc.exportOutputs();
        (0, _assert.default)(outputsHex.length > 0);
        await walletRpc.close(true);

        // open as full wallet
        let walletFull = await (0, _index.openWalletFull)(new _index.MoneroWalletConfig().setPath(_TestUtils.default.WALLET_RPC_LOCAL_WALLET_DIR + "/" + walletName).setPassword(_TestUtils.default.WALLET_PASSWORD).setNetworkType(_TestUtils.default.NETWORK_TYPE).setServer(_TestUtils.default.DAEMON_RPC_CONFIG));
        await walletFull.sync();
        _assert.default.equal(_TestUtils.default.SEED, await walletFull.getSeed());
        _assert.default.equal(_TestUtils.default.ADDRESS, await walletFull.getPrimaryAddress());
        _assert.default.equal(balance.toString(), (await walletFull.getBalance()).toString());
        _assert.default.equal(outputsHex.length, (await walletFull.exportOutputs()).length);
        await walletFull.close(true);

        // create full wallet
        walletName = _index.GenUtils.getUUID();
        let path = _TestUtils.default.WALLET_RPC_LOCAL_WALLET_DIR + "/" + walletName;
        walletFull = await (0, _index.createWalletFull)(new _index.MoneroWalletConfig().setPath(path).setPassword(_TestUtils.default.WALLET_PASSWORD).setNetworkType(_TestUtils.default.NETWORK_TYPE).setSeed(_TestUtils.default.SEED).setRestoreHeight(_TestUtils.default.FIRST_RECEIVE_HEIGHT).setServer(_TestUtils.default.DAEMON_RPC_CONFIG));
        await walletFull.sync();
        balance = await walletFull.getBalance();
        outputsHex = await walletFull.exportOutputs();
        await walletFull.close(true);

        // rebuild wallet cache using full wallet
        (await _TestUtils.default.getDefaultFs()).unlinkSync(path);
        walletFull = await (0, _index.openWalletFull)(new _index.MoneroWalletConfig().setPath(path).setPassword(_TestUtils.default.WALLET_PASSWORD).setNetworkType(_TestUtils.default.NETWORK_TYPE).setServer(_TestUtils.default.DAEMON_RPC_CONFIG));
        await walletFull.close(true);

        // open wallet using monero-wallet-rpc
        await walletRpc.openWallet(new _index.MoneroWalletConfig().setPath(walletName).setPassword(_TestUtils.default.WALLET_PASSWORD));
        await walletRpc.sync();
        _assert.default.equal(_TestUtils.default.SEED, await walletRpc.getSeed());
        _assert.default.equal(_TestUtils.default.ADDRESS, await walletRpc.getPrimaryAddress());
        _assert.default.equal(balance.toString(), (await walletRpc.getBalance()).toString());
        _assert.default.equal(outputsHex.length, (await walletRpc.exportOutputs()).length);
        await walletRpc.close(true);
      });

      if (!testConfig.liteMode && (testConfig.testNonRelays || testConfig.testRelays))
      it("Is compatible with monero-wallet-rpc outputs and offline transaction signing", async function () {

        // create view-only wallet in wallet rpc process
        let viewOnlyWallet = await _TestUtils.default.startWalletRpcProcess();
        await viewOnlyWallet.createWallet({
          path: _index.GenUtils.getUUID(),
          password: _TestUtils.default.WALLET_PASSWORD,
          primaryAddress: await that.wallet.getPrimaryAddress(),
          privateViewKey: await that.wallet.getPrivateViewKey(),
          restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT
        });
        await viewOnlyWallet.sync();

        // create offline full wallet
        let offlineWallet = await that.createWallet({ primaryAddress: await that.wallet.getPrimaryAddress(), privateViewKey: await that.wallet.getPrivateViewKey(), privateSpendKey: await that.wallet.getPrivateSpendKey(), server: _TestUtils.default.OFFLINE_SERVER_URI, restoreHeight: 0 });

        // test tx signing with wallets
        let err;
        try {await that.testViewOnlyAndOfflineWallets(viewOnlyWallet, offlineWallet);}
        catch (e) {err = e;}

        // finally
        _TestUtils.default.stopWalletRpcProcess(viewOnlyWallet);
        await that.closeWallet(offlineWallet);
        if (err) throw err;
      });

      if (!testConfig.liteMode)
      it("Is compatible with monero-wallet-rpc multisig wallets", async function () {

        // create participants with monero-wallet-rpc and full wallet
        let participants = [];
        participants.push(await (await _TestUtils.default.startWalletRpcProcess()).createWallet(new _index.MoneroWalletConfig().setPath(_index.GenUtils.getUUID()).setPassword(_TestUtils.default.WALLET_PASSWORD)));
        participants.push(await (await _TestUtils.default.startWalletRpcProcess()).createWallet(new _index.MoneroWalletConfig().setPath(_index.GenUtils.getUUID()).setPassword(_TestUtils.default.WALLET_PASSWORD)));
        participants.push(await that.createWallet(new _index.MoneroWalletConfig()));

        // test multisig
        let err;
        try {
          await that.testMultisigParticipants(participants, 3, 3, true);
        } catch (e) {
          err = e;
        }

        // stop mining at end of test
        try {await that.daemon.stopMining();}
        catch (e) {}

        // save and close participants
        if (participants[0] instanceof _index.MoneroWalletRpc) await _TestUtils.default.stopWalletRpcProcess(participants[0]);else
        participants[0].close(true); // multisig tests might restore wallet from seed
        await _TestUtils.default.stopWalletRpcProcess(participants[1]);
        await that.closeWallet(participants[2], true);
        if (err) throw err;
      });

      // TODO monero-project: cannot re-sync from lower block height after wallet saved
      if (testConfig.testNonRelays && !testConfig.liteMode && false)
      it("Can re-sync an existing wallet from scratch", async function () {
        let wallet = await that.openWallet({ path: _TestUtils.default.WALLET_FULL_PATH, password: _TestUtils.default.WALLET_PASSWORD, networkType: _index.MoneroNetworkType.TESTNET, server: _TestUtils.default.OFFLINE_SERVER_URI }, true); // wallet must already exist
        await wallet.setDaemonConnection(_TestUtils.default.getDaemonRpcConnection());
        //long startHeight = TestUtils.TEST_RESTORE_HEIGHT;
        let startHeight = 0;
        let progressTester = new SyncProgressTester(wallet, startHeight, await wallet.getDaemonHeight());
        await wallet.setRestoreHeight(1);
        let result = await wallet.sync(progressTester, 1);
        await progressTester.onDone(await wallet.getDaemonHeight());

        // test result after syncing
        (0, _assert.default)(await wallet.isConnectedToDaemon());
        (0, _assert.default)(await wallet.isSynced());
        _assert.default.equal(result.getNumBlocksFetched(), (await wallet.getDaemonHeight()) - startHeight);
        (0, _assert.default)(result.getReceivedMoney());
        _assert.default.equal(await wallet.getHeight(), await that.daemon.getHeight());
        await wallet.close();
      });

      if (testConfig.testNonRelays)
      it("Can sync a wallet with a randomly generated seed", async function () {
        (0, _assert.default)(await that.daemon.isConnected(), "Not connected to daemon");

        // create test wallet
        let restoreHeight = await that.daemon.getHeight();
        let wallet = await that.createWallet({}, false);

        // test wallet's height before syncing
        let walletGt;
        let err;
        try {
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
          _assert.default.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
          _assert.default.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
          _assert.default.equal(await wallet.getDaemonHeight(), restoreHeight);
          (0, _assert.default)(await wallet.isConnectedToDaemon());
          (0, _assert.default)(!(await wallet.isSynced()));
          _assert.default.equal(await wallet.getHeight(), 1);
          _assert.default.equal(await wallet.getRestoreHeight(), restoreHeight);

          // sync the wallet
          let progressTester = new SyncProgressTester(wallet, await wallet.getRestoreHeight(), await wallet.getDaemonHeight());
          let result = await wallet.sync(progressTester, undefined);
          await progressTester.onDone(await wallet.getDaemonHeight());

          // test result after syncing
          walletGt = await that.createWallet({ seed: await wallet.getSeed(), restoreHeight: restoreHeight });
          await walletGt.sync();
          (0, _assert.default)(await wallet.isConnectedToDaemon());
          (0, _assert.default)(await wallet.isSynced());
          _assert.default.equal(result.getNumBlocksFetched(), 0);
          (0, _assert.default)(!result.getReceivedMoney());
          if ((await wallet.getHeight()) !== (await that.daemon.getHeight())) console.log("WARNING: wallet height " + (await wallet.getHeight()) + " is not synced with daemon height " + (await that.daemon.getHeight())); // TODO: height may not be same after long sync

          // sync the wallet with default params
          await wallet.sync();
          (0, _assert.default)(await wallet.isSynced());
          _assert.default.equal(await wallet.getHeight(), await that.daemon.getHeight());

          // compare wallet to ground truth
          await TestMoneroWalletFull.testWalletEqualityOnChain(walletGt, wallet);
        } catch (e) {
          err = e;
        }

        // finally 
        if (walletGt) await walletGt.close();
        await wallet.close();
        if (err) throw err;

        // attempt to sync unconnected wallet
        wallet = await that.createWallet({ server: _TestUtils.default.OFFLINE_SERVER_URI });
        err = undefined;
        try {
          await wallet.sync();
          throw new Error("Should have thrown exception");
        } catch (e1) {
          try {
            _assert.default.equal(e1.message, "Wallet is not connected to daemon");
          } catch (e2) {
            err = e2;
          }
        }

        // finally
        await wallet.close();
        if (err) throw err;
      });

      if (false && testConfig.testNonRelays && !testConfig.liteMode) // TODO: re-enable before release
        it("Can sync a wallet created from seed from the genesis", async function () {
          await testSyncSeed(undefined, undefined, true, false);
        });

      if (testConfig.testNonRelays)
      it("Can sync a wallet created from seed from a restore height", async function () {
        await testSyncSeed(undefined, _TestUtils.default.FIRST_RECEIVE_HEIGHT);
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can sync a wallet created from seed from a start height.", async function () {
        await testSyncSeed(_TestUtils.default.FIRST_RECEIVE_HEIGHT, undefined, false, true);
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can sync a wallet created from seed from a start height less than the restore height", async function () {
        await testSyncSeed(_TestUtils.default.FIRST_RECEIVE_HEIGHT, _TestUtils.default.FIRST_RECEIVE_HEIGHT + 3);
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can sync a wallet created from seed from a start height greater than the restore height", async function () {
        await testSyncSeed(_TestUtils.default.FIRST_RECEIVE_HEIGHT + 3, _TestUtils.default.FIRST_RECEIVE_HEIGHT);
      });

      async function testSyncSeed(startHeight, restoreHeight, skipGtComparison, testPostSyncNotifications) {
        (0, _assert.default)(await that.daemon.isConnected(), "Not connected to daemon");
        if (startHeight !== undefined && restoreHeight != undefined) (0, _assert.default)(startHeight <= _TestUtils.default.FIRST_RECEIVE_HEIGHT || restoreHeight <= _TestUtils.default.FIRST_RECEIVE_HEIGHT);

        // create wallet from seed
        let wallet = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: restoreHeight }, false);

        // sanitize expected sync bounds
        if (restoreHeight === undefined) restoreHeight = 0;
        let startHeightExpected = startHeight === undefined ? restoreHeight : startHeight;
        if (startHeightExpected === 0) startHeightExpected = 1;
        let endHeightExpected = await wallet.getDaemonMaxPeerHeight();

        // test wallet and close as final step
        let walletGt = undefined;
        let err = undefined; // to permit final cleanup like Java's try...catch...finally
        try {

          // test wallet's height before syncing
          (0, _assert.default)(await wallet.isConnectedToDaemon());
          (0, _assert.default)(!(await wallet.isSynced()));
          _assert.default.equal(await wallet.getHeight(), 1);
          _assert.default.equal(await wallet.getRestoreHeight(), restoreHeight);

          // register a wallet listener which tests notifications throughout the sync
          let walletSyncTester = new WalletSyncTester(wallet, startHeightExpected, endHeightExpected);
          await wallet.addListener(walletSyncTester);

          // sync the wallet with a listener which tests sync notifications
          let progressTester = new SyncProgressTester(wallet, startHeightExpected, endHeightExpected);
          let result = await wallet.sync(progressTester, startHeight);

          // test completion of the wallet and sync listeners
          await progressTester.onDone(await wallet.getDaemonHeight());
          await walletSyncTester.onDone(await wallet.getDaemonHeight());

          // test result after syncing
          (0, _assert.default)(await wallet.isSynced());
          _assert.default.equal(result.getNumBlocksFetched(), (await wallet.getDaemonHeight()) - startHeightExpected);
          (0, _assert.default)(result.getReceivedMoney());
          if ((await wallet.getHeight()) !== (await that.daemon.getHeight())) console.log("WARNING: wallet height " + (await wallet.getHeight()) + " is not synced with daemon height " + (await that.daemon.getHeight())); // TODO: height may not be same after long sync
          _assert.default.equal(await wallet.getDaemonHeight(), await that.daemon.getHeight(), "Daemon heights are not equal: " + (await wallet.getDaemonHeight()) + " vs " + (await that.daemon.getHeight()));
          if (startHeightExpected > _TestUtils.default.FIRST_RECEIVE_HEIGHT) (0, _assert.default)((await wallet.getTxs())[0].getHeight() > _TestUtils.default.FIRST_RECEIVE_HEIGHT); // wallet is partially synced so first tx happens after true restore height
          else _assert.default.equal((await wallet.getTxs())[0].getHeight(), _TestUtils.default.FIRST_RECEIVE_HEIGHT); // wallet should be fully synced so first tx happens on true restore height

          // sync the wallet with default params
          result = await wallet.sync();
          (0, _assert.default)(await wallet.isSynced());
          if ((await wallet.getHeight()) !== (await that.daemon.getHeight())) console.log("WARNING: wallet height " + (await wallet.getHeight()) + " is not synced with daemon height " + (await that.daemon.getHeight()) + " after re-syncing");
          _assert.default.equal(result.getNumBlocksFetched(), 0);
          (0, _assert.default)(!result.getReceivedMoney());

          // compare with ground truth
          if (!skipGtComparison) {
            walletGt = await _TestUtils.default.createWalletGroundTruth(_TestUtils.default.NETWORK_TYPE, await wallet.getSeed(), startHeight, restoreHeight);
            await TestMoneroWalletFull.testWalletEqualityOnChain(walletGt, wallet);
          }

          // if testing post-sync notifications, wait for a block to be added to the chain
          // then test that sync arg listener was not invoked and registered wallet listener was invoked
          if (testPostSyncNotifications) {

            // start automatic syncing
            await wallet.startSyncing(_TestUtils.default.SYNC_PERIOD_IN_MS);

            // attempt to start mining to push the network along  // TODO: TestUtils.tryStartMining() : reqId, TestUtils.tryStopMining(reqId)
            let startedMining = false;
            let miningStatus = await that.daemon.getMiningStatus();
            if (!miningStatus.getIsActive()) {
              try {
                await _StartMining.default.startMining();
                startedMining = true;
              } catch (e) {

                // no problem
              }}

            try {

              // wait for block
              console.log("Waiting for next block to test post sync notifications");
              await that.daemon.waitForNextBlockHeader();

              // ensure wallet has time to detect new block
              await new Promise(function (resolve) {setTimeout(resolve, _TestUtils.default.SYNC_PERIOD_IN_MS + 3000);}); // sleep for wallet interval + time to sync

              // test that wallet listener's onSyncProgress() and onNewBlock() were invoked after previous completion
              (0, _assert.default)(walletSyncTester.getOnSyncProgressAfterDone());
              (0, _assert.default)(walletSyncTester.getOnNewBlockAfterDone());
            } catch (e) {
              err = e;
            }

            // finally
            if (startedMining) {
              await that.daemon.stopMining();
              //await wallet.stopMining();  // TODO: support client-side mining?
            }
            if (err) throw err;
          }
        } catch (e) {
          err = e;
        }

        // finally
        if (walletGt !== undefined) await walletGt.close(true);
        await wallet.close();
        if (err) throw err;
      }

      if (testConfig.testNonRelays)
      it("Can sync a wallet created from keys", async function () {

        // recreate test wallet from keys
        let walletKeys = await that.createWallet({ primaryAddress: await that.wallet.getPrimaryAddress(), privateViewKey: await that.wallet.getPrivateViewKey(), privateSpendKey: await that.wallet.getPrivateSpendKey(), restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT }, false);

        // create ground truth wallet for comparison
        let walletGt = await _TestUtils.default.createWalletGroundTruth(_TestUtils.default.NETWORK_TYPE, _TestUtils.default.SEED, undefined, _TestUtils.default.FIRST_RECEIVE_HEIGHT);

        // test wallet and close as final step
        let err;
        try {
          _assert.default.equal(await walletKeys.getSeed(), await walletGt.getSeed());
          _assert.default.equal(await walletKeys.getPrimaryAddress(), await walletGt.getPrimaryAddress());
          _assert.default.equal(await walletKeys.getPrivateViewKey(), await walletGt.getPrivateViewKey());
          _assert.default.equal(await walletKeys.getPublicViewKey(), await walletGt.getPublicViewKey());
          _assert.default.equal(await walletKeys.getPrivateSpendKey(), await walletGt.getPrivateSpendKey());
          _assert.default.equal(await walletKeys.getPublicSpendKey(), await walletGt.getPublicSpendKey());
          _assert.default.equal(await walletKeys.getRestoreHeight(), _TestUtils.default.FIRST_RECEIVE_HEIGHT);
          (0, _assert.default)(await walletKeys.isConnectedToDaemon());
          (0, _assert.default)(!(await walletKeys.isSynced()));

          // sync the wallet
          let progressTester = new SyncProgressTester(walletKeys, _TestUtils.default.FIRST_RECEIVE_HEIGHT, await walletKeys.getDaemonMaxPeerHeight());
          let result = await walletKeys.sync(progressTester);
          await progressTester.onDone(await walletKeys.getDaemonHeight());

          // test result after syncing
          (0, _assert.default)(await walletKeys.isSynced());
          _assert.default.equal(result.getNumBlocksFetched(), (await walletKeys.getDaemonHeight()) - _TestUtils.default.FIRST_RECEIVE_HEIGHT);
          (0, _assert.default)(result.getReceivedMoney());
          _assert.default.equal(await walletKeys.getHeight(), await that.daemon.getHeight());
          _assert.default.equal(await walletKeys.getDaemonHeight(), await that.daemon.getHeight());
          _assert.default.equal((await walletKeys.getTxs())[0].getHeight(), _TestUtils.default.FIRST_RECEIVE_HEIGHT); // wallet should be fully synced so first tx happens on true restore height

          // compare with ground truth
          await TestMoneroWalletFull.testWalletEqualityOnChain(walletGt, walletKeys);
        } catch (e) {
          err = e;
        }

        // finally
        await walletGt.close(true);
        await walletKeys.close();
        if (err) throw err;
      });

      // TODO: test start syncing, notification of syncs happening, stop syncing, no notifications, etc
      if (testConfig.testNonRelays)
      it("Can start and stop syncing", async function () {

        // test unconnected wallet
        let err; // used to emulate Java's try...catch...finally
        let path = TestMoneroWalletFull.getRandomWalletPath();
        let wallet = await that.createWallet({ path: path, password: _TestUtils.default.WALLET_PASSWORD, networkType: _TestUtils.default.NETWORK_TYPE, server: _TestUtils.default.OFFLINE_SERVER_URI });
        try {
          _assert.default.notEqual(await wallet.getSeed(), undefined);
          _assert.default.equal(await wallet.getHeight(), 1);
          _assert.default.equal(await wallet.getBalance(), 0n);
          await wallet.startSyncing();
        } catch (e1) {// first error is expected
          try {
            _assert.default.equal(e1.message, "Wallet is not connected to daemon");
          } catch (e2) {
            err = e2;
          }
        }

        // finally
        await wallet.close();
        if (err) throw err;

        // test connecting wallet
        path = TestMoneroWalletFull.getRandomWalletPath();
        wallet = await that.createWallet({ path: path, password: _TestUtils.default.WALLET_PASSWORD, networkType: _TestUtils.default.NETWORK_TYPE, server: _TestUtils.default.OFFLINE_SERVER_URI });
        try {
          _assert.default.notEqual(wallet.getSeed(), undefined);
          (0, _assert.default)(!(await wallet.isConnectedToDaemon()));
          await wallet.setDaemonConnection(await that.daemon.getRpcConnection());
          _assert.default.equal(await wallet.getHeight(), 1);
          (0, _assert.default)(!(await wallet.isSynced()));
          _assert.default.equal(await wallet.getBalance(), 0n);
          let chainHeight = await wallet.getDaemonHeight();
          await wallet.setRestoreHeight(chainHeight - 3);
          await wallet.startSyncing();
          _assert.default.equal(await wallet.getRestoreHeight(), chainHeight - 3);
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri()); // TODO: replace with config comparison
          _assert.default.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
          _assert.default.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
          await wallet.stopSyncing();
          await wallet.sync();
          await wallet.stopSyncing();
          await wallet.stopSyncing();
        } catch (e) {
          err = e;
        }

        // finally
        await wallet.close();
        if (err) throw err;

        // test that sync starts automatically
        let restoreHeight = (await that.daemon.getHeight()) - 100;
        path = TestMoneroWalletFull.getRandomWalletPath();
        wallet = await that.createWallet({ path: path, password: _TestUtils.default.WALLET_PASSWORD, networkType: _TestUtils.default.NETWORK_TYPE, seed: _TestUtils.default.SEED, server: await that.daemon.getRpcConnection(), restoreHeight: restoreHeight }, false);
        try {

          // start syncing
          _assert.default.equal(await wallet.getHeight(), 1);
          _assert.default.equal(await wallet.getRestoreHeight(), restoreHeight);
          (0, _assert.default)(!(await wallet.isSynced()));
          _assert.default.equal(await wallet.getBalance(), BigInt(0));
          await wallet.startSyncing(_TestUtils.default.SYNC_PERIOD_IN_MS);

          // pause for sync to start
          await new Promise(function (resolve) {setTimeout(resolve, _TestUtils.default.SYNC_PERIOD_IN_MS + 1000);}); // in ms

          // test that wallet has started syncing
          (0, _assert.default)((await wallet.getHeight()) > 1);

          // stop syncing
          await wallet.stopSyncing();

          // TODO monero-project: wallet.cpp m_synchronized only ever set to true, never false
          //          // wait for block to be added to chain
          //          await that.daemon.waitForNextBlockHeader();
          //          
          //          // wallet is no longer synced
          //          assert(!(await wallet.isSynced()));  
        } catch (e) {
          err = e;
        }

        // finally
        await wallet.close();
        if (err) throw err;
      });

      if (testConfig.testNonRelays)
      it("Does not interfere with other wallet notifications", async function () {

        // create 2 wallets with a recent restore height
        let height = await that.daemon.getHeight();
        let restoreHeight = height - 5;
        let wallet1 = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: restoreHeight }, false);
        let wallet2 = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: restoreHeight }, false);

        // track notifications of each wallet
        let tester1 = new SyncProgressTester(wallet1, restoreHeight, height);
        let tester2 = new SyncProgressTester(wallet2, restoreHeight, height);
        await wallet1.addListener(tester1);
        await wallet2.addListener(tester2);

        // sync first wallet and test that 2nd is not notified
        await wallet1.sync();
        (0, _assert.default)(tester1.isNotified());
        (0, _assert.default)(!tester2.isNotified());

        // sync 2nd wallet and test that 1st is not notified
        let tester3 = new SyncProgressTester(wallet1, restoreHeight, height);
        await wallet1.addListener(tester3);
        await wallet2.sync();
        (0, _assert.default)(tester2.isNotified());
        (0, _assert.default)(!tester3.isNotified());

        // close wallets
        await wallet1.close();
        await wallet2.close();
      });

      if (testConfig.testNonRelays)
      it("Is equal to the RPC wallet.", async function () {
        await _WalletEqualityUtils.default.testWalletEqualityOnChain(await _TestUtils.default.getWalletRpc(), that.wallet);
      });

      if (testConfig.testNonRelays)
      it("Is equal to the RPC wallet with a seed offset", async function () {

        // use common offset to compare wallet implementations
        let seedOffset = "my super secret offset!";

        // create rpc wallet with offset
        let walletRpc = await _TestUtils.default.getWalletRpc();
        await walletRpc.createWallet({ path: _index.GenUtils.getUUID(), password: _TestUtils.default.WALLET_PASSWORD, seed: await walletRpc.getSeed(), restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT, seedOffset: seedOffset });

        // create full wallet with offset
        let walletFull = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT, seedOffset: seedOffset });

        // deep compare
        let err;
        try {
          await _WalletEqualityUtils.default.testWalletEqualityOnChain(walletRpc, walletFull);
        } catch (e) {
          err = e;
        }
        await walletFull.close();
        if (err) throw err;
      });

      if (testConfig.testNonRelays)
      it("Supports multisig sample code", async function () {
        await testCreateMultisigWallet(2, 2);
        await testCreateMultisigWallet(2, 3);
        await testCreateMultisigWallet(2, 4);
      });

      async function testCreateMultisigWallet(M, N) {
        console.log("Creating " + M + "/" + N + " multisig wallet");

        // create participating wallets
        let wallets = [];
        for (let i = 0; i < N; i++) {
          wallets.push(await that.createWallet());
        }

        // prepare and collect multisig hex from each participant
        let preparedMultisigHexes = [];
        for (let wallet of wallets) preparedMultisigHexes.push(await wallet.prepareMultisig());

        // make each wallet multisig and collect results
        let madeMultisigHexes = [];
        for (let i = 0; i < wallets.length; i++) {

          // collect prepared multisig hexes from wallet's peers
          let peerMultisigHexes = [];
          for (let j = 0; j < wallets.length; j++) if (j !== i) peerMultisigHexes.push(preparedMultisigHexes[j]);

          // make wallet multisig and collect result hex
          let multisigHex = await wallets[i].makeMultisig(peerMultisigHexes, M, _TestUtils.default.WALLET_PASSWORD);
          madeMultisigHexes.push(multisigHex);
        }

        // exchange multisig keys N - M + 1 times
        let multisigHexes = madeMultisigHexes;
        for (let i = 0; i < N - M + 1; i++) {

          // exchange multisig keys among participants and collect results for next round if applicable
          let resultMultisigHexes = [];
          for (let wallet of wallets) {

            // import the multisig hex of other participants and collect results
            let result = await wallet.exchangeMultisigKeys(multisigHexes, _TestUtils.default.WALLET_PASSWORD);
            resultMultisigHexes.push(result.getMultisigHex());
          }

          // use resulting multisig hex for next round of exchange if applicable
          multisigHexes = resultMultisigHexes;
        }

        // wallets are now multisig
        for (let wallet of wallets) {
          let primaryAddress = await wallet.getAddress(0, 0);
          await _index.MoneroUtils.validateAddress(primaryAddress, await wallet.getNetworkType());
          let info = await wallet.getMultisigInfo();
          (0, _assert.default)(info.getIsMultisig());
          (0, _assert.default)(info.getIsReady());
          _assert.default.equal(info.getThreshold(), M);
          _assert.default.equal(info.getNumParticipants(), N);
          await wallet.close(true);
        }
      }

      if (testConfig.testNonRelays)
      it("Can be saved", async function () {

        // create unique path for new test wallet
        let path = TestMoneroWalletFull.getRandomWalletPath();

        // wallet does not exist
        (0, _assert.default)(!(await _index.MoneroWalletFull.walletExists(path, await _TestUtils.default.getDefaultFs())));

        // cannot open non-existent wallet
        try {
          await that.openWallet({ path: path, server: "" });
          throw new Error("Cannot open non-existent wallet");
        } catch (e) {
          _assert.default.equal(e.message, "Wallet does not exist at path: " + path);
        }

        // create wallet at the path
        let restoreHeight = (await that.daemon.getHeight()) - 200;
        let wallet = await that.createWallet({ path: path, password: _TestUtils.default.WALLET_PASSWORD, networkType: _TestUtils.default.NETWORK_TYPE, seed: _TestUtils.default.SEED, restoreHeight: restoreHeight, server: _TestUtils.default.OFFLINE_SERVER_URI });

        // test wallet at newly created state
        let err;
        try {
          (0, _assert.default)(await _index.MoneroWalletFull.walletExists(path, await _TestUtils.default.getDefaultFs()));
          _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED);
          _assert.default.equal(await wallet.getNetworkType(), _TestUtils.default.NETWORK_TYPE);
          _assert.default.deepEqual(await wallet.getDaemonConnection(), new _index.MoneroRpcConnection(_TestUtils.default.OFFLINE_SERVER_URI));
          _assert.default.equal(await wallet.getRestoreHeight(), restoreHeight);
          _assert.default.equal(await wallet.getSeedLanguage(), "English");
          _assert.default.equal(await wallet.getHeight(), 1);
          _assert.default.equal(await wallet.getRestoreHeight(), restoreHeight);

          // set the wallet's connection and sync
          await wallet.setDaemonConnection(_TestUtils.default.getDaemonRpcConnection());
          await wallet.sync();
          if ((await wallet.getHeight()) !== (await wallet.getDaemonHeight())) console.log("WARNING: wallet height " + (await wallet.getHeight()) + " is not synced with daemon height " + (await that.daemon.getHeight())); // TODO: height may not be same after long sync

          // close the wallet without saving
          await wallet.close();

          // re-open the wallet
          wallet = await that.openWallet({ path: path, server: _TestUtils.default.OFFLINE_SERVER_URI });

          // test wallet is at newly created state
          (0, _assert.default)(await _index.MoneroWalletFull.walletExists(path, await _TestUtils.default.getDefaultFs()));
          _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED);
          _assert.default.equal(await wallet.getNetworkType(), _TestUtils.default.NETWORK_TYPE);
          _assert.default.deepEqual(await wallet.getDaemonConnection(), new _index.MoneroRpcConnection(_TestUtils.default.OFFLINE_SERVER_URI));
          (0, _assert.default)(!(await wallet.isConnectedToDaemon()));
          _assert.default.equal(await wallet.getSeedLanguage(), "English");
          (0, _assert.default)(!(await wallet.isSynced()));
          _assert.default.equal(await wallet.getHeight(), 1);
          (0, _assert.default)((await wallet.getRestoreHeight()) > 0);

          // set the wallet's connection and sync
          await wallet.setDaemonConnection(_TestUtils.default.getDaemonRpcConnection());
          (0, _assert.default)(await wallet.isConnectedToDaemon());
          await wallet.setRestoreHeight(restoreHeight);
          await wallet.sync();
          (0, _assert.default)(await wallet.isSynced());
          _assert.default.equal(await wallet.getHeight(), await wallet.getDaemonHeight());
          let prevHeight = await wallet.getHeight();

          // save and close the wallet
          await wallet.save();
          await wallet.close();

          // re-open the wallet
          wallet = await that.openWallet({ path: path, server: _TestUtils.default.OFFLINE_SERVER_URI });

          // test wallet state is saved
          (0, _assert.default)(!(await wallet.isConnectedToDaemon()));
          await wallet.setDaemonConnection(_TestUtils.default.getDaemonRpcConnection()); // TODO monero-project: daemon connection not stored in wallet files so must be explicitly set each time
          _assert.default.deepEqual(await wallet.getDaemonConnection(), _TestUtils.default.getDaemonRpcConnection());
          (0, _assert.default)(await wallet.isConnectedToDaemon());
          _assert.default.equal(await wallet.getHeight(), prevHeight);
          (0, _assert.default)((await wallet.getRestoreHeight()) > 0);
          (0, _assert.default)(await _index.MoneroWalletFull.walletExists(path, await _TestUtils.default.getDefaultFs()));
          _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED);
          _assert.default.equal(await wallet.getNetworkType(), _TestUtils.default.NETWORK_TYPE);
          _assert.default.equal(await wallet.getSeedLanguage(), "English");

          // sync
          await wallet.sync();
        } catch (e) {
          err = e;
        }

        // finally
        await wallet.close();
        if (err) throw err;
      });

      if (testConfig.testNonRelays)
      it("Can export and import wallet files", async function () {
        let err;
        let wallet;
        let wallet2;
        try {

          // create random wallet
          wallet = await (0, _index.createWalletFull)({
            networkType: _index.MoneroNetworkType.MAINNET,
            password: "password123"
          });

          // export wallet files
          let walletData = await wallet.getData();
          let keysData = walletData[0];
          let cacheData = walletData[1];

          // import keys file without cache
          wallet2 = await (0, _index.openWalletFull)({
            networkType: _index.MoneroNetworkType.MAINNET,
            password: "password123",
            keysData: keysData
          });

          // import wallet files
          wallet2 = await (0, _index.openWalletFull)({
            networkType: _index.MoneroNetworkType.MAINNET,
            password: "password123",
            keysData: keysData,
            cacheData: cacheData
          });

          // test that wallets are equal
          _assert.default.equal(await wallet.getSeed(), await wallet2.getSeed());
          await TestMoneroWalletFull.testWalletEqualityOnChain(wallet, wallet2);
        } catch (e) {
          err = e;
        }

        // finally
        if (wallet) await wallet.close();
        if (wallet2) await wallet2.close();
        if (err) throw err;
      });

      if (testConfig.testNonRelays)
      it("Can be moved", async function () {
        let err;
        let wallet;
        try {

          // create random in-memory wallet with defaults
          wallet = await that.createWallet(new _index.MoneroWalletConfig().setPath(""));
          let mnemonic = await wallet.getSeed();
          await wallet.setAttribute("mykey", "myval1");

          // change password of in-memory wallet
          let password2 = "abc123";
          await wallet.changePassword(_TestUtils.default.WALLET_PASSWORD, password2);

          // move wallet from memory to disk
          let path1 = _TestUtils.default.TEST_WALLETS_DIR + "/" + _index.GenUtils.getUUID();
          (0, _assert.default)(!(await _index.MoneroWalletFull.walletExists(path1, await _TestUtils.default.getDefaultFs())));
          await wallet.moveTo(path1);
          (0, _assert.default)(await _index.MoneroWalletFull.walletExists(path1, await _TestUtils.default.getDefaultFs()));
          _assert.default.equal(await wallet.getSeed(), mnemonic);
          _assert.default.equal("myval1", await wallet.getAttribute("mykey"));

          // move to same path which is same as saving
          await wallet.setAttribute("mykey", "myval2");
          await wallet.moveTo(path1);
          await wallet.close();
          (0, _assert.default)(await _index.MoneroWalletFull.walletExists(path1, await _TestUtils.default.getDefaultFs()));
          wallet = await that.openWallet(new _index.MoneroWalletConfig().setPath(path1).setPassword(password2));
          _assert.default.equal(await wallet.getSeed(), mnemonic);
          _assert.default.equal("myval2", await wallet.getAttribute("mykey"));

          // move wallet to new directory
          let path2 = _TestUtils.default.TEST_WALLETS_DIR + "/moved/" + _index.GenUtils.getUUID();
          await wallet.setAttribute("mykey", "myval3");
          await wallet.moveTo(path2);
          (0, _assert.default)(!(await _index.MoneroWalletFull.walletExists(path1, await _TestUtils.default.getDefaultFs())));
          (0, _assert.default)(await _index.MoneroWalletFull.walletExists(path2, await _TestUtils.default.getDefaultFs()));
          _assert.default.equal(await wallet.getSeed(), mnemonic);

          // re-open and test wallet
          await wallet.close();
          wallet = await that.openWallet(new _index.MoneroWalletConfig().setPath(path2).setPassword(password2));
          await wallet.sync();
          _assert.default.equal(await wallet.getSeed(), mnemonic);
          _assert.default.equal("myval3", await wallet.getAttribute("mykey"));
        } catch (e) {
          err = e;
        }

        // final cleanup
        if (wallet) await wallet.close();
        if (err) throw err;
        console.log("All done with test");
      });

      if (testConfig.testNonRelays)
      it("Can be closed", async function () {
        let err;
        let wallet;
        try {

          // create a test wallet
          wallet = await that.createWallet();
          let path = await wallet.getPath();
          await wallet.sync();
          (0, _assert.default)((await wallet.getHeight()) > 1);
          (0, _assert.default)(await wallet.isSynced());
          _assert.default.equal(await wallet.isClosed(), false);

          // close the wallet
          await wallet.close();
          (0, _assert.default)(await wallet.isClosed());

          // attempt to interact with the wallet
          try {await wallet.getHeight();}
          catch (e) {_assert.default.equal(e.message, "Wallet is closed");}
          try {await wallet.getSeed();}
          catch (e) {_assert.default.equal(e.message, "Wallet is closed");}
          try {await wallet.sync();}
          catch (e) {_assert.default.equal(e.message, "Wallet is closed");}
          try {await wallet.startSyncing();}
          catch (e) {_assert.default.equal(e.message, "Wallet is closed");}
          try {await wallet.stopSyncing();}
          catch (e) {_assert.default.equal(e.message, "Wallet is closed");}

          // re-open the wallet
          wallet = await that.openWallet({ path: path });
          await wallet.sync();
          _assert.default.equal(await wallet.getHeight(), await wallet.getDaemonHeight());
          _assert.default.equal(await wallet.isClosed(), false);
        } catch (e) {
          console.log(e);
          err = e;
        }

        // final cleanup
        await wallet.close();
        (0, _assert.default)(await wallet.isClosed());
        if (err) throw err;
      });

      if (false)
      it("Does not leak memory", async function () {
        let err;
        try {
          console.log("Infinite loop starting, monitor memory in OS process manager...");
          let i = 0;
          let closeWallet = false;
          if (closeWallet) await that.wallet.close(true);
          while (true) {
            if (closeWallet) that.wallet = await _TestUtils.default.getWalletFull();
            await that.wallet.sync();
            await that.wallet.getTxs();
            await that.wallet.getTransfers();
            await that.wallet.getOutputs(new _index.MoneroOutputQuery().setIsSpent(false));
            if (i % 1000) {
              console.log("Iteration: " + i);
            }
            if (closeWallet) await that.wallet.close(true);
          }
        } catch (e) {
          console.log(e);
          err = e;
        }

        // final cleanup
        if (err) throw err;
      });
    });
  }

  //----------------------------- PRIVATE HELPERS -----------------------------

  static getRandomWalletPath() {
    return _TestUtils.default.TEST_WALLETS_DIR + "/test_wallet_" + _index.GenUtils.getUUID();
  }

  // possible configuration: on chain xor local wallet data ("strict"), txs ordered same way? TBD
  static async testWalletEqualityOnChain(wallet1, wallet2) {
    await _WalletEqualityUtils.default.testWalletEqualityOnChain(wallet1, wallet2);
    _assert.default.equal(await wallet2.getNetworkType(), await wallet1.getNetworkType());
    _assert.default.equal(await wallet2.getRestoreHeight(), await wallet1.getRestoreHeight());
    _assert.default.deepEqual(await wallet1.getDaemonConnection(), await wallet2.getDaemonConnection());
    _assert.default.equal(await wallet2.getSeedLanguage(), await wallet1.getSeedLanguage());
    // TODO: more wasm-specific extensions
  }
}

/**
 * Helper class to test progress updates.
 */exports.default = TestMoneroWalletFull;
class SyncProgressTester extends _WalletSyncPrinter.default {









  constructor(wallet, startHeight, endHeight) {
    super();
    this.wallet = wallet;
    (0, _assert.default)(startHeight >= 0);
    (0, _assert.default)(endHeight >= 0);
    this.startHeight = startHeight;
    this.prevEndHeight = endHeight;
    this.isDone = false;
  }

  async onSyncProgress(height, startHeight, endHeight, percentDone, message) {
    super.onSyncProgress(height, startHeight, endHeight, percentDone, message);

    // registered wallet listeners will continue to get sync notifications after the wallet's initial sync
    if (this.isDone) {
      (0, _assert.default)(this.wallet.getListeners().includes(this), "Listener has completed and is not registered so should not be called again");
      this.onSyncProgressAfterDone = true;
    }

    // update tester's start height if new sync session
    if (this.prevCompleteHeight !== undefined && startHeight === this.prevCompleteHeight) this.startHeight = startHeight;

    // if sync is complete, record completion height for subsequent start heights
    if (percentDone === 1) this.prevCompleteHeight = endHeight;

    // otherwise start height is equal to previous completion height
    else if (this.prevCompleteHeight !== undefined) _assert.default.equal(startHeight, this.prevCompleteHeight);

    (0, _assert.default)(endHeight > startHeight, "end height > start height");
    _assert.default.equal(startHeight, this.startHeight);
    (0, _assert.default)(endHeight >= this.prevEndHeight); // chain can grow while syncing
    this.prevEndHeight = endHeight;
    (0, _assert.default)(height >= startHeight);
    (0, _assert.default)(height < endHeight);
    let expectedPercentDone = (height - startHeight + 1) / (endHeight - startHeight);
    _assert.default.equal(expectedPercentDone, percentDone);
    if (this.prevHeight === undefined) _assert.default.equal(height, startHeight);else
    _assert.default.equal(this.prevHeight + 1, height);
    this.prevHeight = height;
  }

  async onDone(chainHeight) {
    (0, _assert.default)(!this.isDone);
    this.isDone = true;
    if (this.prevHeight === undefined) {
      _assert.default.equal(this.prevCompleteHeight, undefined);
      _assert.default.equal(this.startHeight, chainHeight);
    } else {
      _assert.default.equal(this.prevHeight, chainHeight - 1); // otherwise last height is chain height - 1
      _assert.default.equal(this.prevCompleteHeight, chainHeight);
    }
  }

  isNotified() {
    return this.prevHeight !== undefined;
  }

  getOnSyncProgressAfterDone() {
    return this.onSyncProgressAfterDone;
  }
}

/**
 * Internal class to test all wallet notifications on sync. 
 */
class WalletSyncTester extends SyncProgressTester {










  constructor(wallet, startHeight, endHeight) {
    super(wallet, startHeight, endHeight);
    (0, _assert.default)(startHeight >= 0);
    (0, _assert.default)(endHeight >= 0);
    this.incomingTotal = 0n;
    this.outgoingTotal = 0n;
  }

  async onNewBlock(height) {
    if (this.isDone) {
      (0, _assert.default)(this.wallet.getListeners().includes(this), "Listener has completed and is not registered so should not be called again");
      this.onNewBlockAfterDone = true;
    }
    if (this.walletTesterPrevHeight !== undefined) _assert.default.equal(height, this.walletTesterPrevHeight + 1);
    (0, _assert.default)(height >= this.startHeight);
    this.walletTesterPrevHeight = height;
  }

  async onBalancesChanged(newBalance, newUnlockedBalance) {
    if (this.prevBalance !== undefined) (0, _assert.default)(newBalance.toString() !== this.prevBalance.toString() || newUnlockedBalance.toString() !== this.prevUnlockedBalance.toString());
    this.prevBalance = newBalance;
    this.prevUnlockedBalance = newUnlockedBalance;
  }

  async onOutputReceived(output) {
    _assert.default.notEqual(output, undefined);
    this.prevOutputReceived = output;

    // test output
    _TestUtils.default.testUnsignedBigInt(output.getAmount());
    (0, _assert.default)(output.getAccountIndex() >= 0);
    (0, _assert.default)(output.getSubaddressIndex() >= 0);

    // test output's tx
    (0, _assert.default)(output.getTx());
    (0, _assert.default)(output.getTx() instanceof _index.MoneroTxWallet);
    (0, _assert.default)(output.getTx().getHash());
    _assert.default.equal(output.getTx().getHash().length, 64);
    (0, _assert.default)(output.getTx().getVersion() >= 0);
    (0, _assert.default)(output.getTx().getUnlockTime() >= 0);
    _assert.default.equal(output.getTx().getInputs(), undefined);
    _assert.default.equal(output.getTx().getOutputs().length, 1);
    (0, _assert.default)(output.getTx().getOutputs()[0] === output);

    // extra is not sent over the wasm bridge
    _assert.default.equal(output.getTx().getExtra(), undefined);

    // add incoming amount to running total
    if (output.getIsLocked()) this.incomingTotal = this.incomingTotal + output.getAmount();
  }

  async onOutputSpent(output) {
    _assert.default.notEqual(output, undefined);
    this.prevOutputSpent = output;

    // test output
    _TestUtils.default.testUnsignedBigInt(output.getAmount());
    (0, _assert.default)(output.getAccountIndex() >= 0);
    if (output.getSubaddressIndex() !== undefined) (0, _assert.default)(output.getSubaddressIndex() >= 0); // TODO (monero-project): can be undefined because inputs not provided so one created from outgoing transfer

    // test output's tx
    (0, _assert.default)(output.getTx());
    (0, _assert.default)(output.getTx() instanceof _index.MoneroTxWallet);
    (0, _assert.default)(output.getTx().getHash());
    _assert.default.equal(output.getTx().getHash().length, 64);
    (0, _assert.default)(output.getTx().getVersion() >= 0);
    (0, _assert.default)(output.getTx().getUnlockTime() >= 0);
    _assert.default.equal(output.getTx().getInputs().length, 1);
    (0, _assert.default)(output.getTx().getInputs()[0] === output);
    _assert.default.equal(output.getTx().getOutputs(), undefined);

    // extra is not sent over the wasm bridge
    _assert.default.equal(output.getTx().getExtra(), undefined);

    // add outgoing amount to running total
    if (output.getIsLocked()) this.outgoingTotal = this.outgoingTotal + output.getAmount();
  }

  async onDone(chainHeight) {
    await super.onDone(chainHeight);
    _assert.default.notEqual(this.walletTesterPrevHeight, undefined);
    _assert.default.notEqual(this.prevOutputReceived, undefined);
    _assert.default.notEqual(this.prevOutputSpent, undefined);
    let balance = this.incomingTotal - this.outgoingTotal;
    _assert.default.equal(balance.toString(), (await this.wallet.getBalance()).toString());
    _assert.default.equal(this.prevBalance.toString(), (await this.wallet.getBalance()).toString());
    _assert.default.equal(this.prevUnlockedBalance.toString(), (await this.wallet.getUnlockedBalance()).toString());
  }

  getOnNewBlockAfterDone() {
    return this.onNewBlockAfterDone;
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYXNzZXJ0IiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfVGVzdFV0aWxzIiwiX1Rlc3RNb25lcm9XYWxsZXRDb21tb24iLCJfU3RhcnRNaW5pbmciLCJfV2FsbGV0U3luY1ByaW50ZXIiLCJfV2FsbGV0RXF1YWxpdHlVdGlscyIsIl9pbmRleCIsIlRlc3RNb25lcm9XYWxsZXRGdWxsIiwiVGVzdE1vbmVyb1dhbGxldENvbW1vbiIsImNvbnN0cnVjdG9yIiwidGVzdENvbmZpZyIsImJlZm9yZUFsbCIsImJlZm9yZUVhY2giLCJjdXJyZW50VGVzdCIsImFmdGVyQWxsIiwiRlVMTF9URVNUU19SVU4iLCJhZnRlckVhY2giLCJjb25zb2xlIiwibG9nIiwiTGlicmFyeVV0aWxzIiwiZ2V0V2FzbU1lbW9yeVVzZWQiLCJ3aGl0ZWxpc3QiLCJUZXN0VXRpbHMiLCJXQUxMRVRfTkFNRSIsIml0ZW1zIiwiZ2V0RGVmYXVsdEZzIiwicmVhZGRpclN5bmMiLCJURVNUX1dBTExFVFNfRElSIiwiaXRlbSIsImZvdW5kIiwid2hpdGVsaXN0ZWQiLCJ1bmxpbmtTeW5jIiwiZ2V0VGVzdFdhbGxldCIsImdldFdhbGxldEZ1bGwiLCJnZXRUZXN0RGFlbW9uIiwiZ2V0RGFlbW9uUnBjIiwib3BlbldhbGxldCIsImNvbmZpZyIsInN0YXJ0U3luY2luZyIsIk1vbmVyb1dhbGxldENvbmZpZyIsImdldFBhc3N3b3JkIiwidW5kZWZpbmVkIiwic2V0UGFzc3dvcmQiLCJXQUxMRVRfUEFTU1dPUkQiLCJnZXROZXR3b3JrVHlwZSIsInNldE5ldHdvcmtUeXBlIiwiTkVUV09SS19UWVBFIiwiZ2V0UHJveHlUb1dvcmtlciIsInNldFByb3h5VG9Xb3JrZXIiLCJQUk9YWV9UT19XT1JLRVIiLCJnZXRTZXJ2ZXIiLCJnZXRDb25uZWN0aW9uTWFuYWdlciIsInNldFNlcnZlciIsImdldERhZW1vblJwY0Nvbm5lY3Rpb24iLCJnZXRGcyIsInNldEZzIiwid2FsbGV0Iiwib3BlbldhbGxldEZ1bGwiLCJpc0Nvbm5lY3RlZFRvRGFlbW9uIiwiU1lOQ19QRVJJT0RfSU5fTVMiLCJjcmVhdGVXYWxsZXQiLCJyYW5kb20iLCJnZXRTZWVkIiwiZ2V0UHJpbWFyeUFkZHJlc3MiLCJnZXRQYXRoIiwic2V0UGF0aCIsIkdlblV0aWxzIiwiZ2V0VVVJRCIsImdldFJlc3RvcmVIZWlnaHQiLCJzZXRSZXN0b3JlSGVpZ2h0IiwiY3JlYXRlV2FsbGV0RnVsbCIsImFzc2VydCIsImVxdWFsIiwiY2xvc2VXYWxsZXQiLCJzYXZlIiwiY2xvc2UiLCJnZXRTZWVkTGFuZ3VhZ2VzIiwiTW9uZXJvV2FsbGV0RnVsbCIsInJ1blRlc3RzIiwidGhhdCIsImRlc2NyaWJlIiwiYmVmb3JlIiwiYWZ0ZXIiLCJ0ZXN0V2FsbGV0RnVsbCIsInJ1bkNvbW1vblRlc3RzIiwidGVzdE5vblJlbGF5cyIsIml0IiwicmVzdG9yZUhlaWdodCIsIkZJUlNUX1JFQ0VJVkVfSEVJR0hUIiwiaSIsInByb2Nlc3MiLCJtZW1vcnlVc2FnZSIsInRlc3RTeW5jU2VlZCIsImRhZW1vbkhlaWdodCIsImdldERhZW1vbkhlaWdodCIsImxpdGVNb2RlIiwid2FsbGV0cyIsInNlZWQiLCJTRUVEIiwicHVzaCIsImhlaWdodCIsImdldERhZW1vbk1heFBlZXJIZWlnaHQiLCJuZXR3b3JrVHlwZSIsIk1vbmVyb05ldHdvcmtUeXBlIiwiTUFJTk5FVCIsInNlcnZlciIsIk9GRkxJTkVfU0VSVkVSX1VSSSIsIk1vbmVyb1V0aWxzIiwidmFsaWRhdGVNbmVtb25pYyIsInZhbGlkYXRlQWRkcmVzcyIsImRlZXBFcXVhbCIsImdldERhZW1vbkNvbm5lY3Rpb24iLCJNb25lcm9ScGNDb25uZWN0aW9uIiwiZ2V0U2VlZExhbmd1YWdlIiwiaXNTeW5jZWQiLCJnZXRIZWlnaHQiLCJlIiwibWVzc2FnZSIsInNldERhZW1vbkNvbm5lY3Rpb24iLCJkYWVtb24iLCJnZXRScGNDb25uZWN0aW9uIiwiVEVTVE5FVCIsImxhbmd1YWdlIiwiZ2V0Q29uZmlnIiwiZ2V0VXJpIiwiZ2V0VXNlcm5hbWUiLCJpc0Nvbm5lY3RlZCIsIkFERFJFU1MiLCJwYXRoIiwid2FsbGV0S2V5cyIsInByaW1hcnlBZGRyZXNzIiwicHJpdmF0ZVZpZXdLZXkiLCJnZXRQcml2YXRlVmlld0tleSIsInByaXZhdGVTcGVuZEtleSIsImdldFByaXZhdGVTcGVuZEtleSIsImVyciIsImdldFB1YmxpY1ZpZXdLZXkiLCJnZXRQdWJsaWNTcGVuZEtleSIsImlzQnJvd3NlciIsIndhbGxldE5hbWUiLCJ3YWxsZXRScGMiLCJnZXRXYWxsZXRScGMiLCJzZXRTZWVkIiwic3luYyIsImJhbGFuY2UiLCJnZXRCYWxhbmNlIiwib3V0cHV0c0hleCIsImV4cG9ydE91dHB1dHMiLCJsZW5ndGgiLCJ3YWxsZXRGdWxsIiwiV0FMTEVUX1JQQ19MT0NBTF9XQUxMRVRfRElSIiwiREFFTU9OX1JQQ19DT05GSUciLCJ0b1N0cmluZyIsInRlc3RSZWxheXMiLCJ2aWV3T25seVdhbGxldCIsInN0YXJ0V2FsbGV0UnBjUHJvY2VzcyIsInBhc3N3b3JkIiwib2ZmbGluZVdhbGxldCIsInRlc3RWaWV3T25seUFuZE9mZmxpbmVXYWxsZXRzIiwic3RvcFdhbGxldFJwY1Byb2Nlc3MiLCJwYXJ0aWNpcGFudHMiLCJ0ZXN0TXVsdGlzaWdQYXJ0aWNpcGFudHMiLCJzdG9wTWluaW5nIiwiTW9uZXJvV2FsbGV0UnBjIiwiV0FMTEVUX0ZVTExfUEFUSCIsInN0YXJ0SGVpZ2h0IiwicHJvZ3Jlc3NUZXN0ZXIiLCJTeW5jUHJvZ3Jlc3NUZXN0ZXIiLCJyZXN1bHQiLCJvbkRvbmUiLCJnZXROdW1CbG9ja3NGZXRjaGVkIiwiZ2V0UmVjZWl2ZWRNb25leSIsIndhbGxldEd0IiwidGVzdFdhbGxldEVxdWFsaXR5T25DaGFpbiIsIkVycm9yIiwiZTEiLCJlMiIsInNraXBHdENvbXBhcmlzb24iLCJ0ZXN0UG9zdFN5bmNOb3RpZmljYXRpb25zIiwic3RhcnRIZWlnaHRFeHBlY3RlZCIsImVuZEhlaWdodEV4cGVjdGVkIiwid2FsbGV0U3luY1Rlc3RlciIsIldhbGxldFN5bmNUZXN0ZXIiLCJhZGRMaXN0ZW5lciIsImdldFR4cyIsImNyZWF0ZVdhbGxldEdyb3VuZFRydXRoIiwic3RhcnRlZE1pbmluZyIsIm1pbmluZ1N0YXR1cyIsImdldE1pbmluZ1N0YXR1cyIsImdldElzQWN0aXZlIiwiU3RhcnRNaW5pbmciLCJzdGFydE1pbmluZyIsIndhaXRGb3JOZXh0QmxvY2tIZWFkZXIiLCJQcm9taXNlIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJnZXRPblN5bmNQcm9ncmVzc0FmdGVyRG9uZSIsImdldE9uTmV3QmxvY2tBZnRlckRvbmUiLCJnZXRSYW5kb21XYWxsZXRQYXRoIiwibm90RXF1YWwiLCJjaGFpbkhlaWdodCIsInN0b3BTeW5jaW5nIiwiQmlnSW50Iiwid2FsbGV0MSIsIndhbGxldDIiLCJ0ZXN0ZXIxIiwidGVzdGVyMiIsImlzTm90aWZpZWQiLCJ0ZXN0ZXIzIiwiV2FsbGV0RXF1YWxpdHlVdGlscyIsInNlZWRPZmZzZXQiLCJ0ZXN0Q3JlYXRlTXVsdGlzaWdXYWxsZXQiLCJNIiwiTiIsInByZXBhcmVkTXVsdGlzaWdIZXhlcyIsInByZXBhcmVNdWx0aXNpZyIsIm1hZGVNdWx0aXNpZ0hleGVzIiwicGVlck11bHRpc2lnSGV4ZXMiLCJqIiwibXVsdGlzaWdIZXgiLCJtYWtlTXVsdGlzaWciLCJtdWx0aXNpZ0hleGVzIiwicmVzdWx0TXVsdGlzaWdIZXhlcyIsImV4Y2hhbmdlTXVsdGlzaWdLZXlzIiwiZ2V0TXVsdGlzaWdIZXgiLCJnZXRBZGRyZXNzIiwiaW5mbyIsImdldE11bHRpc2lnSW5mbyIsImdldElzTXVsdGlzaWciLCJnZXRJc1JlYWR5IiwiZ2V0VGhyZXNob2xkIiwiZ2V0TnVtUGFydGljaXBhbnRzIiwid2FsbGV0RXhpc3RzIiwicHJldkhlaWdodCIsIndhbGxldERhdGEiLCJnZXREYXRhIiwia2V5c0RhdGEiLCJjYWNoZURhdGEiLCJtbmVtb25pYyIsInNldEF0dHJpYnV0ZSIsInBhc3N3b3JkMiIsImNoYW5nZVBhc3N3b3JkIiwicGF0aDEiLCJtb3ZlVG8iLCJnZXRBdHRyaWJ1dGUiLCJwYXRoMiIsImlzQ2xvc2VkIiwiZ2V0VHJhbnNmZXJzIiwiZ2V0T3V0cHV0cyIsIk1vbmVyb091dHB1dFF1ZXJ5Iiwic2V0SXNTcGVudCIsImV4cG9ydHMiLCJkZWZhdWx0IiwiV2FsbGV0U3luY1ByaW50ZXIiLCJlbmRIZWlnaHQiLCJwcmV2RW5kSGVpZ2h0IiwiaXNEb25lIiwib25TeW5jUHJvZ3Jlc3MiLCJwZXJjZW50RG9uZSIsImdldExpc3RlbmVycyIsImluY2x1ZGVzIiwib25TeW5jUHJvZ3Jlc3NBZnRlckRvbmUiLCJwcmV2Q29tcGxldGVIZWlnaHQiLCJleHBlY3RlZFBlcmNlbnREb25lIiwiaW5jb21pbmdUb3RhbCIsIm91dGdvaW5nVG90YWwiLCJvbk5ld0Jsb2NrIiwib25OZXdCbG9ja0FmdGVyRG9uZSIsIndhbGxldFRlc3RlclByZXZIZWlnaHQiLCJvbkJhbGFuY2VzQ2hhbmdlZCIsIm5ld0JhbGFuY2UiLCJuZXdVbmxvY2tlZEJhbGFuY2UiLCJwcmV2QmFsYW5jZSIsInByZXZVbmxvY2tlZEJhbGFuY2UiLCJvbk91dHB1dFJlY2VpdmVkIiwib3V0cHV0IiwicHJldk91dHB1dFJlY2VpdmVkIiwidGVzdFVuc2lnbmVkQmlnSW50IiwiZ2V0QW1vdW50IiwiZ2V0QWNjb3VudEluZGV4IiwiZ2V0U3ViYWRkcmVzc0luZGV4IiwiZ2V0VHgiLCJNb25lcm9UeFdhbGxldCIsImdldEhhc2giLCJnZXRWZXJzaW9uIiwiZ2V0VW5sb2NrVGltZSIsImdldElucHV0cyIsImdldEV4dHJhIiwiZ2V0SXNMb2NrZWQiLCJvbk91dHB1dFNwZW50IiwicHJldk91dHB1dFNwZW50IiwiZ2V0VW5sb2NrZWRCYWxhbmNlIl0sInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3Rlc3QvVGVzdE1vbmVyb1dhbGxldEZ1bGwudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFzc2VydCBmcm9tIFwiYXNzZXJ0XCI7XG5pbXBvcnQgVGVzdFV0aWxzIGZyb20gXCIuL3V0aWxzL1Rlc3RVdGlsc1wiO1xuaW1wb3J0IFRlc3RNb25lcm9XYWxsZXRDb21tb24gZnJvbSBcIi4vVGVzdE1vbmVyb1dhbGxldENvbW1vblwiO1xuaW1wb3J0IFN0YXJ0TWluaW5nIGZyb20gXCIuL3V0aWxzL1N0YXJ0TWluaW5nXCI7XG5pbXBvcnQgV2FsbGV0U3luY1ByaW50ZXIgZnJvbSBcIi4vdXRpbHMvV2FsbGV0U3luY1ByaW50ZXJcIjtcbmltcG9ydCBXYWxsZXRFcXVhbGl0eVV0aWxzIGZyb20gXCIuL3V0aWxzL1dhbGxldEVxdWFsaXR5VXRpbHNcIjtcbmltcG9ydCB7Y3JlYXRlV2FsbGV0RnVsbCxcbiAgICAgICAgb3BlbldhbGxldEZ1bGwsXG4gICAgICAgIExpYnJhcnlVdGlscyxcbiAgICAgICAgTW9uZXJvV2FsbGV0Q29uZmlnLFxuICAgICAgICBHZW5VdGlscyxcbiAgICAgICAgTW9uZXJvVXRpbHMsXG4gICAgICAgIE1vbmVyb05ldHdvcmtUeXBlLFxuICAgICAgICBNb25lcm9UeFdhbGxldCxcbiAgICAgICAgTW9uZXJvT3V0cHV0UXVlcnksXG4gICAgICAgIE1vbmVyb091dHB1dFdhbGxldCxcbiAgICAgICAgTW9uZXJvUnBjQ29ubmVjdGlvbixcbiAgICAgICAgTW9uZXJvV2FsbGV0LFxuICAgICAgICBNb25lcm9XYWxsZXRGdWxsLFxuICAgICAgICBNb25lcm9XYWxsZXRScGN9IGZyb20gXCIuLi8uLi9pbmRleFwiO1xuXG4vKipcbiAqIFRlc3RzIGEgTW9uZXJvIHdhbGxldCB1c2luZyBXZWJBc3NlbWJseSB0byBicmlkZ2UgdG8gbW9uZXJvLXByb2plY3QncyB3YWxsZXQyLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXN0TW9uZXJvV2FsbGV0RnVsbCBleHRlbmRzIFRlc3RNb25lcm9XYWxsZXRDb21tb24ge1xuXG4gIHN0YXRpYyBGVUxMX1RFU1RTX1JVTjogYm9vbGVhbjtcbiAgXG4gIGNvbnN0cnVjdG9yKHRlc3RDb25maWcpIHtcbiAgICBzdXBlcih0ZXN0Q29uZmlnKTtcbiAgfVxuICBcbiAgYXN5bmMgYmVmb3JlQWxsKCkge1xuICAgIGF3YWl0IHN1cGVyLmJlZm9yZUFsbCgpO1xuICB9XG4gIFxuICBhc3luYyBiZWZvcmVFYWNoKGN1cnJlbnRUZXN0KSB7XG4gICAgYXdhaXQgc3VwZXIuYmVmb3JlRWFjaChjdXJyZW50VGVzdCk7XG4gIH1cbiAgXG4gIGFzeW5jIGFmdGVyQWxsKCkge1xuICAgIGF3YWl0IHN1cGVyLmFmdGVyQWxsKCk7XG4gICAgVGVzdE1vbmVyb1dhbGxldEZ1bGwuRlVMTF9URVNUU19SVU4gPSB0cnVlO1xuICB9XG4gIFxuICBhc3luYyBhZnRlckVhY2goY3VycmVudFRlc3QpIHtcbiAgICBhd2FpdCBzdXBlci5hZnRlckVhY2goY3VycmVudFRlc3QpO1xuICAgIFxuICAgIC8vIHByaW50IG1lbW9yeSB1c2FnZVxuICAgIGNvbnNvbGUubG9nKFwiV0FTTSBtZW1vcnkgdXNhZ2U6IFwiICsgYXdhaXQgTGlicmFyeVV0aWxzLmdldFdhc21NZW1vcnlVc2VkKCkpO1xuICAgIC8vY29uc29sZS5sb2cocHJvY2Vzcy5tZW1vcnlVc2FnZSgpKTtcbiAgICBcbiAgICAvLyByZW1vdmUgbm9uLXdoaXRlbGlzdGVkIHdhbGxldHNcbiAgICBsZXQgd2hpdGVsaXN0ID0gW1Rlc3RVdGlscy5XQUxMRVRfTkFNRSwgXCJncm91bmRfdHJ1dGhcIiwgXCJtb3ZlZFwiXTtcbiAgICBsZXQgaXRlbXMgPSAoYXdhaXQgVGVzdFV0aWxzLmdldERlZmF1bHRGcygpKS5yZWFkZGlyU3luYyhUZXN0VXRpbHMuVEVTVF9XQUxMRVRTX0RJUiwgXCJidWZmZXJcIik7XG4gICAgZm9yIChsZXQgaXRlbSBvZiBpdGVtcykge1xuICAgICAgaXRlbSA9IGl0ZW0gKyBcIlwiOyAvLyBnZXQgZmlsZW5hbWUgYXMgc3RyaW5nXG4gICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgIGZvciAobGV0IHdoaXRlbGlzdGVkIG9mIHdoaXRlbGlzdCkge1xuICAgICAgICBpZiAoaXRlbSA9PT0gd2hpdGVsaXN0ZWQgfHwgaXRlbSA9PT0gd2hpdGVsaXN0ZWQgKyBcIi5rZXlzXCIgfHwgaXRlbSA9PT0gd2hpdGVsaXN0ZWQgKyBcIi5hZGRyZXNzLnR4dFwiKSB7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWZvdW5kKSAoYXdhaXQgVGVzdFV0aWxzLmdldERlZmF1bHRGcygpKS51bmxpbmtTeW5jKFRlc3RVdGlscy5URVNUX1dBTExFVFNfRElSICsgXCIvXCIgKyBpdGVtKTtcbiAgICB9XG4gIH1cbiAgXG4gIGFzeW5jIGdldFRlc3RXYWxsZXQoKSB7XG4gICAgcmV0dXJuIGF3YWl0IFRlc3RVdGlscy5nZXRXYWxsZXRGdWxsKCk7XG4gIH1cbiAgXG4gIGFzeW5jIGdldFRlc3REYWVtb24oKSB7XG4gICAgcmV0dXJuIGF3YWl0IFRlc3RVdGlscy5nZXREYWVtb25ScGMoKTtcbiAgfVxuICBcbiAgYXN5bmMgb3BlbldhbGxldChjb25maWc6IFBhcnRpYWw8TW9uZXJvV2FsbGV0Q29uZmlnPiwgc3RhcnRTeW5jaW5nPzogYW55KTogUHJvbWlzZTxNb25lcm9XYWxsZXRGdWxsPiB7XG4gICAgXG4gICAgLy8gYXNzaWduIGRlZmF1bHRzXG4gICAgY29uZmlnID0gbmV3IE1vbmVyb1dhbGxldENvbmZpZyhjb25maWcpO1xuICAgIGlmIChjb25maWcuZ2V0UGFzc3dvcmQoKSA9PT0gdW5kZWZpbmVkKSBjb25maWcuc2V0UGFzc3dvcmQoVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCk7XG4gICAgaWYgKGNvbmZpZy5nZXROZXR3b3JrVHlwZSgpID09PSB1bmRlZmluZWQpIGNvbmZpZy5zZXROZXR3b3JrVHlwZShUZXN0VXRpbHMuTkVUV09SS19UWVBFKTtcbiAgICBpZiAoY29uZmlnLmdldFByb3h5VG9Xb3JrZXIoKSA9PT0gdW5kZWZpbmVkKSBjb25maWcuc2V0UHJveHlUb1dvcmtlcihUZXN0VXRpbHMuUFJPWFlfVE9fV09SS0VSKTtcbiAgICBpZiAoY29uZmlnLmdldFNlcnZlcigpID09PSB1bmRlZmluZWQgJiYgIWNvbmZpZy5nZXRDb25uZWN0aW9uTWFuYWdlcigpKSBjb25maWcuc2V0U2VydmVyKFRlc3RVdGlscy5nZXREYWVtb25ScGNDb25uZWN0aW9uKCkpO1xuICAgIGlmIChjb25maWcuZ2V0RnMoKSA9PT0gdW5kZWZpbmVkKSBjb25maWcuc2V0RnMoYXdhaXQgVGVzdFV0aWxzLmdldERlZmF1bHRGcygpKTtcbiAgICBcbiAgICAvLyBvcGVuIHdhbGxldFxuICAgIGxldCB3YWxsZXQgPSBhd2FpdCBvcGVuV2FsbGV0RnVsbChjb25maWcpO1xuICAgIGlmIChzdGFydFN5bmNpbmcgIT09IGZhbHNlICYmIGF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpIGF3YWl0IHdhbGxldC5zdGFydFN5bmNpbmcoVGVzdFV0aWxzLlNZTkNfUEVSSU9EX0lOX01TKTtcbiAgICByZXR1cm4gd2FsbGV0O1xuICB9XG4gIFxuICBhc3luYyBjcmVhdGVXYWxsZXQoY29uZmlnPzogUGFydGlhbDxNb25lcm9XYWxsZXRDb25maWc+LCBzdGFydFN5bmNpbmc/KTogUHJvbWlzZTxNb25lcm9XYWxsZXRGdWxsPiB7XG4gICAgXG4gICAgLy8gYXNzaWduIGRlZmF1bHRzXG4gICAgY29uZmlnID0gbmV3IE1vbmVyb1dhbGxldENvbmZpZyhjb25maWcpO1xuICAgIGxldCByYW5kb20gPSBjb25maWcuZ2V0U2VlZCgpID09PSB1bmRlZmluZWQgJiYgY29uZmlnLmdldFByaW1hcnlBZGRyZXNzKCkgPT09IHVuZGVmaW5lZDtcbiAgICBpZiAoY29uZmlnLmdldFBhdGgoKSA9PT0gdW5kZWZpbmVkKSBjb25maWcuc2V0UGF0aChUZXN0VXRpbHMuVEVTVF9XQUxMRVRTX0RJUiArIFwiL1wiICsgR2VuVXRpbHMuZ2V0VVVJRCgpKTtcbiAgICBpZiAoY29uZmlnLmdldFBhc3N3b3JkKCkgPT09IHVuZGVmaW5lZCkgY29uZmlnLnNldFBhc3N3b3JkKFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQpO1xuICAgIGlmIChjb25maWcuZ2V0TmV0d29ya1R5cGUoKSA9PT0gdW5kZWZpbmVkKSBjb25maWcuc2V0TmV0d29ya1R5cGUoVGVzdFV0aWxzLk5FVFdPUktfVFlQRSk7XG4gICAgaWYgKCFjb25maWcuZ2V0UmVzdG9yZUhlaWdodCgpICYmICFyYW5kb20pIGNvbmZpZy5zZXRSZXN0b3JlSGVpZ2h0KDApO1xuICAgIGlmICghY29uZmlnLmdldFNlcnZlcigpICYmICFjb25maWcuZ2V0Q29ubmVjdGlvbk1hbmFnZXIoKSkgY29uZmlnLnNldFNlcnZlcihUZXN0VXRpbHMuZ2V0RGFlbW9uUnBjQ29ubmVjdGlvbigpKTtcbiAgICBpZiAoY29uZmlnLmdldFByb3h5VG9Xb3JrZXIoKSA9PT0gdW5kZWZpbmVkKSBjb25maWcuc2V0UHJveHlUb1dvcmtlcihUZXN0VXRpbHMuUFJPWFlfVE9fV09SS0VSKTtcbiAgICBpZiAoY29uZmlnLmdldEZzKCkgPT09IHVuZGVmaW5lZCkgY29uZmlnLnNldEZzKGF3YWl0IFRlc3RVdGlscy5nZXREZWZhdWx0RnMoKSk7XG4gICAgXG4gICAgLy8gY3JlYXRlIHdhbGxldFxuICAgIGxldCB3YWxsZXQgPSBhd2FpdCBjcmVhdGVXYWxsZXRGdWxsKGNvbmZpZyk7XG4gICAgaWYgKCFyYW5kb20pIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UmVzdG9yZUhlaWdodCgpLCBjb25maWcuZ2V0UmVzdG9yZUhlaWdodCgpID09PSB1bmRlZmluZWQgPyAwIDogY29uZmlnLmdldFJlc3RvcmVIZWlnaHQoKSk7XG4gICAgaWYgKHN0YXJ0U3luY2luZyAhPT0gZmFsc2UgJiYgYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSkgYXdhaXQgd2FsbGV0LnN0YXJ0U3luY2luZyhUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMpO1xuICAgIHJldHVybiB3YWxsZXQ7XG4gIH1cbiAgXG4gIGFzeW5jIGNsb3NlV2FsbGV0KHdhbGxldCwgc2F2ZT8pIHtcbiAgICBhd2FpdCB3YWxsZXQuY2xvc2Uoc2F2ZSk7XG4gIH1cbiAgXG4gIGFzeW5jIGdldFNlZWRMYW5ndWFnZXMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIHJldHVybiBhd2FpdCBNb25lcm9XYWxsZXRGdWxsLmdldFNlZWRMYW5ndWFnZXMoKTtcbiAgfVxuICBcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBCRUdJTiBURVNUUyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgXG4gIHJ1blRlc3RzKCkge1xuICAgIGxldCB0aGF0ID0gdGhpcztcbiAgICBsZXQgdGVzdENvbmZpZyA9IHRoaXMudGVzdENvbmZpZztcbiAgICBkZXNjcmliZShcIlRFU1QgTU9ORVJPIFdBTExFVCBGVUxMXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgIC8vIHJlZ2lzdGVyIGhhbmRsZXJzIHRvIHJ1biBiZWZvcmUgYW5kIGFmdGVyIHRlc3RzXG4gICAgICBiZWZvcmUoYXN5bmMgZnVuY3Rpb24oKSB7IGF3YWl0IHRoYXQuYmVmb3JlQWxsKCk7IH0pO1xuICAgICAgYmVmb3JlRWFjaChhc3luYyBmdW5jdGlvbigpIHsgYXdhaXQgdGhhdC5iZWZvcmVFYWNoKHRoaXMuY3VycmVudFRlc3QpOyB9KTtcbiAgICAgIGFmdGVyKGFzeW5jIGZ1bmN0aW9uKCkgeyBhd2FpdCB0aGF0LmFmdGVyQWxsKCk7IH0pO1xuICAgICAgYWZ0ZXJFYWNoKGFzeW5jIGZ1bmN0aW9uKCkgeyBhd2FpdCB0aGF0LmFmdGVyRWFjaCh0aGlzLmN1cnJlbnRUZXN0KTsgfSk7XG4gICAgICBcbiAgICAgIC8vIHJ1biB0ZXN0cyBzcGVjaWZpYyB0byBmdWxsIHdhbGxldFxuICAgICAgdGhhdC50ZXN0V2FsbGV0RnVsbCgpO1xuICAgICAgXG4gICAgICAvLyBydW4gY29tbW9uIHRlc3RzXG4gICAgICB0aGF0LnJ1bkNvbW1vblRlc3RzKCk7XG4gICAgfSk7XG4gIH1cbiAgXG4gIHByb3RlY3RlZCB0ZXN0V2FsbGV0RnVsbCgpIHtcbiAgICBsZXQgdGhhdCA9IHRoaXM7XG4gICAgbGV0IHRlc3RDb25maWcgPSB0aGlzLnRlc3RDb25maWc7XG4gICAgZGVzY3JpYmUoXCJUZXN0cyBzcGVjaWZpYyB0byBXZWJBc3NlbWJseSB3YWxsZXRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBcbiAgICAgIGlmIChmYWxzZSAmJiB0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkRvZXMgbm90IGxlYWsgbWVtb3J5XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgcmVzdG9yZUhlaWdodCA9IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVDtcbiAgICAgICAgLy9sZXQgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3NlZWQ6IFRlc3RVdGlscy5TRUVELCByZXN0b3JlSGVpZ2h0OiByZXN0b3JlSGVpZ2h0fSwgZmFsc2UpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwMDsgaSsrKSB7XG4gICAgICAgICAgY29uc29sZS5sb2cocHJvY2Vzcy5tZW1vcnlVc2FnZSgpKTtcbiAgICAgICAgICBhd2FpdCB0ZXN0U3luY1NlZWQoVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hULCB1bmRlZmluZWQsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdGhlIGRhZW1vbidzIGhlaWdodFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXNzZXJ0KGF3YWl0IHRoYXQud2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgICAgIGxldCBkYWVtb25IZWlnaHQgPSBhd2FpdCB0aGF0LndhbGxldC5nZXREYWVtb25IZWlnaHQoKTtcbiAgICAgICAgYXNzZXJ0KGRhZW1vbkhlaWdodCA+IDApO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgJiYgIXRlc3RDb25maWcubGl0ZU1vZGUpXG4gICAgICBpdChcIkNhbiBvcGVuLCBzeW5jLCBhbmQgY2xvc2Ugd2FsbGV0cyByZXBlYXRlZGx5XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgd2FsbGV0czogTW9uZXJvV2FsbGV0RnVsbFtdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSB7XG4gICAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtzZWVkOiBUZXN0VXRpbHMuU0VFRCwgcmVzdG9yZUhlaWdodDogVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hUfSk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnN0YXJ0U3luY2luZygpO1xuICAgICAgICAgIHdhbGxldHMucHVzaCh3YWxsZXQpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IHdhbGxldCBvZiB3YWxsZXRzKSBhd2FpdCB3YWxsZXQuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRoZSBkYWVtb24ncyBtYXggcGVlciBoZWlnaHRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBoZWlnaHQgPSBhd2FpdCAodGhhdC53YWxsZXQgYXMgTW9uZXJvV2FsbGV0RnVsbCkuZ2V0RGFlbW9uTWF4UGVlckhlaWdodCgpO1xuICAgICAgICBhc3NlcnQoaGVpZ2h0ID4gMCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGNyZWF0ZSBhIHJhbmRvbSBmdWxsIHdhbGxldFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSB1bmNvbm5lY3RlZCByYW5kb20gd2FsbGV0XG4gICAgICAgIGxldCB3YWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7bmV0d29ya1R5cGU6IE1vbmVyb05ldHdvcmtUeXBlLk1BSU5ORVQsIHNlcnZlcjogVGVzdFV0aWxzLk9GRkxJTkVfU0VSVkVSX1VSSX0pO1xuICAgICAgICBhd2FpdCBNb25lcm9VdGlscy52YWxpZGF0ZU1uZW1vbmljKGF3YWl0IHdhbGxldC5nZXRTZWVkKCkpO1xuICAgICAgICBhd2FpdCBNb25lcm9VdGlscy52YWxpZGF0ZUFkZHJlc3MoYXdhaXQgd2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIE1vbmVyb05ldHdvcmtUeXBlLk1BSU5ORVQpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldE5ldHdvcmtUeXBlKCksIE1vbmVyb05ldHdvcmtUeXBlLk1BSU5ORVQpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCksIG5ldyBNb25lcm9ScGNDb25uZWN0aW9uKFRlc3RVdGlscy5PRkZMSU5FX1NFUlZFUl9VUkkpKTtcbiAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWRMYW5ndWFnZSgpLCBcIkVuZ2xpc2hcIik7XG4gICAgICAgIGFzc2VydCghKGF3YWl0IHdhbGxldC5pc1N5bmNlZCgpKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCksIDEpOyAvLyBUT0RPIG1vbmVyby1wcm9qZWN0OiB3aHkgZG9lcyBoZWlnaHQgb2YgbmV3IHVuc3luY2VkIHdhbGxldCBzdGFydCBhdCAxP1xuICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSA+PSAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNhbm5vdCBnZXQgZGFlbW9uIGNoYWluIGhlaWdodFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5nZXREYWVtb25IZWlnaHQoKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJXYWxsZXQgaXMgbm90IGNvbm5lY3RlZCB0byBkYWVtb25cIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHNldCBkYWVtb24gY29ubmVjdGlvbiBhbmQgY2hlY2sgY2hhaW4gaGVpZ2h0XG4gICAgICAgIGF3YWl0IHdhbGxldC5zZXREYWVtb25Db25uZWN0aW9uKGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uSGVpZ2h0KCksIGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNsb3NlIHdhbGxldCB3aGljaCByZWxlYXNlcyByZXNvdXJjZXNcbiAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKCk7XG5cbiAgICAgICAgLy8gY3JlYXRlIHJhbmRvbSB3YWxsZXQgd2l0aCBub24gZGVmYXVsdHNcbiAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe25ldHdvcmtUeXBlOiBNb25lcm9OZXR3b3JrVHlwZS5URVNUTkVULCBsYW5ndWFnZTogXCJTcGFuaXNoXCJ9LCBmYWxzZSk7XG4gICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlTW5lbW9uaWMoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSk7XG4gICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlQWRkcmVzcyhhd2FpdCB3YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgTW9uZXJvTmV0d29ya1R5cGUuVEVTVE5FVCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0TmV0d29ya1R5cGUoKSwgYXdhaXQgTW9uZXJvTmV0d29ya1R5cGUuVEVTVE5FVCk7XG4gICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpKTtcbiAgICAgICAgYXNzZXJ0KChhd2FpdCB0aGF0LmRhZW1vbi5nZXRScGNDb25uZWN0aW9uKCkpLmdldENvbmZpZygpICE9PSAoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0Q29uZmlnKCkpOyAgICAgICAgIC8vIG5vdCBzYW1lIHJlZmVyZW5jZVxuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldFVyaSgpLCAoYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpKS5nZXRVcmkoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0VXNlcm5hbWUoKSwgKGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSkuZ2V0VXNlcm5hbWUoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0UGFzc3dvcmQoKSwgKGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSkuZ2V0UGFzc3dvcmQoKSk7XG4gICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuaXNDb25uZWN0ZWRUb0RhZW1vbigpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkTGFuZ3VhZ2UoKSwgXCJTcGFuaXNoXCIpO1xuICAgICAgICBhc3NlcnQoIShhd2FpdCB3YWxsZXQuaXNTeW5jZWQoKSkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCAxKTsgLy8gVE9ETyBtb25lcm8tcHJvamVjdDogd2h5IGlzIGhlaWdodCBvZiB1bnN5bmNlZCB3YWxsZXQgMT9cbiAgICAgICAgaWYgKGF3YWl0IHRoYXQuZGFlbW9uLmlzQ29ubmVjdGVkKCkpIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UmVzdG9yZUhlaWdodCgpLCBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSk7XG4gICAgICAgIGVsc2UgYXNzZXJ0KGF3YWl0IHdhbGxldC5nZXRSZXN0b3JlSGVpZ2h0KCkgPj0gMCk7XG4gICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBjcmVhdGUgYSBmdWxsIHdhbGxldCBmcm9tIHNlZWRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGUgdW5jb25uZWN0ZWQgd2FsbGV0IHdpdGggbW5lbW9uaWNcbiAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtzZWVkOiBUZXN0VXRpbHMuU0VFRCwgc2VydmVyOiBUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJfSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZCgpLCBUZXN0VXRpbHMuU0VFRCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgVGVzdFV0aWxzLkFERFJFU1MpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldE5ldHdvcmtUeXBlKCksIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCksIG5ldyBNb25lcm9ScGNDb25uZWN0aW9uKFRlc3RVdGlscy5PRkZMSU5FX1NFUlZFUl9VUkkpKTtcbiAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWRMYW5ndWFnZSgpLCBcIkVuZ2xpc2hcIik7XG4gICAgICAgIGFzc2VydCghKGF3YWl0IHdhbGxldC5pc1N5bmNlZCgpKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCksIDEpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSwgMCk7XG4gICAgICAgIHRyeSB7IGF3YWl0IHdhbGxldC5zdGFydFN5bmNpbmcoKTsgfSBjYXRjaCAoZTogYW55KSB7IGFzc2VydC5lcXVhbChlLm1lc3NhZ2UsIFwiV2FsbGV0IGlzIG5vdCBjb25uZWN0ZWQgdG8gZGFlbW9uXCIpOyB9XG4gICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIHdhbGxldCB3aXRob3V0IHJlc3RvcmUgaGVpZ2h0XG4gICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtzZWVkOiBUZXN0VXRpbHMuU0VFRH0sIGZhbHNlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkKCksIFRlc3RVdGlscy5TRUVEKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBUZXN0VXRpbHMuQUREUkVTUyk7XG4gICAgICAgIGFzc2VydC5lcXVhbChUZXN0VXRpbHMuTkVUV09SS19UWVBFLCBhd2FpdCB3YWxsZXQuZ2V0TmV0d29ya1R5cGUoKSk7XG4gICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpKTtcbiAgICAgICAgYXNzZXJ0KGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSAhPSBhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpKS5nZXRVcmkoKSwgKGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSkuZ2V0VXJpKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldFVzZXJuYW1lKCksIChhd2FpdCB0aGF0LmRhZW1vbi5nZXRScGNDb25uZWN0aW9uKCkpLmdldFVzZXJuYW1lKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldFBhc3N3b3JkKCksIChhd2FpdCB0aGF0LmRhZW1vbi5nZXRScGNDb25uZWN0aW9uKCkpLmdldFBhc3N3b3JkKCkpO1xuICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZExhbmd1YWdlKCksIFwiRW5nbGlzaFwiKTtcbiAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0LmlzU3luY2VkKCkpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRIZWlnaHQoKSwgMSk7IC8vIFRPRE8gbW9uZXJvLXByb2plY3Q6IHdoeSBkb2VzIGhlaWdodCBvZiBuZXcgdW5zeW5jZWQgd2FsbGV0IHN0YXJ0IGF0IDE/XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UmVzdG9yZUhlaWdodCgpLCAwKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGUgd2FsbGV0IHdpdGggc2VlZCwgbm8gY29ubmVjdGlvbiwgYW5kIHJlc3RvcmUgaGVpZ2h0XG4gICAgICAgIGxldCByZXN0b3JlSGVpZ2h0ID0gMTAwMDA7XG4gICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtzZWVkOiBUZXN0VXRpbHMuU0VFRCwgcmVzdG9yZUhlaWdodDogcmVzdG9yZUhlaWdodCwgc2VydmVyOiBUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJfSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZCgpLCBUZXN0VXRpbHMuU0VFRCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgVGVzdFV0aWxzLkFERFJFU1MpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldE5ldHdvcmtUeXBlKCksIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCksIG5ldyBNb25lcm9ScGNDb25uZWN0aW9uKFRlc3RVdGlscy5PRkZMSU5FX1NFUlZFUl9VUkkpKTtcbiAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWRMYW5ndWFnZSgpLCBcIkVuZ2xpc2hcIik7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCksIDEpOyAvLyBUT0RPIG1vbmVyby1wcm9qZWN0OiB3aHkgZG9lcyBoZWlnaHQgb2YgbmV3IHVuc3luY2VkIHdhbGxldCBzdGFydCBhdCAxP1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSwgcmVzdG9yZUhlaWdodCk7XG4gICAgICAgIGxldCBwYXRoID0gYXdhaXQgd2FsbGV0LmdldFBhdGgoKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKHRydWUpO1xuICAgICAgICB3YWxsZXQgPSBhd2FpdCB0aGF0Lm9wZW5XYWxsZXQoe3BhdGg6IHBhdGgsIHNlcnZlcjogVGVzdFV0aWxzLk9GRkxJTkVfU0VSVkVSX1VSSX0pO1xuICAgICAgICBhc3NlcnQoIShhd2FpdCB3YWxsZXQuaXNDb25uZWN0ZWRUb0RhZW1vbigpKSk7XG4gICAgICAgIGFzc2VydCghKGF3YWl0IHdhbGxldC5pc1N5bmNlZCgpKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCksIDEpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSwgcmVzdG9yZUhlaWdodCk7XG4gICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSB3YWxsZXQgd2l0aCBzZWVkLCBjb25uZWN0aW9uLCBhbmQgcmVzdG9yZSBoZWlnaHRcbiAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3NlZWQ6IFRlc3RVdGlscy5TRUVELCByZXN0b3JlSGVpZ2h0OiByZXN0b3JlSGVpZ2h0fSwgZmFsc2UpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSwgVGVzdFV0aWxzLlNFRUQpO1xuICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIFRlc3RVdGlscy5BRERSRVNTKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXROZXR3b3JrVHlwZSgpLCBUZXN0VXRpbHMuTkVUV09SS19UWVBFKTtcbiAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpO1xuICAgICAgICBhc3NlcnQoYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpICE9IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldFVyaSgpLCAoYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpKS5nZXRVcmkoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0VXNlcm5hbWUoKSwgKGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSkuZ2V0VXNlcm5hbWUoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0UGFzc3dvcmQoKSwgKGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSkuZ2V0UGFzc3dvcmQoKSk7XG4gICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuaXNDb25uZWN0ZWRUb0RhZW1vbigpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkTGFuZ3VhZ2UoKSwgXCJFbmdsaXNoXCIpO1xuICAgICAgICBhc3NlcnQoIShhd2FpdCB3YWxsZXQuaXNTeW5jZWQoKSkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCAxKTsgLy8gVE9ETyBtb25lcm8tcHJvamVjdDogd2h5IGRvZXMgaGVpZ2h0IG9mIG5ldyB1bnN5bmNlZCB3YWxsZXQgc3RhcnQgYXQgMT9cbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRSZXN0b3JlSGVpZ2h0KCksIHJlc3RvcmVIZWlnaHQpO1xuICAgICAgICBhd2FpdCB3YWxsZXQuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gY3JlYXRlIGEgZnVsbCB3YWxsZXQgZnJvbSBrZXlzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gcmVjcmVhdGUgdGVzdCB3YWxsZXQgZnJvbSBrZXlzXG4gICAgICAgIGxldCB3YWxsZXQgPSB0aGF0LndhbGxldDtcbiAgICAgICAgbGV0IHdhbGxldEtleXMgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7c2VydmVyOiBUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJLCBuZXR3b3JrVHlwZTogYXdhaXQgKHdhbGxldCBhcyBNb25lcm9XYWxsZXRGdWxsKS5nZXROZXR3b3JrVHlwZSgpLCBwcmltYXJ5QWRkcmVzczogYXdhaXQgd2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIHByaXZhdGVWaWV3S2V5OiBhd2FpdCB3YWxsZXQuZ2V0UHJpdmF0ZVZpZXdLZXkoKSwgcHJpdmF0ZVNwZW5kS2V5OiBhd2FpdCB3YWxsZXQuZ2V0UHJpdmF0ZVNwZW5kS2V5KCksIHJlc3RvcmVIZWlnaHQ6IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVH0pO1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXRLZXlzLmdldFNlZWQoKSwgYXdhaXQgd2FsbGV0LmdldFNlZWQoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldEtleXMuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgYXdhaXQgd2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXRLZXlzLmdldFByaXZhdGVWaWV3S2V5KCksIGF3YWl0IHdhbGxldC5nZXRQcml2YXRlVmlld0tleSgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0S2V5cy5nZXRQdWJsaWNWaWV3S2V5KCksIGF3YWl0IHdhbGxldC5nZXRQdWJsaWNWaWV3S2V5KCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXRLZXlzLmdldFByaXZhdGVTcGVuZEtleSgpLCBhd2FpdCB3YWxsZXQuZ2V0UHJpdmF0ZVNwZW5kS2V5KCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXRLZXlzLmdldFB1YmxpY1NwZW5kS2V5KCksIGF3YWl0IHdhbGxldC5nZXRQdWJsaWNTcGVuZEtleSgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0S2V5cy5nZXRSZXN0b3JlSGVpZ2h0KCksIFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCk7XG4gICAgICAgICAgYXNzZXJ0KCFhd2FpdCB3YWxsZXRLZXlzLmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0S2V5cy5pc1N5bmNlZCgpKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHdhbGxldEtleXMuY2xvc2UoKTtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgJiYgIUdlblV0aWxzLmlzQnJvd3NlcigpKVxuICAgICAgaXQoXCJJcyBjb21wYXRpYmxlIHdpdGggbW9uZXJvLXdhbGxldC1ycGMgd2FsbGV0IGZpbGVzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIHdhbGxldCB1c2luZyBtb25lcm8td2FsbGV0LXJwY1xuICAgICAgICBsZXQgd2FsbGV0TmFtZSA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgbGV0IHdhbGxldFJwYyA9IGF3YWl0IFRlc3RVdGlscy5nZXRXYWxsZXRScGMoKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0UnBjLmNyZWF0ZVdhbGxldChuZXcgTW9uZXJvV2FsbGV0Q29uZmlnKCkuc2V0UGF0aCh3YWxsZXROYW1lKS5zZXRQYXNzd29yZChUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKS5zZXRTZWVkKFRlc3RVdGlscy5TRUVEKS5zZXRSZXN0b3JlSGVpZ2h0KFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCkpO1xuICAgICAgICBhd2FpdCB3YWxsZXRScGMuc3luYygpO1xuICAgICAgICBsZXQgYmFsYW5jZSA9IGF3YWl0IHdhbGxldFJwYy5nZXRCYWxhbmNlKCk7XG4gICAgICAgIGxldCBvdXRwdXRzSGV4ID0gYXdhaXQgd2FsbGV0UnBjLmV4cG9ydE91dHB1dHMoKTtcbiAgICAgICAgYXNzZXJ0KG91dHB1dHNIZXgubGVuZ3RoID4gMCk7XG4gICAgICAgIGF3YWl0IHdhbGxldFJwYy5jbG9zZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIG9wZW4gYXMgZnVsbCB3YWxsZXRcbiAgICAgICAgbGV0IHdhbGxldEZ1bGwgPSBhd2FpdCBvcGVuV2FsbGV0RnVsbChuZXcgTW9uZXJvV2FsbGV0Q29uZmlnKCkuc2V0UGF0aChUZXN0VXRpbHMuV0FMTEVUX1JQQ19MT0NBTF9XQUxMRVRfRElSICsgXCIvXCIgKyB3YWxsZXROYW1lKS5zZXRQYXNzd29yZChUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKS5zZXROZXR3b3JrVHlwZShUZXN0VXRpbHMuTkVUV09SS19UWVBFKS5zZXRTZXJ2ZXIoVGVzdFV0aWxzLkRBRU1PTl9SUENfQ09ORklHKSk7XG4gICAgICAgIGF3YWl0IHdhbGxldEZ1bGwuc3luYygpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoVGVzdFV0aWxzLlNFRUQsIGF3YWl0IHdhbGxldEZ1bGwuZ2V0U2VlZCgpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKFRlc3RVdGlscy5BRERSRVNTLCBhd2FpdCB3YWxsZXRGdWxsLmdldFByaW1hcnlBZGRyZXNzKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYmFsYW5jZS50b1N0cmluZygpLCAoYXdhaXQgd2FsbGV0RnVsbC5nZXRCYWxhbmNlKCkpLnRvU3RyaW5nKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0c0hleC5sZW5ndGgsIChhd2FpdCB3YWxsZXRGdWxsLmV4cG9ydE91dHB1dHMoKSkubGVuZ3RoKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0RnVsbC5jbG9zZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSBmdWxsIHdhbGxldFxuICAgICAgICB3YWxsZXROYW1lID0gR2VuVXRpbHMuZ2V0VVVJRCgpO1xuICAgICAgICBsZXQgcGF0aCA9IFRlc3RVdGlscy5XQUxMRVRfUlBDX0xPQ0FMX1dBTExFVF9ESVIgKyBcIi9cIiArIHdhbGxldE5hbWU7XG4gICAgICAgIHdhbGxldEZ1bGwgPSBhd2FpdCBjcmVhdGVXYWxsZXRGdWxsKG5ldyBNb25lcm9XYWxsZXRDb25maWcoKS5zZXRQYXRoKHBhdGgpLnNldFBhc3N3b3JkKFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQpLnNldE5ldHdvcmtUeXBlKFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpLnNldFNlZWQoVGVzdFV0aWxzLlNFRUQpLnNldFJlc3RvcmVIZWlnaHQoVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hUKS5zZXRTZXJ2ZXIoVGVzdFV0aWxzLkRBRU1PTl9SUENfQ09ORklHKSk7XG4gICAgICAgIGF3YWl0IHdhbGxldEZ1bGwuc3luYygpO1xuICAgICAgICBiYWxhbmNlID0gYXdhaXQgd2FsbGV0RnVsbC5nZXRCYWxhbmNlKCk7XG4gICAgICAgIG91dHB1dHNIZXggPSBhd2FpdCB3YWxsZXRGdWxsLmV4cG9ydE91dHB1dHMoKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0RnVsbC5jbG9zZSh0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlYnVpbGQgd2FsbGV0IGNhY2hlIHVzaW5nIGZ1bGwgd2FsbGV0XG4gICAgICAgIChhd2FpdCBUZXN0VXRpbHMuZ2V0RGVmYXVsdEZzKCkpLnVubGlua1N5bmMocGF0aCk7XG4gICAgICAgIHdhbGxldEZ1bGwgPSBhd2FpdCBvcGVuV2FsbGV0RnVsbChuZXcgTW9uZXJvV2FsbGV0Q29uZmlnKCkuc2V0UGF0aChwYXRoKS5zZXRQYXNzd29yZChUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKS5zZXROZXR3b3JrVHlwZShUZXN0VXRpbHMuTkVUV09SS19UWVBFKS5zZXRTZXJ2ZXIoVGVzdFV0aWxzLkRBRU1PTl9SUENfQ09ORklHKSk7XG4gICAgICAgIGF3YWl0IHdhbGxldEZ1bGwuY2xvc2UodHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBvcGVuIHdhbGxldCB1c2luZyBtb25lcm8td2FsbGV0LXJwY1xuICAgICAgICBhd2FpdCB3YWxsZXRScGMub3BlbldhbGxldChuZXcgTW9uZXJvV2FsbGV0Q29uZmlnKCkuc2V0UGF0aCh3YWxsZXROYW1lKS5zZXRQYXNzd29yZChUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKSk7XG4gICAgICAgIGF3YWl0IHdhbGxldFJwYy5zeW5jKCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChUZXN0VXRpbHMuU0VFRCwgYXdhaXQgd2FsbGV0UnBjLmdldFNlZWQoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChUZXN0VXRpbHMuQUREUkVTUywgYXdhaXQgd2FsbGV0UnBjLmdldFByaW1hcnlBZGRyZXNzKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYmFsYW5jZS50b1N0cmluZygpLCAoYXdhaXQgd2FsbGV0UnBjLmdldEJhbGFuY2UoKSkudG9TdHJpbmcoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChvdXRwdXRzSGV4Lmxlbmd0aCwgKGF3YWl0IHdhbGxldFJwYy5leHBvcnRPdXRwdXRzKCkpLmxlbmd0aCk7XG4gICAgICAgIGF3YWl0IHdhbGxldFJwYy5jbG9zZSh0cnVlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAoIXRlc3RDb25maWcubGl0ZU1vZGUgJiYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cyB8fCB0ZXN0Q29uZmlnLnRlc3RSZWxheXMpKVxuICAgICAgaXQoXCJJcyBjb21wYXRpYmxlIHdpdGggbW9uZXJvLXdhbGxldC1ycGMgb3V0cHV0cyBhbmQgb2ZmbGluZSB0cmFuc2FjdGlvbiBzaWduaW5nXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIHZpZXctb25seSB3YWxsZXQgaW4gd2FsbGV0IHJwYyBwcm9jZXNzXG4gICAgICAgIGxldCB2aWV3T25seVdhbGxldCA9IGF3YWl0IFRlc3RVdGlscy5zdGFydFdhbGxldFJwY1Byb2Nlc3MoKTtcbiAgICAgICAgYXdhaXQgdmlld09ubHlXYWxsZXQuY3JlYXRlV2FsbGV0KHtcbiAgICAgICAgICBwYXRoOiBHZW5VdGlscy5nZXRVVUlEKCksXG4gICAgICAgICAgcGFzc3dvcmQ6IFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQsXG4gICAgICAgICAgcHJpbWFyeUFkZHJlc3M6IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksXG4gICAgICAgICAgcHJpdmF0ZVZpZXdLZXk6IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaXZhdGVWaWV3S2V5KCksXG4gICAgICAgICAgcmVzdG9yZUhlaWdodDogVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hUXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB2aWV3T25seVdhbGxldC5zeW5jKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGUgb2ZmbGluZSBmdWxsIHdhbGxldFxuICAgICAgICBsZXQgb2ZmbGluZVdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtwcmltYXJ5QWRkcmVzczogYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgcHJpdmF0ZVZpZXdLZXk6IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaXZhdGVWaWV3S2V5KCksIHByaXZhdGVTcGVuZEtleTogYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpdmF0ZVNwZW5kS2V5KCksIHNlcnZlcjogVGVzdFV0aWxzLk9GRkxJTkVfU0VSVkVSX1VSSSwgcmVzdG9yZUhlaWdodDogMH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB0eCBzaWduaW5nIHdpdGggd2FsbGV0c1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICB0cnkgeyBhd2FpdCB0aGF0LnRlc3RWaWV3T25seUFuZE9mZmxpbmVXYWxsZXRzKHZpZXdPbmx5V2FsbGV0LCBvZmZsaW5lV2FsbGV0KTsgfVxuICAgICAgICBjYXRjaCAoZSkgeyBlcnIgPSBlOyB9XG4gICAgICAgIFxuICAgICAgICAvLyBmaW5hbGx5XG4gICAgICAgIFRlc3RVdGlscy5zdG9wV2FsbGV0UnBjUHJvY2Vzcyh2aWV3T25seVdhbGxldCk7XG4gICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQob2ZmbGluZVdhbGxldCk7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAoIXRlc3RDb25maWcubGl0ZU1vZGUpXG4gICAgICBpdChcIklzIGNvbXBhdGlibGUgd2l0aCBtb25lcm8td2FsbGV0LXJwYyBtdWx0aXNpZyB3YWxsZXRzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIHBhcnRpY2lwYW50cyB3aXRoIG1vbmVyby13YWxsZXQtcnBjIGFuZCBmdWxsIHdhbGxldFxuICAgICAgICBsZXQgcGFydGljaXBhbnRzOiBNb25lcm9XYWxsZXRbXSA9IFtdO1xuICAgICAgICBwYXJ0aWNpcGFudHMucHVzaChhd2FpdCAoYXdhaXQgVGVzdFV0aWxzLnN0YXJ0V2FsbGV0UnBjUHJvY2VzcygpKS5jcmVhdGVXYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpLnNldFBhdGgoR2VuVXRpbHMuZ2V0VVVJRCgpKS5zZXRQYXNzd29yZChUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKSkpO1xuICAgICAgICBwYXJ0aWNpcGFudHMucHVzaChhd2FpdCAoYXdhaXQgVGVzdFV0aWxzLnN0YXJ0V2FsbGV0UnBjUHJvY2VzcygpKS5jcmVhdGVXYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpLnNldFBhdGgoR2VuVXRpbHMuZ2V0VVVJRCgpKS5zZXRQYXNzd29yZChUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKSkpO1xuICAgICAgICBwYXJ0aWNpcGFudHMucHVzaChhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldChuZXcgTW9uZXJvV2FsbGV0Q29uZmlnKCkpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgbXVsdGlzaWdcbiAgICAgICAgbGV0IGVycjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RNdWx0aXNpZ1BhcnRpY2lwYW50cyhwYXJ0aWNpcGFudHMsIDMsIDMsIHRydWUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gc3RvcCBtaW5pbmcgYXQgZW5kIG9mIHRlc3RcbiAgICAgICAgdHJ5IHsgYXdhaXQgdGhhdC5kYWVtb24uc3RvcE1pbmluZygpOyB9XG4gICAgICAgIGNhdGNoIChlKSB7IH1cbiAgICAgICAgXG4gICAgICAgIC8vIHNhdmUgYW5kIGNsb3NlIHBhcnRpY2lwYW50c1xuICAgICAgICBpZiAocGFydGljaXBhbnRzWzBdIGluc3RhbmNlb2YgTW9uZXJvV2FsbGV0UnBjKSBhd2FpdCBUZXN0VXRpbHMuc3RvcFdhbGxldFJwY1Byb2Nlc3MocGFydGljaXBhbnRzWzBdKTtcbiAgICAgICAgZWxzZSBwYXJ0aWNpcGFudHNbMF0uY2xvc2UodHJ1ZSk7IC8vIG11bHRpc2lnIHRlc3RzIG1pZ2h0IHJlc3RvcmUgd2FsbGV0IGZyb20gc2VlZFxuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuc3RvcFdhbGxldFJwY1Byb2Nlc3MocGFydGljaXBhbnRzWzFdKTtcbiAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldChwYXJ0aWNpcGFudHNbMl0sIHRydWUpO1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gVE9ETyBtb25lcm8tcHJvamVjdDogY2Fubm90IHJlLXN5bmMgZnJvbSBsb3dlciBibG9jayBoZWlnaHQgYWZ0ZXIgd2FsbGV0IHNhdmVkXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzICYmICF0ZXN0Q29uZmlnLmxpdGVNb2RlICYmIGZhbHNlKVxuICAgICAgaXQoXCJDYW4gcmUtc3luYyBhbiBleGlzdGluZyB3YWxsZXQgZnJvbSBzY3JhdGNoXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgd2FsbGV0ID0gYXdhaXQgdGhhdC5vcGVuV2FsbGV0KHtwYXRoOiBUZXN0VXRpbHMuV0FMTEVUX0ZVTExfUEFUSCwgcGFzc3dvcmQ6IFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQsIG5ldHdvcmtUeXBlOiBNb25lcm9OZXR3b3JrVHlwZS5URVNUTkVULCBzZXJ2ZXI6IFRlc3RVdGlscy5PRkZMSU5FX1NFUlZFUl9VUkl9LCB0cnVlKTsgIC8vIHdhbGxldCBtdXN0IGFscmVhZHkgZXhpc3RcbiAgICAgICAgYXdhaXQgd2FsbGV0LnNldERhZW1vbkNvbm5lY3Rpb24oVGVzdFV0aWxzLmdldERhZW1vblJwY0Nvbm5lY3Rpb24oKSk7XG4gICAgICAgIC8vbG9uZyBzdGFydEhlaWdodCA9IFRlc3RVdGlscy5URVNUX1JFU1RPUkVfSEVJR0hUO1xuICAgICAgICBsZXQgc3RhcnRIZWlnaHQgPSAwO1xuICAgICAgICBsZXQgcHJvZ3Jlc3NUZXN0ZXIgPSBuZXcgU3luY1Byb2dyZXNzVGVzdGVyKHdhbGxldCwgc3RhcnRIZWlnaHQsIGF3YWl0IHdhbGxldC5nZXREYWVtb25IZWlnaHQoKSk7XG4gICAgICAgIGF3YWl0IHdhbGxldC5zZXRSZXN0b3JlSGVpZ2h0KDEpO1xuICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgd2FsbGV0LnN5bmMocHJvZ3Jlc3NUZXN0ZXIsIDEpO1xuICAgICAgICBhd2FpdCBwcm9ncmVzc1Rlc3Rlci5vbkRvbmUoYXdhaXQgd2FsbGV0LmdldERhZW1vbkhlaWdodCgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgcmVzdWx0IGFmdGVyIHN5bmNpbmdcbiAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmlzU3luY2VkKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldE51bUJsb2Nrc0ZldGNoZWQoKSwgYXdhaXQgd2FsbGV0LmdldERhZW1vbkhlaWdodCgpIC0gc3RhcnRIZWlnaHQpO1xuICAgICAgICBhc3NlcnQocmVzdWx0LmdldFJlY2VpdmVkTW9uZXkoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCksIGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHN5bmMgYSB3YWxsZXQgd2l0aCBhIHJhbmRvbWx5IGdlbmVyYXRlZCBzZWVkXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhc3NlcnQoYXdhaXQgdGhhdC5kYWVtb24uaXNDb25uZWN0ZWQoKSwgXCJOb3QgY29ubmVjdGVkIHRvIGRhZW1vblwiKTtcblxuICAgICAgICAvLyBjcmVhdGUgdGVzdCB3YWxsZXRcbiAgICAgICAgbGV0IHJlc3RvcmVIZWlnaHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKTtcbiAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHt9LCBmYWxzZSk7XG5cbiAgICAgICAgLy8gdGVzdCB3YWxsZXQncyBoZWlnaHQgYmVmb3JlIHN5bmNpbmdcbiAgICAgICAgbGV0IHdhbGxldEd0O1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0VXJpKCksIChhd2FpdCB0aGF0LmRhZW1vbi5nZXRScGNDb25uZWN0aW9uKCkpLmdldFVyaSgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldFVzZXJuYW1lKCksIChhd2FpdCB0aGF0LmRhZW1vbi5nZXRScGNDb25uZWN0aW9uKCkpLmdldFVzZXJuYW1lKCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0UGFzc3dvcmQoKSwgKGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSkuZ2V0UGFzc3dvcmQoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXREYWVtb25IZWlnaHQoKSwgcmVzdG9yZUhlaWdodCk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuICAgICAgICAgIGFzc2VydCghKGF3YWl0IHdhbGxldC5pc1N5bmNlZCgpKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRIZWlnaHQoKSwgMSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRSZXN0b3JlSGVpZ2h0KCksIHJlc3RvcmVIZWlnaHQpO1xuICBcbiAgICAgICAgICAvLyBzeW5jIHRoZSB3YWxsZXRcbiAgICAgICAgICBsZXQgcHJvZ3Jlc3NUZXN0ZXIgPSBuZXcgU3luY1Byb2dyZXNzVGVzdGVyKHdhbGxldCwgYXdhaXQgd2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSwgYXdhaXQgd2FsbGV0LmdldERhZW1vbkhlaWdodCgpKTtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgd2FsbGV0LnN5bmMocHJvZ3Jlc3NUZXN0ZXIsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgYXdhaXQgcHJvZ3Jlc3NUZXN0ZXIub25Eb25lKGF3YWl0IHdhbGxldC5nZXREYWVtb25IZWlnaHQoKSk7XG4gICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgcmVzdWx0IGFmdGVyIHN5bmNpbmdcbiAgICAgICAgICB3YWxsZXRHdCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtzZWVkOiBhd2FpdCB3YWxsZXQuZ2V0U2VlZCgpLCByZXN0b3JlSGVpZ2h0OiByZXN0b3JlSGVpZ2h0fSk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0R3Quc3luYygpO1xuICAgICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuaXNDb25uZWN0ZWRUb0RhZW1vbigpKTtcbiAgICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmlzU3luY2VkKCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0TnVtQmxvY2tzRmV0Y2hlZCgpLCAwKTtcbiAgICAgICAgICBhc3NlcnQoIXJlc3VsdC5nZXRSZWNlaXZlZE1vbmV5KCkpO1xuICAgICAgICAgIGlmIChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCkgIT09IGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpKSBjb25zb2xlLmxvZyhcIldBUk5JTkc6IHdhbGxldCBoZWlnaHQgXCIgKyBhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCkgKyBcIiBpcyBub3Qgc3luY2VkIHdpdGggZGFlbW9uIGhlaWdodCBcIiArIGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpKTsgIC8vIFRPRE86IGhlaWdodCBtYXkgbm90IGJlIHNhbWUgYWZ0ZXIgbG9uZyBzeW5jXG5cbiAgICAgICAgICAvLyBzeW5jIHRoZSB3YWxsZXQgd2l0aCBkZWZhdWx0IHBhcmFtc1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zeW5jKCk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc1N5bmNlZCgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY29tcGFyZSB3YWxsZXQgdG8gZ3JvdW5kIHRydXRoXG4gICAgICAgICAgYXdhaXQgVGVzdE1vbmVyb1dhbGxldEZ1bGwudGVzdFdhbGxldEVxdWFsaXR5T25DaGFpbih3YWxsZXRHdCwgd2FsbGV0KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGVyciA9IGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGZpbmFsbHkgXG4gICAgICAgIGlmICh3YWxsZXRHdCkgYXdhaXQgd2FsbGV0R3QuY2xvc2UoKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKCk7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgICAgXG4gICAgICAgIC8vIGF0dGVtcHQgdG8gc3luYyB1bmNvbm5lY3RlZCB3YWxsZXRcbiAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3NlcnZlcjogVGVzdFV0aWxzLk9GRkxJTkVfU0VSVkVSX1VSSX0pO1xuICAgICAgICBlcnIgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnN5bmMoKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXhjZXB0aW9uXCIpO1xuICAgICAgICB9IGNhdGNoIChlMTogYW55KSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChlMS5tZXNzYWdlLCBcIldhbGxldCBpcyBub3QgY29ubmVjdGVkIHRvIGRhZW1vblwiKTtcbiAgICAgICAgICB9IGNhdGNoIChlMikge1xuICAgICAgICAgICAgZXJyID0gZTI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmaW5hbGx5XG4gICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKGZhbHNlICYmIHRlc3RDb25maWcudGVzdE5vblJlbGF5cyAmJiAhdGVzdENvbmZpZy5saXRlTW9kZSkgLy8gVE9ETzogcmUtZW5hYmxlIGJlZm9yZSByZWxlYXNlXG4gICAgICBpdChcIkNhbiBzeW5jIGEgd2FsbGV0IGNyZWF0ZWQgZnJvbSBzZWVkIGZyb20gdGhlIGdlbmVzaXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RTeW5jU2VlZCh1bmRlZmluZWQsIHVuZGVmaW5lZCwgdHJ1ZSwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBzeW5jIGEgd2FsbGV0IGNyZWF0ZWQgZnJvbSBzZWVkIGZyb20gYSByZXN0b3JlIGhlaWdodFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgdGVzdFN5bmNTZWVkKHVuZGVmaW5lZCwgVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hUKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzICYmICF0ZXN0Q29uZmlnLmxpdGVNb2RlKVxuICAgICAgaXQoXCJDYW4gc3luYyBhIHdhbGxldCBjcmVhdGVkIGZyb20gc2VlZCBmcm9tIGEgc3RhcnQgaGVpZ2h0LlwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgdGVzdFN5bmNTZWVkKFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCwgdW5kZWZpbmVkLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cyAmJiAhdGVzdENvbmZpZy5saXRlTW9kZSlcbiAgICAgIGl0KFwiQ2FuIHN5bmMgYSB3YWxsZXQgY3JlYXRlZCBmcm9tIHNlZWQgZnJvbSBhIHN0YXJ0IGhlaWdodCBsZXNzIHRoYW4gdGhlIHJlc3RvcmUgaGVpZ2h0XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhd2FpdCB0ZXN0U3luY1NlZWQoVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hULCBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQgKyAzKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzICYmICF0ZXN0Q29uZmlnLmxpdGVNb2RlKVxuICAgICAgaXQoXCJDYW4gc3luYyBhIHdhbGxldCBjcmVhdGVkIGZyb20gc2VlZCBmcm9tIGEgc3RhcnQgaGVpZ2h0IGdyZWF0ZXIgdGhhbiB0aGUgcmVzdG9yZSBoZWlnaHRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RTeW5jU2VlZChUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQgKyAzLCBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGFzeW5jIGZ1bmN0aW9uIHRlc3RTeW5jU2VlZChzdGFydEhlaWdodCwgcmVzdG9yZUhlaWdodD8sIHNraXBHdENvbXBhcmlzb24/LCB0ZXN0UG9zdFN5bmNOb3RpZmljYXRpb25zPykge1xuICAgICAgICBhc3NlcnQoYXdhaXQgdGhhdC5kYWVtb24uaXNDb25uZWN0ZWQoKSwgXCJOb3QgY29ubmVjdGVkIHRvIGRhZW1vblwiKTtcbiAgICAgICAgaWYgKHN0YXJ0SGVpZ2h0ICE9PSB1bmRlZmluZWQgJiYgcmVzdG9yZUhlaWdodCAhPSB1bmRlZmluZWQpIGFzc2VydChzdGFydEhlaWdodCA8PSBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQgfHwgcmVzdG9yZUhlaWdodCA8PSBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQpO1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIHdhbGxldCBmcm9tIHNlZWRcbiAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtzZWVkOiBUZXN0VXRpbHMuU0VFRCwgcmVzdG9yZUhlaWdodDogcmVzdG9yZUhlaWdodH0sIGZhbHNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHNhbml0aXplIGV4cGVjdGVkIHN5bmMgYm91bmRzXG4gICAgICAgIGlmIChyZXN0b3JlSGVpZ2h0ID09PSB1bmRlZmluZWQpIHJlc3RvcmVIZWlnaHQgPSAwO1xuICAgICAgICBsZXQgc3RhcnRIZWlnaHRFeHBlY3RlZCA9IHN0YXJ0SGVpZ2h0ID09PSB1bmRlZmluZWQgPyByZXN0b3JlSGVpZ2h0IDogc3RhcnRIZWlnaHQ7XG4gICAgICAgIGlmIChzdGFydEhlaWdodEV4cGVjdGVkID09PSAwKSBzdGFydEhlaWdodEV4cGVjdGVkID0gMTtcbiAgICAgICAgbGV0IGVuZEhlaWdodEV4cGVjdGVkID0gYXdhaXQgd2FsbGV0LmdldERhZW1vbk1heFBlZXJIZWlnaHQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgd2FsbGV0IGFuZCBjbG9zZSBhcyBmaW5hbCBzdGVwXG4gICAgICAgIGxldCB3YWxsZXRHdDogTW9uZXJvV2FsbGV0IHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgICBsZXQgZXJyID0gdW5kZWZpbmVkOyAgLy8gdG8gcGVybWl0IGZpbmFsIGNsZWFudXAgbGlrZSBKYXZhJ3MgdHJ5Li4uY2F0Y2guLi5maW5hbGx5XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCB3YWxsZXQncyBoZWlnaHQgYmVmb3JlIHN5bmNpbmdcbiAgICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0LmlzU3luY2VkKCkpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCAxKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSwgcmVzdG9yZUhlaWdodCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gcmVnaXN0ZXIgYSB3YWxsZXQgbGlzdGVuZXIgd2hpY2ggdGVzdHMgbm90aWZpY2F0aW9ucyB0aHJvdWdob3V0IHRoZSBzeW5jXG4gICAgICAgICAgbGV0IHdhbGxldFN5bmNUZXN0ZXIgPSBuZXcgV2FsbGV0U3luY1Rlc3Rlcih3YWxsZXQsIHN0YXJ0SGVpZ2h0RXhwZWN0ZWQsIGVuZEhlaWdodEV4cGVjdGVkKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuYWRkTGlzdGVuZXIod2FsbGV0U3luY1Rlc3Rlcik7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc3luYyB0aGUgd2FsbGV0IHdpdGggYSBsaXN0ZW5lciB3aGljaCB0ZXN0cyBzeW5jIG5vdGlmaWNhdGlvbnNcbiAgICAgICAgICBsZXQgcHJvZ3Jlc3NUZXN0ZXIgPSBuZXcgU3luY1Byb2dyZXNzVGVzdGVyKHdhbGxldCwgc3RhcnRIZWlnaHRFeHBlY3RlZCwgZW5kSGVpZ2h0RXhwZWN0ZWQpO1xuICAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCB3YWxsZXQuc3luYyhwcm9ncmVzc1Rlc3Rlciwgc3RhcnRIZWlnaHQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgY29tcGxldGlvbiBvZiB0aGUgd2FsbGV0IGFuZCBzeW5jIGxpc3RlbmVyc1xuICAgICAgICAgIGF3YWl0IHByb2dyZXNzVGVzdGVyLm9uRG9uZShhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uSGVpZ2h0KCkpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldFN5bmNUZXN0ZXIub25Eb25lKGF3YWl0IHdhbGxldC5nZXREYWVtb25IZWlnaHQoKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCByZXN1bHQgYWZ0ZXIgc3luY2luZ1xuICAgICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuaXNTeW5jZWQoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXROdW1CbG9ja3NGZXRjaGVkKCksIGF3YWl0IHdhbGxldC5nZXREYWVtb25IZWlnaHQoKSAtIHN0YXJ0SGVpZ2h0RXhwZWN0ZWQpO1xuICAgICAgICAgIGFzc2VydChyZXN1bHQuZ2V0UmVjZWl2ZWRNb25leSgpKTtcbiAgICAgICAgICBpZiAoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpICE9PSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSkgY29uc29sZS5sb2coXCJXQVJOSU5HOiB3YWxsZXQgaGVpZ2h0IFwiICsgYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpICsgXCIgaXMgbm90IHN5bmNlZCB3aXRoIGRhZW1vbiBoZWlnaHQgXCIgKyBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSk7ICAvLyBUT0RPOiBoZWlnaHQgbWF5IG5vdCBiZSBzYW1lIGFmdGVyIGxvbmcgc3luY1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uSGVpZ2h0KCksIGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpLCBcIkRhZW1vbiBoZWlnaHRzIGFyZSBub3QgZXF1YWw6IFwiICsgYXdhaXQgd2FsbGV0LmdldERhZW1vbkhlaWdodCgpICsgXCIgdnMgXCIgKyBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSk7XG4gICAgICAgICAgaWYgKHN0YXJ0SGVpZ2h0RXhwZWN0ZWQgPiBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQpIGFzc2VydCgoYXdhaXQgd2FsbGV0LmdldFR4cygpKVswXS5nZXRIZWlnaHQoKSA+IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCk7ICAvLyB3YWxsZXQgaXMgcGFydGlhbGx5IHN5bmNlZCBzbyBmaXJzdCB0eCBoYXBwZW5zIGFmdGVyIHRydWUgcmVzdG9yZSBoZWlnaHRcbiAgICAgICAgICBlbHNlIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldFR4cygpKVswXS5nZXRIZWlnaHQoKSwgVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hUKTsgIC8vIHdhbGxldCBzaG91bGQgYmUgZnVsbHkgc3luY2VkIHNvIGZpcnN0IHR4IGhhcHBlbnMgb24gdHJ1ZSByZXN0b3JlIGhlaWdodFxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHN5bmMgdGhlIHdhbGxldCB3aXRoIGRlZmF1bHQgcGFyYW1zXG4gICAgICAgICAgcmVzdWx0ID0gYXdhaXQgd2FsbGV0LnN5bmMoKTtcbiAgICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmlzU3luY2VkKCkpO1xuICAgICAgICAgIGlmIChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCkgIT09IGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpKSBjb25zb2xlLmxvZyhcIldBUk5JTkc6IHdhbGxldCBoZWlnaHQgXCIgKyBhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCkgKyBcIiBpcyBub3Qgc3luY2VkIHdpdGggZGFlbW9uIGhlaWdodCBcIiArIGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpICsgXCIgYWZ0ZXIgcmUtc3luY2luZ1wiKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldE51bUJsb2Nrc0ZldGNoZWQoKSwgMCk7XG4gICAgICAgICAgYXNzZXJ0KCFyZXN1bHQuZ2V0UmVjZWl2ZWRNb25leSgpKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBjb21wYXJlIHdpdGggZ3JvdW5kIHRydXRoXG4gICAgICAgICAgaWYgKCFza2lwR3RDb21wYXJpc29uKSB7XG4gICAgICAgICAgICB3YWxsZXRHdCA9IGF3YWl0IFRlc3RVdGlscy5jcmVhdGVXYWxsZXRHcm91bmRUcnV0aChUZXN0VXRpbHMuTkVUV09SS19UWVBFLCBhd2FpdCB3YWxsZXQuZ2V0U2VlZCgpLCBzdGFydEhlaWdodCwgcmVzdG9yZUhlaWdodCk7XG4gICAgICAgICAgICBhd2FpdCBUZXN0TW9uZXJvV2FsbGV0RnVsbC50ZXN0V2FsbGV0RXF1YWxpdHlPbkNoYWluKHdhbGxldEd0LCB3YWxsZXQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBpZiB0ZXN0aW5nIHBvc3Qtc3luYyBub3RpZmljYXRpb25zLCB3YWl0IGZvciBhIGJsb2NrIHRvIGJlIGFkZGVkIHRvIHRoZSBjaGFpblxuICAgICAgICAgIC8vIHRoZW4gdGVzdCB0aGF0IHN5bmMgYXJnIGxpc3RlbmVyIHdhcyBub3QgaW52b2tlZCBhbmQgcmVnaXN0ZXJlZCB3YWxsZXQgbGlzdGVuZXIgd2FzIGludm9rZWRcbiAgICAgICAgICBpZiAodGVzdFBvc3RTeW5jTm90aWZpY2F0aW9ucykge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBzdGFydCBhdXRvbWF0aWMgc3luY2luZ1xuICAgICAgICAgICAgYXdhaXQgd2FsbGV0LnN0YXJ0U3luY2luZyhUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBhdHRlbXB0IHRvIHN0YXJ0IG1pbmluZyB0byBwdXNoIHRoZSBuZXR3b3JrIGFsb25nICAvLyBUT0RPOiBUZXN0VXRpbHMudHJ5U3RhcnRNaW5pbmcoKSA6IHJlcUlkLCBUZXN0VXRpbHMudHJ5U3RvcE1pbmluZyhyZXFJZClcbiAgICAgICAgICAgIGxldCBzdGFydGVkTWluaW5nID0gZmFsc2U7XG4gICAgICAgICAgICBsZXQgbWluaW5nU3RhdHVzID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0TWluaW5nU3RhdHVzKCk7XG4gICAgICAgICAgICBpZiAoIW1pbmluZ1N0YXR1cy5nZXRJc0FjdGl2ZSgpKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgU3RhcnRNaW5pbmcuc3RhcnRNaW5pbmcoKTtcbiAgICAgICAgICAgICAgICBzdGFydGVkTWluaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIG5vIHByb2JsZW1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gd2FpdCBmb3IgYmxvY2tcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJXYWl0aW5nIGZvciBuZXh0IGJsb2NrIHRvIHRlc3QgcG9zdCBzeW5jIG5vdGlmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLndhaXRGb3JOZXh0QmxvY2tIZWFkZXIoKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIGVuc3VyZSB3YWxsZXQgaGFzIHRpbWUgdG8gZGV0ZWN0IG5ldyBibG9ja1xuICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7IHNldFRpbWVvdXQocmVzb2x2ZSwgVGVzdFV0aWxzLlNZTkNfUEVSSU9EX0lOX01TICsgMzAwMCk7IH0pOyAvLyBzbGVlcCBmb3Igd2FsbGV0IGludGVydmFsICsgdGltZSB0byBzeW5jXG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyB0ZXN0IHRoYXQgd2FsbGV0IGxpc3RlbmVyJ3Mgb25TeW5jUHJvZ3Jlc3MoKSBhbmQgb25OZXdCbG9jaygpIHdlcmUgaW52b2tlZCBhZnRlciBwcmV2aW91cyBjb21wbGV0aW9uXG4gICAgICAgICAgICAgIGFzc2VydCh3YWxsZXRTeW5jVGVzdGVyLmdldE9uU3luY1Byb2dyZXNzQWZ0ZXJEb25lKCkpO1xuICAgICAgICAgICAgICBhc3NlcnQod2FsbGV0U3luY1Rlc3Rlci5nZXRPbk5ld0Jsb2NrQWZ0ZXJEb25lKCkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBmaW5hbGx5XG4gICAgICAgICAgICBpZiAoc3RhcnRlZE1pbmluZykge1xuICAgICAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zdG9wTWluaW5nKCk7XG4gICAgICAgICAgICAgIC8vYXdhaXQgd2FsbGV0LnN0b3BNaW5pbmcoKTsgIC8vIFRPRE86IHN1cHBvcnQgY2xpZW50LXNpZGUgbWluaW5nP1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGVyciA9IGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGZpbmFsbHlcbiAgICAgICAgaWYgKHdhbGxldEd0ICE9PSB1bmRlZmluZWQpIGF3YWl0IHdhbGxldEd0LmNsb3NlKHRydWUpO1xuICAgICAgICBhd2FpdCB3YWxsZXQuY2xvc2UoKTtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc3luYyBhIHdhbGxldCBjcmVhdGVkIGZyb20ga2V5c1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlY3JlYXRlIHRlc3Qgd2FsbGV0IGZyb20ga2V5c1xuICAgICAgICBsZXQgd2FsbGV0S2V5cyA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtwcmltYXJ5QWRkcmVzczogYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgcHJpdmF0ZVZpZXdLZXk6IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaXZhdGVWaWV3S2V5KCksIHByaXZhdGVTcGVuZEtleTogYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpdmF0ZVNwZW5kS2V5KCksIHJlc3RvcmVIZWlnaHQ6IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVH0sIGZhbHNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSBncm91bmQgdHJ1dGggd2FsbGV0IGZvciBjb21wYXJpc29uXG4gICAgICAgIGxldCB3YWxsZXRHdCA9IGF3YWl0IFRlc3RVdGlscy5jcmVhdGVXYWxsZXRHcm91bmRUcnV0aChUZXN0VXRpbHMuTkVUV09SS19UWVBFLCBUZXN0VXRpbHMuU0VFRCwgdW5kZWZpbmVkLCBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB3YWxsZXQgYW5kIGNsb3NlIGFzIGZpbmFsIHN0ZXBcbiAgICAgICAgbGV0IGVycjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0S2V5cy5nZXRTZWVkKCksIGF3YWl0IHdhbGxldEd0LmdldFNlZWQoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldEtleXMuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgYXdhaXQgd2FsbGV0R3QuZ2V0UHJpbWFyeUFkZHJlc3MoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldEtleXMuZ2V0UHJpdmF0ZVZpZXdLZXkoKSwgYXdhaXQgd2FsbGV0R3QuZ2V0UHJpdmF0ZVZpZXdLZXkoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldEtleXMuZ2V0UHVibGljVmlld0tleSgpLCBhd2FpdCB3YWxsZXRHdC5nZXRQdWJsaWNWaWV3S2V5KCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXRLZXlzLmdldFByaXZhdGVTcGVuZEtleSgpLCBhd2FpdCB3YWxsZXRHdC5nZXRQcml2YXRlU3BlbmRLZXkoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldEtleXMuZ2V0UHVibGljU3BlbmRLZXkoKSwgYXdhaXQgd2FsbGV0R3QuZ2V0UHVibGljU3BlbmRLZXkoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldEtleXMuZ2V0UmVzdG9yZUhlaWdodCgpLCBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQpO1xuICAgICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXRLZXlzLmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0S2V5cy5pc1N5bmNlZCgpKSk7XG5cbiAgICAgICAgICAvLyBzeW5jIHRoZSB3YWxsZXRcbiAgICAgICAgICBsZXQgcHJvZ3Jlc3NUZXN0ZXIgPSBuZXcgU3luY1Byb2dyZXNzVGVzdGVyKHdhbGxldEtleXMsIFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCwgYXdhaXQgd2FsbGV0S2V5cy5nZXREYWVtb25NYXhQZWVySGVpZ2h0KCkpO1xuICAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCB3YWxsZXRLZXlzLnN5bmMocHJvZ3Jlc3NUZXN0ZXIpO1xuICAgICAgICAgIGF3YWl0IHByb2dyZXNzVGVzdGVyLm9uRG9uZShhd2FpdCB3YWxsZXRLZXlzLmdldERhZW1vbkhlaWdodCgpKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IHJlc3VsdCBhZnRlciBzeW5jaW5nXG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldEtleXMuaXNTeW5jZWQoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXROdW1CbG9ja3NGZXRjaGVkKCksIGF3YWl0IHdhbGxldEtleXMuZ2V0RGFlbW9uSGVpZ2h0KCkgLSBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQpO1xuICAgICAgICAgIGFzc2VydChyZXN1bHQuZ2V0UmVjZWl2ZWRNb25leSgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0S2V5cy5nZXRIZWlnaHQoKSwgYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXRLZXlzLmdldERhZW1vbkhlaWdodCgpLCBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB3YWxsZXRLZXlzLmdldFR4cygpKVswXS5nZXRIZWlnaHQoKSwgVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hUKTsgIC8vIHdhbGxldCBzaG91bGQgYmUgZnVsbHkgc3luY2VkIHNvIGZpcnN0IHR4IGhhcHBlbnMgb24gdHJ1ZSByZXN0b3JlIGhlaWdodFxuICAgICAgICAgIFxuICAgICAgICAgIC8vIGNvbXBhcmUgd2l0aCBncm91bmQgdHJ1dGhcbiAgICAgICAgICBhd2FpdCBUZXN0TW9uZXJvV2FsbGV0RnVsbC50ZXN0V2FsbGV0RXF1YWxpdHlPbkNoYWluKHdhbGxldEd0LCB3YWxsZXRLZXlzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGVyciA9IGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGZpbmFsbHlcbiAgICAgICAgYXdhaXQgd2FsbGV0R3QuY2xvc2UodHJ1ZSk7XG4gICAgICAgIGF3YWl0IHdhbGxldEtleXMuY2xvc2UoKTtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIFRPRE86IHRlc3Qgc3RhcnQgc3luY2luZywgbm90aWZpY2F0aW9uIG9mIHN5bmNzIGhhcHBlbmluZywgc3RvcCBzeW5jaW5nLCBubyBub3RpZmljYXRpb25zLCBldGNcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBzdGFydCBhbmQgc3RvcCBzeW5jaW5nXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB1bmNvbm5lY3RlZCB3YWxsZXRcbiAgICAgICAgbGV0IGVycjsgIC8vIHVzZWQgdG8gZW11bGF0ZSBKYXZhJ3MgdHJ5Li4uY2F0Y2guLi5maW5hbGx5XG4gICAgICAgIGxldCBwYXRoID0gVGVzdE1vbmVyb1dhbGxldEZ1bGwuZ2V0UmFuZG9tV2FsbGV0UGF0aCgpO1xuICAgICAgICBsZXQgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3BhdGg6IHBhdGgsIHBhc3N3b3JkOiBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JELCBuZXR3b3JrVHlwZTogVGVzdFV0aWxzLk5FVFdPUktfVFlQRSwgc2VydmVyOiBUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJfSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkKCksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRIZWlnaHQoKSwgMSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRCYWxhbmNlKCksIDBuKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc3RhcnRTeW5jaW5nKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUxOiBhbnkpIHsgIC8vIGZpcnN0IGVycm9yIGlzIGV4cGVjdGVkXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChlMS5tZXNzYWdlLCBcIldhbGxldCBpcyBub3QgY29ubmVjdGVkIHRvIGRhZW1vblwiKTtcbiAgICAgICAgICB9IGNhdGNoIChlMikge1xuICAgICAgICAgICAgZXJyID0gZTI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmaW5hbGx5XG4gICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGNvbm5lY3Rpbmcgd2FsbGV0XG4gICAgICAgIHBhdGggPSBUZXN0TW9uZXJvV2FsbGV0RnVsbC5nZXRSYW5kb21XYWxsZXRQYXRoKCk7XG4gICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtwYXRoOiBwYXRoLCBwYXNzd29yZDogVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCwgbmV0d29ya1R5cGU6IFRlc3RVdGlscy5ORVRXT1JLX1RZUEUsIHNlcnZlcjogVGVzdFV0aWxzLk9GRkxJTkVfU0VSVkVSX1VSSX0pO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGFzc2VydC5ub3RFcXVhbCh3YWxsZXQuZ2V0U2VlZCgpLCB1bmRlZmluZWQpO1xuICAgICAgICAgIGFzc2VydCghYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnNldERhZW1vbkNvbm5lY3Rpb24oYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCAxKTtcbiAgICAgICAgICBhc3NlcnQoIWF3YWl0IHdhbGxldC5pc1N5bmNlZCgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEJhbGFuY2UoKSwgMG4pO1xuICAgICAgICAgIGxldCBjaGFpbkhlaWdodCA9IGF3YWl0IHdhbGxldC5nZXREYWVtb25IZWlnaHQoKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2V0UmVzdG9yZUhlaWdodChjaGFpbkhlaWdodCAtIDMpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zdGFydFN5bmNpbmcoKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSwgY2hhaW5IZWlnaHQgLSAzKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldFVyaSgpLCAoYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpKS5nZXRVcmkoKSk7IC8vIFRPRE86IHJlcGxhY2Ugd2l0aCBjb25maWcgY29tcGFyaXNvblxuICAgICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0VXNlcm5hbWUoKSwgKGF3YWl0IHRoYXQuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSkuZ2V0VXNlcm5hbWUoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpKS5nZXRQYXNzd29yZCgpLCAoYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpKS5nZXRQYXNzd29yZCgpKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc3RvcFN5bmNpbmcoKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc3luYygpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zdG9wU3luY2luZygpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zdG9wU3luY2luZygpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZmluYWxseVxuICAgICAgICBhd2FpdCB3YWxsZXQuY2xvc2UoKTtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB0aGF0IHN5bmMgc3RhcnRzIGF1dG9tYXRpY2FsbHlcbiAgICAgICAgbGV0IHJlc3RvcmVIZWlnaHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSAtIDEwMDtcbiAgICAgICAgcGF0aCA9IFRlc3RNb25lcm9XYWxsZXRGdWxsLmdldFJhbmRvbVdhbGxldFBhdGgoKTtcbiAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3BhdGg6IHBhdGgsIHBhc3N3b3JkOiBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JELCBuZXR3b3JrVHlwZTogVGVzdFV0aWxzLk5FVFdPUktfVFlQRSwgc2VlZDogVGVzdFV0aWxzLlNFRUQsIHNlcnZlcjogYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpLCByZXN0b3JlSGVpZ2h0OiByZXN0b3JlSGVpZ2h0fSwgZmFsc2UpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHN0YXJ0IHN5bmNpbmdcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCAxKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFJlc3RvcmVIZWlnaHQoKSwgcmVzdG9yZUhlaWdodCk7XG4gICAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0LmlzU3luY2VkKCkpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEJhbGFuY2UoKSwgQmlnSW50KDApKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc3RhcnRTeW5jaW5nKFRlc3RVdGlscy5TWU5DX1BFUklPRF9JTl9NUyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gcGF1c2UgZm9yIHN5bmMgdG8gc3RhcnRcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7IHNldFRpbWVvdXQocmVzb2x2ZSwgVGVzdFV0aWxzLlNZTkNfUEVSSU9EX0lOX01TICsgMTAwMCk7IH0pOyAvLyBpbiBtc1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgdGhhdCB3YWxsZXQgaGFzIHN0YXJ0ZWQgc3luY2luZ1xuICAgICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCkgPiAxKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzdG9wIHN5bmNpbmdcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc3RvcFN5bmNpbmcoKTtcbiAgICAgICAgICBcbiAgICAgICAvLyBUT0RPIG1vbmVyby1wcm9qZWN0OiB3YWxsZXQuY3BwIG1fc3luY2hyb25pemVkIG9ubHkgZXZlciBzZXQgdG8gdHJ1ZSwgbmV2ZXIgZmFsc2Vcbi8vICAgICAgICAgIC8vIHdhaXQgZm9yIGJsb2NrIHRvIGJlIGFkZGVkIHRvIGNoYWluXG4vLyAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi53YWl0Rm9yTmV4dEJsb2NrSGVhZGVyKCk7XG4vLyAgICAgICAgICBcbi8vICAgICAgICAgIC8vIHdhbGxldCBpcyBubyBsb25nZXIgc3luY2VkXG4vLyAgICAgICAgICBhc3NlcnQoIShhd2FpdCB3YWxsZXQuaXNTeW5jZWQoKSkpOyAgXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIC8vIGZpbmFsbHlcbiAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKCk7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJEb2VzIG5vdCBpbnRlcmZlcmUgd2l0aCBvdGhlciB3YWxsZXQgbm90aWZpY2F0aW9uc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSAyIHdhbGxldHMgd2l0aCBhIHJlY2VudCByZXN0b3JlIGhlaWdodFxuICAgICAgICBsZXQgaGVpZ2h0ID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCk7XG4gICAgICAgIGxldCByZXN0b3JlSGVpZ2h0ID0gaGVpZ2h0IC0gNTtcbiAgICAgICAgbGV0IHdhbGxldDEgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7c2VlZDogVGVzdFV0aWxzLlNFRUQsIHJlc3RvcmVIZWlnaHQ6IHJlc3RvcmVIZWlnaHR9LCBmYWxzZSk7XG4gICAgICAgIGxldCB3YWxsZXQyID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3NlZWQ6IFRlc3RVdGlscy5TRUVELCByZXN0b3JlSGVpZ2h0OiByZXN0b3JlSGVpZ2h0fSwgZmFsc2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gdHJhY2sgbm90aWZpY2F0aW9ucyBvZiBlYWNoIHdhbGxldFxuICAgICAgICBsZXQgdGVzdGVyMSA9IG5ldyBTeW5jUHJvZ3Jlc3NUZXN0ZXIod2FsbGV0MSwgcmVzdG9yZUhlaWdodCwgaGVpZ2h0KTtcbiAgICAgICAgbGV0IHRlc3RlcjIgPSBuZXcgU3luY1Byb2dyZXNzVGVzdGVyKHdhbGxldDIsIHJlc3RvcmVIZWlnaHQsIGhlaWdodCk7XG4gICAgICAgIGF3YWl0IHdhbGxldDEuYWRkTGlzdGVuZXIodGVzdGVyMSk7XG4gICAgICAgIGF3YWl0IHdhbGxldDIuYWRkTGlzdGVuZXIodGVzdGVyMik7XG4gICAgICAgIFxuICAgICAgICAvLyBzeW5jIGZpcnN0IHdhbGxldCBhbmQgdGVzdCB0aGF0IDJuZCBpcyBub3Qgbm90aWZpZWRcbiAgICAgICAgYXdhaXQgd2FsbGV0MS5zeW5jKCk7XG4gICAgICAgIGFzc2VydCh0ZXN0ZXIxLmlzTm90aWZpZWQoKSk7XG4gICAgICAgIGFzc2VydCghdGVzdGVyMi5pc05vdGlmaWVkKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3luYyAybmQgd2FsbGV0IGFuZCB0ZXN0IHRoYXQgMXN0IGlzIG5vdCBub3RpZmllZFxuICAgICAgICBsZXQgdGVzdGVyMyA9IG5ldyBTeW5jUHJvZ3Jlc3NUZXN0ZXIod2FsbGV0MSwgcmVzdG9yZUhlaWdodCwgaGVpZ2h0KTtcbiAgICAgICAgYXdhaXQgd2FsbGV0MS5hZGRMaXN0ZW5lcih0ZXN0ZXIzKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0Mi5zeW5jKCk7XG4gICAgICAgIGFzc2VydCh0ZXN0ZXIyLmlzTm90aWZpZWQoKSk7XG4gICAgICAgIGFzc2VydCghKHRlc3RlcjMuaXNOb3RpZmllZCgpKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBjbG9zZSB3YWxsZXRzXG4gICAgICAgIGF3YWl0IHdhbGxldDEuY2xvc2UoKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0Mi5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIklzIGVxdWFsIHRvIHRoZSBSUEMgd2FsbGV0LlwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgV2FsbGV0RXF1YWxpdHlVdGlscy50ZXN0V2FsbGV0RXF1YWxpdHlPbkNoYWluKGF3YWl0IFRlc3RVdGlscy5nZXRXYWxsZXRScGMoKSwgdGhhdC53YWxsZXQpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIklzIGVxdWFsIHRvIHRoZSBSUEMgd2FsbGV0IHdpdGggYSBzZWVkIG9mZnNldFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHVzZSBjb21tb24gb2Zmc2V0IHRvIGNvbXBhcmUgd2FsbGV0IGltcGxlbWVudGF0aW9uc1xuICAgICAgICBsZXQgc2VlZE9mZnNldCA9IFwibXkgc3VwZXIgc2VjcmV0IG9mZnNldCFcIjtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSBycGMgd2FsbGV0IHdpdGggb2Zmc2V0XG4gICAgICAgIGxldCB3YWxsZXRScGMgPSBhd2FpdCBUZXN0VXRpbHMuZ2V0V2FsbGV0UnBjKCk7XG4gICAgICAgIGF3YWl0IHdhbGxldFJwYy5jcmVhdGVXYWxsZXQoe3BhdGg6IEdlblV0aWxzLmdldFVVSUQoKSwgcGFzc3dvcmQ6IFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQsIHNlZWQ6IGF3YWl0IHdhbGxldFJwYy5nZXRTZWVkKCksIHJlc3RvcmVIZWlnaHQ6IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCwgc2VlZE9mZnNldDogc2VlZE9mZnNldH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIGZ1bGwgd2FsbGV0IHdpdGggb2Zmc2V0XG4gICAgICAgIGxldCB3YWxsZXRGdWxsID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3NlZWQ6IFRlc3RVdGlscy5TRUVELCByZXN0b3JlSGVpZ2h0OiBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQsIHNlZWRPZmZzZXQ6IHNlZWRPZmZzZXR9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGRlZXAgY29tcGFyZVxuICAgICAgICBsZXQgZXJyO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IFdhbGxldEVxdWFsaXR5VXRpbHMudGVzdFdhbGxldEVxdWFsaXR5T25DaGFpbih3YWxsZXRScGMsIHdhbGxldEZ1bGwpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB3YWxsZXRGdWxsLmNsb3NlKCk7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJTdXBwb3J0cyBtdWx0aXNpZyBzYW1wbGUgY29kZVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgdGVzdENyZWF0ZU11bHRpc2lnV2FsbGV0KDIsIDIpO1xuICAgICAgICBhd2FpdCB0ZXN0Q3JlYXRlTXVsdGlzaWdXYWxsZXQoMiwgMyk7XG4gICAgICAgIGF3YWl0IHRlc3RDcmVhdGVNdWx0aXNpZ1dhbGxldCgyLCA0KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBhc3luYyBmdW5jdGlvbiB0ZXN0Q3JlYXRlTXVsdGlzaWdXYWxsZXQoTSwgTikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkNyZWF0aW5nIFwiICsgTSArIFwiL1wiICsgTiArIFwiIG11bHRpc2lnIHdhbGxldFwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSBwYXJ0aWNpcGF0aW5nIHdhbGxldHNcbiAgICAgICAgbGV0IHdhbGxldHM6IE1vbmVyb1dhbGxldFtdID0gW11cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOOyBpKyspIHtcbiAgICAgICAgICB3YWxsZXRzLnB1c2goYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHByZXBhcmUgYW5kIGNvbGxlY3QgbXVsdGlzaWcgaGV4IGZyb20gZWFjaCBwYXJ0aWNpcGFudFxuICAgICAgICBsZXQgcHJlcGFyZWRNdWx0aXNpZ0hleGVzOiBzdHJpbmdbXSA9IFtdXG4gICAgICAgIGZvciAobGV0IHdhbGxldCBvZiB3YWxsZXRzKSBwcmVwYXJlZE11bHRpc2lnSGV4ZXMucHVzaChhd2FpdCB3YWxsZXQucHJlcGFyZU11bHRpc2lnKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gbWFrZSBlYWNoIHdhbGxldCBtdWx0aXNpZyBhbmQgY29sbGVjdCByZXN1bHRzXG4gICAgICAgIGxldCBtYWRlTXVsdGlzaWdIZXhlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3YWxsZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY29sbGVjdCBwcmVwYXJlZCBtdWx0aXNpZyBoZXhlcyBmcm9tIHdhbGxldCdzIHBlZXJzXG4gICAgICAgICAgbGV0IHBlZXJNdWx0aXNpZ0hleGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgd2FsbGV0cy5sZW5ndGg7IGorKykgaWYgKGogIT09IGkpIHBlZXJNdWx0aXNpZ0hleGVzLnB1c2gocHJlcGFyZWRNdWx0aXNpZ0hleGVzW2pdKTtcbiAgICAgICAgXG4gICAgICAgICAgLy8gbWFrZSB3YWxsZXQgbXVsdGlzaWcgYW5kIGNvbGxlY3QgcmVzdWx0IGhleFxuICAgICAgICAgIGxldCBtdWx0aXNpZ0hleCA9IGF3YWl0IHdhbGxldHNbaV0ubWFrZU11bHRpc2lnKHBlZXJNdWx0aXNpZ0hleGVzLCBNLCBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKTtcbiAgICAgICAgICBtYWRlTXVsdGlzaWdIZXhlcy5wdXNoKG11bHRpc2lnSGV4KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZXhjaGFuZ2UgbXVsdGlzaWcga2V5cyBOIC0gTSArIDEgdGltZXNcbiAgICAgICAgbGV0IG11bHRpc2lnSGV4ZXMgPSBtYWRlTXVsdGlzaWdIZXhlcztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOIC0gTSArIDE7IGkrKykge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGV4Y2hhbmdlIG11bHRpc2lnIGtleXMgYW1vbmcgcGFydGljaXBhbnRzIGFuZCBjb2xsZWN0IHJlc3VsdHMgZm9yIG5leHQgcm91bmQgaWYgYXBwbGljYWJsZVxuICAgICAgICAgIGxldCByZXN1bHRNdWx0aXNpZ0hleGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgIGZvciAobGV0IHdhbGxldCBvZiB3YWxsZXRzKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGltcG9ydCB0aGUgbXVsdGlzaWcgaGV4IG9mIG90aGVyIHBhcnRpY2lwYW50cyBhbmQgY29sbGVjdCByZXN1bHRzXG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgd2FsbGV0LmV4Y2hhbmdlTXVsdGlzaWdLZXlzKG11bHRpc2lnSGV4ZXMsIFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQpO1xuICAgICAgICAgICAgcmVzdWx0TXVsdGlzaWdIZXhlcy5wdXNoKHJlc3VsdC5nZXRNdWx0aXNpZ0hleCgpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdXNlIHJlc3VsdGluZyBtdWx0aXNpZyBoZXggZm9yIG5leHQgcm91bmQgb2YgZXhjaGFuZ2UgaWYgYXBwbGljYWJsZVxuICAgICAgICAgIG11bHRpc2lnSGV4ZXMgPSByZXN1bHRNdWx0aXNpZ0hleGVzO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB3YWxsZXRzIGFyZSBub3cgbXVsdGlzaWdcbiAgICAgICAgZm9yIChsZXQgd2FsbGV0IG9mIHdhbGxldHMpIHtcbiAgICAgICAgICBsZXQgcHJpbWFyeUFkZHJlc3MgPSBhd2FpdCB3YWxsZXQuZ2V0QWRkcmVzcygwLCAwKTtcbiAgICAgICAgICBhd2FpdCBNb25lcm9VdGlscy52YWxpZGF0ZUFkZHJlc3MocHJpbWFyeUFkZHJlc3MsIGF3YWl0ICh3YWxsZXQgYXMgTW9uZXJvV2FsbGV0RnVsbCkuZ2V0TmV0d29ya1R5cGUoKSk7XG4gICAgICAgICAgbGV0IGluZm8gPSBhd2FpdCB3YWxsZXQuZ2V0TXVsdGlzaWdJbmZvKCk7XG4gICAgICAgICAgYXNzZXJ0KGluZm8uZ2V0SXNNdWx0aXNpZygpKTtcbiAgICAgICAgICBhc3NlcnQoaW5mby5nZXRJc1JlYWR5KCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChpbmZvLmdldFRocmVzaG9sZCgpLCBNKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoaW5mby5nZXROdW1QYXJ0aWNpcGFudHMoKSwgTik7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBiZSBzYXZlZFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSB1bmlxdWUgcGF0aCBmb3IgbmV3IHRlc3Qgd2FsbGV0XG4gICAgICAgIGxldCBwYXRoID0gVGVzdE1vbmVyb1dhbGxldEZ1bGwuZ2V0UmFuZG9tV2FsbGV0UGF0aCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gd2FsbGV0IGRvZXMgbm90IGV4aXN0XG4gICAgICAgIGFzc2VydCghKGF3YWl0IE1vbmVyb1dhbGxldEZ1bGwud2FsbGV0RXhpc3RzKHBhdGgsIGF3YWl0IFRlc3RVdGlscy5nZXREZWZhdWx0RnMoKSkpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNhbm5vdCBvcGVuIG5vbi1leGlzdGVudCB3YWxsZXRcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0Lm9wZW5XYWxsZXQoe3BhdGg6IHBhdGgsIHNlcnZlcjogXCJcIn0pO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBvcGVuIG5vbi1leGlzdGVudCB3YWxsZXRcIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChlLm1lc3NhZ2UsIFwiV2FsbGV0IGRvZXMgbm90IGV4aXN0IGF0IHBhdGg6IFwiICsgcGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSB3YWxsZXQgYXQgdGhlIHBhdGhcbiAgICAgICAgbGV0IHJlc3RvcmVIZWlnaHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSAtIDIwMDtcbiAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtwYXRoOiBwYXRoLCBwYXNzd29yZDogVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCwgbmV0d29ya1R5cGU6IFRlc3RVdGlscy5ORVRXT1JLX1RZUEUsIHNlZWQ6IFRlc3RVdGlscy5TRUVELCByZXN0b3JlSGVpZ2h0OiByZXN0b3JlSGVpZ2h0LCBzZXJ2ZXI6IFRlc3RVdGlscy5PRkZMSU5FX1NFUlZFUl9VUkl9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgd2FsbGV0IGF0IG5ld2x5IGNyZWF0ZWQgc3RhdGVcbiAgICAgICAgbGV0IGVycjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhc3NlcnQoYXdhaXQgTW9uZXJvV2FsbGV0RnVsbC53YWxsZXRFeGlzdHMocGF0aCwgYXdhaXQgVGVzdFV0aWxzLmdldERlZmF1bHRGcygpKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkKCksIFRlc3RVdGlscy5TRUVEKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldE5ldHdvcmtUeXBlKCksIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpO1xuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSwgbmV3IE1vbmVyb1JwY0Nvbm5lY3Rpb24oVGVzdFV0aWxzLk9GRkxJTkVfU0VSVkVSX1VSSSkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UmVzdG9yZUhlaWdodCgpLCByZXN0b3JlSGVpZ2h0KTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWRMYW5ndWFnZSgpLCBcIkVuZ2xpc2hcIik7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRIZWlnaHQoKSwgMSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRSZXN0b3JlSGVpZ2h0KCksIHJlc3RvcmVIZWlnaHQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHNldCB0aGUgd2FsbGV0J3MgY29ubmVjdGlvbiBhbmQgc3luY1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zZXREYWVtb25Db25uZWN0aW9uKFRlc3RVdGlscy5nZXREYWVtb25ScGNDb25uZWN0aW9uKCkpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zeW5jKCk7XG4gICAgICAgICAgaWYgKGF3YWl0IHdhbGxldC5nZXRIZWlnaHQoKSAhPT0gYXdhaXQgd2FsbGV0LmdldERhZW1vbkhlaWdodCgpKSBjb25zb2xlLmxvZyhcIldBUk5JTkc6IHdhbGxldCBoZWlnaHQgXCIgKyBhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCkgKyBcIiBpcyBub3Qgc3luY2VkIHdpdGggZGFlbW9uIGhlaWdodCBcIiArIGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpKTsgIC8vIFRPRE86IGhlaWdodCBtYXkgbm90IGJlIHNhbWUgYWZ0ZXIgbG9uZyBzeW5jXG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY2xvc2UgdGhlIHdhbGxldCB3aXRob3V0IHNhdmluZ1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHJlLW9wZW4gdGhlIHdhbGxldFxuICAgICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQub3BlbldhbGxldCh7cGF0aDogcGF0aCwgc2VydmVyOiBUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCB3YWxsZXQgaXMgYXQgbmV3bHkgY3JlYXRlZCBzdGF0ZVxuICAgICAgICAgIGFzc2VydChhd2FpdCBNb25lcm9XYWxsZXRGdWxsLndhbGxldEV4aXN0cyhwYXRoLCBhd2FpdCBUZXN0VXRpbHMuZ2V0RGVmYXVsdEZzKCkpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSwgVGVzdFV0aWxzLlNFRUQpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0TmV0d29ya1R5cGUoKSwgVGVzdFV0aWxzLk5FVFdPUktfVFlQRSk7XG4gICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpLCBuZXcgTW9uZXJvUnBjQ29ubmVjdGlvbihUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJKSk7XG4gICAgICAgICAgYXNzZXJ0KCEoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZExhbmd1YWdlKCksIFwiRW5nbGlzaFwiKTtcbiAgICAgICAgICBhc3NlcnQoIShhd2FpdCB3YWxsZXQuaXNTeW5jZWQoKSkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCksIDEpO1xuICAgICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuZ2V0UmVzdG9yZUhlaWdodCgpID4gMCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc2V0IHRoZSB3YWxsZXQncyBjb25uZWN0aW9uIGFuZCBzeW5jXG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnNldERhZW1vbkNvbm5lY3Rpb24oVGVzdFV0aWxzLmdldERhZW1vblJwY0Nvbm5lY3Rpb24oKSk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zZXRSZXN0b3JlSGVpZ2h0KHJlc3RvcmVIZWlnaHQpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zeW5jKCk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc1N5bmNlZCgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCBhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uSGVpZ2h0KCkpO1xuICAgICAgICAgIGxldCBwcmV2SGVpZ2h0ID0gYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHNhdmUgYW5kIGNsb3NlIHRoZSB3YWxsZXRcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2F2ZSgpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHJlLW9wZW4gdGhlIHdhbGxldFxuICAgICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQub3BlbldhbGxldCh7cGF0aDogcGF0aCwgc2VydmVyOiBUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCB3YWxsZXQgc3RhdGUgaXMgc2F2ZWRcbiAgICAgICAgICBhc3NlcnQoIShhd2FpdCB3YWxsZXQuaXNDb25uZWN0ZWRUb0RhZW1vbigpKSk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnNldERhZW1vbkNvbm5lY3Rpb24oVGVzdFV0aWxzLmdldERhZW1vblJwY0Nvbm5lY3Rpb24oKSk7ICAvLyBUT0RPIG1vbmVyby1wcm9qZWN0OiBkYWVtb24gY29ubmVjdGlvbiBub3Qgc3RvcmVkIGluIHdhbGxldCBmaWxlcyBzbyBtdXN0IGJlIGV4cGxpY2l0bHkgc2V0IGVhY2ggdGltZVxuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSwgVGVzdFV0aWxzLmdldERhZW1vblJwY0Nvbm5lY3Rpb24oKSk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCksIHByZXZIZWlnaHQpO1xuICAgICAgICAgIGFzc2VydChhd2FpdCB3YWxsZXQuZ2V0UmVzdG9yZUhlaWdodCgpID4gMCk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IE1vbmVyb1dhbGxldEZ1bGwud2FsbGV0RXhpc3RzKHBhdGgsIGF3YWl0IFRlc3RVdGlscy5nZXREZWZhdWx0RnMoKSkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZCgpLCBUZXN0VXRpbHMuU0VFRCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXROZXR3b3JrVHlwZSgpLCBUZXN0VXRpbHMuTkVUV09SS19UWVBFKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWRMYW5ndWFnZSgpLCBcIkVuZ2xpc2hcIik7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc3luY1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zeW5jKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmaW5hbGx5XG4gICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGV4cG9ydCBhbmQgaW1wb3J0IHdhbGxldCBmaWxlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGVycjtcbiAgICAgICAgbGV0IHdhbGxldFxuICAgICAgICBsZXQgd2FsbGV0MjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBjcmVhdGUgcmFuZG9tIHdhbGxldFxuICAgICAgICAgIHdhbGxldCA9IGF3YWl0IGNyZWF0ZVdhbGxldEZ1bGwoe1xuICAgICAgICAgICAgbmV0d29ya1R5cGU6IE1vbmVyb05ldHdvcmtUeXBlLk1BSU5ORVQsXG4gICAgICAgICAgICBwYXNzd29yZDogXCJwYXNzd29yZDEyM1wiXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gZXhwb3J0IHdhbGxldCBmaWxlc1xuICAgICAgICAgIGxldCB3YWxsZXREYXRhID0gYXdhaXQgd2FsbGV0LmdldERhdGEoKTtcbiAgICAgICAgICBsZXQga2V5c0RhdGEgPSB3YWxsZXREYXRhWzBdO1xuICAgICAgICAgIGxldCBjYWNoZURhdGEgPSB3YWxsZXREYXRhWzFdO1xuXG4gICAgICAgICAgLy8gaW1wb3J0IGtleXMgZmlsZSB3aXRob3V0IGNhY2hlXG4gICAgICAgICAgd2FsbGV0MiA9IGF3YWl0IG9wZW5XYWxsZXRGdWxsKHtcbiAgICAgICAgICAgIG5ldHdvcmtUeXBlOiBNb25lcm9OZXR3b3JrVHlwZS5NQUlOTkVULFxuICAgICAgICAgICAgcGFzc3dvcmQ6IFwicGFzc3dvcmQxMjNcIixcbiAgICAgICAgICAgIGtleXNEYXRhOiBrZXlzRGF0YVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGltcG9ydCB3YWxsZXQgZmlsZXNcbiAgICAgICAgICB3YWxsZXQyID0gYXdhaXQgb3BlbldhbGxldEZ1bGwoe1xuICAgICAgICAgICAgbmV0d29ya1R5cGU6IE1vbmVyb05ldHdvcmtUeXBlLk1BSU5ORVQsXG4gICAgICAgICAgICBwYXNzd29yZDogXCJwYXNzd29yZDEyM1wiLFxuICAgICAgICAgICAga2V5c0RhdGE6IGtleXNEYXRhLFxuICAgICAgICAgICAgY2FjaGVEYXRhOiBjYWNoZURhdGFcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IHRoYXQgd2FsbGV0cyBhcmUgZXF1YWxcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSwgYXdhaXQgd2FsbGV0Mi5nZXRTZWVkKCkpO1xuICAgICAgICAgIGF3YWl0IFRlc3RNb25lcm9XYWxsZXRGdWxsLnRlc3RXYWxsZXRFcXVhbGl0eU9uQ2hhaW4od2FsbGV0LCB3YWxsZXQyKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGVyciA9IGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGZpbmFsbHlcbiAgICAgICAgaWYgKHdhbGxldCkgYXdhaXQgd2FsbGV0LmNsb3NlKCk7XG4gICAgICAgIGlmICh3YWxsZXQyKSBhd2FpdCB3YWxsZXQyLmNsb3NlKCk7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gYmUgbW92ZWRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBlcnI7XG4gICAgICAgIGxldCB3YWxsZXQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY3JlYXRlIHJhbmRvbSBpbi1tZW1vcnkgd2FsbGV0IHdpdGggZGVmYXVsdHNcbiAgICAgICAgICB3YWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldChuZXcgTW9uZXJvV2FsbGV0Q29uZmlnKCkuc2V0UGF0aChcIlwiKSk7XG4gICAgICAgICAgbGV0IG1uZW1vbmljID0gYXdhaXQgd2FsbGV0LmdldFNlZWQoKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2V0QXR0cmlidXRlKFwibXlrZXlcIiwgXCJteXZhbDFcIik7XG5cbiAgICAgICAgICAvLyBjaGFuZ2UgcGFzc3dvcmQgb2YgaW4tbWVtb3J5IHdhbGxldFxuICAgICAgICAgIGxldCBwYXNzd29yZDIgPSBcImFiYzEyM1wiO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5jaGFuZ2VQYXNzd29yZChUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JELCBwYXNzd29yZDIpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIG1vdmUgd2FsbGV0IGZyb20gbWVtb3J5IHRvIGRpc2tcbiAgICAgICAgICBsZXQgcGF0aDEgPSBUZXN0VXRpbHMuVEVTVF9XQUxMRVRTX0RJUiArIFwiL1wiICsgR2VuVXRpbHMuZ2V0VVVJRCgpO1xuICAgICAgICAgIGFzc2VydCghKGF3YWl0IE1vbmVyb1dhbGxldEZ1bGwud2FsbGV0RXhpc3RzKHBhdGgxLCBhd2FpdCBUZXN0VXRpbHMuZ2V0RGVmYXVsdEZzKCkpKSk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0Lm1vdmVUbyhwYXRoMSk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IE1vbmVyb1dhbGxldEZ1bGwud2FsbGV0RXhpc3RzKHBhdGgxLCBhd2FpdCBUZXN0VXRpbHMuZ2V0RGVmYXVsdEZzKCkpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSwgbW5lbW9uaWMpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChcIm15dmFsMVwiLCBhd2FpdCB3YWxsZXQuZ2V0QXR0cmlidXRlKFwibXlrZXlcIikpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIG1vdmUgdG8gc2FtZSBwYXRoIHdoaWNoIGlzIHNhbWUgYXMgc2F2aW5nXG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnNldEF0dHJpYnV0ZShcIm15a2V5XCIsIFwibXl2YWwyXCIpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5tb3ZlVG8ocGF0aDEpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgICAgIGFzc2VydChhd2FpdCBNb25lcm9XYWxsZXRGdWxsLndhbGxldEV4aXN0cyhwYXRoMSwgYXdhaXQgVGVzdFV0aWxzLmdldERlZmF1bHRGcygpKSk7XG4gICAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5vcGVuV2FsbGV0KG5ldyBNb25lcm9XYWxsZXRDb25maWcoKS5zZXRQYXRoKHBhdGgxKS5zZXRQYXNzd29yZChwYXNzd29yZDIpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSwgbW5lbW9uaWMpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChcIm15dmFsMlwiLCBhd2FpdCB3YWxsZXQuZ2V0QXR0cmlidXRlKFwibXlrZXlcIikpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIG1vdmUgd2FsbGV0IHRvIG5ldyBkaXJlY3RvcnlcbiAgICAgICAgICBsZXQgcGF0aDIgPSBUZXN0VXRpbHMuVEVTVF9XQUxMRVRTX0RJUiArIFwiL21vdmVkL1wiICsgR2VuVXRpbHMuZ2V0VVVJRCgpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zZXRBdHRyaWJ1dGUoXCJteWtleVwiLCBcIm15dmFsM1wiKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQubW92ZVRvKHBhdGgyKTtcbiAgICAgICAgICBhc3NlcnQoIShhd2FpdCBNb25lcm9XYWxsZXRGdWxsLndhbGxldEV4aXN0cyhwYXRoMSwgYXdhaXQgVGVzdFV0aWxzLmdldERlZmF1bHRGcygpKSkpO1xuICAgICAgICAgIGFzc2VydChhd2FpdCBNb25lcm9XYWxsZXRGdWxsLndhbGxldEV4aXN0cyhwYXRoMiwgYXdhaXQgVGVzdFV0aWxzLmdldERlZmF1bHRGcygpKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkKCksIG1uZW1vbmljKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyByZS1vcGVuIGFuZCB0ZXN0IHdhbGxldFxuICAgICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuICAgICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQub3BlbldhbGxldChuZXcgTW9uZXJvV2FsbGV0Q29uZmlnKCkuc2V0UGF0aChwYXRoMikuc2V0UGFzc3dvcmQocGFzc3dvcmQyKSk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnN5bmMoKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSwgbW5lbW9uaWMpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChcIm15dmFsM1wiLCBhd2FpdCB3YWxsZXQuZ2V0QXR0cmlidXRlKFwibXlrZXlcIikpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZmluYWwgY2xlYW51cFxuICAgICAgICBpZiAod2FsbGV0KSBhd2FpdCB3YWxsZXQuY2xvc2UoKTtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgICBjb25zb2xlLmxvZyhcIkFsbCBkb25lIHdpdGggdGVzdFwiKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gYmUgY2xvc2VkXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICBsZXQgd2FsbGV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGNyZWF0ZSBhIHRlc3Qgd2FsbGV0XG4gICAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoKTtcbiAgICAgICAgICBsZXQgcGF0aCA9IGF3YWl0IHdhbGxldC5nZXRQYXRoKCk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnN5bmMoKTtcbiAgICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpID4gMSk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc1N5bmNlZCgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmlzQ2xvc2VkKCksIGZhbHNlKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBjbG9zZSB0aGUgd2FsbGV0XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKCk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc0Nsb3NlZCgpKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBhdHRlbXB0IHRvIGludGVyYWN0IHdpdGggdGhlIHdhbGxldFxuICAgICAgICAgIHRyeSB7IGF3YWl0IHdhbGxldC5nZXRIZWlnaHQoKTsgfVxuICAgICAgICAgIGNhdGNoIChlOiBhbnkpIHsgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJXYWxsZXQgaXMgY2xvc2VkXCIpOyB9XG4gICAgICAgICAgdHJ5IHsgYXdhaXQgd2FsbGV0LmdldFNlZWQoKTsgfVxuICAgICAgICAgIGNhdGNoIChlOiBhbnkpIHsgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJXYWxsZXQgaXMgY2xvc2VkXCIpOyB9XG4gICAgICAgICAgdHJ5IHsgYXdhaXQgd2FsbGV0LnN5bmMoKTsgfVxuICAgICAgICAgIGNhdGNoIChlOiBhbnkpIHsgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJXYWxsZXQgaXMgY2xvc2VkXCIpOyB9XG4gICAgICAgICAgdHJ5IHsgYXdhaXQgd2FsbGV0LnN0YXJ0U3luY2luZygpOyB9XG4gICAgICAgICAgY2F0Y2ggKGU6IGFueSkgeyBhc3NlcnQuZXF1YWwoZS5tZXNzYWdlLCBcIldhbGxldCBpcyBjbG9zZWRcIik7IH1cbiAgICAgICAgICB0cnkgeyBhd2FpdCB3YWxsZXQuc3RvcFN5bmNpbmcoKTsgfVxuICAgICAgICAgIGNhdGNoIChlOiBhbnkpIHsgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJXYWxsZXQgaXMgY2xvc2VkXCIpOyB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gcmUtb3BlbiB0aGUgd2FsbGV0XG4gICAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5vcGVuV2FsbGV0KHtwYXRoOiBwYXRofSk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnN5bmMoKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCBhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uSGVpZ2h0KCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuaXNDbG9zZWQoKSwgZmFsc2UpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZmluYWwgY2xlYW51cFxuICAgICAgICBhd2FpdCB3YWxsZXQuY2xvc2UoKTtcbiAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc0Nsb3NlZCgpKTtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChmYWxzZSlcbiAgICAgIGl0KFwiRG9lcyBub3QgbGVhayBtZW1vcnlcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBlcnI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJJbmZpbml0ZSBsb29wIHN0YXJ0aW5nLCBtb25pdG9yIG1lbW9yeSBpbiBPUyBwcm9jZXNzIG1hbmFnZXIuLi5cIik7XG4gICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgIGxldCBjbG9zZVdhbGxldCA9IGZhbHNlO1xuICAgICAgICAgIGlmIChjbG9zZVdhbGxldCkgYXdhaXQgdGhhdC53YWxsZXQuY2xvc2UodHJ1ZSk7XG4gICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIGlmIChjbG9zZVdhbGxldCkgdGhhdC53YWxsZXQgPSBhd2FpdCBUZXN0VXRpbHMuZ2V0V2FsbGV0RnVsbCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuc3luYygpO1xuICAgICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5nZXRUcmFuc2ZlcnMoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmdldE91dHB1dHMobmV3IE1vbmVyb091dHB1dFF1ZXJ5KCkuc2V0SXNTcGVudChmYWxzZSkpO1xuICAgICAgICAgICAgaWYgKGkgJSAxMDAwKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSXRlcmF0aW9uOiBcIiArIGkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNsb3NlV2FsbGV0KSBhd2FpdCB0aGF0LndhbGxldC5jbG9zZSh0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmaW5hbCBjbGVhbnVwXG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIFxuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFBSSVZBVEUgSEVMUEVSUyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBcbiAgcHJvdGVjdGVkIHN0YXRpYyBnZXRSYW5kb21XYWxsZXRQYXRoKCkge1xuICAgIHJldHVybiBUZXN0VXRpbHMuVEVTVF9XQUxMRVRTX0RJUiArIFwiL3Rlc3Rfd2FsbGV0X1wiICsgR2VuVXRpbHMuZ2V0VVVJRCgpO1xuICB9XG4gIFxuICAvLyBwb3NzaWJsZSBjb25maWd1cmF0aW9uOiBvbiBjaGFpbiB4b3IgbG9jYWwgd2FsbGV0IGRhdGEgKFwic3RyaWN0XCIpLCB0eHMgb3JkZXJlZCBzYW1lIHdheT8gVEJEXG4gIHByb3RlY3RlZCBzdGF0aWMgYXN5bmMgdGVzdFdhbGxldEVxdWFsaXR5T25DaGFpbih3YWxsZXQxLCB3YWxsZXQyKSB7XG4gICAgYXdhaXQgV2FsbGV0RXF1YWxpdHlVdGlscy50ZXN0V2FsbGV0RXF1YWxpdHlPbkNoYWluKHdhbGxldDEsIHdhbGxldDIpO1xuICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQyLmdldE5ldHdvcmtUeXBlKCksIGF3YWl0IHdhbGxldDEuZ2V0TmV0d29ya1R5cGUoKSk7XG4gICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldDIuZ2V0UmVzdG9yZUhlaWdodCgpLCBhd2FpdCB3YWxsZXQxLmdldFJlc3RvcmVIZWlnaHQoKSk7XG4gICAgYXNzZXJ0LmRlZXBFcXVhbChhd2FpdCB3YWxsZXQxLmdldERhZW1vbkNvbm5lY3Rpb24oKSwgYXdhaXQgd2FsbGV0Mi5nZXREYWVtb25Db25uZWN0aW9uKCkpO1xuICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQyLmdldFNlZWRMYW5ndWFnZSgpLCBhd2FpdCB3YWxsZXQxLmdldFNlZWRMYW5ndWFnZSgpKTtcbiAgICAvLyBUT0RPOiBtb3JlIHdhc20tc3BlY2lmaWMgZXh0ZW5zaW9uc1xuICB9XG59XG5cbi8qKlxuICogSGVscGVyIGNsYXNzIHRvIHRlc3QgcHJvZ3Jlc3MgdXBkYXRlcy5cbiAqL1xuY2xhc3MgU3luY1Byb2dyZXNzVGVzdGVyIGV4dGVuZHMgV2FsbGV0U3luY1ByaW50ZXIge1xuXG4gIHdhbGxldDogYW55O1xuICBzdGFydEhlaWdodDogbnVtYmVyO1xuICBwcmV2RW5kSGVpZ2h0OiBudW1iZXI7XG4gIHByZXZDb21wbGV0ZUhlaWdodDogbnVtYmVyO1xuICBwcmV2SGVpZ2h0OiBudW1iZXI7XG4gIGlzRG9uZTogYm9vbGVhbjtcbiAgb25TeW5jUHJvZ3Jlc3NBZnRlckRvbmU6IGJvb2xlYW47XG4gIFxuICBjb25zdHJ1Y3Rvcih3YWxsZXQsIHN0YXJ0SGVpZ2h0LCBlbmRIZWlnaHQpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMud2FsbGV0ID0gd2FsbGV0O1xuICAgIGFzc2VydChzdGFydEhlaWdodCA+PSAwKTtcbiAgICBhc3NlcnQoZW5kSGVpZ2h0ID49IDApO1xuICAgIHRoaXMuc3RhcnRIZWlnaHQgPSBzdGFydEhlaWdodDtcbiAgICB0aGlzLnByZXZFbmRIZWlnaHQgPSBlbmRIZWlnaHQ7XG4gICAgdGhpcy5pc0RvbmUgPSBmYWxzZTtcbiAgfVxuICBcbiAgYXN5bmMgb25TeW5jUHJvZ3Jlc3MoaGVpZ2h0LCBzdGFydEhlaWdodCwgZW5kSGVpZ2h0LCBwZXJjZW50RG9uZSwgbWVzc2FnZSkge1xuICAgIHN1cGVyLm9uU3luY1Byb2dyZXNzKGhlaWdodCwgc3RhcnRIZWlnaHQsIGVuZEhlaWdodCwgcGVyY2VudERvbmUsIG1lc3NhZ2UpO1xuICAgIFxuICAgIC8vIHJlZ2lzdGVyZWQgd2FsbGV0IGxpc3RlbmVycyB3aWxsIGNvbnRpbnVlIHRvIGdldCBzeW5jIG5vdGlmaWNhdGlvbnMgYWZ0ZXIgdGhlIHdhbGxldCdzIGluaXRpYWwgc3luY1xuICAgIGlmICh0aGlzLmlzRG9uZSkge1xuICAgICAgYXNzZXJ0KHRoaXMud2FsbGV0LmdldExpc3RlbmVycygpLmluY2x1ZGVzKHRoaXMpLCBcIkxpc3RlbmVyIGhhcyBjb21wbGV0ZWQgYW5kIGlzIG5vdCByZWdpc3RlcmVkIHNvIHNob3VsZCBub3QgYmUgY2FsbGVkIGFnYWluXCIpO1xuICAgICAgdGhpcy5vblN5bmNQcm9ncmVzc0FmdGVyRG9uZSA9IHRydWU7XG4gICAgfVxuICAgIFxuICAgIC8vIHVwZGF0ZSB0ZXN0ZXIncyBzdGFydCBoZWlnaHQgaWYgbmV3IHN5bmMgc2Vzc2lvblxuICAgIGlmICh0aGlzLnByZXZDb21wbGV0ZUhlaWdodCAhPT0gdW5kZWZpbmVkICYmIHN0YXJ0SGVpZ2h0ID09PSB0aGlzLnByZXZDb21wbGV0ZUhlaWdodCkgdGhpcy5zdGFydEhlaWdodCA9IHN0YXJ0SGVpZ2h0OyAgXG4gICAgXG4gICAgLy8gaWYgc3luYyBpcyBjb21wbGV0ZSwgcmVjb3JkIGNvbXBsZXRpb24gaGVpZ2h0IGZvciBzdWJzZXF1ZW50IHN0YXJ0IGhlaWdodHNcbiAgICBpZiAocGVyY2VudERvbmUgPT09IDEpIHRoaXMucHJldkNvbXBsZXRlSGVpZ2h0ID0gZW5kSGVpZ2h0O1xuICAgIFxuICAgIC8vIG90aGVyd2lzZSBzdGFydCBoZWlnaHQgaXMgZXF1YWwgdG8gcHJldmlvdXMgY29tcGxldGlvbiBoZWlnaHRcbiAgICBlbHNlIGlmICh0aGlzLnByZXZDb21wbGV0ZUhlaWdodCAhPT0gdW5kZWZpbmVkKSBhc3NlcnQuZXF1YWwoc3RhcnRIZWlnaHQsIHRoaXMucHJldkNvbXBsZXRlSGVpZ2h0KTtcbiAgICBcbiAgICBhc3NlcnQoZW5kSGVpZ2h0ID4gc3RhcnRIZWlnaHQsIFwiZW5kIGhlaWdodCA+IHN0YXJ0IGhlaWdodFwiKTtcbiAgICBhc3NlcnQuZXF1YWwoc3RhcnRIZWlnaHQsIHRoaXMuc3RhcnRIZWlnaHQpO1xuICAgIGFzc2VydChlbmRIZWlnaHQgPj0gdGhpcy5wcmV2RW5kSGVpZ2h0KTsgIC8vIGNoYWluIGNhbiBncm93IHdoaWxlIHN5bmNpbmdcbiAgICB0aGlzLnByZXZFbmRIZWlnaHQgPSBlbmRIZWlnaHQ7XG4gICAgYXNzZXJ0KGhlaWdodCA+PSBzdGFydEhlaWdodCk7XG4gICAgYXNzZXJ0KGhlaWdodCA8IGVuZEhlaWdodCk7XG4gICAgbGV0IGV4cGVjdGVkUGVyY2VudERvbmUgPSAoaGVpZ2h0IC0gc3RhcnRIZWlnaHQgKyAxKSAvIChlbmRIZWlnaHQgLSBzdGFydEhlaWdodCk7XG4gICAgYXNzZXJ0LmVxdWFsKGV4cGVjdGVkUGVyY2VudERvbmUsIHBlcmNlbnREb25lKTtcbiAgICBpZiAodGhpcy5wcmV2SGVpZ2h0ID09PSB1bmRlZmluZWQpIGFzc2VydC5lcXVhbChoZWlnaHQsIHN0YXJ0SGVpZ2h0KTtcbiAgICBlbHNlIGFzc2VydC5lcXVhbCh0aGlzLnByZXZIZWlnaHQgKyAxLCBoZWlnaHQpO1xuICAgIHRoaXMucHJldkhlaWdodCA9IGhlaWdodDtcbiAgfVxuICBcbiAgYXN5bmMgb25Eb25lKGNoYWluSGVpZ2h0KSB7XG4gICAgYXNzZXJ0KCF0aGlzLmlzRG9uZSk7XG4gICAgdGhpcy5pc0RvbmUgPSB0cnVlO1xuICAgIGlmICh0aGlzLnByZXZIZWlnaHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgYXNzZXJ0LmVxdWFsKHRoaXMucHJldkNvbXBsZXRlSGVpZ2h0LCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHRoaXMuc3RhcnRIZWlnaHQsIGNoYWluSGVpZ2h0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXJ0LmVxdWFsKHRoaXMucHJldkhlaWdodCwgY2hhaW5IZWlnaHQgLSAxKTsgIC8vIG90aGVyd2lzZSBsYXN0IGhlaWdodCBpcyBjaGFpbiBoZWlnaHQgLSAxXG4gICAgICBhc3NlcnQuZXF1YWwodGhpcy5wcmV2Q29tcGxldGVIZWlnaHQsIGNoYWluSGVpZ2h0KTtcbiAgICB9XG4gIH1cbiAgXG4gIGlzTm90aWZpZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMucHJldkhlaWdodCAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIFxuICBnZXRPblN5bmNQcm9ncmVzc0FmdGVyRG9uZSgpIHtcbiAgICByZXR1cm4gdGhpcy5vblN5bmNQcm9ncmVzc0FmdGVyRG9uZTtcbiAgfVxufVxuXG4vKipcbiAqIEludGVybmFsIGNsYXNzIHRvIHRlc3QgYWxsIHdhbGxldCBub3RpZmljYXRpb25zIG9uIHN5bmMuIFxuICovXG5jbGFzcyBXYWxsZXRTeW5jVGVzdGVyIGV4dGVuZHMgU3luY1Byb2dyZXNzVGVzdGVyIHtcblxuICBpbmNvbWluZ1RvdGFsOiBiaWdpbnQ7XG4gIG91dGdvaW5nVG90YWw6IGJpZ2ludDtcbiAgcHJldkJhbGFuY2U6IGJpZ2ludDtcbiAgcHJldlVubG9ja2VkQmFsYW5jZTogYmlnaW50O1xuICBwcmV2T3V0cHV0UmVjZWl2ZWQ6IE1vbmVyb091dHB1dFdhbGxldDtcbiAgcHJldk91dHB1dFNwZW50OiBNb25lcm9PdXRwdXRXYWxsZXQ7XG4gIHdhbGxldFRlc3RlclByZXZIZWlnaHQ6IG51bWJlcjtcbiAgb25OZXdCbG9ja0FmdGVyRG9uZTogYm9vbGVhbjtcbiAgXG4gIGNvbnN0cnVjdG9yKHdhbGxldCwgc3RhcnRIZWlnaHQsIGVuZEhlaWdodCkge1xuICAgIHN1cGVyKHdhbGxldCwgc3RhcnRIZWlnaHQsIGVuZEhlaWdodCk7XG4gICAgYXNzZXJ0KHN0YXJ0SGVpZ2h0ID49IDApO1xuICAgIGFzc2VydChlbmRIZWlnaHQgPj0gMCk7XG4gICAgdGhpcy5pbmNvbWluZ1RvdGFsID0gMG47XG4gICAgdGhpcy5vdXRnb2luZ1RvdGFsID0gMG47XG4gIH1cbiAgXG4gIGFzeW5jIG9uTmV3QmxvY2soaGVpZ2h0KSB7XG4gICAgaWYgKHRoaXMuaXNEb25lKSB7XG4gICAgICBhc3NlcnQodGhpcy53YWxsZXQuZ2V0TGlzdGVuZXJzKCkuaW5jbHVkZXModGhpcyksIFwiTGlzdGVuZXIgaGFzIGNvbXBsZXRlZCBhbmQgaXMgbm90IHJlZ2lzdGVyZWQgc28gc2hvdWxkIG5vdCBiZSBjYWxsZWQgYWdhaW5cIik7XG4gICAgICB0aGlzLm9uTmV3QmxvY2tBZnRlckRvbmUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAodGhpcy53YWxsZXRUZXN0ZXJQcmV2SGVpZ2h0ICE9PSB1bmRlZmluZWQpIGFzc2VydC5lcXVhbChoZWlnaHQsIHRoaXMud2FsbGV0VGVzdGVyUHJldkhlaWdodCArIDEpO1xuICAgIGFzc2VydChoZWlnaHQgPj0gdGhpcy5zdGFydEhlaWdodCk7XG4gICAgdGhpcy53YWxsZXRUZXN0ZXJQcmV2SGVpZ2h0ID0gaGVpZ2h0O1xuICB9XG4gIFxuICBhc3luYyBvbkJhbGFuY2VzQ2hhbmdlZChuZXdCYWxhbmNlLCBuZXdVbmxvY2tlZEJhbGFuY2UpIHtcbiAgICBpZiAodGhpcy5wcmV2QmFsYW5jZSAhPT0gdW5kZWZpbmVkKSBhc3NlcnQobmV3QmFsYW5jZS50b1N0cmluZygpICE9PSB0aGlzLnByZXZCYWxhbmNlLnRvU3RyaW5nKCkgfHwgbmV3VW5sb2NrZWRCYWxhbmNlLnRvU3RyaW5nKCkgIT09IHRoaXMucHJldlVubG9ja2VkQmFsYW5jZS50b1N0cmluZygpKTtcbiAgICB0aGlzLnByZXZCYWxhbmNlID0gbmV3QmFsYW5jZTtcbiAgICB0aGlzLnByZXZVbmxvY2tlZEJhbGFuY2UgPSBuZXdVbmxvY2tlZEJhbGFuY2U7XG4gIH1cblxuICBhc3luYyBvbk91dHB1dFJlY2VpdmVkKG91dHB1dCkge1xuICAgIGFzc2VydC5ub3RFcXVhbChvdXRwdXQsIHVuZGVmaW5lZCk7XG4gICAgdGhpcy5wcmV2T3V0cHV0UmVjZWl2ZWQgPSBvdXRwdXQ7XG4gICAgXG4gICAgLy8gdGVzdCBvdXRwdXRcbiAgICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KG91dHB1dC5nZXRBbW91bnQoKSk7XG4gICAgYXNzZXJ0KG91dHB1dC5nZXRBY2NvdW50SW5kZXgoKSA+PSAwKTtcbiAgICBhc3NlcnQob3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpID49IDApO1xuICAgIFxuICAgIC8vIHRlc3Qgb3V0cHV0J3MgdHhcbiAgICBhc3NlcnQob3V0cHV0LmdldFR4KCkpO1xuICAgIGFzc2VydChvdXRwdXQuZ2V0VHgoKSBpbnN0YW5jZW9mIE1vbmVyb1R4V2FsbGV0KTtcbiAgICBhc3NlcnQob3V0cHV0LmdldFR4KCkuZ2V0SGFzaCgpKTtcbiAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldFR4KCkuZ2V0SGFzaCgpLmxlbmd0aCwgNjQpO1xuICAgIGFzc2VydChvdXRwdXQuZ2V0VHgoKS5nZXRWZXJzaW9uKCkgPj0gMCk7XG4gICAgYXNzZXJ0KG91dHB1dC5nZXRUeCgpLmdldFVubG9ja1RpbWUoKSA+PSAwKTtcbiAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldFR4KCkuZ2V0SW5wdXRzKCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRUeCgpLmdldE91dHB1dHMoKS5sZW5ndGgsIDEpO1xuICAgIGFzc2VydChvdXRwdXQuZ2V0VHgoKS5nZXRPdXRwdXRzKClbMF0gPT09IG91dHB1dCk7XG4gICAgXG4gICAgLy8gZXh0cmEgaXMgbm90IHNlbnQgb3ZlciB0aGUgd2FzbSBicmlkZ2VcbiAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldFR4KCkuZ2V0RXh0cmEoKSwgdW5kZWZpbmVkKTtcbiAgICBcbiAgICAvLyBhZGQgaW5jb21pbmcgYW1vdW50IHRvIHJ1bm5pbmcgdG90YWxcbiAgICBpZiAob3V0cHV0LmdldElzTG9ja2VkKCkpIHRoaXMuaW5jb21pbmdUb3RhbCA9IHRoaXMuaW5jb21pbmdUb3RhbCArIChvdXRwdXQuZ2V0QW1vdW50KCkpO1xuICB9XG5cbiAgYXN5bmMgb25PdXRwdXRTcGVudChvdXRwdXQpIHtcbiAgICBhc3NlcnQubm90RXF1YWwob3V0cHV0LCB1bmRlZmluZWQpO1xuICAgIHRoaXMucHJldk91dHB1dFNwZW50ID0gb3V0cHV0O1xuICAgIFxuICAgIC8vIHRlc3Qgb3V0cHV0XG4gICAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChvdXRwdXQuZ2V0QW1vdW50KCkpO1xuICAgIGFzc2VydChvdXRwdXQuZ2V0QWNjb3VudEluZGV4KCkgPj0gMCk7XG4gICAgaWYgKG91dHB1dC5nZXRTdWJhZGRyZXNzSW5kZXgoKSAhPT0gdW5kZWZpbmVkKSBhc3NlcnQob3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpID49IDApOyAvLyBUT0RPIChtb25lcm8tcHJvamVjdCk6IGNhbiBiZSB1bmRlZmluZWQgYmVjYXVzZSBpbnB1dHMgbm90IHByb3ZpZGVkIHNvIG9uZSBjcmVhdGVkIGZyb20gb3V0Z29pbmcgdHJhbnNmZXJcbiAgICBcbiAgICAvLyB0ZXN0IG91dHB1dCdzIHR4XG4gICAgYXNzZXJ0KG91dHB1dC5nZXRUeCgpKTtcbiAgICBhc3NlcnQob3V0cHV0LmdldFR4KCkgaW5zdGFuY2VvZiBNb25lcm9UeFdhbGxldCk7XG4gICAgYXNzZXJ0KG91dHB1dC5nZXRUeCgpLmdldEhhc2goKSk7XG4gICAgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRUeCgpLmdldEhhc2goKS5sZW5ndGgsIDY0KTtcbiAgICBhc3NlcnQob3V0cHV0LmdldFR4KCkuZ2V0VmVyc2lvbigpID49IDApO1xuICAgIGFzc2VydChvdXRwdXQuZ2V0VHgoKS5nZXRVbmxvY2tUaW1lKCkgPj0gMCk7XG4gICAgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRUeCgpLmdldElucHV0cygpLmxlbmd0aCwgMSk7XG4gICAgYXNzZXJ0KG91dHB1dC5nZXRUeCgpLmdldElucHV0cygpWzBdID09PSBvdXRwdXQpO1xuICAgIGFzc2VydC5lcXVhbChvdXRwdXQuZ2V0VHgoKS5nZXRPdXRwdXRzKCksIHVuZGVmaW5lZCk7XG4gICAgXG4gICAgLy8gZXh0cmEgaXMgbm90IHNlbnQgb3ZlciB0aGUgd2FzbSBicmlkZ2VcbiAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldFR4KCkuZ2V0RXh0cmEoKSwgdW5kZWZpbmVkKTtcbiAgICBcbiAgICAvLyBhZGQgb3V0Z29pbmcgYW1vdW50IHRvIHJ1bm5pbmcgdG90YWxcbiAgICBpZiAob3V0cHV0LmdldElzTG9ja2VkKCkpIHRoaXMub3V0Z29pbmdUb3RhbCA9IHRoaXMub3V0Z29pbmdUb3RhbCArIChvdXRwdXQuZ2V0QW1vdW50KCkpO1xuICB9XG4gIFxuICBhc3luYyBvbkRvbmUoY2hhaW5IZWlnaHQpIHtcbiAgICBhd2FpdCBzdXBlci5vbkRvbmUoY2hhaW5IZWlnaHQpO1xuICAgIGFzc2VydC5ub3RFcXVhbCh0aGlzLndhbGxldFRlc3RlclByZXZIZWlnaHQsIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0Lm5vdEVxdWFsKHRoaXMucHJldk91dHB1dFJlY2VpdmVkLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5ub3RFcXVhbCh0aGlzLnByZXZPdXRwdXRTcGVudCwgdW5kZWZpbmVkKTtcbiAgICBsZXQgYmFsYW5jZSA9IHRoaXMuaW5jb21pbmdUb3RhbCAtICh0aGlzLm91dGdvaW5nVG90YWwpO1xuICAgIGFzc2VydC5lcXVhbChiYWxhbmNlLnRvU3RyaW5nKCksIChhd2FpdCB0aGlzLndhbGxldC5nZXRCYWxhbmNlKCkpLnRvU3RyaW5nKCkpO1xuICAgIGFzc2VydC5lcXVhbCh0aGlzLnByZXZCYWxhbmNlLnRvU3RyaW5nKCksIChhd2FpdCB0aGlzLndhbGxldC5nZXRCYWxhbmNlKCkpLnRvU3RyaW5nKCkpO1xuICAgIGFzc2VydC5lcXVhbCh0aGlzLnByZXZVbmxvY2tlZEJhbGFuY2UudG9TdHJpbmcoKSwgKGF3YWl0IHRoaXMud2FsbGV0LmdldFVubG9ja2VkQmFsYW5jZSgpKS50b1N0cmluZygpKTtcbiAgfVxuICBcbiAgZ2V0T25OZXdCbG9ja0FmdGVyRG9uZSgpIHtcbiAgICByZXR1cm4gdGhpcy5vbk5ld0Jsb2NrQWZ0ZXJEb25lO1xuICB9XG59XG5cbiJdLCJtYXBwaW5ncyI6InlMQUFBLElBQUFBLE9BQUEsR0FBQUMsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFDLFVBQUEsR0FBQUYsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFFLHVCQUFBLEdBQUFILHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBRyxZQUFBLEdBQUFKLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBSSxrQkFBQSxHQUFBTCxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUssb0JBQUEsR0FBQU4sc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFNLE1BQUEsR0FBQU4sT0FBQTs7Ozs7Ozs7Ozs7Ozs7O0FBZUE7QUFDQTtBQUNBO0FBQ2UsTUFBTU8sb0JBQW9CLFNBQVNDLCtCQUFzQixDQUFDOzs7O0VBSXZFQyxXQUFXQSxDQUFDQyxVQUFVLEVBQUU7SUFDdEIsS0FBSyxDQUFDQSxVQUFVLENBQUM7RUFDbkI7O0VBRUEsTUFBTUMsU0FBU0EsQ0FBQSxFQUFHO0lBQ2hCLE1BQU0sS0FBSyxDQUFDQSxTQUFTLENBQUMsQ0FBQztFQUN6Qjs7RUFF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