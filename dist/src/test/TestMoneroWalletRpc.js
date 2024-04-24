"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _assert = _interopRequireDefault(require("assert"));
var _TestUtils = _interopRequireDefault(require("./utils/TestUtils"));
var _TestMoneroWalletCommon = _interopRequireDefault(require("./TestMoneroWalletCommon"));
var _TestMoneroWalletFull = _interopRequireDefault(require("./TestMoneroWalletFull"));
var _index = require("../../index");






/**
 * Tests the Monero Wallet RPC client and server.
 */
class TestMoneroWalletRpc extends _TestMoneroWalletCommon.default {

  constructor(testConfig) {
    super(testConfig);
  }

  async beforeAll() {
    await super.beforeAll();

    // if full tests ran, wait for full wallet's pool txs to confirm
    if (_TestMoneroWalletFull.default.FULL_TESTS_RUN) {
      let walletFull = await _TestUtils.default.getWalletFull();
      await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(walletFull);
      await walletFull.close(true);
    }
  }

  async beforeEach(currentTest) {
    await super.beforeEach(currentTest);
  }

  async afterAll() {
    await super.afterAll();
    for (let portOffset of Object.keys(_TestUtils.default.WALLET_PORT_OFFSETS)) {// TODO: this breaks encapsulation, use MoneroWalletRpcManager
      console.error("WARNING: Wallet RPC process on port " + (_TestUtils.default.WALLET_RPC_PORT_START + Number(portOffset)) + " was not stopped after all tests, stopping");
      await _TestUtils.default.stopWalletRpcProcess(_TestUtils.default.WALLET_PORT_OFFSETS[portOffset]);
    }
  }

  async afterEach(currentTest) {
    await super.afterEach(currentTest);
  }

  async getTestWallet() {
    return _TestUtils.default.getWalletRpc();
  }

  async getTestDaemon() {
    return _TestUtils.default.getDaemonRpc();
  }

  async openWallet(config) {

    // assign defaults
    config = new _index.MoneroWalletConfig(config);
    if (config.getPassword() === undefined) config.setPassword(_TestUtils.default.WALLET_PASSWORD);
    if (!config.getServer() && !config.getConnectionManager()) config.setServer(await this.daemon.getRpcConnection());

    // create client connected to internal monero-wallet-rpc executable
    let offline = config.getServer() && config.getServer().getUri() === _TestUtils.default.OFFLINE_SERVER_URI;
    let wallet = await _TestUtils.default.startWalletRpcProcess(offline);

    // open wallet
    try {
      await wallet.openWallet(config);
      await wallet.setDaemonConnection(await wallet.getDaemonConnection(), true, undefined); // set daemon as trusted
      if (await wallet.isConnectedToDaemon()) await wallet.startSyncing(_TestUtils.default.SYNC_PERIOD_IN_MS);
      return wallet;
    } catch (err) {
      await _TestUtils.default.stopWalletRpcProcess(wallet);
      throw err;
    }
  }

  async createWallet(config) {

    // assign defaults
    config = new _index.MoneroWalletConfig(config);
    let random = !config.getSeed() && !config.getPrimaryAddress();
    if (!config.getPath()) config.setPath(_index.GenUtils.getUUID());
    if (config.getPassword() === undefined) config.setPassword(_TestUtils.default.WALLET_PASSWORD);
    if (!config.getRestoreHeight() && !random) config.setRestoreHeight(0);
    if (!config.getServer() && !config.getConnectionManager()) config.setServer(await this.daemon.getRpcConnection());

    // create client connected to internal monero-wallet-rpc executable
    let offline = config.getServer() && config.getServer().getUri() === _index.GenUtils.normalizeUri(_TestUtils.default.OFFLINE_SERVER_URI);
    let wallet = await _TestUtils.default.startWalletRpcProcess(offline);

    // create wallet
    try {
      await wallet.createWallet(config);
      await wallet.setDaemonConnection(await wallet.getDaemonConnection(), true, undefined); // set daemon as trusted
      if (await wallet.isConnectedToDaemon()) await wallet.startSyncing(_TestUtils.default.SYNC_PERIOD_IN_MS);
      return wallet;
    } catch (err) {
      await _TestUtils.default.stopWalletRpcProcess(wallet);
      throw err;
    }
  }

  async closeWallet(wallet, save) {
    await wallet.close(save);
    await _TestUtils.default.stopWalletRpcProcess(wallet);
  }

  async getSeedLanguages() {
    return await this.wallet.getSeedLanguages();
  }

  runTests() {
    let that = this;
    let testConfig = this.testConfig;
    describe("TEST MONERO WALLET RPC", function () {

      // register handlers to run before and after tests
      before(async function () {await that.beforeAll();});
      beforeEach(async function () {await that.beforeEach(this.currentTest);});
      after(async function () {await that.afterAll();});
      afterEach(async function () {await that.afterEach(this.currentTest);});

      // run tests specific to wallet rpc
      that.testWalletRpc(testConfig);

      // run common tests
      that.runCommonTests(testConfig);
    });
  }

  // ---------------------------------- PRIVATE -------------------------------

  // rpc-specific tx test
  async testTxWallet(tx, ctx) {
    ctx = Object.assign({}, ctx);

    // run common tests
    await super.testTxWallet(tx, ctx);
  }

  // rpc-specific out-of-range subaddress test
  async testGetSubaddressAddressOutOfRange() {
    let accounts = await this.wallet.getAccounts(true);
    let accountIdx = accounts.length - 1;
    let subaddressIdx = accounts[accountIdx].getSubaddresses().length;
    let address = await this.wallet.getAddress(accountIdx, subaddressIdx);
    _assert.default.equal(address, undefined);
  }

  testInvalidAddressError(err) {
    super.testInvalidAddressError(err);
    _assert.default.equal(-2, err.getCode());
  }

  testInvalidTxHashError(err) {
    super.testInvalidTxHashError(err);
    _assert.default.equal(-8, err.getCode());
  }

  testInvalidTxKeyError(err) {
    super.testInvalidTxKeyError(err);
    _assert.default.equal(-25, err.getCode());
  }

  testInvalidSignatureError(err) {
    super.testInvalidSignatureError(err);
    _assert.default.equal(-1, err.getCode());
  }

  testNoSubaddressError(err) {
    super.testNoSubaddressError(err);
    _assert.default.equal(-1, err.getCode());
  }

  testSignatureHeaderCheckError(err) {
    super.testSignatureHeaderCheckError(err);
    _assert.default.equal(-1, err.getCode());
  }

  testWalletRpc(testConfig) {
    let that = this;
    describe("Tests specific to RPC wallet", function () {

      // ---------------------------- BEGIN TESTS ---------------------------------

      if (testConfig.testNonRelays)
      it("Can create a wallet with a randomly generated mnemonic", async function () {

        // create random wallet with defaults
        let path = _index.GenUtils.getUUID();
        let wallet = await that.createWallet({ path: path });
        let mnemonic = await wallet.getSeed();
        await _index.MoneroUtils.validateMnemonic(mnemonic);
        _assert.default.notEqual(mnemonic, _TestUtils.default.SEED);
        await _index.MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), _TestUtils.default.NETWORK_TYPE);
        await wallet.sync(); // very quick because restore height is chain height
        await that.closeWallet(wallet);

        // create random wallet with non defaults
        path = _index.GenUtils.getUUID();
        wallet = await that.createWallet({ path: path, language: "Spanish" });
        await _index.MoneroUtils.validateMnemonic(await wallet.getSeed());
        _assert.default.notEqual(await wallet.getSeed(), mnemonic);
        mnemonic = await wallet.getSeed();
        await _index.MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), _TestUtils.default.NETWORK_TYPE);

        // attempt to create wallet which already exists
        try {
          await that.createWallet({ path: path, language: "Spanish" });
        } catch (e) {
          _assert.default.equal(e.message, "Wallet already exists: " + path);
          _assert.default.equal(-21, e.getCode());
          _assert.default.equal(mnemonic, await wallet.getSeed());
        }
        await that.closeWallet(wallet);
      });

      if (testConfig.testNonRelays)
      it("Can create a RPC wallet from a mnemonic phrase", async function () {

        // create wallet with mnemonic and defaults
        let path = _index.GenUtils.getUUID();
        let wallet = await that.createWallet({ path: path, password: _TestUtils.default.WALLET_PASSWORD, seed: _TestUtils.default.SEED, restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT });
        _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED);
        _assert.default.equal(await wallet.getPrimaryAddress(), _TestUtils.default.ADDRESS);
        await wallet.sync();
        _assert.default.equal(await wallet.getHeight(), await that.daemon.getHeight());
        let txs = await wallet.getTxs();
        (0, _assert.default)(txs.length > 0); // wallet is used
        _assert.default.equal(txs[0].getHeight(), _TestUtils.default.FIRST_RECEIVE_HEIGHT);
        await that.closeWallet(wallet);

        // create wallet with non-defaults
        path = _index.GenUtils.getUUID();
        wallet = await that.createWallet({ path: path, password: _TestUtils.default.WALLET_PASSWORD, seed: _TestUtils.default.SEED, restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT, language: "German", seedOffset: "my offset!", saveCurrent: false });
        await _index.MoneroUtils.validateMnemonic(await wallet.getSeed());
        _assert.default.notEqual(await wallet.getSeed(), _TestUtils.default.SEED); // mnemonic is different because of offset
        _assert.default.notEqual(await wallet.getPrimaryAddress(), _TestUtils.default.ADDRESS);
        await that.closeWallet(wallet);
      });

      if (testConfig.testNonRelays)
      it("Can open wallets", async function () {

        // create names of test wallets
        let numTestWallets = 3;
        let names = [];
        for (let i = 0; i < numTestWallets; i++) names.push(_index.GenUtils.getUUID());

        // create test wallets
        let mnemonics = [];
        for (let name of names) {
          let wallet = await that.createWallet({ path: name, password: _TestUtils.default.WALLET_PASSWORD });
          mnemonics.push(await wallet.getSeed());
          await that.closeWallet(wallet, true);
        }

        // open test wallets
        let wallets = [];
        for (let i = 0; i < numTestWallets; i++) {
          let wallet = await that.openWallet({ path: names[i], password: _TestUtils.default.WALLET_PASSWORD });
          _assert.default.equal(await wallet.getSeed(), mnemonics[i]);
          wallets.push(wallet);
        }

        // attempt to re-open already opened wallet
        try {
          await that.openWallet({ path: names[numTestWallets - 1], password: _TestUtils.default.WALLET_PASSWORD });
        } catch (e) {
          _assert.default.equal(e.getCode(), -1);
        }

        // attempt to open non-existent
        try {
          await that.openWallet({ path: "btc_integrity", password: _TestUtils.default.WALLET_PASSWORD });
          throw new Error("Cannot open wallet which is already open");
        } catch (e) {
          (0, _assert.default)(e instanceof _index.MoneroError);
          _assert.default.equal(e.getCode(), -1); // -1 indicates wallet does not exist (or is open by another app)
        }

        // close wallets
        for (let wallet of wallets) await that.closeWallet(wallet);
      });

      if (testConfig.testNonRelays)
      it("Can indicate if multisig import is needed for correct balance information", async function () {
        _assert.default.equal(await that.wallet.isMultisigImportNeeded(), false);
      });

      if (testConfig.testNonRelays)
      it("Can tag accounts and query accounts by tag", async function () {

        // get accounts
        let accounts = await that.wallet.getAccounts();
        (0, _assert.default)(accounts.length >= 3, "Not enough accounts to test; run create account test");

        // tag some of the accounts
        let tag = new _index.MoneroAccountTag({ tag: "my_tag_" + _index.GenUtils.getUUID(), label: "my tag label", accountIndices: [0, 1] });
        await that.wallet.tagAccounts(tag.getTag(), tag.getAccountIndices());

        // query accounts by tag
        let taggedAccounts = await that.wallet.getAccounts(undefined, tag.getTag());
        _assert.default.equal(taggedAccounts.length, 2);
        _assert.default.equal(taggedAccounts[0].getIndex(), 0);
        _assert.default.equal(taggedAccounts[0].getTag(), tag.getTag());
        _assert.default.equal(taggedAccounts[1].getIndex(), 1);
        _assert.default.equal(taggedAccounts[1].getTag(), tag.getTag());

        // set tag label
        await that.wallet.setAccountTagLabel(tag.getTag(), tag.getLabel());

        // fetch tags and ensure new tag is contained
        let tags = await that.wallet.getAccountTags();
        (0, _assert.default)(_index.GenUtils.arrayContains(tags, tag));

        // re-tag an account
        let tag2 = new _index.MoneroAccountTag({ tag: "my_tag_" + _index.GenUtils.getUUID(), label: "my tag label 2", accountIndices: [1] });
        await that.wallet.tagAccounts(tag2.getTag(), tag2.getAccountIndices());
        let taggedAccounts2 = await that.wallet.getAccounts(undefined, tag2.getTag());
        _assert.default.equal(taggedAccounts2.length, 1);
        _assert.default.equal(taggedAccounts2[0].getIndex(), 1);
        _assert.default.equal(taggedAccounts2[0].getTag(), tag2.getTag());

        // re-query original tag which only applies to one account now
        taggedAccounts = await that.wallet.getAccounts(undefined, tag.getTag());
        _assert.default.equal(taggedAccounts.length, 1);
        _assert.default.equal(taggedAccounts[0].getIndex(), 0);
        _assert.default.equal(taggedAccounts[0].getTag(), tag.getTag());

        // untag and query accounts
        await that.wallet.untagAccounts([0, 1]);
        _assert.default.equal((await that.wallet.getAccountTags()).length, 0);
        try {
          await that.wallet.getAccounts(undefined, tag.getTag());
          throw new Error("Should have thrown exception with unregistered tag");
        } catch (e) {
          _assert.default.equal(e.getCode(), -1);
        }

        // test that non-existing tag returns no accounts
        try {
          await that.wallet.getAccounts(undefined, "non_existing_tag");
          throw new Error("Should have thrown exception with unregistered tag");
        } catch (e) {
          _assert.default.equal(e.getCode(), -1);
        }
      });

      if (testConfig.testNonRelays)
      it("Can fetch accounts and subaddresses without balance info because this is another RPC call", async function () {
        let accounts = await that.wallet.getAccounts(true, undefined, true);
        (0, _assert.default)(accounts.length > 0);
        for (let account of accounts) {
          (0, _assert.default)(account.getSubaddresses().length > 0);
          for (let subaddress of account.getSubaddresses()) {
            _assert.default.equal(typeof subaddress.getAddress(), "string");
            (0, _assert.default)(subaddress.getAddress().length > 0);
            (0, _assert.default)(subaddress.getAccountIndex() >= 0);
            (0, _assert.default)(subaddress.getIndex() >= 0);
            (0, _assert.default)(subaddress.getLabel() === undefined || typeof subaddress.getLabel() === "string");
            if (typeof subaddress.getLabel() === "string") (0, _assert.default)(subaddress.getLabel().length > 0);
            _assert.default.equal(typeof subaddress.getIsUsed(), "boolean");
            _assert.default.equal(subaddress.getNumUnspentOutputs(), undefined);
            _assert.default.equal(subaddress.getBalance(), undefined);
            _assert.default.equal(subaddress.getUnlockedBalance(), undefined);
          }
        }
      });

      if (testConfig.testNonRelays)
      it("Can rescan spent", async function () {
        await that.wallet.rescanSpent();
      });

      if (testConfig.testNonRelays)
      it("Can save the wallet file", async function () {
        await that.wallet.save();
      });

      if (testConfig.testNonRelays)
      it("Can close a wallet", async function () {

        // create a test wallet
        let path = _index.GenUtils.getUUID();
        let wallet = await that.createWallet({ path: path, password: _TestUtils.default.WALLET_PASSWORD });
        await wallet.sync();
        (0, _assert.default)((await wallet.getHeight()) > 1);

        // close the wallet
        await wallet.close();

        // attempt to interact with the wallet
        try {
          await wallet.getHeight();
        } catch (e) {
          _assert.default.equal(e.getCode(), -13);
          _assert.default.equal(e.message, "No wallet file");
        }
        try {
          await wallet.getSeed();
        } catch (e) {
          _assert.default.equal(e.getCode(), -13);
          _assert.default.equal(e.message, "No wallet file");
        }
        try {
          await wallet.sync();
        } catch (e) {
          _assert.default.equal(e.getCode(), -13);
          _assert.default.equal(e.message, "No wallet file");
        }

        // re-open the wallet
        await wallet.openWallet(path, _TestUtils.default.WALLET_PASSWORD);
        await wallet.sync();
        _assert.default.equal(await wallet.getHeight(), await that.daemon.getHeight());

        // close the wallet
        await that.closeWallet(wallet, true);
      });

      if (false && testConfig.testNonRelays) // disabled so server not actually stopped
        it("Can stop the RPC server", async function () {
          await that.wallet.stop();
        });
    });
  }
}exports.default = TestMoneroWalletRpc;

function testAddressBookEntry(entry) {
  (0, _assert.default)(entry.getIndex() >= 0);
  (0, _assert.default)(entry.getAddress());
  (0, _assert.default)(entry.getDescription());
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYXNzZXJ0IiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfVGVzdFV0aWxzIiwiX1Rlc3RNb25lcm9XYWxsZXRDb21tb24iLCJfVGVzdE1vbmVyb1dhbGxldEZ1bGwiLCJfaW5kZXgiLCJUZXN0TW9uZXJvV2FsbGV0UnBjIiwiVGVzdE1vbmVyb1dhbGxldENvbW1vbiIsImNvbnN0cnVjdG9yIiwidGVzdENvbmZpZyIsImJlZm9yZUFsbCIsIlRlc3RNb25lcm9XYWxsZXRGdWxsIiwiRlVMTF9URVNUU19SVU4iLCJ3YWxsZXRGdWxsIiwiVGVzdFV0aWxzIiwiZ2V0V2FsbGV0RnVsbCIsIldBTExFVF9UWF9UUkFDS0VSIiwid2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sIiwiY2xvc2UiLCJiZWZvcmVFYWNoIiwiY3VycmVudFRlc3QiLCJhZnRlckFsbCIsInBvcnRPZmZzZXQiLCJPYmplY3QiLCJrZXlzIiwiV0FMTEVUX1BPUlRfT0ZGU0VUUyIsImNvbnNvbGUiLCJlcnJvciIsIldBTExFVF9SUENfUE9SVF9TVEFSVCIsIk51bWJlciIsInN0b3BXYWxsZXRScGNQcm9jZXNzIiwiYWZ0ZXJFYWNoIiwiZ2V0VGVzdFdhbGxldCIsImdldFdhbGxldFJwYyIsImdldFRlc3REYWVtb24iLCJnZXREYWVtb25ScGMiLCJvcGVuV2FsbGV0IiwiY29uZmlnIiwiTW9uZXJvV2FsbGV0Q29uZmlnIiwiZ2V0UGFzc3dvcmQiLCJ1bmRlZmluZWQiLCJzZXRQYXNzd29yZCIsIldBTExFVF9QQVNTV09SRCIsImdldFNlcnZlciIsImdldENvbm5lY3Rpb25NYW5hZ2VyIiwic2V0U2VydmVyIiwiZGFlbW9uIiwiZ2V0UnBjQ29ubmVjdGlvbiIsIm9mZmxpbmUiLCJnZXRVcmkiLCJPRkZMSU5FX1NFUlZFUl9VUkkiLCJ3YWxsZXQiLCJzdGFydFdhbGxldFJwY1Byb2Nlc3MiLCJzZXREYWVtb25Db25uZWN0aW9uIiwiZ2V0RGFlbW9uQ29ubmVjdGlvbiIsImlzQ29ubmVjdGVkVG9EYWVtb24iLCJzdGFydFN5bmNpbmciLCJTWU5DX1BFUklPRF9JTl9NUyIsImVyciIsImNyZWF0ZVdhbGxldCIsInJhbmRvbSIsImdldFNlZWQiLCJnZXRQcmltYXJ5QWRkcmVzcyIsImdldFBhdGgiLCJzZXRQYXRoIiwiR2VuVXRpbHMiLCJnZXRVVUlEIiwiZ2V0UmVzdG9yZUhlaWdodCIsInNldFJlc3RvcmVIZWlnaHQiLCJub3JtYWxpemVVcmkiLCJjbG9zZVdhbGxldCIsInNhdmUiLCJnZXRTZWVkTGFuZ3VhZ2VzIiwicnVuVGVzdHMiLCJ0aGF0IiwiZGVzY3JpYmUiLCJiZWZvcmUiLCJhZnRlciIsInRlc3RXYWxsZXRScGMiLCJydW5Db21tb25UZXN0cyIsInRlc3RUeFdhbGxldCIsInR4IiwiY3R4IiwiYXNzaWduIiwidGVzdEdldFN1YmFkZHJlc3NBZGRyZXNzT3V0T2ZSYW5nZSIsImFjY291bnRzIiwiZ2V0QWNjb3VudHMiLCJhY2NvdW50SWR4IiwibGVuZ3RoIiwic3ViYWRkcmVzc0lkeCIsImdldFN1YmFkZHJlc3NlcyIsImFkZHJlc3MiLCJnZXRBZGRyZXNzIiwiYXNzZXJ0IiwiZXF1YWwiLCJ0ZXN0SW52YWxpZEFkZHJlc3NFcnJvciIsImdldENvZGUiLCJ0ZXN0SW52YWxpZFR4SGFzaEVycm9yIiwidGVzdEludmFsaWRUeEtleUVycm9yIiwidGVzdEludmFsaWRTaWduYXR1cmVFcnJvciIsInRlc3ROb1N1YmFkZHJlc3NFcnJvciIsInRlc3RTaWduYXR1cmVIZWFkZXJDaGVja0Vycm9yIiwidGVzdE5vblJlbGF5cyIsIml0IiwicGF0aCIsIm1uZW1vbmljIiwiTW9uZXJvVXRpbHMiLCJ2YWxpZGF0ZU1uZW1vbmljIiwibm90RXF1YWwiLCJTRUVEIiwidmFsaWRhdGVBZGRyZXNzIiwiTkVUV09SS19UWVBFIiwic3luYyIsImxhbmd1YWdlIiwiZSIsIm1lc3NhZ2UiLCJwYXNzd29yZCIsInNlZWQiLCJyZXN0b3JlSGVpZ2h0IiwiRklSU1RfUkVDRUlWRV9IRUlHSFQiLCJBRERSRVNTIiwiZ2V0SGVpZ2h0IiwidHhzIiwiZ2V0VHhzIiwic2VlZE9mZnNldCIsInNhdmVDdXJyZW50IiwibnVtVGVzdFdhbGxldHMiLCJuYW1lcyIsImkiLCJwdXNoIiwibW5lbW9uaWNzIiwibmFtZSIsIndhbGxldHMiLCJFcnJvciIsIk1vbmVyb0Vycm9yIiwiaXNNdWx0aXNpZ0ltcG9ydE5lZWRlZCIsInRhZyIsIk1vbmVyb0FjY291bnRUYWciLCJsYWJlbCIsImFjY291bnRJbmRpY2VzIiwidGFnQWNjb3VudHMiLCJnZXRUYWciLCJnZXRBY2NvdW50SW5kaWNlcyIsInRhZ2dlZEFjY291bnRzIiwiZ2V0SW5kZXgiLCJzZXRBY2NvdW50VGFnTGFiZWwiLCJnZXRMYWJlbCIsInRhZ3MiLCJnZXRBY2NvdW50VGFncyIsImFycmF5Q29udGFpbnMiLCJ0YWcyIiwidGFnZ2VkQWNjb3VudHMyIiwidW50YWdBY2NvdW50cyIsImFjY291bnQiLCJzdWJhZGRyZXNzIiwiZ2V0QWNjb3VudEluZGV4IiwiZ2V0SXNVc2VkIiwiZ2V0TnVtVW5zcGVudE91dHB1dHMiLCJnZXRCYWxhbmNlIiwiZ2V0VW5sb2NrZWRCYWxhbmNlIiwicmVzY2FuU3BlbnQiLCJzdG9wIiwiZXhwb3J0cyIsImRlZmF1bHQiLCJ0ZXN0QWRkcmVzc0Jvb2tFbnRyeSIsImVudHJ5IiwiZ2V0RGVzY3JpcHRpb24iXSwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdGVzdC9UZXN0TW9uZXJvV2FsbGV0UnBjLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhc3NlcnQgZnJvbSBcImFzc2VydFwiO1xuaW1wb3J0IFRlc3RVdGlscyBmcm9tIFwiLi91dGlscy9UZXN0VXRpbHNcIjtcbmltcG9ydCBUZXN0TW9uZXJvV2FsbGV0Q29tbW9uIGZyb20gXCIuL1Rlc3RNb25lcm9XYWxsZXRDb21tb25cIjtcbmltcG9ydCBUZXN0TW9uZXJvV2FsbGV0RnVsbCBmcm9tIFwiLi9UZXN0TW9uZXJvV2FsbGV0RnVsbFwiO1xuaW1wb3J0IHtNb25lcm9FcnJvcixcbiAgICAgICAgR2VuVXRpbHMsXG4gICAgICAgIE1vbmVyb1dhbGxldENvbmZpZyxcbiAgICAgICAgTW9uZXJvVXRpbHMsXG4gICAgICAgIE1vbmVyb0FjY291bnRUYWcsXG4gICAgICAgIE1vbmVyb1dhbGxldFJwY30gZnJvbSBcIi4uLy4uL2luZGV4XCI7XG5cbi8qKlxuICogVGVzdHMgdGhlIE1vbmVybyBXYWxsZXQgUlBDIGNsaWVudCBhbmQgc2VydmVyLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUZXN0TW9uZXJvV2FsbGV0UnBjIGV4dGVuZHMgVGVzdE1vbmVyb1dhbGxldENvbW1vbiB7XG5cbiAgICBjb25zdHJ1Y3Rvcih0ZXN0Q29uZmlnKSB7XG4gICAgICAgIHN1cGVyKHRlc3RDb25maWcpO1xuICAgIH1cblxuICAgIGFzeW5jIGJlZm9yZUFsbCgpIHtcbiAgICAgICAgYXdhaXQgc3VwZXIuYmVmb3JlQWxsKCk7XG5cbiAgICAgICAgLy8gaWYgZnVsbCB0ZXN0cyByYW4sIHdhaXQgZm9yIGZ1bGwgd2FsbGV0J3MgcG9vbCB0eHMgdG8gY29uZmlybVxuICAgICAgICBpZiAoVGVzdE1vbmVyb1dhbGxldEZ1bGwuRlVMTF9URVNUU19SVU4pIHtcbiAgICAgICAgICAgIGxldCB3YWxsZXRGdWxsID0gYXdhaXQgVGVzdFV0aWxzLmdldFdhbGxldEZ1bGwoKTtcbiAgICAgICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wod2FsbGV0RnVsbCk7XG4gICAgICAgICAgICBhd2FpdCB3YWxsZXRGdWxsLmNsb3NlKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgYmVmb3JlRWFjaChjdXJyZW50VGVzdCkge1xuICAgICAgICBhd2FpdCBzdXBlci5iZWZvcmVFYWNoKGN1cnJlbnRUZXN0KTtcbiAgICB9XG5cbiAgICBhc3luYyBhZnRlckFsbCgpIHtcbiAgICAgICAgYXdhaXQgc3VwZXIuYWZ0ZXJBbGwoKTtcbiAgICAgICAgZm9yIChsZXQgcG9ydE9mZnNldCBvZiBPYmplY3Qua2V5cyhUZXN0VXRpbHMuV0FMTEVUX1BPUlRfT0ZGU0VUUykpIHsgLy8gVE9ETzogdGhpcyBicmVha3MgZW5jYXBzdWxhdGlvbiwgdXNlIE1vbmVyb1dhbGxldFJwY01hbmFnZXJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJXQVJOSU5HOiBXYWxsZXQgUlBDIHByb2Nlc3Mgb24gcG9ydCBcIiArIChUZXN0VXRpbHMuV0FMTEVUX1JQQ19QT1JUX1NUQVJUICsgTnVtYmVyKHBvcnRPZmZzZXQpKSArIFwiIHdhcyBub3Qgc3RvcHBlZCBhZnRlciBhbGwgdGVzdHMsIHN0b3BwaW5nXCIpO1xuICAgICAgICAgICAgYXdhaXQgVGVzdFV0aWxzLnN0b3BXYWxsZXRScGNQcm9jZXNzKFRlc3RVdGlscy5XQUxMRVRfUE9SVF9PRkZTRVRTW3BvcnRPZmZzZXRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGFmdGVyRWFjaChjdXJyZW50VGVzdCkge1xuICAgICAgICBhd2FpdCBzdXBlci5hZnRlckVhY2goY3VycmVudFRlc3QpO1xuICAgIH1cblxuICAgIGFzeW5jIGdldFRlc3RXYWxsZXQoKSB7XG4gICAgICAgIHJldHVybiBUZXN0VXRpbHMuZ2V0V2FsbGV0UnBjKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2V0VGVzdERhZW1vbigpIHtcbiAgICAgICAgcmV0dXJuIFRlc3RVdGlscy5nZXREYWVtb25ScGMoKTtcbiAgICB9XG5cbiAgICBhc3luYyBvcGVuV2FsbGV0KGNvbmZpZykge1xuXG4gICAgICAgIC8vIGFzc2lnbiBkZWZhdWx0c1xuICAgICAgICBjb25maWcgPSBuZXcgTW9uZXJvV2FsbGV0Q29uZmlnKGNvbmZpZyk7XG4gICAgICAgIGlmIChjb25maWcuZ2V0UGFzc3dvcmQoKSA9PT0gdW5kZWZpbmVkKSBjb25maWcuc2V0UGFzc3dvcmQoVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCk7XG4gICAgICAgIGlmICghY29uZmlnLmdldFNlcnZlcigpICYmICFjb25maWcuZ2V0Q29ubmVjdGlvbk1hbmFnZXIoKSkgY29uZmlnLnNldFNlcnZlcihhd2FpdCB0aGlzLmRhZW1vbi5nZXRScGNDb25uZWN0aW9uKCkpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSBjbGllbnQgY29ubmVjdGVkIHRvIGludGVybmFsIG1vbmVyby13YWxsZXQtcnBjIGV4ZWN1dGFibGVcbiAgICAgICAgbGV0IG9mZmxpbmUgPSBjb25maWcuZ2V0U2VydmVyKCkgJiYgY29uZmlnLmdldFNlcnZlcigpLmdldFVyaSgpID09PSBUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJO1xuICAgICAgICBsZXQgd2FsbGV0ID0gYXdhaXQgVGVzdFV0aWxzLnN0YXJ0V2FsbGV0UnBjUHJvY2VzcyhvZmZsaW5lKTtcblxuICAgICAgICAvLyBvcGVuIHdhbGxldFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgd2FsbGV0Lm9wZW5XYWxsZXQoY29uZmlnKTtcbiAgICAgICAgICAgIGF3YWl0IHdhbGxldC5zZXREYWVtb25Db25uZWN0aW9uKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCksIHRydWUsIHVuZGVmaW5lZCk7IC8vIHNldCBkYWVtb24gYXMgdHJ1c3RlZFxuICAgICAgICAgICAgaWYgKGF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpIGF3YWl0IHdhbGxldC5zdGFydFN5bmNpbmcoVGVzdFV0aWxzLlNZTkNfUEVSSU9EX0lOX01TKTtcbiAgICAgICAgICAgIHJldHVybiB3YWxsZXQ7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgYXdhaXQgVGVzdFV0aWxzLnN0b3BXYWxsZXRScGNQcm9jZXNzKHdhbGxldCk7XG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVXYWxsZXQoY29uZmlnOiBQYXJ0aWFsPE1vbmVyb1dhbGxldENvbmZpZz4pIHtcblxuICAgICAgICAvLyBhc3NpZ24gZGVmYXVsdHNcbiAgICAgICAgY29uZmlnID0gbmV3IE1vbmVyb1dhbGxldENvbmZpZyhjb25maWcpO1xuICAgICAgICBsZXQgcmFuZG9tID0gIWNvbmZpZy5nZXRTZWVkKCkgJiYgIWNvbmZpZy5nZXRQcmltYXJ5QWRkcmVzcygpO1xuICAgICAgICBpZiAoIWNvbmZpZy5nZXRQYXRoKCkpIGNvbmZpZy5zZXRQYXRoKEdlblV0aWxzLmdldFVVSUQoKSk7XG4gICAgICAgIGlmIChjb25maWcuZ2V0UGFzc3dvcmQoKSA9PT0gdW5kZWZpbmVkKSBjb25maWcuc2V0UGFzc3dvcmQoVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCk7XG4gICAgICAgIGlmICghY29uZmlnLmdldFJlc3RvcmVIZWlnaHQoKSAmJiAhcmFuZG9tKSBjb25maWcuc2V0UmVzdG9yZUhlaWdodCgwKTtcbiAgICAgICAgaWYgKCFjb25maWcuZ2V0U2VydmVyKCkgJiYgIWNvbmZpZy5nZXRDb25uZWN0aW9uTWFuYWdlcigpKSBjb25maWcuc2V0U2VydmVyKGF3YWl0IHRoaXMuZGFlbW9uLmdldFJwY0Nvbm5lY3Rpb24oKSk7XG5cbiAgICAgICAgLy8gY3JlYXRlIGNsaWVudCBjb25uZWN0ZWQgdG8gaW50ZXJuYWwgbW9uZXJvLXdhbGxldC1ycGMgZXhlY3V0YWJsZVxuICAgICAgICBsZXQgb2ZmbGluZSA9IGNvbmZpZy5nZXRTZXJ2ZXIoKSAmJiBjb25maWcuZ2V0U2VydmVyKCkuZ2V0VXJpKCkgPT09IEdlblV0aWxzLm5vcm1hbGl6ZVVyaShUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJKTtcbiAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IFRlc3RVdGlscy5zdGFydFdhbGxldFJwY1Byb2Nlc3Mob2ZmbGluZSk7XG5cbiAgICAgICAgLy8gY3JlYXRlIHdhbGxldFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgd2FsbGV0LmNyZWF0ZVdhbGxldChjb25maWcpO1xuICAgICAgICAgICAgYXdhaXQgd2FsbGV0LnNldERhZW1vbkNvbm5lY3Rpb24oYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSwgdHJ1ZSwgdW5kZWZpbmVkKTsgLy8gc2V0IGRhZW1vbiBhcyB0cnVzdGVkXG4gICAgICAgICAgICBpZiAoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSkgYXdhaXQgd2FsbGV0LnN0YXJ0U3luY2luZyhUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMpO1xuICAgICAgICAgICAgcmV0dXJuIHdhbGxldDtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBhd2FpdCBUZXN0VXRpbHMuc3RvcFdhbGxldFJwY1Byb2Nlc3Mod2FsbGV0KTtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGNsb3NlV2FsbGV0KHdhbGxldCwgc2F2ZT8pIHtcbiAgICAgICAgYXdhaXQgd2FsbGV0LmNsb3NlKHNhdmUpO1xuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuc3RvcFdhbGxldFJwY1Byb2Nlc3Mod2FsbGV0KTtcbiAgICB9XG5cbiAgICBhc3luYyBnZXRTZWVkTGFuZ3VhZ2VzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0ICh0aGlzLndhbGxldCBhcyBNb25lcm9XYWxsZXRScGMpLmdldFNlZWRMYW5ndWFnZXMoKTtcbiAgICB9XG5cbiAgICBydW5UZXN0cygpIHtcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xuICAgICAgICBsZXQgdGVzdENvbmZpZyA9IHRoaXMudGVzdENvbmZpZztcbiAgICAgICAgZGVzY3JpYmUoXCJURVNUIE1PTkVSTyBXQUxMRVQgUlBDXCIsIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvLyByZWdpc3RlciBoYW5kbGVycyB0byBydW4gYmVmb3JlIGFuZCBhZnRlciB0ZXN0c1xuICAgICAgICAgICAgYmVmb3JlKGFzeW5jIGZ1bmN0aW9uKCkgeyBhd2FpdCB0aGF0LmJlZm9yZUFsbCgpOyB9KTtcbiAgICAgICAgICAgIGJlZm9yZUVhY2goYXN5bmMgZnVuY3Rpb24oKSB7IGF3YWl0IHRoYXQuYmVmb3JlRWFjaCh0aGlzLmN1cnJlbnRUZXN0KTsgfSk7XG4gICAgICAgICAgICBhZnRlcihhc3luYyBmdW5jdGlvbigpIHsgYXdhaXQgdGhhdC5hZnRlckFsbCgpOyB9KTtcbiAgICAgICAgICAgIGFmdGVyRWFjaChhc3luYyBmdW5jdGlvbigpIHsgYXdhaXQgdGhhdC5hZnRlckVhY2godGhpcy5jdXJyZW50VGVzdCk7IH0pO1xuXG4gICAgICAgICAgICAvLyBydW4gdGVzdHMgc3BlY2lmaWMgdG8gd2FsbGV0IHJwY1xuICAgICAgICAgICAgdGhhdC50ZXN0V2FsbGV0UnBjKHRlc3RDb25maWcpO1xuXG4gICAgICAgICAgICAvLyBydW4gY29tbW9uIHRlc3RzXG4gICAgICAgICAgICB0aGF0LnJ1bkNvbW1vblRlc3RzKHRlc3RDb25maWcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFBSSVZBVEUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gICAgLy8gcnBjLXNwZWNpZmljIHR4IHRlc3RcbiAgICBhc3luYyB0ZXN0VHhXYWxsZXQodHgsIGN0eCkge1xuICAgICAgICBjdHggPSBPYmplY3QuYXNzaWduKHt9LCBjdHgpO1xuXG4gICAgICAgIC8vIHJ1biBjb21tb24gdGVzdHNcbiAgICAgICAgYXdhaXQgc3VwZXIudGVzdFR4V2FsbGV0KHR4LCBjdHgpO1xuICAgIH1cblxuICAgIC8vIHJwYy1zcGVjaWZpYyBvdXQtb2YtcmFuZ2Ugc3ViYWRkcmVzcyB0ZXN0XG4gICAgYXN5bmMgdGVzdEdldFN1YmFkZHJlc3NBZGRyZXNzT3V0T2ZSYW5nZSgpIHtcbiAgICAgICAgbGV0IGFjY291bnRzID0gYXdhaXQgdGhpcy53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSk7XG4gICAgICAgIGxldCBhY2NvdW50SWR4ID0gYWNjb3VudHMubGVuZ3RoIC0gMTtcbiAgICAgICAgbGV0IHN1YmFkZHJlc3NJZHggPSBhY2NvdW50c1thY2NvdW50SWR4XS5nZXRTdWJhZGRyZXNzZXMoKS5sZW5ndGg7XG4gICAgICAgIGxldCBhZGRyZXNzID0gYXdhaXQgdGhpcy53YWxsZXQuZ2V0QWRkcmVzcyhhY2NvdW50SWR4LCBzdWJhZGRyZXNzSWR4KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGFkZHJlc3MsIHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgdGVzdEludmFsaWRBZGRyZXNzRXJyb3IoZXJyKSB7XG4gICAgICAgIHN1cGVyLnRlc3RJbnZhbGlkQWRkcmVzc0Vycm9yKGVycik7XG4gICAgICAgIGFzc2VydC5lcXVhbCgtMiwgZXJyLmdldENvZGUoKSk7XG4gICAgfVxuXG4gICAgdGVzdEludmFsaWRUeEhhc2hFcnJvcihlcnIpIHtcbiAgICAgICAgc3VwZXIudGVzdEludmFsaWRUeEhhc2hFcnJvcihlcnIpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoLTgsIGVyci5nZXRDb2RlKCkpO1xuICAgIH1cblxuICAgIHRlc3RJbnZhbGlkVHhLZXlFcnJvcihlcnIpIHtcbiAgICAgICAgc3VwZXIudGVzdEludmFsaWRUeEtleUVycm9yKGVycik7XG4gICAgICAgIGFzc2VydC5lcXVhbCgtMjUsIGVyci5nZXRDb2RlKCkpO1xuICAgIH1cblxuICAgIHRlc3RJbnZhbGlkU2lnbmF0dXJlRXJyb3IoZXJyKSB7XG4gICAgICAgIHN1cGVyLnRlc3RJbnZhbGlkU2lnbmF0dXJlRXJyb3IoZXJyKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKC0xLCBlcnIuZ2V0Q29kZSgpKTtcbiAgICB9XG5cbiAgICB0ZXN0Tm9TdWJhZGRyZXNzRXJyb3IoZXJyKSB7XG4gICAgICAgIHN1cGVyLnRlc3ROb1N1YmFkZHJlc3NFcnJvcihlcnIpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoLTEsIGVyci5nZXRDb2RlKCkpO1xuICAgIH1cblxuICAgIHRlc3RTaWduYXR1cmVIZWFkZXJDaGVja0Vycm9yKGVycikge1xuICAgICAgICBzdXBlci50ZXN0U2lnbmF0dXJlSGVhZGVyQ2hlY2tFcnJvcihlcnIpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoLTEsIGVyci5nZXRDb2RlKCkpO1xuICAgIH1cblxuICAgIHByb3RlY3RlZCB0ZXN0V2FsbGV0UnBjKHRlc3RDb25maWcpIHtcbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xuICAgICAgICBkZXNjcmliZShcIlRlc3RzIHNwZWNpZmljIHRvIFJQQyB3YWxsZXRcIiwgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gQkVHSU4gVEVTVFMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAgICAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICAgICAgICAgICAgaXQoXCJDYW4gY3JlYXRlIGEgd2FsbGV0IHdpdGggYSByYW5kb21seSBnZW5lcmF0ZWQgbW5lbW9uaWNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIHJhbmRvbSB3YWxsZXQgd2l0aCBkZWZhdWx0c1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aCA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHsgcGF0aDogcGF0aCB9KTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1uZW1vbmljID0gYXdhaXQgd2FsbGV0LmdldFNlZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVNbmVtb25pYyhtbmVtb25pYyk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5ub3RFcXVhbChtbmVtb25pYywgVGVzdFV0aWxzLlNFRUQpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBNb25lcm9VdGlscy52YWxpZGF0ZUFkZHJlc3MoYXdhaXQgd2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB3YWxsZXQuc3luYygpOyAgLy8gdmVyeSBxdWljayBiZWNhdXNlIHJlc3RvcmUgaGVpZ2h0IGlzIGNoYWluIGhlaWdodFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHdhbGxldCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIHJhbmRvbSB3YWxsZXQgd2l0aCBub24gZGVmYXVsdHNcbiAgICAgICAgICAgICAgICAgICAgcGF0aCA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgICAgICAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoeyBwYXRoOiBwYXRoLCBsYW5ndWFnZTogXCJTcGFuaXNoXCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlTW5lbW9uaWMoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5ub3RFcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZCgpLCBtbmVtb25pYyk7XG4gICAgICAgICAgICAgICAgICAgIG1uZW1vbmljID0gYXdhaXQgd2FsbGV0LmdldFNlZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVBZGRyZXNzKGF3YWl0IHdhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBUZXN0VXRpbHMuTkVUV09SS19UWVBFKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBhdHRlbXB0IHRvIGNyZWF0ZSB3YWxsZXQgd2hpY2ggYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHsgcGF0aDogcGF0aCwgbGFuZ3VhZ2U6IFwiU3BhbmlzaFwiIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlLm1lc3NhZ2UsIFwiV2FsbGV0IGFscmVhZHkgZXhpc3RzOiBcIiArIHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKC0yMSwgZS5nZXRDb2RlKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwobW5lbW9uaWMsIGF3YWl0IHdhbGxldC5nZXRTZWVkKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQod2FsbGV0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgICAgICAgICAgICBpdChcIkNhbiBjcmVhdGUgYSBSUEMgd2FsbGV0IGZyb20gYSBtbmVtb25pYyBwaHJhc2VcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIHdhbGxldCB3aXRoIG1uZW1vbmljIGFuZCBkZWZhdWx0c1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aCA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHsgcGF0aDogcGF0aCwgcGFzc3dvcmQ6IFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQsIHNlZWQ6IFRlc3RVdGlscy5TRUVELCByZXN0b3JlSGVpZ2h0OiBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQgfSk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZCgpLCBUZXN0VXRpbHMuU0VFRCk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgVGVzdFV0aWxzLkFERFJFU1MpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB3YWxsZXQuc3luYygpO1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldEhlaWdodCgpLCBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0eHMgPSBhd2FpdCB3YWxsZXQuZ2V0VHhzKCk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydCh0eHMubGVuZ3RoID4gMCk7IC8vIHdhbGxldCBpcyB1c2VkXG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0eHNbMF0uZ2V0SGVpZ2h0KCksIFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQod2FsbGV0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgd2FsbGV0IHdpdGggbm9uLWRlZmF1bHRzXG4gICAgICAgICAgICAgICAgICAgIHBhdGggPSBHZW5VdGlscy5nZXRVVUlEKCk7XG4gICAgICAgICAgICAgICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHsgcGF0aDogcGF0aCwgcGFzc3dvcmQ6IFRlc3RVdGlscy5XQUxMRVRfUEFTU1dPUkQsIHNlZWQ6IFRlc3RVdGlscy5TRUVELCByZXN0b3JlSGVpZ2h0OiBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQsIGxhbmd1YWdlOiBcIkdlcm1hblwiLCBzZWVkT2Zmc2V0OiBcIm15IG9mZnNldCFcIiwgc2F2ZUN1cnJlbnQ6IGZhbHNlIH0pO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBNb25lcm9VdGlscy52YWxpZGF0ZU1uZW1vbmljKGF3YWl0IHdhbGxldC5nZXRTZWVkKCkpO1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQubm90RXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSwgVGVzdFV0aWxzLlNFRUQpOyAgLy8gbW5lbW9uaWMgaXMgZGlmZmVyZW50IGJlY2F1c2Ugb2Ygb2Zmc2V0XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5ub3RFcXVhbChhd2FpdCB3YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgVGVzdFV0aWxzLkFERFJFU1MpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHdhbGxldCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICAgICAgICAgICAgaXQoXCJDYW4gb3BlbiB3YWxsZXRzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBuYW1lcyBvZiB0ZXN0IHdhbGxldHNcbiAgICAgICAgICAgICAgICAgICAgbGV0IG51bVRlc3RXYWxsZXRzID0gMztcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVRlc3RXYWxsZXRzOyBpKyspIG5hbWVzLnB1c2goR2VuVXRpbHMuZ2V0VVVJRCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGUgdGVzdCB3YWxsZXRzXG4gICAgICAgICAgICAgICAgICAgIGxldCBtbmVtb25pY3M6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IG5hbWUgb2YgbmFtZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB3YWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7IHBhdGg6IG5hbWUsIHBhc3N3b3JkOiBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbW5lbW9uaWNzLnB1c2goYXdhaXQgd2FsbGV0LmdldFNlZWQoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHdhbGxldCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBvcGVuIHRlc3Qgd2FsbGV0c1xuICAgICAgICAgICAgICAgICAgICBsZXQgd2FsbGV0czogTW9uZXJvV2FsbGV0UnBjW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1UZXN0V2FsbGV0czsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgd2FsbGV0ID0gYXdhaXQgdGhhdC5vcGVuV2FsbGV0KHsgcGF0aDogbmFtZXNbaV0sIHBhc3N3b3JkOiBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkKCksIG1uZW1vbmljc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YWxsZXRzLnB1c2god2FsbGV0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGF0dGVtcHQgdG8gcmUtb3BlbiBhbHJlYWR5IG9wZW5lZCB3YWxsZXRcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoYXQub3BlbldhbGxldCh7IHBhdGg6IG5hbWVzW251bVRlc3RXYWxsZXRzIC0gMV0sIHBhc3N3b3JkOiBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlLmdldENvZGUoKSwgLTEpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gYXR0ZW1wdCB0byBvcGVuIG5vbi1leGlzdGVudFxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhhdC5vcGVuV2FsbGV0KHsgcGF0aDogXCJidGNfaW50ZWdyaXR5XCIsIHBhc3N3b3JkOiBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG9wZW4gd2FsbGV0IHdoaWNoIGlzIGFscmVhZHkgb3BlblwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZSBpbnN0YW5jZW9mIE1vbmVyb0Vycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlLmdldENvZGUoKSwgLTEpOyAgLy8gLTEgaW5kaWNhdGVzIHdhbGxldCBkb2VzIG5vdCBleGlzdCAob3IgaXMgb3BlbiBieSBhbm90aGVyIGFwcClcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNsb3NlIHdhbGxldHNcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgd2FsbGV0IG9mIHdhbGxldHMpIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQod2FsbGV0KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgICAgICAgICAgICBpdChcIkNhbiBpbmRpY2F0ZSBpZiBtdWx0aXNpZyBpbXBvcnQgaXMgbmVlZGVkIGZvciBjb3JyZWN0IGJhbGFuY2UgaW5mb3JtYXRpb25cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB0aGF0LndhbGxldC5pc011bHRpc2lnSW1wb3J0TmVlZGVkKCksIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgICAgICAgICAgICBpdChcIkNhbiB0YWcgYWNjb3VudHMgYW5kIHF1ZXJ5IGFjY291bnRzIGJ5IHRhZ1wiLCBhc3luYyBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgICAgICAvLyBnZXQgYWNjb3VudHNcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFjY291bnRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGFjY291bnRzLmxlbmd0aCA+PSAzLCBcIk5vdCBlbm91Z2ggYWNjb3VudHMgdG8gdGVzdDsgcnVuIGNyZWF0ZSBhY2NvdW50IHRlc3RcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gdGFnIHNvbWUgb2YgdGhlIGFjY291bnRzXG4gICAgICAgICAgICAgICAgICAgIGxldCB0YWcgPSBuZXcgTW9uZXJvQWNjb3VudFRhZyh7dGFnOiBcIm15X3RhZ19cIiArIEdlblV0aWxzLmdldFVVSUQoKSwgbGFiZWw6IFwibXkgdGFnIGxhYmVsXCIsIGFjY291bnRJbmRpY2VzOiBbMCwgMV19KTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQudGFnQWNjb3VudHModGFnLmdldFRhZygpLCB0YWcuZ2V0QWNjb3VudEluZGljZXMoKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gcXVlcnkgYWNjb3VudHMgYnkgdGFnXG4gICAgICAgICAgICAgICAgICAgIGxldCB0YWdnZWRBY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKHVuZGVmaW5lZCwgdGFnLmdldFRhZygpKTtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhZ2dlZEFjY291bnRzLmxlbmd0aCwgMik7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWdnZWRBY2NvdW50c1swXS5nZXRJbmRleCgpLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhZ2dlZEFjY291bnRzWzBdLmdldFRhZygpLCB0YWcuZ2V0VGFnKCkpO1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGFnZ2VkQWNjb3VudHNbMV0uZ2V0SW5kZXgoKSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWdnZWRBY2NvdW50c1sxXS5nZXRUYWcoKSwgdGFnLmdldFRhZygpKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGFnIGxhYmVsXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnNldEFjY291bnRUYWdMYWJlbCh0YWcuZ2V0VGFnKCksIHRhZy5nZXRMYWJlbCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBmZXRjaCB0YWdzIGFuZCBlbnN1cmUgbmV3IHRhZyBpcyBjb250YWluZWRcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRhZ3MgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50VGFncygpO1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQoR2VuVXRpbHMuYXJyYXlDb250YWlucyh0YWdzLCB0YWcpKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyByZS10YWcgYW4gYWNjb3VudFxuICAgICAgICAgICAgICAgICAgICBsZXQgdGFnMiA9IG5ldyBNb25lcm9BY2NvdW50VGFnKHt0YWc6IFwibXlfdGFnX1wiICsgR2VuVXRpbHMuZ2V0VVVJRCgpLCBsYWJlbDogXCJteSB0YWcgbGFiZWwgMlwiLCBhY2NvdW50SW5kaWNlczogWzFdfSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnRhZ0FjY291bnRzKHRhZzIuZ2V0VGFnKCksIHRhZzIuZ2V0QWNjb3VudEluZGljZXMoKSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0YWdnZWRBY2NvdW50czIgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cyh1bmRlZmluZWQsIHRhZzIuZ2V0VGFnKCkpXG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWdnZWRBY2NvdW50czIubGVuZ3RoLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhZ2dlZEFjY291bnRzMlswXS5nZXRJbmRleCgpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhZ2dlZEFjY291bnRzMlswXS5nZXRUYWcoKSwgdGFnMi5nZXRUYWcoKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gcmUtcXVlcnkgb3JpZ2luYWwgdGFnIHdoaWNoIG9ubHkgYXBwbGllcyB0byBvbmUgYWNjb3VudCBub3dcbiAgICAgICAgICAgICAgICAgICAgdGFnZ2VkQWNjb3VudHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cyh1bmRlZmluZWQsIHRhZy5nZXRUYWcoKSk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWdnZWRBY2NvdW50cy5sZW5ndGgsIDEpO1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGFnZ2VkQWNjb3VudHNbMF0uZ2V0SW5kZXgoKSwgMCk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWdnZWRBY2NvdW50c1swXS5nZXRUYWcoKSwgdGFnLmdldFRhZygpKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyB1bnRhZyBhbmQgcXVlcnkgYWNjb3VudHNcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQudW50YWdBY2NvdW50cyhbMCwgMV0pO1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRUYWdzKCkpLmxlbmd0aCwgMCk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cyh1bmRlZmluZWQsIHRhZy5nZXRUYWcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXhjZXB0aW9uIHdpdGggdW5yZWdpc3RlcmVkIHRhZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5nZXRDb2RlKCksIC0xKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIHRlc3QgdGhhdCBub24tZXhpc3RpbmcgdGFnIHJldHVybnMgbm8gYWNjb3VudHNcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKHVuZGVmaW5lZCwgXCJub25fZXhpc3RpbmdfdGFnXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvbiB3aXRoIHVucmVnaXN0ZXJlZCB0YWdcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGUuZ2V0Q29kZSgpLCAtMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgICAgICAgICAgICBpdChcIkNhbiBmZXRjaCBhY2NvdW50cyBhbmQgc3ViYWRkcmVzc2VzIHdpdGhvdXQgYmFsYW5jZSBpbmZvIGJlY2F1c2UgdGhpcyBpcyBhbm90aGVyIFJQQyBjYWxsXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgYWNjb3VudHMgPSBhd2FpdCAodGhhdC53YWxsZXQgYXMgTW9uZXJvV2FsbGV0UnBjKS5nZXRBY2NvdW50cyh0cnVlLCB1bmRlZmluZWQsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQoYWNjb3VudHMubGVuZ3RoID4gMCk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgYWNjb3VudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzcyBvZiBhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBzdWJhZGRyZXNzLmdldEFkZHJlc3MoKSwgXCJzdHJpbmdcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3MuZ2V0QWRkcmVzcygpLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChzdWJhZGRyZXNzLmdldEFjY291bnRJbmRleCgpID49IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChzdWJhZGRyZXNzLmdldEluZGV4KCkgPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3MuZ2V0TGFiZWwoKSA9PT0gdW5kZWZpbmVkIHx8IHR5cGVvZiBzdWJhZGRyZXNzLmdldExhYmVsKCkgPT09IFwic3RyaW5nXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3ViYWRkcmVzcy5nZXRMYWJlbCgpID09PSBcInN0cmluZ1wiKSBhc3NlcnQoc3ViYWRkcmVzcy5nZXRMYWJlbCgpLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0eXBlb2Ygc3ViYWRkcmVzcy5nZXRJc1VzZWQoKSwgXCJib29sZWFuXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChzdWJhZGRyZXNzLmdldE51bVVuc3BlbnRPdXRwdXRzKCksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHN1YmFkZHJlc3MuZ2V0QmFsYW5jZSgpLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChzdWJhZGRyZXNzLmdldFVubG9ja2VkQmFsYW5jZSgpLCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICAgICAgICAgICAgaXQoXCJDYW4gcmVzY2FuIHNwZW50XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5yZXNjYW5TcGVudCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgICAgICAgICAgIGl0KFwiQ2FuIHNhdmUgdGhlIHdhbGxldCBmaWxlXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICAgICAgICAgICAgaXQoXCJDYW4gY2xvc2UgYSB3YWxsZXRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY3JlYXRlIGEgdGVzdCB3YWxsZXRcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSBHZW5VdGlscy5nZXRVVUlEKCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB3YWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7IHBhdGg6IHBhdGgsIHBhc3N3b3JkOiBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEIH0pO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB3YWxsZXQuc3luYygpO1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQoKGF3YWl0IHdhbGxldC5nZXRIZWlnaHQoKSkgPiAxKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjbG9zZSB0aGUgd2FsbGV0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHdhbGxldC5jbG9zZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGF0dGVtcHQgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgd2FsbGV0XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGUuZ2V0Q29kZSgpLCAtMTMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJObyB3YWxsZXQgZmlsZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgd2FsbGV0LmdldFNlZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5nZXRDb2RlKCksIC0xMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5tZXNzYWdlLCBcIk5vIHdhbGxldCBmaWxlXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB3YWxsZXQuc3luYygpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlLmdldENvZGUoKSwgLTEzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlLm1lc3NhZ2UsIFwiTm8gd2FsbGV0IGZpbGVcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyByZS1vcGVuIHRoZSB3YWxsZXRcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgd2FsbGV0Lm9wZW5XYWxsZXQocGF0aCwgVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHdhbGxldC5zeW5jKCk7XG4gICAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0SGVpZ2h0KCksIGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjbG9zZSB0aGUgd2FsbGV0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQod2FsbGV0LCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGZhbHNlICYmIHRlc3RDb25maWcudGVzdE5vblJlbGF5cykgIC8vIGRpc2FibGVkIHNvIHNlcnZlciBub3QgYWN0dWFsbHkgc3RvcHBlZFxuICAgICAgICAgICAgICAgIGl0KFwiQ2FuIHN0b3AgdGhlIFJQQyBzZXJ2ZXJcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0ICh0aGF0LndhbGxldCBhcyBNb25lcm9XYWxsZXRScGMpLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0ZXN0QWRkcmVzc0Jvb2tFbnRyeShlbnRyeSkge1xuICAgIGFzc2VydChlbnRyeS5nZXRJbmRleCgpID49IDApO1xuICAgIGFzc2VydChlbnRyeS5nZXRBZGRyZXNzKCkpO1xuICAgIGFzc2VydChlbnRyeS5nZXREZXNjcmlwdGlvbigpKTtcbn0iXSwibWFwcGluZ3MiOiJ5TEFBQSxJQUFBQSxPQUFBLEdBQUFDLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBQyxVQUFBLEdBQUFGLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBRSx1QkFBQSxHQUFBSCxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUcscUJBQUEsR0FBQUosc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFJLE1BQUEsR0FBQUosT0FBQTs7Ozs7OztBQU9BO0FBQ0E7QUFDQTtBQUNlLE1BQU1LLG1CQUFtQixTQUFTQywrQkFBc0IsQ0FBQzs7RUFFcEVDLFdBQVdBLENBQUNDLFVBQVUsRUFBRTtJQUNwQixLQUFLLENBQUNBLFVBQVUsQ0FBQztFQUNyQjs7RUFFQSxNQUFNQyxTQUFTQSxDQUFBLEVBQUc7SUFDZCxNQUFNLEtBQUssQ0FBQ0EsU0FBUyxDQUFDLENBQUM7O0lBRXZCO0lBQ0EsSUFBSUMsNkJBQW9CLENBQUNDLGNBQWMsRUFBRTtNQUNyQyxJQUFJQyxVQUFVLEdBQUcsTUFBTUMsa0JBQVMsQ0FBQ0MsYUFBYSxDQUFDLENBQUM7TUFDaEQsTUFBTUQsa0JBQVMsQ0FBQ0UsaUJBQWlCLENBQUNDLDJCQUEyQixDQUFDSixVQUFVLENBQUM7TUFDekUs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