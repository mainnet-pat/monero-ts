"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _assert = _interopRequireDefault(require("assert"));
var _StartMining = _interopRequireDefault(require("./utils/StartMining"));
var _TestUtils = _interopRequireDefault(require("./utils/TestUtils"));
var _index = require("../../index");



































// test constants
const SEND_DIVISOR = BigInt(10);
const SEND_MAX_DIFF = BigInt(60);
const MAX_TX_PROOFS = 25; // maximum number of transactions to check for each proof, undefined to check all
const NUM_BLOCKS_LOCKED = 10;

/**
 * Test a wallet for common functionality.
 */
class TestMoneroWalletCommon {

  // instance variables




  /**
   * Construct the tester.
   * 
   * @param {object} testConfig - test configuration
   */
  constructor(testConfig) {
    this.testConfig = testConfig;
  }

  /**
   * Called before all wallet tests.
   */
  async beforeAll() {
    console.log("Before all");
    this.wallet = await this.getTestWallet();
    this.daemon = await this.getTestDaemon();
    _TestUtils.default.WALLET_TX_TRACKER.reset(); // all wallets need to wait for txs to confirm to reliably sync
    await _index.LibraryUtils.loadKeysModule(); // for wasm dependents like address validation
  }

  /**
   * Called before each wallet test.
   * 
   @param {object} currentTest - invoked with Mocha current test
   */
  async beforeEach(currentTest) {
    console.log("Before test \"" + currentTest.title + "\"");
  }

  /**
   * Called after all wallet tests.
   */
  async afterAll() {
    console.log("After all");

    // try to stop mining
    try {await this.daemon.stopMining();}
    catch (err) {}

    // close wallet
    await this.wallet.close(true);
  }

  /**
   * Called after each wallet test.
   * 
   @param {object} currentTest - invoked with Mocha current test
   */
  async afterEach(currentTest) {
    console.log("After test \"" + currentTest.title + "\"");
  }

  /**
   * Get the daemon to test.
   * 
   * @return the daemon to test
   */
  async getTestDaemon() {
    return _TestUtils.default.getDaemonRpc();
  }

  /**
   * Get the main wallet to test.
   * 
   * @return {Promise<MoneroWallet>} the wallet to test
   */
  async getTestWallet() {
    throw new Error("Subclass must implement");
  }

  /**
   * Open a test wallet with default configuration for each wallet type.
   * 
   * @param config - configures the wallet to open
   * @return MoneroWallet is the opened wallet
   */
  async openWallet(config) {
    throw new Error("Subclass must implement");
  }

  /**
   * Create a test wallet with default configuration for each wallet type.
   * 
   * @param [config] - configures the wallet to create
   * @return {Promise<MoneroWallet>} is the created wallet
   */
  async createWallet(config) {
    throw new Error("Subclass must implement");
  }

  /**
   * Close a test wallet with customization for each wallet type. 
   * 
   * @param {MoneroWallet} wallet - the wallet to close
   * @param {boolean} [save] - whether or not to save the wallet
   * @return {Promise<void>}
   */
  async closeWallet(wallet, save) {
    throw new Error("Subclass must implement");
  }

  /**
   * Get the wallet's supported languages for the seed phrase.  This is an
   * instance method for wallet rpc and a static utility for other wallets.
   * 
   * @return {Promise<string[]>} the wallet's supported languages
   */
  async getSeedLanguages() {
    throw new Error("Subclass must implement");
  }

  // ------------------------------ BEGIN TESTS -------------------------------

  runCommonTests(testConfig) {
    let that = this;
    testConfig = Object.assign({}, this.testConfig, testConfig);
    describe("Common Wallet Tests" + (testConfig.liteMode ? " (lite mode)" : ""), function () {

      // start tests by sending to multiple addresses
      if (testConfig.testRelays)
      it("Can send to multiple addresses in a single transaction", async function () {
        await testSendToMultiple(5, 3, false);
      });

      //  --------------------------- TEST NON RELAYS -------------------------

      if (testConfig.testNonRelays)
      it("Can create a random wallet", async function () {
        let e1 = undefined;
        try {
          let wallet = await that.createWallet();
          let path;try {path = await wallet.getPath();} catch (e) {} // TODO: factor out keys-only tests?
          let e2 = undefined;
          try {
            await _index.MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), _TestUtils.default.NETWORK_TYPE);
            await _index.MoneroUtils.validatePrivateViewKey(await wallet.getPrivateViewKey());
            await _index.MoneroUtils.validatePrivateSpendKey(await wallet.getPrivateSpendKey());
            await _index.MoneroUtils.validateMnemonic(await wallet.getSeed());
            if (!(wallet instanceof _index.MoneroWalletRpc)) _assert.default.equal(await wallet.getSeedLanguage(), _index.MoneroWallet.DEFAULT_LANGUAGE); // TODO monero-wallet-rpc: get mnemonic language
          } catch (e) {
            e2 = e;
          }
          await that.closeWallet(wallet);
          if (e2 !== undefined) throw e2;

          // attempt to create wallet at same path
          if (path) {
            try {
              await that.createWallet({ path: path });
              throw new Error("Should have thrown error");
            } catch (e) {
              _assert.default.equal(e.message, "Wallet already exists: " + path);
            }
          }

          // attempt to create wallet with unknown language
          try {
            await that.createWallet({ language: "english" }); // TODO: support lowercase?
            throw new Error("Should have thrown error");
          } catch (e) {
            _assert.default.equal(e.message, "Unknown language: english");
          }
        } catch (e) {
          e1 = e;
        }

        if (e1 !== undefined) throw e1;
      });

      if (testConfig.testNonRelays)
      it("Can create a wallet from a mnemonic phrase.", async function () {
        let e1 = undefined;
        try {

          // save for comparison
          let primaryAddress = await that.wallet.getPrimaryAddress();
          let privateViewKey = await that.wallet.getPrivateViewKey();
          let privateSpendKey = await that.wallet.getPrivateSpendKey();

          // recreate test wallet from seed
          let wallet = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT });
          let path;try {path = await wallet.getPath();} catch (e) {} // TODO: factor out keys-only tests?
          let e2 = undefined;
          try {
            _assert.default.equal(await wallet.getPrimaryAddress(), primaryAddress);
            _assert.default.equal(await wallet.getPrivateViewKey(), privateViewKey);
            _assert.default.equal(await wallet.getPrivateSpendKey(), privateSpendKey);
            if (!(wallet instanceof _index.MoneroWalletRpc)) _assert.default.equal(await wallet.getSeedLanguage(), _index.MoneroWallet.DEFAULT_LANGUAGE);
          } catch (e) {
            e2 = e;
          }
          await that.closeWallet(wallet);
          if (e2 !== undefined) throw e2;

          // attempt to create wallet with two missing words
          try {
            let invalidMnemonic = "memoir desk algebra inbound innocent unplugs fully okay five inflamed giant factual ritual toyed topic snake unhappy guarded tweezers haunted inundate giant";
            await that.createWallet(new _index.MoneroWalletConfig().setSeed(invalidMnemonic).setRestoreHeight(_TestUtils.default.FIRST_RECEIVE_HEIGHT));
          } catch (err) {
            _assert.default.equal("Invalid mnemonic", err.message);
          }

          // attempt to create wallet at same path
          if (path) {
            try {
              await that.createWallet({ path: path });
              throw new Error("Should have thrown error");
            } catch (e) {
              _assert.default.equal(e.message, "Wallet already exists: " + path);
            }
          }
        } catch (e) {
          e1 = e;
        }

        if (e1 !== undefined) throw e1;
      });

      if (testConfig.testNonRelays)
      it("Can create a wallet from a mnemonic phrase with a seed offset", async function () {
        let e1 = undefined;
        try {

          // create test wallet with offset
          let wallet = await that.createWallet({ seed: _TestUtils.default.SEED, restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT, seedOffset: "my secret offset!" });
          let e2 = undefined;
          try {
            await _index.MoneroUtils.validateMnemonic(await wallet.getSeed());
            _assert.default.notEqual(await wallet.getSeed(), _TestUtils.default.SEED);
            await _index.MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), _TestUtils.default.NETWORK_TYPE);
            _assert.default.notEqual(await wallet.getPrimaryAddress(), _TestUtils.default.ADDRESS);
            if (!(wallet instanceof _index.MoneroWalletRpc)) _assert.default.equal(await wallet.getSeedLanguage(), _index.MoneroWallet.DEFAULT_LANGUAGE); // TODO monero-wallet-rpc: support
          } catch (e) {
            e2 = e;
          }
          await that.closeWallet(wallet);
          if (e2 !== undefined) throw e2;
        } catch (e) {
          e1 = e;
        }

        if (e1 !== undefined) throw e1;
      });

      if (testConfig.testNonRelays)
      it("Can create a wallet from keys", async function () {
        let e1 = undefined;
        try {

          // save for comparison
          let primaryAddress = await that.wallet.getPrimaryAddress();
          let privateViewKey = await that.wallet.getPrivateViewKey();
          let privateSpendKey = await that.wallet.getPrivateSpendKey();

          // recreate test wallet from keys
          let wallet = await that.createWallet({ primaryAddress: primaryAddress, privateViewKey: privateViewKey, privateSpendKey: privateSpendKey, restoreHeight: await that.daemon.getHeight() });
          let path;try {path = await wallet.getPath();} catch (e) {} // TODO: factor out keys-only tests?
          let e2 = undefined;
          try {
            _assert.default.equal(await wallet.getPrimaryAddress(), primaryAddress);
            _assert.default.equal(await wallet.getPrivateViewKey(), privateViewKey);
            _assert.default.equal(await wallet.getPrivateSpendKey(), privateSpendKey);
            if (!(wallet instanceof _index.MoneroWalletKeys) && !(await wallet.isConnectedToDaemon())) console.log("WARNING: wallet created from keys is not connected to authenticated daemon"); // TODO monero-project: keys wallets not connected
            if (!(wallet instanceof _index.MoneroWalletRpc)) {
              _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED); // TODO monero-wallet-rpc: cannot get mnemonic from wallet created from keys?
              _assert.default.equal(await wallet.getSeedLanguage(), _index.MoneroWallet.DEFAULT_LANGUAGE);
            }
          } catch (e) {
            e2 = e;
          }
          await that.closeWallet(wallet);
          if (e2 !== undefined) throw e2;

          // recreate test wallet from spend key
          if (!(wallet instanceof _index.MoneroWalletRpc)) {// TODO monero-wallet-rpc: cannot create wallet from spend key?
            wallet = await that.createWallet({ privateSpendKey: privateSpendKey, restoreHeight: await that.daemon.getHeight() });
            try {path = await wallet.getPath();} catch (e) {} // TODO: factor out keys-only tests?
            e2 = undefined;
            try {
              _assert.default.equal(await wallet.getPrimaryAddress(), primaryAddress);
              _assert.default.equal(await wallet.getPrivateViewKey(), privateViewKey);
              _assert.default.equal(await wallet.getPrivateSpendKey(), privateSpendKey);
              if (!(wallet instanceof _index.MoneroWalletKeys) && !(await wallet.isConnectedToDaemon())) console.log("WARNING: wallet created from keys is not connected to authenticated daemon"); // TODO monero-project: keys wallets not connected
              if (!(wallet instanceof _index.MoneroWalletRpc)) {
                _assert.default.equal(await wallet.getSeed(), _TestUtils.default.SEED); // TODO monero-wallet-rpc: cannot get seed from wallet created from keys?
                _assert.default.equal(await wallet.getSeedLanguage(), _index.MoneroWallet.DEFAULT_LANGUAGE);
              }
            } catch (e) {
              e2 = e;
            }
            await that.closeWallet(wallet);
            if (e2 !== undefined) throw e2;
          }

          // attempt to create wallet at same path
          if (path) {
            try {
              await that.createWallet({ path: path });
              throw new Error("Should have thrown error");
            } catch (e) {
              _assert.default.equal(e.message, "Wallet already exists: " + path);
            }
          }
        } catch (e) {
          e1 = e;
        }

        if (e1 !== undefined) throw e1;
      });

      if (testConfig.testRelays)
      it("Can create wallets with subaddress lookahead", async function () {
        let err;
        let receiver = undefined;
        try {

          // create wallet with high subaddress lookahead
          receiver = await that.createWallet({
            accountLookahead: 1,
            subaddressLookahead: 100000
          });

          // transfer funds to subaddress with high index
          await that.wallet.createTx(new _index.MoneroTxConfig().
          setAccountIndex(0).
          addDestination((await receiver.getSubaddress(0, 85000)).getAddress(), _TestUtils.default.MAX_FEE).
          setRelay(true));

          // observe unconfirmed funds
          await _index.GenUtils.waitFor(1000);
          await receiver.sync();
          (0, _assert.default)((await receiver.getBalance()) > 0n);
        } catch (e) {
          err = e;
        }

        // close wallet and throw if error occurred
        if (receiver) await that.closeWallet(receiver);
        if (err) throw err;
      });

      if (testConfig.testNonRelays)
      it("Can get the wallet's version", async function () {
        let version = await that.wallet.getVersion();
        _assert.default.equal(typeof version.getNumber(), "number");
        (0, _assert.default)(version.getNumber() > 0);
        _assert.default.equal(typeof version.getIsRelease(), "boolean");
      });

      if (testConfig.testNonRelays)
      it("Can get the wallet's path", async function () {

        // create random wallet
        let wallet = await that.createWallet();

        // set a random attribute
        let uuid = _index.GenUtils.getUUID();
        await wallet.setAttribute("uuid", uuid);

        // record the wallet's path then save and close
        let path = await wallet.getPath();
        await that.closeWallet(wallet, true);

        // re-open the wallet using its path
        wallet = await that.openWallet({ path: path });

        // test the attribute
        _assert.default.equal(await wallet.getAttribute("uuid"), uuid);
        await that.closeWallet(wallet);
      });

      if (testConfig.testNonRelays)
      it("Can set the daemon connection", async function () {
        let err;
        let wallet;
        try {

          // create random wallet with default daemon connection
          wallet = await that.createWallet();
          _assert.default.deepEqual(await wallet.getDaemonConnection(), new _index.MoneroRpcConnection(_TestUtils.default.DAEMON_RPC_CONFIG));
          _assert.default.equal(await wallet.isConnectedToDaemon(), true);

          // set empty server uri
          await wallet.setDaemonConnection("");
          _assert.default.equal(await wallet.getDaemonConnection(), undefined);
          _assert.default.equal(await wallet.isConnectedToDaemon(), false);

          // set offline server uri
          await wallet.setDaemonConnection(_TestUtils.default.OFFLINE_SERVER_URI);
          _assert.default.deepEqual(await wallet.getDaemonConnection(), new _index.MoneroRpcConnection(_TestUtils.default.OFFLINE_SERVER_URI));
          _assert.default.equal(await wallet.isConnectedToDaemon(), false);

          // set daemon with wrong credentials
          await wallet.setDaemonConnection({ uri: _TestUtils.default.DAEMON_RPC_CONFIG.uri, username: "wronguser", password: "wrongpass" });
          _assert.default.deepEqual((await wallet.getDaemonConnection()).getConfig(), new _index.MoneroRpcConnection(_TestUtils.default.DAEMON_RPC_CONFIG.uri, "wronguser", "wrongpass").getConfig());
          if (!_TestUtils.default.DAEMON_RPC_CONFIG.username) _assert.default.equal(await wallet.isConnectedToDaemon(), true); // TODO: monerod without authentication works with bad credentials?
          else _assert.default.equal(await wallet.isConnectedToDaemon(), false);

          // set daemon with authentication
          await wallet.setDaemonConnection(_TestUtils.default.DAEMON_RPC_CONFIG);
          _assert.default.deepEqual(await wallet.getDaemonConnection(), new _index.MoneroRpcConnection(_TestUtils.default.DAEMON_RPC_CONFIG.uri, _TestUtils.default.DAEMON_RPC_CONFIG.username, _TestUtils.default.DAEMON_RPC_CONFIG.password));
          (0, _assert.default)(await wallet.isConnectedToDaemon());

          // nullify daemon connection
          await wallet.setDaemonConnection(undefined);
          _assert.default.equal(await wallet.getDaemonConnection(), undefined);
          await wallet.setDaemonConnection(_TestUtils.default.DAEMON_RPC_CONFIG.uri);
          _assert.default.deepEqual((await wallet.getDaemonConnection()).getConfig(), new _index.MoneroRpcConnection(_TestUtils.default.DAEMON_RPC_CONFIG.uri).getConfig());
          await wallet.setDaemonConnection(undefined);
          _assert.default.equal(await wallet.getDaemonConnection(), undefined);

          // set daemon uri to non-daemon
          await wallet.setDaemonConnection("www.getmonero.org");
          _assert.default.deepEqual((await wallet.getDaemonConnection()).getConfig(), new _index.MoneroRpcConnection("www.getmonero.org").getConfig());
          (0, _assert.default)(!(await wallet.isConnectedToDaemon()));

          // set daemon to invalid uri
          await wallet.setDaemonConnection("abc123");
          (0, _assert.default)(!(await wallet.isConnectedToDaemon()));

          // attempt to sync
          try {
            await wallet.sync();
            throw new Error("Exception expected");
          } catch (e1) {
            _assert.default.equal(e1.message, "Wallet is not connected to daemon");
          }
        } catch (e) {
          err = e;
        }

        // close wallet and throw if error occurred
        if (wallet) await that.closeWallet(wallet);
        if (err) throw err;
      });

      if (testConfig.testNonRelays)
      it("Can use a connection manager", async function () {
        let err;
        let wallet = undefined;
        try {

          // create connection manager with monerod connections
          let connectionManager = new _index.MoneroConnectionManager();
          let connection1 = new _index.MoneroRpcConnection(await that.daemon.getRpcConnection()).setPriority(1);
          let connection2 = new _index.MoneroRpcConnection("localhost:48081").setPriority(2);
          await connectionManager.setConnection(connection1);
          await connectionManager.addConnection(connection2);

          // create wallet with connection manager
          wallet = await that.createWallet(new _index.MoneroWalletConfig().setServer("").setConnectionManager(connectionManager));
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
          (0, _assert.default)(await wallet.isConnectedToDaemon());

          // set manager's connection
          await connectionManager.setConnection(connection2);
          await _index.GenUtils.waitFor(_TestUtils.default.AUTO_CONNECT_TIMEOUT_MS);
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), connection2.getUri());

          // reopen wallet with connection manager
          let path = await wallet.getPath();
          await that.closeWallet(wallet);
          wallet = undefined;
          wallet = await that.openWallet(new _index.MoneroWalletConfig().setServer("").setConnectionManager(connectionManager).setPath(path));
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), connection2.getUri());

          // disconnect
          await connectionManager.setConnection(undefined);
          _assert.default.equal(await wallet.getDaemonConnection(), undefined);
          (0, _assert.default)(!(await wallet.isConnectedToDaemon()));

          // start polling connections
          connectionManager.startPolling(_TestUtils.default.SYNC_PERIOD_IN_MS);

          // test that wallet auto connects
          await _index.GenUtils.waitFor(_TestUtils.default.AUTO_CONNECT_TIMEOUT_MS);
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), connection1.getUri());
          (0, _assert.default)(await wallet.isConnectedToDaemon());

          // test override with bad connection
          wallet.addListener(new _index.MoneroWalletListener());
          connectionManager.setAutoSwitch(false);
          await connectionManager.setConnection("http://foo.bar.xyz");
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), "http://foo.bar.xyz");
          _assert.default.equal(false, await wallet.isConnectedToDaemon());
          await _index.GenUtils.waitFor(5000);
          _assert.default.equal(false, await wallet.isConnectedToDaemon());

          // set to another connection manager
          let connectionManager2 = new _index.MoneroConnectionManager();
          await connectionManager2.setConnection(connection2);
          await wallet.setConnectionManager(connectionManager2);
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), connection2.getUri());

          // unset connection manager
          await wallet.setConnectionManager();
          _assert.default.equal(await wallet.getConnectionManager(), undefined);
          _assert.default.equal((await wallet.getDaemonConnection()).getUri(), connection2.getUri());

          // stop polling and close
          connectionManager.stopPolling();
        } catch (e) {
          err = e;
        }

        // close wallet and throw if error occurred
        if (wallet) await that.closeWallet(wallet);
        if (err) throw err;
      });

      if (testConfig.testNonRelays)
      it("Can get the seed as a mnemonic phrase", async function () {
        let mnemonic = await that.wallet.getSeed();
        await _index.MoneroUtils.validateMnemonic(mnemonic);
        _assert.default.equal(mnemonic, _TestUtils.default.SEED);
      });

      if (testConfig.testNonRelays)
      it("Can get the language of the seed", async function () {
        let language = await that.wallet.getSeedLanguage();
        _assert.default.equal(language, "English");
      });

      if (testConfig.testNonRelays)
      it("Can get a list of supported languages for the seed", async function () {
        let languages = await that.getSeedLanguages();
        (0, _assert.default)(Array.isArray(languages));
        (0, _assert.default)(languages.length);
        for (let language of languages) (0, _assert.default)(language);
      });

      if (testConfig.testNonRelays)
      it("Can get the private view key", async function () {
        let privateViewKey = await that.wallet.getPrivateViewKey();
        await _index.MoneroUtils.validatePrivateViewKey(privateViewKey);
      });

      if (testConfig.testNonRelays)
      it("Can get the private spend key", async function () {
        let privateSpendKey = await that.wallet.getPrivateSpendKey();
        await _index.MoneroUtils.validatePrivateSpendKey(privateSpendKey);
      });

      if (testConfig.testNonRelays)
      it("Can get the public view key", async function () {
        let publicViewKey = await that.wallet.getPublicViewKey();
        await _index.MoneroUtils.validatePublicViewKey(publicViewKey);
      });

      if (testConfig.testNonRelays)
      it("Can get the public spend key", async function () {
        let publicSpendKey = await that.wallet.getPublicSpendKey();
        await _index.MoneroUtils.validatePublicSpendKey(publicSpendKey);
      });

      if (testConfig.testNonRelays)
      it("Can get the primary address", async function () {
        let primaryAddress = await that.wallet.getPrimaryAddress();
        await _index.MoneroUtils.validateAddress(primaryAddress, _TestUtils.default.NETWORK_TYPE);
        _assert.default.equal(primaryAddress, await that.wallet.getAddress(0, 0));
      });

      if (testConfig.testNonRelays)
      it("Can get the address of a subaddress at a specified account and subaddress index", async function () {
        _assert.default.equal((await that.wallet.getSubaddress(0, 0)).getAddress(), await that.wallet.getPrimaryAddress());
        for (let account of await that.wallet.getAccounts(true)) {
          for (let subaddress of account.getSubaddresses()) {
            _assert.default.equal(await that.wallet.getAddress(account.getIndex(), subaddress.getIndex()), subaddress.getAddress());
          }
        }
      });

      if (testConfig.testNonRelays)
      it("Can get addresses out of range of used accounts and subaddresses", async function () {
        await that.testGetSubaddressAddressOutOfRange();
      });

      if (testConfig.testNonRelays)
      it("Can get the account and subaddress indices of an address", async function () {

        // get last subaddress to test
        let accounts = await that.wallet.getAccounts(true);
        let accountIdx = accounts.length - 1;
        let subaddressIdx = accounts[accountIdx].getSubaddresses().length - 1;
        let address = await that.wallet.getAddress(accountIdx, subaddressIdx);
        (0, _assert.default)(address);
        _assert.default.equal(typeof address, "string");

        // get address index
        let subaddress = await that.wallet.getAddressIndex(address);
        _assert.default.equal(subaddress.getAccountIndex(), accountIdx);
        _assert.default.equal(subaddress.getIndex(), subaddressIdx);

        // test valid but unfound address
        let nonWalletAddress = await _TestUtils.default.getExternalWalletAddress();
        try {
          subaddress = await that.wallet.getAddressIndex(nonWalletAddress);
          throw new Error("fail");
        } catch (e) {
          _assert.default.equal(e.message, "Address doesn't belong to the wallet");
        }

        // test invalid address
        try {
          subaddress = await that.wallet.getAddressIndex("this is definitely not an address");
          throw new Error("fail");
        } catch (e) {
          _assert.default.equal(e.message, "Invalid address");
        }
      });

      if (testConfig.testNonRelays)
      it("Can get an integrated address given a payment id", async function () {

        // save address for later comparison
        let address = await that.wallet.getPrimaryAddress();

        // test valid payment id
        let paymentId = "03284e41c342f036";
        let integratedAddress = await that.wallet.getIntegratedAddress(undefined, paymentId);
        _assert.default.equal(integratedAddress.getStandardAddress(), address);
        _assert.default.equal(integratedAddress.getPaymentId(), paymentId);

        // test undefined payment id which generates a new one
        integratedAddress = await that.wallet.getIntegratedAddress();
        _assert.default.equal(integratedAddress.getStandardAddress(), address);
        (0, _assert.default)(integratedAddress.getPaymentId().length);

        // test with primary address
        let primaryAddress = await that.wallet.getPrimaryAddress();
        integratedAddress = await that.wallet.getIntegratedAddress(primaryAddress, paymentId);
        _assert.default.equal(integratedAddress.getStandardAddress(), primaryAddress);
        _assert.default.equal(integratedAddress.getPaymentId(), paymentId);

        // test with subaddress
        if ((await that.wallet.getSubaddresses(0)).length < 2) await that.wallet.createSubaddress(0);
        let subaddress = (await that.wallet.getSubaddress(0, 1)).getAddress();
        try {
          integratedAddress = await that.wallet.getIntegratedAddress(subaddress);
          throw new Error("Getting integrated address from subaddress should have failed");
        } catch (e) {
          _assert.default.equal(e.message, "Subaddress shouldn't be used");
        }

        // test invalid payment id
        let invalidPaymentId = "invalid_payment_id_123456";
        try {
          integratedAddress = await that.wallet.getIntegratedAddress(undefined, invalidPaymentId);
          throw new Error("Getting integrated address with invalid payment id " + invalidPaymentId + " should have thrown a RPC exception");
        } catch (e) {
          //assert.equal(e.getCode(), -5);  // TODO: error codes part of rpc only?
          _assert.default.equal(e.message, "Invalid payment ID: " + invalidPaymentId);
        }
      });

      if (testConfig.testNonRelays)
      it("Can decode an integrated address", async function () {
        let integratedAddress = await that.wallet.getIntegratedAddress(undefined, "03284e41c342f036");
        let decodedAddress = await that.wallet.decodeIntegratedAddress(integratedAddress.toString());
        _assert.default.deepEqual(decodedAddress, integratedAddress);

        // decode invalid address
        try {
          console.log(await that.wallet.decodeIntegratedAddress("bad address"));
          throw new Error("Should have failed decoding bad address");
        } catch (err) {
          _assert.default.equal(err.message, "Invalid address");
        }
      });

      // TODO: test syncing from start height
      if (testConfig.testNonRelays)
      it("Can sync (without progress)", async function () {
        let numBlocks = 100;
        let chainHeight = await that.daemon.getHeight();
        (0, _assert.default)(chainHeight >= numBlocks);
        let result = await that.wallet.sync(chainHeight - numBlocks); // sync to end of chain
        (0, _assert.default)(result instanceof _index.MoneroSyncResult);
        (0, _assert.default)(result.getNumBlocksFetched() >= 0);
        _assert.default.equal(typeof result.getReceivedMoney(), "boolean");
      });

      if (testConfig.testNonRelays)
      it("Can get the current height that the wallet is synchronized to", async function () {
        let height = await that.wallet.getHeight();
        (0, _assert.default)(height >= 0);
      });

      if (testConfig.testNonRelays)
      it("Can get a blockchain height by date", async function () {

        // collect dates to test starting 100 days ago
        const DAY_MS = 24 * 60 * 60 * 1000;
        let yesterday = new Date(new Date().getTime() - DAY_MS); // TODO monero-project: today's date can throw exception as "in future" so we test up to yesterday
        let dates = [];
        for (let i = 99; i >= 0; i--) {
          dates.push(new Date(yesterday.getTime() - DAY_MS * i)); // subtract i days
        }

        // test heights by date
        let lastHeight = undefined;
        for (let date of dates) {
          let height = await that.wallet.getHeightByDate(date.getYear() + 1900, date.getMonth() + 1, date.getDate());
          (0, _assert.default)(height >= 0);
          if (lastHeight != undefined) (0, _assert.default)(height >= lastHeight);
          lastHeight = height;
        }
        (0, _assert.default)(lastHeight >= 0);
        let height = await that.wallet.getHeight();
        (0, _assert.default)(height >= 0);

        // test future date
        try {
          let tomorrow = new Date(yesterday.getTime() + DAY_MS * 2);
          await that.wallet.getHeightByDate(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
          throw new Error("Expected exception on future date");
        } catch (err) {
          _assert.default.equal(err.message, "specified date is in the future");
        }
      });

      if (testConfig.testNonRelays)
      it("Can get the locked and unlocked balances of the wallet, accounts, and subaddresses", async function () {

        // fetch accounts with all info as reference
        let accounts = await that.wallet.getAccounts(true);

        // test that balances add up between accounts and wallet
        let accountsBalance = BigInt(0);
        let accountsUnlockedBalance = BigInt(0);
        for (let account of accounts) {
          accountsBalance = accountsBalance + account.getBalance();
          accountsUnlockedBalance = accountsUnlockedBalance + account.getUnlockedBalance();

          // test that balances add up between subaddresses and accounts
          let subaddressesBalance = BigInt(0);
          let subaddressesUnlockedBalance = BigInt(0);
          for (let subaddress of account.getSubaddresses()) {
            subaddressesBalance = subaddressesBalance + subaddress.getBalance();
            subaddressesUnlockedBalance = subaddressesUnlockedBalance + subaddress.getUnlockedBalance();

            // test that balances are consistent with getAccounts() call
            _assert.default.equal((await that.wallet.getBalance(subaddress.getAccountIndex(), subaddress.getIndex())).toString(), subaddress.getBalance().toString());
            _assert.default.equal((await that.wallet.getUnlockedBalance(subaddress.getAccountIndex(), subaddress.getIndex())).toString(), subaddress.getUnlockedBalance().toString());
          }
          _assert.default.equal((await that.wallet.getBalance(account.getIndex())).toString(), subaddressesBalance.toString());
          _assert.default.equal((await that.wallet.getUnlockedBalance(account.getIndex())).toString(), subaddressesUnlockedBalance.toString());
        }
        _TestUtils.default.testUnsignedBigInt(accountsBalance);
        _TestUtils.default.testUnsignedBigInt(accountsUnlockedBalance);
        _assert.default.equal((await that.wallet.getBalance()).toString(), accountsBalance.toString());
        _assert.default.equal((await that.wallet.getUnlockedBalance()).toString(), accountsUnlockedBalance.toString());

        // test invalid input
        try {
          await that.wallet.getBalance(undefined, 0);
          throw new Error("Should have failed");
        } catch (e) {
          _assert.default.notEqual(e.message, "Should have failed");
        }
      });

      if (testConfig.testNonRelays)
      it("Can get accounts without subaddresses", async function () {
        let accounts = await that.wallet.getAccounts();
        (0, _assert.default)(accounts.length > 0);
        accounts.map(async (account) => {
          await testAccount(account);
          (0, _assert.default)(account.getSubaddresses() === undefined);
        });
      });

      if (testConfig.testNonRelays)
      it("Can get accounts with subaddresses", async function () {
        let accounts = await that.wallet.getAccounts(true);
        (0, _assert.default)(accounts.length > 0);
        accounts.map(async (account) => {
          await testAccount(account);
          (0, _assert.default)(account.getSubaddresses().length > 0);
        });
      });

      if (testConfig.testNonRelays)
      it("Can get an account at a specified index", async function () {
        let accounts = await that.wallet.getAccounts();
        (0, _assert.default)(accounts.length > 0);
        for (let account of accounts) {
          await testAccount(account);

          // test without subaddresses
          let retrieved = await that.wallet.getAccount(account.getIndex());
          (0, _assert.default)(retrieved.getSubaddresses() === undefined);

          // test with subaddresses
          retrieved = await that.wallet.getAccount(account.getIndex(), true);
          (0, _assert.default)(retrieved.getSubaddresses().length > 0);
        }
      });

      if (testConfig.testNonRelays)
      it("Can create a new account without a label", async function () {
        let accountsBefore = await that.wallet.getAccounts();
        let createdAccount = await that.wallet.createAccount();
        await testAccount(createdAccount);
        _assert.default.equal((await that.wallet.getAccounts()).length - 1, accountsBefore.length);
      });

      if (testConfig.testNonRelays)
      it("Can create a new account with a label", async function () {

        // create account with label
        let accountsBefore = await that.wallet.getAccounts();
        let label = _index.GenUtils.getUUID();
        let createdAccount = await that.wallet.createAccount(label);
        await testAccount(createdAccount);
        _assert.default.equal((await that.wallet.getAccounts()).length - 1, accountsBefore.length);
        _assert.default.equal((await that.wallet.getSubaddress(createdAccount.getIndex(), 0)).getLabel(), label);

        // fetch and test account
        createdAccount = await that.wallet.getAccount(createdAccount.getIndex());
        await testAccount(createdAccount);

        // create account with same label
        createdAccount = await that.wallet.createAccount(label);
        await testAccount(createdAccount);
        _assert.default.equal((await that.wallet.getAccounts()).length - 2, accountsBefore.length);
        _assert.default.equal((await that.wallet.getSubaddress(createdAccount.getIndex(), 0)).getLabel(), label);

        // fetch and test account
        createdAccount = await that.wallet.getAccount(createdAccount.getIndex());
        await testAccount(createdAccount);
      });

      if (testConfig.testNonRelays)
      it("Can set account labels", async function () {

        // create account
        if ((await that.wallet.getAccounts()).length < 2) await that.wallet.createAccount();

        // set account label
        const label = _index.GenUtils.getUUID();
        await that.wallet.setAccountLabel(1, label);
        _assert.default.equal((await that.wallet.getSubaddress(1, 0)).getLabel(), label);
      });

      if (testConfig.testNonRelays)
      it("Can get subaddresses at a specified account index", async function () {
        let accounts = await that.wallet.getAccounts();
        (0, _assert.default)(accounts.length > 0);
        for (let account of accounts) {
          let subaddresses = await that.wallet.getSubaddresses(account.getIndex());
          (0, _assert.default)(subaddresses.length > 0);
          subaddresses.map((subaddress) => {
            testSubaddress(subaddress);
            (0, _assert.default)(account.getIndex() === subaddress.getAccountIndex());
          });
        }
      });

      if (testConfig.testNonRelays)
      it("Can get subaddresses at specified account and subaddress indices", async function () {
        let accounts = await that.wallet.getAccounts();
        (0, _assert.default)(accounts.length > 0);
        for (let account of accounts) {

          // get subaddresses
          let subaddresses = await that.wallet.getSubaddresses(account.getIndex());
          (0, _assert.default)(subaddresses.length > 0);

          // remove a subaddress for query if possible
          if (subaddresses.length > 1) subaddresses.splice(0, 1);

          // get subaddress indices
          let subaddressIndices = subaddresses.map((subaddress) => subaddress.getIndex());
          (0, _assert.default)(subaddressIndices.length > 0);

          // fetch subaddresses by indices
          let fetchedSubaddresses = await that.wallet.getSubaddresses(account.getIndex(), subaddressIndices);

          // original subaddresses (minus one removed if applicable) is equal to fetched subaddresses
          _assert.default.deepEqual(fetchedSubaddresses, subaddresses);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get a subaddress at a specified account and subaddress index", async function () {
        let accounts = await that.wallet.getAccounts();
        (0, _assert.default)(accounts.length > 0);
        for (let account of accounts) {
          let subaddresses = await that.wallet.getSubaddresses(account.getIndex());
          (0, _assert.default)(subaddresses.length > 0);
          for (let subaddress of subaddresses) {
            testSubaddress(subaddress);
            _assert.default.deepEqual(await that.wallet.getSubaddress(account.getIndex(), subaddress.getIndex()), subaddress);
            _assert.default.deepEqual((await that.wallet.getSubaddresses(account.getIndex(), [subaddress.getIndex()]))[0], subaddress); // test plural call with single subaddr number
          }
        }
      });

      if (testConfig.testNonRelays)
      it("Can create a subaddress with and without a label", async function () {

        // create subaddresses across accounts
        let accounts = await that.wallet.getAccounts();
        if (accounts.length < 2) await that.wallet.createAccount();
        accounts = await that.wallet.getAccounts();
        (0, _assert.default)(accounts.length > 1);
        for (let accountIdx = 0; accountIdx < 2; accountIdx++) {

          // create subaddress with no label
          let subaddresses = await that.wallet.getSubaddresses(accountIdx);
          let subaddress = await that.wallet.createSubaddress(accountIdx);
          _assert.default.equal(subaddress.getLabel(), undefined);
          testSubaddress(subaddress);
          let subaddressesNew = await that.wallet.getSubaddresses(accountIdx);
          _assert.default.equal(subaddressesNew.length - 1, subaddresses.length);
          _assert.default.deepEqual(subaddressesNew[subaddressesNew.length - 1].toString(), subaddress.toString());

          // create subaddress with label
          subaddresses = await that.wallet.getSubaddresses(accountIdx);
          let uuid = _index.GenUtils.getUUID();
          subaddress = await that.wallet.createSubaddress(accountIdx, uuid);
          _assert.default.equal(uuid, subaddress.getLabel());
          testSubaddress(subaddress);
          subaddressesNew = await that.wallet.getSubaddresses(accountIdx);
          _assert.default.equal(subaddressesNew.length - 1, subaddresses.length);
          _assert.default.deepEqual(subaddressesNew[subaddressesNew.length - 1].toString(), subaddress.toString());
        }
      });

      if (testConfig.testNonRelays)
      it("Can set subaddress labels", async function () {

        // create subaddresses
        while ((await that.wallet.getSubaddresses(0)).length < 3) await that.wallet.createSubaddress(0);

        // set subaddress labels
        for (let subaddressIdx = 0; subaddressIdx < (await that.wallet.getSubaddresses(0)).length; subaddressIdx++) {
          const label = _index.GenUtils.getUUID();
          await that.wallet.setSubaddressLabel(0, subaddressIdx, label);
          _assert.default.equal((await that.wallet.getSubaddress(0, subaddressIdx)).getLabel(), label);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get transactions in the wallet", async function () {
        let nonDefaultIncoming = false;
        let txs = await that.getAndTestTxs(that.wallet, undefined, true);
        (0, _assert.default)(txs.length > 0, "Wallet has no txs to test");
        _assert.default.equal(txs[0].getHeight(), _TestUtils.default.FIRST_RECEIVE_HEIGHT, "First tx's restore height must match the restore height in TestUtils");

        // test each tranasction
        let blocksPerHeight = {};
        for (let i = 0; i < txs.length; i++) {
          await that.testTxWallet(txs[i], { wallet: that.wallet });
          await that.testTxWallet(txs[i], { wallet: that.wallet });
          _assert.default.equal(txs[i].toString(), txs[i].toString());

          // test merging equivalent txs
          let copy1 = txs[i].copy();
          let copy2 = txs[i].copy();
          if (copy1.getIsConfirmed()) copy1.setBlock(txs[i].getBlock().copy().setTxs([copy1]));
          if (copy2.getIsConfirmed()) copy2.setBlock(txs[i].getBlock().copy().setTxs([copy2]));
          let merged = copy1.merge(copy2);
          await that.testTxWallet(merged, { wallet: that.wallet });

          // find non-default incoming
          if (txs[i].getIncomingTransfers()) {
            for (let transfer of txs[i].getIncomingTransfers()) {
              if (transfer.getAccountIndex() !== 0 && transfer.getSubaddressIndex() !== 0) nonDefaultIncoming = true;
            }
          }

          // ensure unique block reference per height
          if (txs[i].getIsConfirmed()) {
            let block = blocksPerHeight[txs[i].getHeight()];
            if (block === undefined) blocksPerHeight[txs[i].getHeight()] = txs[i].getBlock();else
            (0, _assert.default)(block === txs[i].getBlock(), "Block references for same height must be same");
          }
        }

        // ensure non-default account and subaddress tested
        (0, _assert.default)(nonDefaultIncoming, "No incoming transfers found to non-default account and subaddress; run send-to-multiple tests first");
      });

      if (testConfig.testNonRelays)
      it("Can get transactions by hash", async function () {

        let maxNumTxs = 10; // max number of txs to test

        // fetch all txs for testing
        let txs = await that.wallet.getTxs();
        (0, _assert.default)(txs.length > 1, "Test requires at least 2 txs to fetch by hash");

        // randomly pick a few for fetching by hash
        _index.GenUtils.shuffle(txs);
        txs = txs.slice(0, Math.min(txs.length, maxNumTxs));

        // test fetching by hash
        let fetchedTx = await that.wallet.getTx(txs[0].getHash());
        _assert.default.equal(fetchedTx.getHash(), txs[0].getHash());
        await that.testTxWallet(fetchedTx);

        // test fetching by hashes
        let txId1 = txs[0].getHash();
        let txId2 = txs[1].getHash();
        let fetchedTxs = await that.wallet.getTxs([txId1, txId2]);
        _assert.default.equal(2, fetchedTxs.length);

        // test fetching by hashes as collection
        let txHashes = [];
        for (let tx of txs) txHashes.push(tx.getHash());
        fetchedTxs = await that.wallet.getTxs(txHashes);
        _assert.default.equal(fetchedTxs.length, txs.length);
        for (let i = 0; i < txs.length; i++) {
          _assert.default.equal(fetchedTxs[i].getHash(), txs[i].getHash());
          await that.testTxWallet(fetchedTxs[i]);
        }

        // test fetching with missing tx hashes
        let missingTxHash = "d01ede9cde813b2a693069b640c4b99c5adbdb49fbbd8da2c16c8087d0c3e320";
        txHashes.push(missingTxHash);
        fetchedTxs = await that.wallet.getTxs(txHashes);
        _assert.default.equal(txs.length, fetchedTxs.length);
        for (let i = 0; i < txs.length; i++) {
          _assert.default.equal(txs[i].getHash(), fetchedTxs[i].getHash());
          await that.testTxWallet(fetchedTxs[i]);
        }
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can get transactions with additional configuration", async function () {

        // get random transactions for testing
        let randomTxs = await getRandomTransactions(that.wallet, undefined, 3, 5);
        for (let randomTx of randomTxs) await that.testTxWallet(randomTx);

        // get transactions by hash
        let txHashes = [];
        for (let randomTx of randomTxs) {
          txHashes.push(randomTx.getHash());
          let txs = await that.getAndTestTxs(that.wallet, { hash: randomTx.getHash() }, true);
          _assert.default.equal(txs.length, 1);
          let merged = txs[0].merge(randomTx.copy()); // txs change with chain so check mergeability
          await that.testTxWallet(merged);
        }

        // get transactions by hashes
        let txs = await that.getAndTestTxs(that.wallet, { hashes: txHashes });
        _assert.default.equal(txs.length, randomTxs.length);
        for (let tx of txs) (0, _assert.default)(txHashes.includes(tx.getHash()));

        // get transactions with an outgoing transfer
        txs = await that.getAndTestTxs(that.wallet, { isOutgoing: true }, true);
        for (let tx of txs) {
          (0, _assert.default)(tx.getIsOutgoing());
          (0, _assert.default)(tx.getOutgoingTransfer() instanceof _index.MoneroTransfer);
          await testTransfer(tx.getOutgoingTransfer());
        }

        // get transactions without an outgoing transfer
        txs = await that.getAndTestTxs(that.wallet, { isOutgoing: false }, true);
        for (let tx of txs) _assert.default.equal(tx.getOutgoingTransfer(), undefined);

        // get transactions with incoming transfers
        txs = await that.getAndTestTxs(that.wallet, { isIncoming: true }, true);
        for (let tx of txs) {
          (0, _assert.default)(tx.getIncomingTransfers().length > 0);
          for (let transfer of tx.getIncomingTransfers()) (0, _assert.default)(transfer instanceof _index.MoneroTransfer);
        }

        // get transactions without incoming transfers
        txs = await that.getAndTestTxs(that.wallet, { isIncoming: false }, true);
        for (let tx of txs) _assert.default.equal(tx.getIncomingTransfers(), undefined);

        // get transactions associated with an account
        let accountIdx = 1;
        txs = await that.wallet.getTxs({ transferQuery: { accountIndex: accountIdx } });
        for (let tx of txs) {
          let found = false;
          if (tx.getOutgoingTransfer() && tx.getOutgoingTransfer().getAccountIndex() === accountIdx) found = true;else
          if (tx.getIncomingTransfers()) {
            for (let transfer of tx.getIncomingTransfers()) {
              if (transfer.getAccountIndex() === accountIdx) {
                found = true;
                break;
              }
            }
          }
          (0, _assert.default)(found, "Transaction is not associated with account " + accountIdx + ":\n" + tx.toString());
        }

        // get transactions with incoming transfers to an account
        txs = await that.wallet.getTxs({ transferQuery: { isIncoming: true, accountIndex: accountIdx } });
        for (let tx of txs) {
          (0, _assert.default)(tx.getIncomingTransfers().length > 0);
          let found = false;
          for (let transfer of tx.getIncomingTransfers()) {
            if (transfer.getAccountIndex() === accountIdx) {
              found = true;
              break;
            }
          }
          (0, _assert.default)(found, "No incoming transfers to account " + accountIdx + " found:\n" + tx.toString());
        }

        // get txs with manually built query that are confirmed and have an outgoing transfer from account 0
        let txQuery = new _index.MoneroTxQuery();
        txQuery.setIsConfirmed(true);
        txQuery.setTransferQuery(new _index.MoneroTransferQuery().setAccountIndex(0).setIsOutgoing(true));
        txs = await that.getAndTestTxs(that.wallet, txQuery, true);
        for (let tx of txs) {
          if (!tx.getIsConfirmed()) console.log(tx.toString());
          _assert.default.equal(tx.getIsConfirmed(), true);
          (0, _assert.default)(tx.getOutgoingTransfer());
          _assert.default.equal(tx.getOutgoingTransfer().getAccountIndex(), 0);
        }

        // get txs with outgoing transfers that have destinations to account 1
        txs = await that.getAndTestTxs(that.wallet, { transferQuery: { hasDestinations: true, accountIndex: 0 } });
        for (let tx of txs) {
          (0, _assert.default)(tx.getOutgoingTransfer());
          (0, _assert.default)(tx.getOutgoingTransfer().getDestinations().length > 0);
        }

        // include outputs with transactions
        txs = await that.getAndTestTxs(that.wallet, { includeOutputs: true }, true);
        let found = false;
        for (let tx of txs) {
          if (tx.getOutputs()) {
            (0, _assert.default)(tx.getOutputs().length > 0);
            found = true;
          } else {
            (0, _assert.default)(tx.getIsOutgoing() || tx.getIsIncoming() && !tx.getIsConfirmed()); // TODO: monero-wallet-rpc: return outputs for unconfirmed txs
          }
        }
        (0, _assert.default)(found, "No outputs found in txs");

        // get txs with input query // TODO: no inputs returned to filter

        // get txs with output query
        let outputQuery = new _index.MoneroOutputQuery().setIsSpent(false).setAccountIndex(1).setSubaddressIndex(2);
        txs = await that.wallet.getTxs(new _index.MoneroTxQuery().setOutputQuery(outputQuery));
        (0, _assert.default)(txs.length > 0);
        for (let tx of txs) {
          (0, _assert.default)(tx.getOutputs().length > 0);
          found = false;
          for (let output of tx.getOutputsWallet()) {
            if (output.getIsSpent() === false && output.getAccountIndex() === 1 && output.getSubaddressIndex() === 2) {
              found = true;
              break;
            }
          }
          if (!found) throw new Error("Tx does not contain specified output");
        }

        // get unlocked txs
        txs = await that.wallet.getTxs(new _index.MoneroTxQuery().setIsLocked(false));
        (0, _assert.default)(txs.length > 0);
        for (let tx of txs) {
          _assert.default.equal(tx.getIsLocked(), false);
        }

        // get confirmed transactions sent from/to same wallet with a transfer with destinations
        txs = await that.wallet.getTxs({ isIncoming: true, isOutgoing: true, isConfirmed: true, includeOutputs: true, transferQuery: { hasDestinations: true } });
        for (let tx of txs) {
          (0, _assert.default)(tx.getIsIncoming());
          (0, _assert.default)(tx.getIsOutgoing());
          (0, _assert.default)(tx.getIsConfirmed());
          (0, _assert.default)(tx.getOutputs().length > 0);
          _assert.default.notEqual(tx.getOutgoingTransfer(), undefined);
          _assert.default.notEqual(tx.getOutgoingTransfer().getDestinations(), undefined);
          (0, _assert.default)(tx.getOutgoingTransfer().getDestinations().length > 0);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get transactions by height", async function () {

        // get all confirmed txs for testing
        let txs = await that.getAndTestTxs(that.wallet, new _index.MoneroTxQuery().setIsConfirmed(true));
        (0, _assert.default)(txs.length > 0, "Wallet has no confirmed txs; run send tests");

        // collect all tx heights
        let txHeights = [];
        for (let tx of txs) txHeights.push(tx.getHeight());

        // get height that most txs occur at
        let heightCounts = countNumInstances(txHeights);
        let heightModes = getModes(heightCounts);
        let modeHeight = heightModes.values().next().value;

        // fetch txs at mode height
        let modeTxs = await that.getAndTestTxs(that.wallet, new _index.MoneroTxQuery().setHeight(modeHeight));
        _assert.default.equal(modeTxs.length, heightCounts.get(modeHeight));

        // fetch txs at mode height by range
        let modeTxsByRange = await that.getAndTestTxs(that.wallet, new _index.MoneroTxQuery().setMinHeight(modeHeight).setMaxHeight(modeHeight));
        _assert.default.equal(modeTxsByRange.length, modeTxs.length);
        _assert.default.deepEqual(modeTxsByRange, modeTxs);

        // fetch all txs by range
        let fetched = await that.getAndTestTxs(that.wallet, new _index.MoneroTxQuery().setMinHeight(txs[0].getHeight()).setMaxHeight(txs[txs.length - 1].getHeight()));
        _assert.default.deepEqual(txs, fetched);

        // test some filtered by range  // TODO: these are separated in Java?
        {
          txs = await that.wallet.getTxs({ isConfirmed: true });
          (0, _assert.default)(txs.length > 0, "No transactions; run send to multiple test");

          // get and sort block heights in ascending order
          let heights = [];
          for (let tx of txs) {
            heights.push(tx.getBlock().getHeight());
          }
          _index.GenUtils.sort(heights);

          // pick minimum and maximum heights for filtering
          let minHeight = -1;
          let maxHeight = -1;
          if (heights.length == 1) {
            minHeight = 0;
            maxHeight = heights[0] - 1;
          } else {
            minHeight = heights[0] + 1;
            maxHeight = heights[heights.length - 1] - 1;
          }

          // assert some transactions filtered
          let unfilteredCount = txs.length;
          txs = await that.getAndTestTxs(that.wallet, { minHeight: minHeight, maxHeight: maxHeight }, true);
          (0, _assert.default)(txs.length < unfilteredCount);
          for (let tx of txs) {
            let height = tx.getBlock().getHeight();
            (0, _assert.default)(height >= minHeight && height <= maxHeight);
          }
        }
      });

      if (testConfig.testNonRelays)
      it("Can get transactions by payment ids", async function () {

        // get random transactions with payment hashes for testing
        let randomTxs = await getRandomTransactions(that.wallet, { hasPaymentId: true }, 2, 5);
        for (let randomTx of randomTxs) {
          (0, _assert.default)(randomTx.getPaymentId());
        }

        // get transactions by payment id
        let paymentIds = randomTxs.map((tx) => tx.getPaymentId());
        (0, _assert.default)(paymentIds.length > 1);
        for (let paymentId of paymentIds) {
          let txs = await that.getAndTestTxs(that.wallet, { paymentId: paymentId });
          (0, _assert.default)(txs.length > 0);
          (0, _assert.default)(txs[0].getPaymentId());
          await _index.MoneroUtils.validatePaymentId(txs[0].getPaymentId());
        }

        // get transactions by payment hashes
        let txs = await that.getAndTestTxs(that.wallet, { paymentIds: paymentIds });
        for (let tx of txs) {
          (0, _assert.default)(paymentIds.includes(tx.getPaymentId()));
        }
      });

      if (testConfig.testNonRelays)
      it("Returns all known fields of txs regardless of filtering", async function () {

        // fetch wallet txs
        let txs = await that.wallet.getTxs({ isConfirmed: true });
        for (let tx of txs) {

          // find tx sent to same wallet with incoming transfer in different account than src account
          if (!tx.getOutgoingTransfer() || !tx.getIncomingTransfers()) continue;
          for (let transfer of tx.getIncomingTransfers()) {
            if (transfer.getAccountIndex() === tx.getOutgoingTransfer().getAccountIndex()) continue;

            // fetch tx with filtering
            let filteredTxs = await that.wallet.getTxs({ transferQuery: { isIncoming: true, accountIndex: transfer.getAccountIndex() } });
            let filteredTx = _index.Filter.apply(new _index.MoneroTxQuery().setHashes([tx.getHash()]), filteredTxs)[0];

            // txs should be the same (mergeable)
            _assert.default.equal(filteredTx.getHash(), tx.getHash());
            tx.merge(filteredTx);

            // test is done
            return;
          }
        }

        // test did not fully execute
        throw new Error("Test requires tx sent from/to different accounts of same wallet but none found; run send tests");
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Validates inputs when getting transactions", async function () {

        // fetch random txs for testing
        let randomTxs = await getRandomTransactions(that.wallet, undefined, 3, 5);

        // valid, invalid, and unknown tx hashes for tests
        let txHash = randomTxs[0].getHash();
        let invalidHash = "invalid_id";
        let unknownHash1 = "6c4982f2499ece80e10b627083c4f9b992a00155e98bcba72a9588ccb91d0a61";
        let unknownHash2 = "ff397104dd875882f5e7c66e4f852ee134f8cf45e21f0c40777c9188bc92e943";

        // fetch unknown tx hash
        _assert.default.equal(await that.wallet.getTx(unknownHash1), undefined);

        // fetch unknown tx hash using query
        let txs = await that.wallet.getTxs(new _index.MoneroTxQuery().setHash(unknownHash1));
        _assert.default.equal(txs.length, 0);

        // fetch unknown tx hash in collection
        txs = await that.wallet.getTxs([txHash, unknownHash1]);
        _assert.default.equal(txs.length, 1);
        _assert.default.equal(txs[0].getHash(), txHash);

        // fetch unknown tx hashes in collection
        txs = await that.wallet.getTxs([txHash, unknownHash1, unknownHash2]);
        _assert.default.equal(txs.length, 1);
        _assert.default.equal(txs[0].getHash(), txHash);

        // fetch invalid hash
        _assert.default.equal(await that.wallet.getTx(invalidHash), undefined);

        // fetch invalid hash collection
        txs = await that.wallet.getTxs([txHash, invalidHash]);
        _assert.default.equal(txs.length, 1);
        _assert.default.equal(txs[0].getHash(), txHash);

        // fetch invalid hashes in collection
        txs = await that.wallet.getTxs([txHash, invalidHash, "invalid_hash_2"]);
        _assert.default.equal(txs.length, 1);
        _assert.default.equal(txs[0].getHash(), txHash);

        // test collection of invalid hashes
        txs = await that.wallet.getTxs(new _index.MoneroTxQuery().setHashes([txHash, invalidHash, "invalid_hash_2"]));
        _assert.default.equal(1, txs.length);
        for (let tx of txs) await that.testTxWallet(tx);
      });

      if (testConfig.testNonRelays)
      it("Can get transfers in the wallet, accounts, and subaddresses", async function () {

        // get all transfers
        await that.getAndTestTransfers(that.wallet, undefined, true);

        // get transfers by account index
        let nonDefaultIncoming = false;
        for (let account of await that.wallet.getAccounts(true)) {
          let accountTransfers = await that.getAndTestTransfers(that.wallet, { accountIndex: account.getIndex() });
          for (let transfer of accountTransfers) _assert.default.equal(transfer.getAccountIndex(), account.getIndex());

          // get transfers by subaddress index
          let subaddressTransfers = [];
          for (let subaddress of account.getSubaddresses()) {
            let transfers = await that.getAndTestTransfers(that.wallet, { accountIndex: subaddress.getAccountIndex(), subaddressIndex: subaddress.getIndex() });
            for (let transfer of transfers) {

              // test account and subaddress indices
              _assert.default.equal(transfer.getAccountIndex(), subaddress.getAccountIndex());
              if (transfer.getIsIncoming()) {
                const inTransfer = transfer;
                _assert.default.equal(inTransfer.getSubaddressIndex(), subaddress.getIndex());
                if (transfer.getAccountIndex() !== 0 && inTransfer.getSubaddressIndex() !== 0) nonDefaultIncoming = true;
              } else {
                const outTransfer = transfer;
                (0, _assert.default)(outTransfer.getSubaddressIndices().includes(subaddress.getIndex()));
                if (outTransfer.getAccountIndex() !== 0) {
                  for (let subaddrIdx of outTransfer.getSubaddressIndices()) {
                    if (subaddrIdx > 0) {
                      nonDefaultIncoming = true;
                      break;
                    }
                  }
                }
              }

              // don't add duplicates TODO monero-wallet-rpc: duplicate outgoing transfers returned for different subaddress indices, way to return outgoing subaddress indices?
              let found = false;
              for (let subaddressTransfer of subaddressTransfers) {
                if (transfer.toString() === subaddressTransfer.toString() && transfer.getTx().getHash() === subaddressTransfer.getTx().getHash()) {
                  found = true;
                  break;
                }
              }
              if (!found) subaddressTransfers.push(transfer);
            }
          }
          _assert.default.equal(subaddressTransfers.length, accountTransfers.length);

          // collect unique subaddress indices
          let subaddressIndices = new Set();
          for (let transfer of subaddressTransfers) {
            if (transfer.getIsIncoming()) subaddressIndices.add(transfer.getSubaddressIndex());else
            for (let subaddressIdx of transfer.getSubaddressIndices()) subaddressIndices.add(subaddressIdx);
          }

          // get and test transfers by subaddress indices
          let transfers = await that.getAndTestTransfers(that.wallet, new _index.MoneroTransferQuery().setAccountIndex(account.getIndex()).setSubaddressIndices(Array.from(subaddressIndices)));
          //if (transfers.length !== subaddressTransfers.length) console.log("WARNING: outgoing transfers always from subaddress 0 (monero-wallet-rpc #5171)");
          _assert.default.equal(transfers.length, subaddressTransfers.length); // TODO monero-wallet-rpc: these may not be equal because outgoing transfers are always from subaddress 0 (#5171) and/or incoming transfers from/to same account are occluded (#4500)
          for (let transfer of transfers) {
            _assert.default.equal(account.getIndex(), transfer.getAccountIndex());
            if (transfer.getIsIncoming()) (0, _assert.default)(subaddressIndices.has(transfer.getSubaddressIndex()));else
            {
              let overlaps = false;
              for (let subaddressIdx of subaddressIndices) {
                for (let outSubaddressIdx of transfer.getSubaddressIndices()) {
                  if (subaddressIdx === outSubaddressIdx) {
                    overlaps = true;
                    break;
                  }
                }
              }
              (0, _assert.default)(overlaps, "Subaddresses must overlap");
            }
          }
        }

        // ensure transfer found with non-zero account and subaddress indices
        (0, _assert.default)(nonDefaultIncoming, "No transfers found in non-default account and subaddress; run send-to-multiple tests");
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can get transfers with additional configuration", async function () {

        // get incoming transfers
        let transfers = await that.getAndTestTransfers(that.wallet, { isIncoming: true }, true);
        for (let transfer of transfers) (0, _assert.default)(transfer.getIsIncoming());

        // get outgoing transfers
        transfers = await that.getAndTestTransfers(that.wallet, { isIncoming: false }, true);
        for (let transfer of transfers) (0, _assert.default)(transfer.getIsOutgoing());

        // get confirmed transfers to account 0
        transfers = await that.getAndTestTransfers(that.wallet, { accountIndex: 0, txQuery: { isConfirmed: true } }, true);
        for (let transfer of transfers) {
          _assert.default.equal(transfer.getAccountIndex(), 0);
          (0, _assert.default)(transfer.getTx().getIsConfirmed());
        }

        // get confirmed transfers to [1, 2]
        transfers = await that.getAndTestTransfers(that.wallet, { accountIndex: 1, subaddressIndex: 2, txQuery: { isConfirmed: true } }, true);
        for (let transfer of transfers) {
          _assert.default.equal(transfer.getAccountIndex(), 1);
          if (transfer.getIsIncoming()) _assert.default.equal(transfer.getSubaddressIndex(), 2);else
          (0, _assert.default)(transfer.getSubaddressIndices().includes(2));
          (0, _assert.default)(transfer.getTx().getIsConfirmed());
        }

        // get transfers in the tx pool
        transfers = await that.getAndTestTransfers(that.wallet, { txQuery: { inTxPool: true } });
        for (let transfer of transfers) {
          _assert.default.equal(transfer.getTx().getInTxPool(), true);
        }

        // get random transactions
        let txs = await getRandomTransactions(that.wallet, undefined, 3, 5);

        // get transfers with a tx hash
        let txHashes = [];
        for (let tx of txs) {
          txHashes.push(tx.getHash());
          transfers = await that.getAndTestTransfers(that.wallet, { txQuery: { hash: tx.getHash() } }, true);
          for (let transfer of transfers) _assert.default.equal(transfer.getTx().getHash(), tx.getHash());
        }

        // get transfers with tx hashes
        transfers = await that.getAndTestTransfers(that.wallet, { txQuery: { hashes: txHashes } }, true);
        for (let transfer of transfers) (0, _assert.default)(txHashes.includes(transfer.getTx().getHash()));

        // TODO: test that transfers with the same tx hash have the same tx reference

        // TODO: test transfers destinations

        // get transfers with pre-built query that are confirmed and have outgoing destinations
        let transferQuery = new _index.MoneroTransferQuery();
        transferQuery.setIsOutgoing(true);
        transferQuery.setHasDestinations(true);
        transferQuery.setTxQuery(new _index.MoneroTxQuery().setIsConfirmed(true));
        transfers = await that.getAndTestTransfers(that.wallet, transferQuery);
        for (let transfer of transfers) {
          _assert.default.equal(transfer.getIsOutgoing(), true);
          (0, _assert.default)(transfer.getDestinations().length > 0);
          _assert.default.equal(transfer.getTx().getIsConfirmed(), true);
        }

        // get incoming transfers to account 0 which has outgoing transfers (i.e. originated from the same wallet)
        transfers = await that.wallet.getTransfers({ accountIndex: 1, isIncoming: true, txQuery: { isOutgoing: true } });
        (0, _assert.default)(transfers.length > 0);
        for (let transfer of transfers) {
          (0, _assert.default)(transfer.getIsIncoming());
          _assert.default.equal(transfer.getAccountIndex(), 1);
          (0, _assert.default)(transfer.getTx().getIsOutgoing());
          _assert.default.equal(transfer.getTx().getOutgoingTransfer(), undefined);
        }

        // get incoming transfers to a specific address
        let subaddress = await that.wallet.getAddress(1, 0);
        transfers = await that.wallet.getTransfers({ isIncoming: true, address: subaddress });
        (0, _assert.default)(transfers.length > 0);
        for (let transfer of transfers) {
          (0, _assert.default)(transfer instanceof _index.MoneroIncomingTransfer);
          _assert.default.equal(1, transfer.getAccountIndex());
          _assert.default.equal(0, transfer.getSubaddressIndex());
          _assert.default.equal(subaddress, transfer.getAddress());
        }
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Validates inputs when getting transfers", async function () {

        // test with invalid hash
        let transfers = await that.wallet.getTransfers({ txQuery: { hash: "invalid_id" } });
        _assert.default.equal(transfers.length, 0);

        // test invalid hash in collection
        let randomTxs = await getRandomTransactions(that.wallet, undefined, 3, 5);
        transfers = await that.wallet.getTransfers({ txQuery: { hashes: [randomTxs[0].getHash(), "invalid_id"] } });
        (0, _assert.default)(transfers.length > 0);
        let tx = transfers[0].getTx();
        for (let transfer of transfers) (0, _assert.default)(tx === transfer.getTx());

        // test unused subaddress indices
        transfers = await that.wallet.getTransfers({ accountIndex: 0, subaddressIndices: [1234907] });
        (0, _assert.default)(transfers.length === 0);

        // test invalid subaddress index
        try {
          let transfers = await that.wallet.getTransfers({ accountIndex: 0, subaddressIndex: -1 });
          throw new Error("Should have failed");
        } catch (e) {
          _assert.default.notEqual(e.message, "Should have failed");
        }
      });

      if (testConfig.testNonRelays)
      it("Can get incoming and outgoing transfers using convenience methods", async function () {

        // get incoming transfers
        let inTransfers = await that.wallet.getIncomingTransfers();
        (0, _assert.default)(inTransfers.length > 0);
        for (let transfer of inTransfers) {
          (0, _assert.default)(transfer.getIsIncoming());
          await testTransfer(transfer, undefined);
        }

        // get incoming transfers with query
        let amount = inTransfers[0].getAmount();
        let accountIdx = inTransfers[0].getAccountIndex();
        let subaddressIdx = inTransfers[0].getSubaddressIndex();
        inTransfers = await that.wallet.getIncomingTransfers({ amount: amount, accountIndex: accountIdx, subaddressIndex: subaddressIdx });
        (0, _assert.default)(inTransfers.length > 0);
        for (let transfer of inTransfers) {
          (0, _assert.default)(transfer.getIsIncoming());
          _assert.default.equal(transfer.getAmount().toString(), amount.toString());
          _assert.default.equal(transfer.getAccountIndex(), accountIdx);
          _assert.default.equal(transfer.getSubaddressIndex(), subaddressIdx);
          await testTransfer(transfer, undefined);
        }

        // get incoming transfers with contradictory query
        try {
          inTransfers = await that.wallet.getIncomingTransfers(new _index.MoneroTransferQuery().setIsIncoming(false));
        } catch (e) {
          _assert.default.equal(e.message, "Transfer query contradicts getting incoming transfers");
        }

        // get outgoing transfers
        let outTransfers = await that.wallet.getOutgoingTransfers();
        (0, _assert.default)(outTransfers.length > 0);
        for (let transfer of outTransfers) {
          (0, _assert.default)(transfer.getIsOutgoing());
          await testTransfer(transfer, undefined);
        }

        // get outgoing transfers with query
        outTransfers = await that.wallet.getOutgoingTransfers({ accountIndex: accountIdx, subaddressIndex: subaddressIdx });
        (0, _assert.default)(outTransfers.length > 0);
        for (let transfer of outTransfers) {
          (0, _assert.default)(transfer.getIsOutgoing());
          _assert.default.equal(transfer.getAccountIndex(), accountIdx);
          (0, _assert.default)(transfer.getSubaddressIndices().includes(subaddressIdx));
          await testTransfer(transfer, undefined);
        }

        // get outgoing transfers with contradictory query
        try {
          outTransfers = await that.wallet.getOutgoingTransfers(new _index.MoneroTransferQuery().setIsOutgoing(false));
        } catch (e) {
          _assert.default.equal(e.message, "Transfer query contradicts getting outgoing transfers");
        }
      });

      if (testConfig.testNonRelays)
      it("Can get outputs in the wallet, accounts, and subaddresses", async function () {

        // get all outputs
        await that.getAndTestOutputs(that.wallet, undefined, true);

        // get outputs for each account
        let nonDefaultIncoming = false;
        let accounts = await that.wallet.getAccounts(true);
        for (let account of accounts) {

          // determine if account is used
          let isUsed = false;
          for (let subaddress of account.getSubaddresses()) if (subaddress.getIsUsed()) isUsed = true;

          // get outputs by account index
          let accountOutputs = await that.getAndTestOutputs(that.wallet, { accountIndex: account.getIndex() }, isUsed);
          for (let output of accountOutputs) _assert.default.equal(output.getAccountIndex(), account.getIndex());

          // get outputs by subaddress index
          let subaddressOutputs = [];
          for (let subaddress of account.getSubaddresses()) {
            let outputs = await that.getAndTestOutputs(that.wallet, { accountIndex: account.getIndex(), subaddressIndex: subaddress.getIndex() }, subaddress.getIsUsed());
            for (let output of outputs) {
              _assert.default.equal(output.getAccountIndex(), subaddress.getAccountIndex());
              _assert.default.equal(output.getSubaddressIndex(), subaddress.getIndex());
              if (output.getAccountIndex() !== 0 && output.getSubaddressIndex() !== 0) nonDefaultIncoming = true;
              subaddressOutputs.push(output);
            }
          }
          _assert.default.equal(subaddressOutputs.length, accountOutputs.length);

          // get outputs by subaddress indices
          let subaddressIndices = Array.from(new Set(subaddressOutputs.map((output) => output.getSubaddressIndex())));
          let outputs = await that.getAndTestOutputs(that.wallet, { accountIndex: account.getIndex(), subaddressIndices: subaddressIndices }, isUsed);
          _assert.default.equal(outputs.length, subaddressOutputs.length);
          for (let output of outputs) {
            _assert.default.equal(output.getAccountIndex(), account.getIndex());
            (0, _assert.default)(subaddressIndices.includes(output.getSubaddressIndex()));
          }
        }

        // ensure output found with non-zero account and subaddress indices
        (0, _assert.default)(nonDefaultIncoming, "No outputs found in non-default account and subaddress; run send-to-multiple tests");
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can get outputs with additional configuration", async function () {

        // get unspent outputs to account 0
        let outputs = await that.getAndTestOutputs(that.wallet, { accountIndex: 0, isSpent: false });
        for (let output of outputs) {
          _assert.default.equal(output.getAccountIndex(), 0);
          _assert.default.equal(output.getIsSpent(), false);
        }

        // get spent outputs to account 1
        outputs = await that.getAndTestOutputs(that.wallet, { accountIndex: 1, isSpent: true }, true);
        for (let output of outputs) {
          _assert.default.equal(output.getAccountIndex(), 1);
          _assert.default.equal(output.getIsSpent(), true);
        }

        // get random transactions
        let txs = await getRandomTransactions(that.wallet, { isConfirmed: true }, 3, 5);

        // get outputs with a tx hash
        let txHashes = [];
        for (let tx of txs) {
          txHashes.push(tx.getHash());
          outputs = await that.getAndTestOutputs(that.wallet, { txQuery: { hash: tx.getHash() } }, true);
          for (let output of outputs) _assert.default.equal(output.getTx().getHash(), tx.getHash());
        }

        // get outputs with tx hashes
        outputs = await that.getAndTestOutputs(that.wallet, { txQuery: { hashes: txHashes } }, true);
        for (let output of outputs) (0, _assert.default)(txHashes.includes(output.getTx().getHash()));

        // get confirmed outputs to specific subaddress with pre-built query
        let accountIdx = 0;
        let subaddressIdx = 1;
        let query = new _index.MoneroOutputQuery();
        query.setAccountIndex(accountIdx).setSubaddressIndex(subaddressIdx);
        query.setTxQuery(new _index.MoneroTxQuery().setIsConfirmed(true));
        query.setMinAmount(_TestUtils.default.MAX_FEE);
        outputs = await that.getAndTestOutputs(that.wallet, query, true);
        for (let output of outputs) {
          _assert.default.equal(output.getAccountIndex(), accountIdx);
          _assert.default.equal(output.getSubaddressIndex(), subaddressIdx);
          _assert.default.equal(output.getTx().getIsConfirmed(), true);
          (0, _assert.default)(output.getAmount() >= _TestUtils.default.MAX_FEE);
        }

        // get output by key image
        let keyImage = outputs[0].getKeyImage().getHex();
        outputs = await that.wallet.getOutputs(new _index.MoneroOutputQuery().setKeyImage(new _index.MoneroKeyImage(keyImage)));
        _assert.default.equal(outputs.length, 1);
        _assert.default.equal(outputs[0].getKeyImage().getHex(), keyImage);

        // get outputs whose transaction is confirmed and has incoming and outgoing transfers
        outputs = await that.wallet.getOutputs({ txQuery: { isConfirmed: true, isIncoming: true, isOutgoing: true, includeOutputs: true } });
        (0, _assert.default)(outputs.length > 0);
        for (let output of outputs) {
          (0, _assert.default)(output.getTx().getIsIncoming());
          (0, _assert.default)(output.getTx().getIsOutgoing());
          (0, _assert.default)(output.getTx().getIsConfirmed());
          (0, _assert.default)(output.getTx().getOutputs().length > 0);
          (0, _assert.default)(_index.GenUtils.arrayContains(output.getTx().getOutputs(), output, true));
        }
      });

      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Validates inputs when getting outputs", async function () {

        // test with invalid hash
        let outputs = await that.wallet.getOutputs({ txQuery: { hash: "invalid_id" } });
        _assert.default.equal(outputs.length, 0);

        // test invalid hash in collection
        let randomTxs = await getRandomTransactions(that.wallet, { isConfirmed: true, includeOutputs: true }, 3, 5);
        outputs = await that.wallet.getOutputs({ txQuery: { hashes: [randomTxs[0].getHash(), "invalid_id"] } });
        (0, _assert.default)(outputs.length > 0);
        _assert.default.equal(randomTxs[0].getOutputs().length, outputs.length);
        let tx = outputs[0].getTx();
        for (let output of outputs) (0, _assert.default)(tx === output.getTx());
      });

      if (testConfig.testNonRelays)
      it("Can export outputs in hex format", async function () {
        let outputsHex = await that.wallet.exportOutputs();
        _assert.default.equal(typeof outputsHex, "string"); // TODO: this will fail if wallet has no outputs; run these tests on new wallet
        (0, _assert.default)(outputsHex.length > 0);

        // wallet exports outputs since last export by default
        outputsHex = await that.wallet.exportOutputs();
        let outputsHexAll = await that.wallet.exportOutputs(true);
        (0, _assert.default)(outputsHexAll.length > outputsHex.length);
      });

      if (testConfig.testNonRelays)
      it("Can import outputs in hex format", async function () {

        // export outputs hex
        let outputsHex = await that.wallet.exportOutputs();

        // import outputs hex
        if (outputsHex !== undefined) {
          let numImported = await that.wallet.importOutputs(outputsHex);
          (0, _assert.default)(numImported >= 0);
        }
      });

      if (testConfig.testNonRelays)
      it("Has correct accounting across accounts, subaddresses, txs, transfers, and outputs", async function () {

        // pre-fetch wallet balances, accounts, subaddresses, and txs
        let walletBalance = await that.wallet.getBalance();
        let walletUnlockedBalance = await that.wallet.getUnlockedBalance();
        let accounts = await that.wallet.getAccounts(true); // includes subaddresses

        // test wallet balance
        _TestUtils.default.testUnsignedBigInt(walletBalance);
        _TestUtils.default.testUnsignedBigInt(walletUnlockedBalance);
        (0, _assert.default)(walletBalance >= walletUnlockedBalance);

        // test that wallet balance equals sum of account balances
        let accountsBalance = BigInt(0);
        let accountsUnlockedBalance = BigInt(0);
        for (let account of accounts) {
          await testAccount(account); // test that account balance equals sum of subaddress balances
          accountsBalance += account.getBalance();
          accountsUnlockedBalance += account.getUnlockedBalance();
        }
        _assert.default.equal(accountsBalance, walletBalance);
        _assert.default.equal(accountsUnlockedBalance, walletUnlockedBalance);

        //        // test that wallet balance equals net of wallet's incoming and outgoing tx amounts
        //        // TODO monero-wallet-rpc: these tests are disabled because incoming transfers are not returned when sent from the same account, so doesn't balance #4500
        //        // TODO: test unlocked balance based on txs, requires e.g. tx.getIsLocked()
        //        let outgoingSum = BigInt(0);
        //        let incomingSum = BigInt(0);
        //        for (let tx of txs) {
        //          if (tx.getOutgoingAmount()) outgoingSum = outgoingSum + (tx.getOutgoingAmount());
        //          if (tx.getIncomingAmount()) incomingSum = incomingSum + (tx.getIncomingAmount());
        //        }
        //        assert.equal(incomingSum - (outgoingSum).toString(), walletBalance.toString());
        //        
        //        // test that each account's balance equals net of account's incoming and outgoing tx amounts
        //        for (let account of accounts) {
        //          if (account.getIndex() !== 1) continue; // find 1
        //          outgoingSum = BigInt(0);
        //          incomingSum = BigInt(0);
        //          let filter = new MoneroTxQuery();
        //          filter.setAccountIndex(account.getIndex());
        //          for (let tx of txs.filter(tx => filter.meetsCriteria(tx))) { // normally we'd call wallet.getTxs(filter) but we're using pre-fetched txs
        //            if (tx.getHash() === "8d3919d98dd5a734da8c52eddc558db3fbf059ad55d432f0052ecd59ef122ecb") console.log(tx.toString(0));
        //            
        //            //console.log((tx.getOutgoingAmount() ? tx.getOutgoingAmount().toString() : "") + ", " + (tx.getIncomingAmount() ? tx.getIncomingAmount().toString() : ""));
        //            if (tx.getOutgoingAmount()) outgoingSum = outgoingSum + (tx.getOutgoingAmount());
        //            if (tx.getIncomingAmount()) incomingSum = incomingSum + (tx.getIncomingAmount());
        //          }
        //          assert.equal(incomingSum - (outgoingSum).toString(), account.getBalance().toString());
        //        }

        // balance may not equal sum of unspent outputs if unconfirmed txs
        // TODO monero-wallet-rpc: reason not to return unspent outputs on unconfirmed txs? then this isn't necessary
        let txs = await that.wallet.getTxs();
        let hasUnconfirmedTx = false;
        for (let tx of txs) if (tx.getInTxPool()) hasUnconfirmedTx = true;

        // wallet balance is sum of all unspent outputs
        let walletSum = BigInt(0);
        for (let output of await that.wallet.getOutputs({ isSpent: false })) walletSum = walletSum + output.getAmount();
        if (walletBalance !== walletSum) {

          // txs may have changed in between calls so retry test
          walletSum = BigInt(0);
          for (let output of await that.wallet.getOutputs({ isSpent: false })) walletSum = walletSum + output.getAmount();
          if (walletBalance !== walletSum) (0, _assert.default)(hasUnconfirmedTx, "Wallet balance must equal sum of unspent outputs if no unconfirmed txs");
        }

        // account balances are sum of their unspent outputs
        for (let account of accounts) {
          let accountSum = BigInt(0);
          let accountOutputs = await that.wallet.getOutputs({ accountIndex: account.getIndex(), isSpent: false });
          for (let output of accountOutputs) accountSum = accountSum + output.getAmount();
          if (account.getBalance().toString() !== accountSum.toString()) (0, _assert.default)(hasUnconfirmedTx, "Account balance must equal sum of its unspent outputs if no unconfirmed txs");

          // subaddress balances are sum of their unspent outputs
          for (let subaddress of account.getSubaddresses()) {
            let subaddressSum = BigInt(0);
            let subaddressOutputs = await that.wallet.getOutputs({ accountIndex: account.getIndex(), subaddressIndex: subaddress.getIndex(), isSpent: false });
            for (let output of subaddressOutputs) subaddressSum = subaddressSum + output.getAmount();
            if (subaddress.getBalance().toString() !== subaddressSum.toString()) (0, _assert.default)(hasUnconfirmedTx, "Subaddress balance must equal sum of its unspent outputs if no unconfirmed txs");
          }
        }
      });

      if (testConfig.testNonRelays)
      it("Can get and set a transaction note", async function () {
        let txs = await getRandomTransactions(that.wallet, undefined, 1, 5);

        // set notes
        let uuid = _index.GenUtils.getUUID();
        for (let i = 0; i < txs.length; i++) {
          await that.wallet.setTxNote(txs[i].getHash(), uuid + i);
        }

        // get notes
        for (let i = 0; i < txs.length; i++) {
          _assert.default.equal(await that.wallet.getTxNote(txs[i].getHash()), uuid + i);
        }
      });

      // TODO: why does getting cached txs take 2 seconds when should already be cached?
      if (testConfig.testNonRelays)
      it("Can get and set multiple transaction notes", async function () {

        // set tx notes
        let uuid = _index.GenUtils.getUUID();
        let txs = await that.wallet.getTxs();
        (0, _assert.default)(txs.length >= 3, "Test requires 3 or more wallet transactions; run send tests");
        let txHashes = [];
        let txNotes = [];
        for (let i = 0; i < txHashes.length; i++) {
          txHashes.push(txs[i].getHash());
          txNotes.push(uuid + i);
        }
        await that.wallet.setTxNotes(txHashes, txNotes);

        // get tx notes
        txNotes = await that.wallet.getTxNotes(txHashes);
        for (let i = 0; i < txHashes.length; i++) {
          _assert.default.equal(uuid + i, txNotes[i]);
        }

        // TODO: test that get transaction has note
      });

      if (testConfig.testNonRelays)
      it("Can check a transfer using the transaction's secret key and the destination", async function () {

        // wait for pool txs to confirm if no confirmed txs with destinations
        if ((await that.wallet.getTxs({ isConfirmed: true, isOutgoing: true, transferQuery: { hasDestinations: true } })).length === 0) {
          _TestUtils.default.WALLET_TX_TRACKER.reset();
          await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        }

        // get random txs that are confirmed and have outgoing destinations
        let txs;
        try {
          txs = await getRandomTransactions(that.wallet, { isConfirmed: true, isOutgoing: true, transferQuery: { hasDestinations: true } }, 1, MAX_TX_PROOFS);
        } catch (e) {
          if (e.message.indexOf("found with") >= 0) throw new Error("No txs with outgoing destinations found; run send tests");
          throw e;
        }

        // test good checks
        (0, _assert.default)(txs.length > 0, "No transactions found with outgoing destinations");
        for (let tx of txs) {
          let key = await that.wallet.getTxKey(tx.getHash());
          (0, _assert.default)(key, "No tx key returned for tx hash");
          (0, _assert.default)(tx.getOutgoingTransfer().getDestinations().length > 0);
          for (let destination of tx.getOutgoingTransfer().getDestinations()) {
            let check = await that.wallet.checkTxKey(tx.getHash(), key, destination.getAddress());
            if (destination.getAmount() > 0n) {
              // TODO monero-wallet-rpc: indicates amount received amount is 0 despite transaction with transfer to this address
              // TODO monero-wallet-rpc: returns 0-4 errors, not consistent
              //assert(check.getReceivedAmount() > 0n);
              if (check.getReceivedAmount() === 0n) {
                console.log("WARNING: key proof indicates no funds received despite transfer (txid=" + tx.getHash() + ", key=" + key + ", address=" + destination.getAddress() + ", amount=" + destination.getAmount() + ")");
              }
            } else
            (0, _assert.default)(check.getReceivedAmount() === 0n);
            testCheckTx(tx, check);
          }
        }

        // test get tx key with invalid hash
        try {
          await that.wallet.getTxKey("invalid_tx_id");
          throw new Error("Should throw exception for invalid key");
        } catch (e) {
          that.testInvalidTxHashError(e);
        }

        // test check with invalid tx hash
        let tx = txs[0];
        let key = await that.wallet.getTxKey(tx.getHash());
        let destination = tx.getOutgoingTransfer().getDestinations()[0];
        try {
          await that.wallet.checkTxKey("invalid_tx_id", key, destination.getAddress());
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testInvalidTxHashError(e);
        }

        // test check with invalid key
        try {
          await that.wallet.checkTxKey(tx.getHash(), "invalid_tx_key", destination.getAddress());
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testInvalidTxKeyError(e);
        }

        // test check with invalid address
        try {
          await that.wallet.checkTxKey(tx.getHash(), key, "invalid_tx_address");
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testInvalidAddressError(e);
        }

        // test check with different address
        let differentAddress;
        for (let aTx of await that.wallet.getTxs()) {
          if (!aTx.getOutgoingTransfer() || !aTx.getOutgoingTransfer().getDestinations()) continue;
          for (let aDestination of aTx.getOutgoingTransfer().getDestinations()) {
            if (aDestination.getAddress() !== destination.getAddress()) {
              differentAddress = aDestination.getAddress();
              break;
            }
          }
        }
        (0, _assert.default)(differentAddress, "Could not get a different outgoing address to test; run send tests");
        let check = await that.wallet.checkTxKey(tx.getHash(), key, differentAddress);
        (0, _assert.default)(check.getIsGood());
        (0, _assert.default)(check.getReceivedAmount() >= 0n);
        testCheckTx(tx, check);
      });

      if (testConfig.testNonRelays)
      it("Can prove a transaction by getting its signature", async function () {

        // get random txs with outgoing destinations
        let txs;
        try {
          txs = await getRandomTransactions(that.wallet, { transferQuery: { hasDestinations: true } }, 2, MAX_TX_PROOFS);
        } catch (e) {
          if (e.message.indexOf("found with") >= 0) throw new Error("No txs with outgoing destinations found; run send tests");
          throw e;
        }

        // test good checks with messages
        for (let tx of txs) {
          for (let destination of tx.getOutgoingTransfer().getDestinations()) {
            let signature = await that.wallet.getTxProof(tx.getHash(), destination.getAddress(), "This transaction definitely happened.");
            (0, _assert.default)(signature, "No signature returned from getTxProof()");
            let check = await that.wallet.checkTxProof(tx.getHash(), destination.getAddress(), "This transaction definitely happened.", signature);
            testCheckTx(tx, check);
          }
        }

        // test good check without message
        let tx = txs[0];
        let destination = tx.getOutgoingTransfer().getDestinations()[0];
        let signature = await that.wallet.getTxProof(tx.getHash(), destination.getAddress());
        let check = await that.wallet.checkTxProof(tx.getHash(), destination.getAddress(), undefined, signature);
        testCheckTx(tx, check);

        // test get proof with invalid hash
        try {
          await that.wallet.getTxProof("invalid_tx_id", destination.getAddress());
          throw new Error("Should throw exception for invalid key");
        } catch (e) {
          that.testInvalidTxHashError(e);
        }

        // test check with invalid tx hash
        try {
          await that.wallet.checkTxProof("invalid_tx_id", destination.getAddress(), undefined, signature);
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testInvalidTxHashError(e);
        }

        // test check with invalid address
        try {
          await that.wallet.checkTxProof(tx.getHash(), "invalid_tx_address", undefined, signature);
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testInvalidAddressError(e);
        }

        // test check with wrong message
        signature = await that.wallet.getTxProof(tx.getHash(), destination.getAddress(), "This is the right message");
        check = await that.wallet.checkTxProof(tx.getHash(), destination.getAddress(), "This is the wrong message", signature);
        _assert.default.equal(check.getIsGood(), false);
        testCheckTx(tx, check);

        // test check with wrong signature
        let wrongSignature = await that.wallet.getTxProof(txs[1].getHash(), txs[1].getOutgoingTransfer().getDestinations()[0].getAddress(), "This is the right message");
        try {
          check = await that.wallet.checkTxProof(tx.getHash(), destination.getAddress(), "This is the right message", wrongSignature);
          _assert.default.equal(check.getIsGood(), false);
        } catch (e) {
          that.testInvalidSignatureError(e);
        }

        // test check with empty signature
        try {
          check = await that.wallet.checkTxProof(tx.getHash(), destination.getAddress(), "This is the right message", "");
          _assert.default.equal(check.getIsGood(), false);
        } catch (e) {
          _assert.default.equal("Must provide signature to check tx proof", e.message);
        }
      });

      if (testConfig.testNonRelays)
      it("Can prove a spend using a generated signature and no destination public address", async function () {

        // get random confirmed outgoing txs
        let txs = await getRandomTransactions(that.wallet, { isIncoming: false, inTxPool: false, isFailed: false }, 2, MAX_TX_PROOFS);
        for (let tx of txs) {
          _assert.default.equal(tx.getIsConfirmed(), true);
          _assert.default.equal(tx.getIncomingTransfers(), undefined);
          (0, _assert.default)(tx.getOutgoingTransfer());
        }

        // test good checks with messages
        for (let tx of txs) {
          let signature = await that.wallet.getSpendProof(tx.getHash(), "I am a message.");
          (0, _assert.default)(signature, "No signature returned for spend proof");
          (0, _assert.default)(await that.wallet.checkSpendProof(tx.getHash(), "I am a message.", signature));
        }

        // test good check without message
        let tx = txs[0];
        let signature = await that.wallet.getSpendProof(tx.getHash());
        (0, _assert.default)(await that.wallet.checkSpendProof(tx.getHash(), undefined, signature));

        // test get proof with invalid hash
        try {
          await that.wallet.getSpendProof("invalid_tx_id");
          throw new Error("Should throw exception for invalid key");
        } catch (e) {
          that.testInvalidTxHashError(e);
        }

        // test check with invalid tx hash
        try {
          await that.wallet.checkSpendProof("invalid_tx_id", undefined, signature);
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testInvalidTxHashError(e);
        }

        // test check with invalid message
        signature = await that.wallet.getSpendProof(tx.getHash(), "This is the right message");
        _assert.default.equal(await that.wallet.checkSpendProof(tx.getHash(), "This is the wrong message", signature), false);

        // test check with wrong signature
        signature = await that.wallet.getSpendProof(txs[1].getHash(), "This is the right message");
        _assert.default.equal(await that.wallet.checkSpendProof(tx.getHash(), "This is the right message", signature), false);
      });

      if (testConfig.testNonRelays)
      it("Can prove reserves in the wallet", async function () {

        // get proof of entire wallet
        let signature = await that.wallet.getReserveProofWallet("Test message");
        (0, _assert.default)(signature, "No signature returned for wallet reserve proof");

        // check proof of entire wallet
        let check = await that.wallet.checkReserveProof(await that.wallet.getPrimaryAddress(), "Test message", signature);
        (0, _assert.default)(check.getIsGood());
        testCheckReserve(check);
        let balance = await that.wallet.getBalance();
        if (balance !== check.getTotalAmount()) {// TODO monero-wallet-rpc: this check fails with unconfirmed txs
          let unconfirmedTxs = await that.wallet.getTxs({ inTxPool: true });
          (0, _assert.default)(unconfirmedTxs.length > 0, "Reserve amount must equal balance unless wallet has unconfirmed txs");
        }

        // test different wallet address
        let differentAddress = await _TestUtils.default.getExternalWalletAddress();
        try {
          await that.wallet.checkReserveProof(differentAddress, "Test message", signature);
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testNoSubaddressError(e);
        }

        // test subaddress
        try {
          await that.wallet.checkReserveProof((await that.wallet.getSubaddress(0, 1)).getAddress(), "Test message", signature);
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testNoSubaddressError(e);
        }

        // test wrong message
        check = await that.wallet.checkReserveProof(await that.wallet.getPrimaryAddress(), "Wrong message", signature);
        _assert.default.equal(check.getIsGood(), false); // TODO: specifically test reserve checks, probably separate objects
        testCheckReserve(check);

        // test wrong signature
        try {
          await that.wallet.checkReserveProof(await that.wallet.getPrimaryAddress(), "Test message", "wrong signature");
          throw new Error("Should have thrown exception");
        } catch (e) {
          that.testSignatureHeaderCheckError(e);
        }
      });

      if (testConfig.testNonRelays)
      it("Can prove reserves in an account", async function () {

        // test proofs of accounts
        let numNonZeroTests = 0;
        let msg = "Test message";
        let accounts = await that.wallet.getAccounts();
        let signature;
        for (let account of accounts) {
          if (account.getBalance() > 0n) {
            let checkAmount = (await account.getBalance()) / BigInt(2);
            signature = await that.wallet.getReserveProofAccount(account.getIndex(), checkAmount, msg);
            let check = await that.wallet.checkReserveProof(await that.wallet.getPrimaryAddress(), msg, signature);
            (0, _assert.default)(check.getIsGood());
            testCheckReserve(check);
            (0, _assert.default)(check.getTotalAmount() >= checkAmount);
            numNonZeroTests++;
          } else {
            try {
              await that.wallet.getReserveProofAccount(account.getIndex(), account.getBalance(), msg);
              throw new Error("Should have thrown exception");
            } catch (e) {
              _assert.default.equal(e.getCode(), -1);
              try {
                await that.wallet.getReserveProofAccount(account.getIndex(), _TestUtils.default.MAX_FEE, msg);
                throw new Error("Should have thrown exception");
              } catch (e2) {
                _assert.default.equal(e2.getCode(), -1);
              }
            }
          }
        }
        (0, _assert.default)(numNonZeroTests > 1, "Must have more than one account with non-zero balance; run send-to-multiple tests");

        // test error when not enough balance for requested minimum reserve amount
        try {
          let reserveProof = await that.wallet.getReserveProofAccount(0, accounts[0].getBalance() + _TestUtils.default.MAX_FEE, "Test message");
          throw new Error("should have thrown error");
        } catch (e) {
          if (e.message === "should have thrown error") throw new Error("Should have thrown exception but got reserve proof: https://github.com/monero-project/monero/issues/6595");
          _assert.default.equal(e.getCode(), -1);
        }

        // test different wallet address
        let differentAddress = await _TestUtils.default.getExternalWalletAddress();
        try {
          await that.wallet.checkReserveProof(differentAddress, "Test message", signature);
          throw new Error("Should have thrown exception");
        } catch (e) {
          _assert.default.equal(e.getCode(), -1);
        }

        // test subaddress
        try {
          await that.wallet.checkReserveProof((await that.wallet.getSubaddress(0, 1)).getAddress(), "Test message", signature);
          throw new Error("Should have thrown exception");
        } catch (e) {
          _assert.default.equal(e.getCode(), -1);
        }

        // test wrong message
        let check = await that.wallet.checkReserveProof(await that.wallet.getPrimaryAddress(), "Wrong message", signature);
        _assert.default.equal(check.getIsGood(), false); // TODO: specifically test reserve checks, probably separate objects
        testCheckReserve(check);

        // test wrong signature
        try {
          await that.wallet.checkReserveProof(await that.wallet.getPrimaryAddress(), "Test message", "wrong signature");
          throw new Error("Should have thrown exception");
        } catch (e) {
          _assert.default.equal(e.getCode(), -1);
        }
      });

      if (testConfig.testNonRelays)
      it("Can export key images", async function () {
        let images = await that.wallet.exportKeyImages(true);
        (0, _assert.default)(Array.isArray(images));
        (0, _assert.default)(images.length > 0, "No signed key images in wallet");
        for (let image of images) {
          (0, _assert.default)(image instanceof _index.MoneroKeyImage);
          (0, _assert.default)(image.getHex());
          (0, _assert.default)(image.getSignature());
        }

        // wallet exports key images since last export by default
        images = await that.wallet.exportKeyImages();
        let imagesAll = await that.wallet.exportKeyImages(true);
        (0, _assert.default)(imagesAll.length > images.length);
      });

      if (testConfig.testNonRelays)
      it("Can get new key images from the last import", async function () {

        // get outputs hex
        let outputsHex = await that.wallet.exportOutputs();

        // import outputs hex
        if (outputsHex !== undefined) {
          let numImported = await that.wallet.importOutputs(outputsHex);
          (0, _assert.default)(numImported >= 0);
        }

        // get and test new key images from last import
        let images = await that.wallet.getNewKeyImagesFromLastImport();
        (0, _assert.default)(Array.isArray(images));
        (0, _assert.default)(images.length > 0, "No new key images in last import"); // TODO: these are already known to the wallet, so no new key images will be imported
        for (let image of images) {
          (0, _assert.default)(image.getHex());
          (0, _assert.default)(image.getSignature());
        }
      });

      if (testConfig.testNonRelays && false) // TODO monero-project: importing key images can cause erasure of incoming transfers per wallet2.cpp:11957
        it("Can import key images", async function () {
          let images = await that.wallet.exportKeyImages();
          (0, _assert.default)(Array.isArray(images));
          (0, _assert.default)(images.length > 0, "Wallet does not have any key images; run send tests");
          let result = await that.wallet.importKeyImages(images);
          (0, _assert.default)(result.getHeight() > 0);

          // determine if non-zero spent and unspent amounts are expected
          let txs = await that.wallet.getTxs({ isConfirmed: true, transferQuery: { isIncoming: false } });
          let balance = await that.wallet.getBalance();
          let hasSpent = txs.length > 0;
          let hasUnspent = balance > 0n;

          // test amounts
          _TestUtils.default.testUnsignedBigInt(result.getSpentAmount(), hasSpent);
          _TestUtils.default.testUnsignedBigInt(result.getUnspentAmount(), hasUnspent);
        });

      if (testConfig.testNonRelays)
      it("Can sign and verify messages", async function () {

        // message to sign and subaddresses to test
        let msg = "This is a super important message which needs to be signed and verified.";
        let subaddresses = [new _index.MoneroSubaddress({ accountIndex: 0, index: 0 }), new _index.MoneroSubaddress({ accountIndex: 0, index: 1 }), new _index.MoneroSubaddress({ accountIndex: 1, index: 0 })];

        // test signing message with subaddresses
        for (let subaddress of subaddresses) {

          // sign and verify message with spend key
          let signature = await that.wallet.signMessage(msg, _index.MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY, subaddress.getAccountIndex(), subaddress.getIndex());
          let result = await that.wallet.verifyMessage(msg, await that.wallet.getAddress(subaddress.getAccountIndex(), subaddress.getIndex()), signature);
          _assert.default.deepEqual(result, new _index.MoneroMessageSignatureResult({ isGood: true, isOld: false, signatureType: _index.MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY, version: 2 }));

          // verify message with incorrect address
          result = await that.wallet.verifyMessage(msg, await that.wallet.getAddress(0, 2), signature);
          _assert.default.deepEqual(result, new _index.MoneroMessageSignatureResult({ isGood: false }));

          // verify message with external address
          result = await that.wallet.verifyMessage(msg, await _TestUtils.default.getExternalWalletAddress(), signature);
          _assert.default.deepEqual(result, new _index.MoneroMessageSignatureResult({ isGood: false }));

          // verify message with invalid address
          result = await that.wallet.verifyMessage(msg, "invalid address", signature);
          _assert.default.deepEqual(result, new _index.MoneroMessageSignatureResult({ isGood: false }));

          // sign and verify message with view key
          signature = await that.wallet.signMessage(msg, _index.MoneroMessageSignatureType.SIGN_WITH_VIEW_KEY, subaddress.getAccountIndex(), subaddress.getIndex());
          result = await that.wallet.verifyMessage(msg, await that.wallet.getAddress(subaddress.getAccountIndex(), subaddress.getIndex()), signature);
          _assert.default.deepEqual(result, new _index.MoneroMessageSignatureResult({ isGood: true, isOld: false, signatureType: _index.MoneroMessageSignatureType.SIGN_WITH_VIEW_KEY, version: 2 }));

          // verify message with incorrect address
          result = await that.wallet.verifyMessage(msg, await that.wallet.getAddress(0, 2), signature);
          _assert.default.deepEqual(result, new _index.MoneroMessageSignatureResult({ isGood: false }));

          // verify message with external address
          result = await that.wallet.verifyMessage(msg, await _TestUtils.default.getExternalWalletAddress(), signature);
          _assert.default.deepEqual(result, new _index.MoneroMessageSignatureResult({ isGood: false }));

          // verify message with invalid address
          result = await that.wallet.verifyMessage(msg, "invalid address", signature);
          _assert.default.deepEqual(result, new _index.MoneroMessageSignatureResult({ isGood: false }));
        }
      });

      if (testConfig.testNonRelays)
      it("Has an address book", async function () {

        // initial state
        let entries = await that.wallet.getAddressBookEntries();
        let numEntriesStart = entries.length;
        for (let entry of entries) await testAddressBookEntry(entry);

        // test adding standard addresses
        const NUM_ENTRIES = 5;
        let address = (await that.wallet.getSubaddress(0, 0)).getAddress();
        let indices = [];
        for (let i = 0; i < NUM_ENTRIES; i++) {
          indices.push(await that.wallet.addAddressBookEntry(address, "hi there!"));
        }
        entries = await that.wallet.getAddressBookEntries();
        _assert.default.equal(entries.length, numEntriesStart + NUM_ENTRIES);
        for (let idx of indices) {
          let found = false;
          for (let entry of entries) {
            if (idx === entry.getIndex()) {
              await testAddressBookEntry(entry);
              _assert.default.equal(entry.getAddress(), address);
              _assert.default.equal(entry.getDescription(), "hi there!");
              found = true;
              break;
            }
          }
          (0, _assert.default)(found, "Index " + idx + " not found in address book indices");
        }

        // edit each address book entry
        for (let idx of indices) {
          await that.wallet.editAddressBookEntry(idx, false, undefined, true, "hello there!!");
        }
        entries = await that.wallet.getAddressBookEntries(indices);
        for (let entry of entries) {
          _assert.default.equal(entry.getDescription(), "hello there!!");
        }

        // delete entries at starting index
        let deleteIdx = indices[0];
        for (let i = 0; i < indices.length; i++) {
          await that.wallet.deleteAddressBookEntry(deleteIdx);
        }
        entries = await that.wallet.getAddressBookEntries();
        _assert.default.equal(entries.length, numEntriesStart);

        // test adding integrated addresses
        indices = [];
        let paymentId = "03284e41c342f03"; // payment id less one character
        let integratedAddresses = {};
        let integratedDescriptions = {};
        for (let i = 0; i < NUM_ENTRIES; i++) {
          let integratedAddress = await that.wallet.getIntegratedAddress(undefined, paymentId + i); // create unique integrated address
          let uuid = _index.GenUtils.getUUID();
          let idx = await that.wallet.addAddressBookEntry(integratedAddress.toString(), uuid);
          indices.push(idx);
          integratedAddresses[idx] = integratedAddress;
          integratedDescriptions[idx] = uuid;
        }
        entries = await that.wallet.getAddressBookEntries();
        _assert.default.equal(entries.length, numEntriesStart + NUM_ENTRIES);
        for (let idx of indices) {
          let found = false;
          for (let entry of entries) {
            if (idx === entry.getIndex()) {
              await testAddressBookEntry(entry);
              _assert.default.equal(entry.getDescription(), integratedDescriptions[idx]);
              _assert.default.equal(entry.getAddress(), integratedAddresses[idx].toString());
              _assert.default.equal(entry.getPaymentId(), undefined);
              found = true;
              break;
            }
          }
          (0, _assert.default)(found, "Index " + idx + " not found in address book indices");
        }

        // delete entries at starting index
        deleteIdx = indices[0];
        for (let i = 0; i < indices.length; i++) {
          await that.wallet.deleteAddressBookEntry(deleteIdx);
        }
        entries = await that.wallet.getAddressBookEntries();
        _assert.default.equal(entries.length, numEntriesStart);
      });

      if (testConfig.testNonRelays)
      it("Can get and set arbitrary key/value attributes", async function () {

        // set attributes
        let attrs = {};
        for (let i = 0; i < 5; i++) {
          let key = "attr" + i;
          let val = _index.GenUtils.getUUID();
          attrs[key] = val;
          await that.wallet.setAttribute(key, val);
        }

        // test attributes
        for (let key of Object.keys(attrs)) {
          _assert.default.equal(attrs[key], await that.wallet.getAttribute(key));
        }

        // get an undefined attribute
        _assert.default.equal(await that.wallet.getAttribute("unset_key"), undefined);
      });

      if (testConfig.testNonRelays)
      it("Can convert between a tx config and payment URI", async function () {

        // test with address and amount
        let config1 = new _index.MoneroTxConfig({ address: await that.wallet.getAddress(0, 0), amount: BigInt(0) });
        let uri = await that.wallet.getPaymentUri(config1);
        let config2 = await that.wallet.parsePaymentUri(uri);
        _index.GenUtils.deleteUndefinedKeys(config1);
        _index.GenUtils.deleteUndefinedKeys(config2);
        _assert.default.deepEqual(JSON.parse(JSON.stringify(config2.toJson())), JSON.parse(JSON.stringify(config1.toJson())));

        // test with subaddress and all fields
        config1.getDestinations()[0].setAddress((await that.wallet.getSubaddress(0, 1)).getAddress());
        config1.getDestinations()[0].setAmount(425000000000n);
        config1.setRecipientName("John Doe");
        config1.setNote("OMZG XMR FTW");
        uri = await that.wallet.getPaymentUri(config1.toJson());
        config2 = await that.wallet.parsePaymentUri(uri);
        _index.GenUtils.deleteUndefinedKeys(config1);
        _index.GenUtils.deleteUndefinedKeys(config2);
        _assert.default.deepEqual(JSON.parse(JSON.stringify(config2.toJson())), JSON.parse(JSON.stringify(config1.toJson())));

        // test with undefined address
        let address = config1.getDestinations()[0].getAddress();
        config1.getDestinations()[0].setAddress(undefined);
        try {
          await that.wallet.getPaymentUri(config1);
          throw new Error("Should have thrown exception with invalid parameters");
        } catch (e) {
          (0, _assert.default)(e.message.indexOf("Cannot make URI from supplied parameters") >= 0);
        }
        config1.getDestinations()[0].setAddress(address);

        // test with standalone payment id
        config1.setPaymentId("03284e41c342f03603284e41c342f03603284e41c342f03603284e41c342f036");
        try {
          await that.wallet.getPaymentUri(config1);
          throw new Error("Should have thrown exception with invalid parameters");
        } catch (e) {
          (0, _assert.default)(e.message.indexOf("Cannot make URI from supplied parameters") >= 0);
        }
      });

      if (testConfig.testNonRelays)
      it("Can start and stop mining", async function () {
        let status = await that.daemon.getMiningStatus();
        if (status.getIsActive()) await that.wallet.stopMining();
        await that.wallet.startMining(2, false, true);
        await that.wallet.stopMining();
      });

      if (testConfig.testNonRelays)
      it("Can change the wallet password", async function () {

        // create random wallet
        let wallet = await that.createWallet(new _index.MoneroWalletConfig().setPassword(_TestUtils.default.WALLET_PASSWORD));
        let path = await wallet.getPath();

        // change password
        let newPassword = "";
        await wallet.changePassword(_TestUtils.default.WALLET_PASSWORD, newPassword);

        // close wallet without saving
        await that.closeWallet(wallet, true);

        // old password does not work (password change is auto saved)
        try {
          await that.openWallet(new _index.MoneroWalletConfig().setPath(path).setPassword(_TestUtils.default.WALLET_PASSWORD));
          throw new Error("Should have thrown");
        } catch (err) {
          (0, _assert.default)(err.message === "Failed to open wallet" || err.message === "invalid password"); // TODO: different errors from rpc and wallet2
        }

        // open wallet with new password
        wallet = await that.openWallet(new _index.MoneroWalletConfig().setPath(path).setPassword(newPassword));

        // change password with incorrect password
        try {
          await wallet.changePassword("badpassword", newPassword);
          throw new Error("Should have thrown");
        } catch (err) {
          _assert.default.equal(err.message, "Invalid original password.");
        }

        // save and close
        await that.closeWallet(wallet, true);

        // open wallet
        wallet = await that.openWallet(new _index.MoneroWalletConfig().setPath(path).setPassword(newPassword));

        // close wallet
        await that.closeWallet(wallet);
      });

      if (testConfig.testNonRelays)
      it("Can save and close the wallet in a single call", async function () {

        // create random wallet
        let password = ""; // unencrypted
        let wallet = await that.createWallet({ password: password });
        let path = await wallet.getPath();

        // set an attribute
        let uuid = _index.GenUtils.getUUID();
        await wallet.setAttribute("id", uuid);

        // close the wallet without saving
        await that.closeWallet(wallet);

        // re-open the wallet and ensure attribute was not saved
        wallet = await that.openWallet({ path: path, password: password });
        _assert.default.equal(await wallet.getAttribute("id"), undefined);

        // set the attribute and close with saving
        await wallet.setAttribute("id", uuid);
        await that.closeWallet(wallet, true);

        // re-open the wallet and ensure attribute was saved
        wallet = await that.openWallet({ path: path, password: password });
        _assert.default.equal(await wallet.getAttribute("id"), uuid);
        await that.closeWallet(wallet);
      });

      // ----------------------------- NOTIFICATION TESTS -------------------------

      if (testConfig.testNotifications)
      it("Can generate notifications sending to different wallet.", async function () {
        await testWalletNotifications("testNotificationsDifferentWallet", false, false, false, false, 0);
      });

      if (testConfig.testNotifications)
      it("Can generate notifications sending to different wallet when relayed", async function () {
        await testWalletNotifications("testNotificationsDifferentWalletWhenRelayed", false, false, false, true, 3);
      });

      if (testConfig.testNotifications)
      it("Can generate notifications sending to different account.", async function () {
        await testWalletNotifications("testNotificationsDifferentAccounts", true, false, false, false, 0);
      });

      if (testConfig.testNotifications)
      it("Can generate notifications sending to same account", async function () {
        await testWalletNotifications("testNotificationsSameAccount", true, true, false, false, 0);
      });

      if (testConfig.testNotifications)
      it("Can generate notifications sweeping output to different account", async function () {
        await testWalletNotifications("testNotificationsDifferentAccountSweepOutput", true, false, true, false, 0);
      });

      if (testConfig.testNotifications)
      it("Can generate notifications sweeping output to same account when relayed", async function () {
        await testWalletNotifications("testNotificationsSameAccountSweepOutputWhenRelayed", true, true, true, true, 0);
      });

      async function testWalletNotifications(testName, sameWallet, sameAccount, sweepOutput, createThenRelay, unlockDelay) {
        let issues = await testWalletNotificationsAux(sameWallet, sameAccount, sweepOutput, createThenRelay, unlockDelay);
        if (issues.length === 0) return;
        let msg = testName + "(" + sameWallet + ", " + sameAccount + ", " + sweepOutput + ", " + createThenRelay + ") generated " + issues.length + " issues:\n" + issuesToStr(issues);
        console.log(msg);
        if (msg.includes("ERROR:")) throw new Error(msg);
      }

      // TODO: test sweepUnlocked()
      async function testWalletNotificationsAux(sameWallet, sameAccount, sweepOutput, createThenRelay, unlockDelay) {
        let MAX_POLL_TIME = 5000; // maximum time granted for wallet to poll

        // collect issues as test runs
        let issues = [];

        // set sender and receiver
        let sender = that.wallet;
        let receiver = sameWallet ? sender : await that.createWallet(new _index.MoneroWalletConfig());

        // create receiver accounts if necessary
        let numAccounts = (await receiver.getAccounts()).length;
        for (let i = 0; i < 4 - numAccounts; i++) await receiver.createAccount();

        // wait for unlocked funds in source account
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(sender);
        await _TestUtils.default.WALLET_TX_TRACKER.waitForUnlockedBalance(sender, 0, undefined, _TestUtils.default.MAX_FEE * 10n);

        // get balances to compare after sending
        let senderBalanceBefore = await sender.getBalance();
        let senderUnlockedBalanceBefore = await sender.getUnlockedBalance();
        let receiverBalanceBefore = await receiver.getBalance();
        let receiverUnlockedBalanceBefore = await receiver.getUnlockedBalance();
        let lastHeight = await that.daemon.getHeight();

        // start collecting notifications from sender and receiver
        let senderNotificationCollector = new WalletNotificationCollector();
        let receiverNotificationCollector = new WalletNotificationCollector();
        await sender.addListener(senderNotificationCollector);
        await _index.GenUtils.waitFor(_TestUtils.default.SYNC_PERIOD_IN_MS / 2); // TODO: remove this, should be unnecessary
        await receiver.addListener(receiverNotificationCollector);

        // send funds
        let ctx = { wallet: sender, isSendResponse: true };
        let senderTx;
        let destinationAccounts = sameAccount ? sweepOutput ? [0] : [0, 1, 2] : sweepOutput ? [1] : [1, 2, 3];
        let expectedOutputs = [];
        if (sweepOutput) {
          ctx.isSweepResponse = true;
          ctx.isSweepOutputResponse = true;
          let outputs = await sender.getOutputs({ isSpent: false, accountIndex: 0, minAmount: _TestUtils.default.MAX_FEE * 5n, txQuery: { isLocked: false } });
          if (outputs.length === 0) {
            issues.push("ERROR: No outputs available to sweep from account 0");
            return issues;
          }
          let config = { address: await receiver.getAddress(destinationAccounts[0], 0), keyImage: outputs[0].getKeyImage().getHex(), relay: !createThenRelay };
          senderTx = await sender.sweepOutput(config);
          expectedOutputs.push(new _index.MoneroOutputWallet().setAmount(senderTx.getOutgoingTransfer().getDestinations()[0].getAmount()).setAccountIndex(destinationAccounts[0]).setSubaddressIndex(0));
          ctx.config = new _index.MoneroTxConfig(config);
        } else {
          let config = new _index.MoneroTxConfig().setAccountIndex(0).setRelay(!createThenRelay);
          for (let destinationAccount of destinationAccounts) {
            config.addDestination(await receiver.getAddress(destinationAccount, 0), _TestUtils.default.MAX_FEE); // TODO: send and check random amounts?
            expectedOutputs.push(new _index.MoneroOutputWallet().setAmount(_TestUtils.default.MAX_FEE).setAccountIndex(destinationAccount).setSubaddressIndex(0));
          }
          senderTx = await sender.createTx(config);
          ctx.config = config;
        }
        if (createThenRelay) await sender.relayTx(senderTx);

        // start timer to measure end of sync period
        let startTime = Date.now(); // timestamp in ms

        // test send tx
        await that.testTxWallet(senderTx, ctx);

        // test sender after sending
        let outputQuery = new _index.MoneroOutputQuery().setTxQuery(new _index.MoneroTxQuery().setHash(senderTx.getHash())); // query for outputs from sender tx
        if (sameWallet) {
          if (senderTx.getIncomingAmount() === undefined) issues.push("WARNING: sender tx incoming amount is null when sent to same wallet");else
          if (senderTx.getIncomingAmount() === 0n) issues.push("WARNING: sender tx incoming amount is 0 when sent to same wallet");else
          if (senderTx.getIncomingAmount() !== senderTx.getOutgoingAmount() - senderTx.getFee()) issues.push("WARNING: sender tx incoming amount != outgoing amount - fee when sent to same wallet");
        } else {
          if (senderTx.getIncomingAmount() !== undefined) issues.push("ERROR: tx incoming amount should be undefined"); // TODO: should be 0? then can remove undefined checks in this method
        }
        senderTx = (await sender.getTxs(new _index.MoneroTxQuery().setHash(senderTx.getHash()).setIncludeOutputs(true)))[0];
        if ((await sender.getBalance()) !== senderBalanceBefore - senderTx.getFee() - senderTx.getOutgoingAmount() + (senderTx.getIncomingAmount() === undefined ? 0n : senderTx.getIncomingAmount())) issues.push("ERROR: sender balance after send != balance before - tx fee - outgoing amount + incoming amount (" + (await sender.getBalance()) + " != " + senderBalanceBefore + " - " + senderTx.getFee() + " - " + senderTx.getOutgoingAmount() + " + " + senderTx.getIncomingAmount() + ")");
        if ((await sender.getUnlockedBalance()) >= senderUnlockedBalanceBefore) issues.push("ERROR: sender unlocked balance should have decreased after sending");
        if (senderNotificationCollector.getBalanceNotifications().length === 0) issues.push("ERROR: sender did not notify balance change after sending");else
        {
          if ((await sender.getBalance()) !== senderNotificationCollector.getBalanceNotifications()[senderNotificationCollector.getBalanceNotifications().length - 1].balance) issues.push("ERROR: sender balance != last notified balance after sending (" + (await sender.getBalance()) + " != " + senderNotificationCollector.getBalanceNotifications()[senderNotificationCollector.getBalanceNotifications().length - 1][0]) + ")";
          if ((await sender.getUnlockedBalance()) !== senderNotificationCollector.getBalanceNotifications()[senderNotificationCollector.getBalanceNotifications().length - 1].unlockedBalance) issues.push("ERROR: sender unlocked balance != last notified unlocked balance after sending (" + (await sender.getUnlockedBalance()) + " != " + senderNotificationCollector.getBalanceNotifications()[senderNotificationCollector.getBalanceNotifications().length - 1][1]) + ")";
        }
        if (senderNotificationCollector.getOutputsSpent(outputQuery).length === 0) issues.push("ERROR: sender did not announce unconfirmed spent output");

        // test receiver after 2 sync periods
        await _index.GenUtils.waitFor(_TestUtils.default.SYNC_PERIOD_IN_MS * 2 - (Date.now() - startTime));
        startTime = Date.now(); // reset timer
        let receiverTx = await receiver.getTx(senderTx.getHash());
        if (senderTx.getOutgoingAmount() !== receiverTx.getIncomingAmount()) {
          if (sameAccount) issues.push("WARNING: sender tx outgoing amount != receiver tx incoming amount when sent to same account (" + senderTx.getOutgoingAmount() + " != " + receiverTx.getIncomingAmount() + ")");else
          issues.push("ERROR: sender tx outgoing amount != receiver tx incoming amount (" + senderTx.getOutgoingAmount() + " != " + receiverTx.getIncomingAmount()) + ")";
        }
        if ((await receiver.getBalance()) !== receiverBalanceBefore + (receiverTx.getIncomingAmount() === undefined ? 0n : receiverTx.getIncomingAmount()) - (receiverTx.getOutgoingAmount() === undefined ? 0n : receiverTx.getOutgoingAmount()) - (sameWallet ? receiverTx.getFee() : 0n)) {
          if (sameAccount) issues.push("WARNING: after sending, receiver balance != balance before + incoming amount - outgoing amount - tx fee when sent to same account (" + (await receiver.getBalance()) + " != " + receiverBalanceBefore + " + " + receiverTx.getIncomingAmount() + " - " + receiverTx.getOutgoingAmount() + " - " + (sameWallet ? receiverTx.getFee() : 0n).toString() + ")");else
          issues.push("ERROR: after sending, receiver balance != balance before + incoming amount - outgoing amount - tx fee (" + (await receiver.getBalance()) + " != " + receiverBalanceBefore + " + " + receiverTx.getIncomingAmount() + " - " + receiverTx.getOutgoingAmount() + " - " + (sameWallet ? receiverTx.getFee() : 0n).toString() + ")");
        }
        if (!sameWallet && (await receiver.getUnlockedBalance()) !== receiverUnlockedBalanceBefore) issues.push("ERROR: receiver unlocked balance should not have changed after sending");
        if (receiverNotificationCollector.getBalanceNotifications().length === 0) issues.push("ERROR: receiver did not notify balance change when funds received");else
        {
          if ((await receiver.getBalance()) !== receiverNotificationCollector.getBalanceNotifications()[receiverNotificationCollector.getBalanceNotifications().length - 1].balance) issues.push("ERROR: receiver balance != last notified balance after funds received");
          if ((await receiver.getUnlockedBalance()) !== receiverNotificationCollector.getBalanceNotifications()[receiverNotificationCollector.getBalanceNotifications().length - 1].unlockedBalance) issues.push("ERROR: receiver unlocked balance != last notified unlocked balance after funds received");
        }
        if (receiverNotificationCollector.getOutputsReceived(outputQuery).length === 0) issues.push("ERROR: receiver did not announce unconfirmed received output");else
        {
          for (let output of getMissingOutputs(expectedOutputs, receiverNotificationCollector.getOutputsReceived(outputQuery), true)) {
            issues.push("ERROR: receiver did not announce received output for amount " + output.getAmount() + " to subaddress [" + output.getAccountIndex() + ", " + output.getSubaddressIndex() + "]");
          }
        }

        // mine until test completes
        await _StartMining.default.startMining();

        // loop every sync period until unlock tested
        let threads = [];
        let expectedUnlockTime = lastHeight + unlockDelay;
        let confirmHeight = undefined;
        while (true) {

          // test height notifications
          let height = await that.daemon.getHeight();
          if (height > lastHeight) {
            let testStartHeight = lastHeight;
            lastHeight = height;
            let threadFn = async function () {
              await _index.GenUtils.waitFor(_TestUtils.default.SYNC_PERIOD_IN_MS * 2 + MAX_POLL_TIME); // wait 2 sync periods + poll time for notifications
              let senderBlockNotifications = senderNotificationCollector.getBlockNotifications();
              let receiverBlockNotifications = receiverNotificationCollector.getBlockNotifications();
              for (let i = testStartHeight; i < height; i++) {
                if (!_index.GenUtils.arrayContains(senderBlockNotifications, i)) issues.push("ERROR: sender did not announce block " + i);
                if (!_index.GenUtils.arrayContains(receiverBlockNotifications, i)) issues.push("ERROR: receiver did not announce block " + i);
              }
            };
            threads.push(threadFn());
          }

          // check if tx confirmed
          if (confirmHeight === undefined) {

            // get updated tx
            let tx = await receiver.getTx(senderTx.getHash());

            // break if tx fails
            if (tx.getIsFailed()) {
              issues.push("ERROR: tx failed in tx pool");
              break;
            }

            // test confirm notifications
            if (tx.getIsConfirmed() && confirmHeight === undefined) {
              confirmHeight = tx.getHeight();
              expectedUnlockTime = Math.max(confirmHeight + NUM_BLOCKS_LOCKED, expectedUnlockTime); // exact unlock time known
              let threadFn = async function () {
                await _index.GenUtils.waitFor(_TestUtils.default.SYNC_PERIOD_IN_MS * 2 + MAX_POLL_TIME); // wait 2 sync periods + poll time for notifications
                let confirmedQuery = outputQuery.getTxQuery().copy().setIsConfirmed(true).setIsLocked(true).getOutputQuery();
                if (senderNotificationCollector.getOutputsSpent(confirmedQuery).length === 0) issues.push("ERROR: sender did not announce confirmed spent output"); // TODO: test amount
                if (receiverNotificationCollector.getOutputsReceived(confirmedQuery).length === 0) issues.push("ERROR: receiver did not announce confirmed received output");else
                for (let output of getMissingOutputs(expectedOutputs, receiverNotificationCollector.getOutputsReceived(confirmedQuery), true)) issues.push("ERROR: receiver did not announce confirmed received output for amount " + output.getAmount() + " to subaddress [" + output.getAccountIndex() + ", " + output.getSubaddressIndex() + "]");

                // if same wallet, net amount spent = tx fee = outputs spent - outputs received
                if (sameWallet) {
                  let netAmount = 0n;
                  for (let outputSpent of senderNotificationCollector.getOutputsSpent(confirmedQuery)) netAmount = netAmount + outputSpent.getAmount();
                  for (let outputReceived of senderNotificationCollector.getOutputsReceived(confirmedQuery)) netAmount = netAmount - outputReceived.getAmount();
                  if (tx.getFee() !== netAmount) {
                    if (sameAccount) issues.push("WARNING: net output amount != tx fee when funds sent to same account: " + netAmount + " vs " + tx.getFee());else
                    if (sender instanceof _index.MoneroWalletRpc) issues.push("WARNING: net output amount != tx fee when funds sent to same wallet because monero-wallet-rpc does not provide tx inputs: " + netAmount + " vs " + tx.getFee()); // TODO (monero-project): open issue to provide tx inputs
                    else issues.push("ERROR: net output amount must equal tx fee when funds sent to same wallet: " + netAmount + " vs " + tx.getFee());
                  }
                }
              };
              threads.push(threadFn());
            }
          }

          // otherwise test unlock notifications
          else if (height >= expectedUnlockTime) {
            let threadFn = async function () {
              await _index.GenUtils.waitFor(_TestUtils.default.SYNC_PERIOD_IN_MS * 2 + MAX_POLL_TIME); // wait 2 sync periods + poll time for notifications
              let unlockedQuery = outputQuery.getTxQuery().copy().setIsLocked(false).getOutputQuery();
              if (senderNotificationCollector.getOutputsSpent(unlockedQuery).length === 0) issues.push("ERROR: sender did not announce unlocked spent output"); // TODO: test amount?
              for (let output of getMissingOutputs(expectedOutputs, receiverNotificationCollector.getOutputsReceived(unlockedQuery), true)) issues.push("ERROR: receiver did not announce unlocked received output for amount " + output.getAmount() + " to subaddress [" + output.getAccountIndex() + ", " + output.getSubaddressIndex() + "]");
              if (!sameWallet && (await receiver.getBalance()) !== (await receiver.getUnlockedBalance())) issues.push("ERROR: receiver balance != unlocked balance after funds unlocked");
              if (senderNotificationCollector.getBalanceNotifications().length === 0) issues.push("ERROR: sender did not announce any balance notifications");else
              {
                if ((await sender.getBalance()) !== senderNotificationCollector.getBalanceNotifications()[senderNotificationCollector.getBalanceNotifications().length - 1].balance) issues.push("ERROR: sender balance != last notified balance after funds unlocked");
                if ((await sender.getUnlockedBalance()) !== senderNotificationCollector.getBalanceNotifications()[senderNotificationCollector.getBalanceNotifications().length - 1].unlockedBalance) issues.push("ERROR: sender unlocked balance != last notified unlocked balance after funds unlocked");
              }
              if (receiverNotificationCollector.getBalanceNotifications().length === 0) issues.push("ERROR: receiver did not announce any balance notifications");else
              {
                if ((await receiver.getBalance()) !== receiverNotificationCollector.getBalanceNotifications()[receiverNotificationCollector.getBalanceNotifications().length - 1].balance) issues.push("ERROR: receiver balance != last notified balance after funds unlocked");
                if ((await receiver.getUnlockedBalance()) !== receiverNotificationCollector.getBalanceNotifications()[receiverNotificationCollector.getBalanceNotifications().length - 1].unlockedBalance) issues.push("ERROR: receiver unlocked balance != last notified unlocked balance after funds unlocked");
              }
            };
            threads.push(threadFn());
            break;
          }

          // wait for end of sync period
          await _index.GenUtils.waitFor(_TestUtils.default.SYNC_PERIOD_IN_MS - (Date.now() - startTime));
          startTime = Date.now(); // reset timer
        }

        // wait for test threads
        await Promise.all(threads);

        // test notified outputs
        for (let output of senderNotificationCollector.getOutputsSpent(outputQuery)) testNotifiedOutput(output, true, issues);
        for (let output of senderNotificationCollector.getOutputsReceived(outputQuery)) testNotifiedOutput(output, false, issues);
        for (let output of receiverNotificationCollector.getOutputsSpent(outputQuery)) testNotifiedOutput(output, true, issues);
        for (let output of receiverNotificationCollector.getOutputsReceived(outputQuery)) testNotifiedOutput(output, false, issues);

        // clean up
        if ((await that.daemon.getMiningStatus()).getIsActive()) await that.daemon.stopMining();
        await sender.removeListener(senderNotificationCollector);
        senderNotificationCollector.setListening(false);
        await receiver.removeListener(receiverNotificationCollector);
        receiverNotificationCollector.setListening(false);
        if (sender !== receiver) await that.closeWallet(receiver);
        return issues;
      }

      function getMissingOutputs(expectedOutputs, actualOutputs, matchSubaddress) {
        let missing = [];
        let used = [];
        for (let expectedOutput of expectedOutputs) {
          let found = false;
          for (let actualOutput of actualOutputs) {
            if (_index.GenUtils.arrayContains(used, actualOutput, true)) continue;
            if (actualOutput.getAmount() === expectedOutput.getAmount() && (!matchSubaddress || actualOutput.getAccountIndex() === expectedOutput.getAccountIndex() && actualOutput.getSubaddressIndex() === expectedOutput.getSubaddressIndex())) {
              used.push(actualOutput);
              found = true;
              break;
            }
          }
          if (!found) missing.push(expectedOutput);
        }
        return missing;
      }

      function issuesToStr(issues) {
        if (issues.length === 0) return undefined;
        let str = "";
        for (let i = 0; i < issues.length; i++) {
          str += i + 1 + ": " + issues[i];
          if (i < issues.length - 1) str += "\n";
        }
        return str;
      }

      function testNotifiedOutput(output, isTxInput, issues) {

        // test tx link
        _assert.default.notEqual(undefined, output.getTx());
        if (isTxInput) (0, _assert.default)(output.getTx().getInputs().includes(output));else
        (0, _assert.default)(output.getTx().getOutputs().includes(output));

        // test output values
        _TestUtils.default.testUnsignedBigInt(output.getAmount());
        if (output.getAccountIndex() !== undefined) (0, _assert.default)(output.getAccountIndex() >= 0);else
        {
          if (isTxInput) issues.push("WARNING: notification of " + getOutputState(output) + " spent output missing account index"); // TODO (monero-project): account index not provided when output swept by key image.  could retrieve it but slows tx creation significantly
          else issues.push("ERROR: notification of " + getOutputState(output) + " received output missing account index");
        }
        if (output.getSubaddressIndex() !== undefined) (0, _assert.default)(output.getSubaddressIndex() >= 0);else
        {
          if (isTxInput) issues.push("WARNING: notification of " + getOutputState(output) + " spent output missing subaddress index"); // TODO (monero-project): because inputs are not provided, creating fake input from outgoing transfer, which can be sourced from multiple subaddress indices, whereas an output can only come from one subaddress index; need to provide tx inputs to resolve this
          else issues.push("ERROR: notification of " + getOutputState(output) + " received output missing subaddress index");
        }
      }

      function getOutputState(output) {
        if (false === output.getTx().getIsLocked()) return "unlocked";
        if (true === output.getTx().getIsConfirmed()) return "confirmed";
        if (false === output.getTx().getIsConfirmed()) return "unconfirmed";
        throw new Error("Unknown output state: " + output.toString());
      }

      it("Can stop listening", async function () {

        // create offline wallet
        let wallet = await that.createWallet(new _index.MoneroWalletConfig().setServer(_TestUtils.default.OFFLINE_SERVER_URI));

        // add listener
        let listener = new WalletNotificationCollector();
        await wallet.addListener(listener);
        await wallet.setDaemonConnection(await that.daemon.getRpcConnection());
        await new Promise(function (resolve) {setTimeout(resolve, 1000);});

        // remove listener and close
        await wallet.removeListener(listener);
        await that.closeWallet(wallet);
      });

      if (testConfig.testNotifications)
      it("Can be created and receive funds", async function () {

        // create a random wallet
        let receiver = await that.createWallet({ password: "mysupersecretpassword123" });
        let err;
        try {

          // listen for received outputs
          let myListener = new WalletNotificationCollector();
          await receiver.addListener(myListener);

          // wait for txs to confirm and for sufficient unlocked balance
          await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
          await _TestUtils.default.WALLET_TX_TRACKER.waitForUnlockedBalance(that.wallet, 0, undefined, _TestUtils.default.MAX_FEE);

          // send funds to the created wallet
          let sentTx = await that.wallet.createTx({ accountIndex: 0, address: await receiver.getPrimaryAddress(), amount: _TestUtils.default.MAX_FEE, relay: true });

          // wait for funds to confirm
          try {await _StartMining.default.startMining();} catch (e) {}
          while (!(await that.wallet.getTx(sentTx.getHash())).getIsConfirmed()) {
            if ((await that.wallet.getTx(sentTx.getHash())).getIsFailed()) throw new Error("Tx failed in mempool: " + sentTx.getHash());
            await that.daemon.waitForNextBlockHeader();
          }

          // receiver should have notified listeners of received outputs
          await new Promise(function (resolve) {setTimeout(resolve, 1000);}); // TODO: this lets block slip, okay?
          (0, _assert.default)(myListener.getOutputsReceived().length > 0, "Listener did not receive outputs");
        } catch (e) {
          err = e;
        }

        // final cleanup
        await that.closeWallet(receiver);
        try {await that.daemon.stopMining();} catch (e) {}
        if (err) throw err;
      });

      // TODO: test sending to multiple accounts
      if (testConfig.testRelays && testConfig.testNotifications)
      it("Can update a locked tx sent from/to the same account as blocks are added to the chain", async function () {
        let config = new _index.MoneroTxConfig({ accountIndex: 0, address: await that.wallet.getPrimaryAddress(), amount: _TestUtils.default.MAX_FEE, unlockTime: BigInt((await that.daemon.getHeight()) + 3), canSplit: false, relay: true });
        await testSendAndUpdateTxs(config);
      });

      if (testConfig.testRelays && testConfig.testNotifications && !testConfig.liteMode)
      it("Can update split locked txs sent from/to the same account as blocks are added to the chain", async function () {
        let config = new _index.MoneroTxConfig({ accountIndex: 0, address: await that.wallet.getPrimaryAddress(), amount: _TestUtils.default.MAX_FEE, unlockTime: BigInt((await that.daemon.getHeight()) + 3), canSplit: true, relay: true });
        await testSendAndUpdateTxs(config);
      });

      if (testConfig.testRelays && testConfig.testNotifications && !testConfig.liteMode)
      it("Can update a locked tx sent from/to different accounts as blocks are added to the chain", async function () {
        let config = new _index.MoneroTxConfig({ accountIndex: 0, address: (await that.wallet.getSubaddress(1, 0)).getAddress(), amount: _TestUtils.default.MAX_FEE, unlockTime: BigInt((await that.daemon.getHeight()) + 3), canSplit: false, relay: true });
        await testSendAndUpdateTxs(config);
      });

      if (testConfig.testRelays && testConfig.testNotifications && !testConfig.liteMode)
      it("Can update locked, split txs sent from/to different accounts as blocks are added to the chain", async function () {
        let config = new _index.MoneroTxConfig({ accountIndex: 0, address: (await that.wallet.getSubaddress(1, 0)).getAddress(), amount: _TestUtils.default.MAX_FEE, unlockTime: BigInt((await that.daemon.getHeight()) + 3), relay: true });
        await testSendAndUpdateTxs(config);
      });

      /**
       * Tests sending a tx with an unlock time then tracking and updating it as
       * blocks are added to the chain.
       * 
       * TODO: test wallet accounting throughout this; dedicated method? probably.
       * 
       * Allows sending to and from the same account which is an edge case where
       * incoming txs are occluded by their outgoing counterpart (issue #4500)
       * and also where it is impossible to discern which incoming output is
       * the tx amount and which is the change amount without wallet metadata.
       * 
       * @param config - tx configuration to send and test
       */
      async function testSendAndUpdateTxs(config) {
        if (!config) config = new _index.MoneroTxConfig();

        // wait for txs to confirm and for sufficient unlocked balance
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        (0, _assert.default)(!config.getSubaddressIndices());
        await _TestUtils.default.WALLET_TX_TRACKER.waitForUnlockedBalance(that.wallet, config.getAccountIndex(), undefined, _TestUtils.default.MAX_FEE * 2n);

        // this test starts and stops mining, so it's wrapped in order to stop mining if anything fails
        let err;
        try {

          // send transactions
          let sentTxs = config.getCanSplit() !== false ? await that.wallet.createTxs(config) : [await that.wallet.createTx(config)];

          // test sent transactions
          for (let tx of sentTxs) {
            await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: true });
            _assert.default.equal(tx.getIsConfirmed(), false);
            _assert.default.equal(tx.getInTxPool(), true);
          }

          // track resulting outgoing and incoming txs as blocks are added to the chain
          let updatedTxs;

          // start mining
          try {await _StartMining.default.startMining();}
          catch (e) {console.log("WARNING: could not start mining: " + e.message);} // not fatal

          // loop to update txs through confirmations
          let numConfirmations = 0;
          const numConfirmationsTotal = 2; // number of confirmations to test
          while (numConfirmations < numConfirmationsTotal) {

            // wait for a block
            let header = await that.daemon.waitForNextBlockHeader();
            console.log("*** Block " + header.getHeight() + " added to chain ***");

            // give wallet time to catch up, otherwise incoming tx may not appear
            await new Promise(function (resolve) {setTimeout(resolve, _TestUtils.default.SYNC_PERIOD_IN_MS);}); // TODO: this lets block slip, okay?

            // get incoming/outgoing txs with sent hashes
            let txQuery = new _index.MoneroTxQuery();
            txQuery.setHashes(sentTxs.map((sentTx) => sentTx.getHash())); // TODO: convenience methods wallet.getTxById(), getTxsById()?
            let fetchedTxs = await that.getAndTestTxs(that.wallet, txQuery, true);
            (0, _assert.default)(fetchedTxs.length > 0);

            // test fetched txs
            await testOutInPairs(that.wallet, fetchedTxs, config, false);

            // merge fetched txs into updated txs and original sent txs
            for (let fetchedTx of fetchedTxs) {

              // merge with updated txs
              if (updatedTxs === undefined) updatedTxs = fetchedTxs;else
              {
                for (let updatedTx of updatedTxs) {
                  if (fetchedTx.getHash() !== updatedTx.getHash()) continue;
                  if (!!fetchedTx.getOutgoingTransfer() !== !!updatedTx.getOutgoingTransfer()) continue; // skip if directions are different
                  updatedTx.merge(fetchedTx.copy());
                  if (!updatedTx.getBlock() && fetchedTx.getBlock()) updatedTx.setBlock(fetchedTx.getBlock().copy().setTxs([updatedTx])); // copy block for testing
                }
              }

              // merge with original sent txs
              for (let sentTx of sentTxs) {
                if (fetchedTx.getHash() !== sentTx.getHash()) continue;
                if (!!fetchedTx.getOutgoingTransfer() !== !!sentTx.getOutgoingTransfer()) continue; // skip if directions are different
                sentTx.merge(fetchedTx.copy()); // TODO: it's mergeable but tests don't account for extra info from send (e.g. hex) so not tested; could specify in test context
              }
            }

            // test updated txs
            testGetTxsStructure(updatedTxs, config);
            await testOutInPairs(that.wallet, updatedTxs, config, false);

            // update confirmations in order to exit loop
            numConfirmations = fetchedTxs[0].getNumConfirmations();
          }
        } catch (e) {
          err = e;
        }

        // stop mining
        try {await that.wallet.stopMining();}
        catch (e) {}

        // throw error if there was one
        if (err) throw err;
      }

      async function testOutInPairs(wallet, txs, config, isSendResponse) {

        // for each out tx
        let txOut;
        for (let tx of txs) {
          await testUnlockTx(that.wallet, tx, config, isSendResponse);
          if (!tx.getOutgoingTransfer()) continue;
          let txOut = tx;

          // find incoming counterpart
          let txIn;
          for (let tx2 of txs) {
            if (tx2.getIncomingTransfers() && tx.getHash() === tx2.getHash()) {
              txIn = tx2;
              break;
            }
          }

          // test out / in pair
          // TODO monero-wallet-rpc: incoming txs occluded by their outgoing counterpart #4500
          if (!txIn) {
            console.log("WARNING: outgoing tx " + txOut.getHash() + " missing incoming counterpart (issue #4500)");
          } else {
            await testOutInPair(txOut, txIn);
          }
        }
      }

      async function testOutInPair(txOut, txIn) {
        _assert.default.equal(txIn.getIsConfirmed(), txOut.getIsConfirmed());
        _assert.default.equal(txOut.getOutgoingAmount(), txIn.getIncomingAmount());
      }

      async function testUnlockTx(wallet, tx, config, isSendResponse) {
        try {
          await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: isSendResponse });
        } catch (e) {
          console.log(tx.toString());
          throw e;
        }
      }

      //  ----------------------------- TEST RELAYS ---------------------------

      if (testConfig.testNonRelays)
      it("Validates inputs when sending funds", async function () {

        // try sending with invalid address
        try {
          await that.wallet.createTx({ address: "my invalid address", accountIndex: 0, amount: _TestUtils.default.MAX_FEE });
          throw new Error("fail");
        } catch (err) {
          _assert.default.equal(err.message, "Invalid destination address");
        }
      });

      if (testConfig.testRelays)
      it("Can send to self", async function () {
        let err;
        let recipient;
        try {

          // wait for txs to confirm and for sufficient unlocked balance
          await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
          let amount = _TestUtils.default.MAX_FEE * 3n;
          await _TestUtils.default.WALLET_TX_TRACKER.waitForUnlockedBalance(that.wallet, 0, undefined, amount);

          // collect sender balances before
          let balance1 = await that.wallet.getBalance();
          let unlockedBalance1 = await that.wallet.getUnlockedBalance();

          // send funds to self
          let tx = await that.wallet.createTx({
            accountIndex: 0,
            address: (await that.wallet.getIntegratedAddress()).getIntegratedAddress(),
            amount: amount,
            relay: true
          });

          // test balances after
          let balance2 = await that.wallet.getBalance();
          let unlockedBalance2 = await that.wallet.getUnlockedBalance();
          (0, _assert.default)(unlockedBalance2 < unlockedBalance1); // unlocked balance should decrease
          let expectedBalance = balance1 - tx.getFee();
          _assert.default.equal(expectedBalance.toString(), balance2.toString(), "Balance after send was not balance before - net tx amount - fee (5 - 1 != 4 test)");
        } catch (e) {
          err = e;
        }

        // finally 
        if (recipient && !(await recipient.isClosed())) await that.closeWallet(recipient);
        if (err) throw err;
      });

      if (testConfig.testRelays)
      it("Can send to an external address", async function () {
        let err;
        let recipient;
        try {

          // wait for txs to confirm and for sufficient unlocked balance
          await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
          let amount = _TestUtils.default.MAX_FEE * 3n;
          await _TestUtils.default.WALLET_TX_TRACKER.waitForUnlockedBalance(that.wallet, 0, undefined, amount);

          // create recipient wallet
          recipient = await that.createWallet(new _index.MoneroWalletConfig());

          // collect sender balances before
          let balance1 = await that.wallet.getBalance();
          let unlockedBalance1 = await that.wallet.getUnlockedBalance();

          // send funds to recipient
          let tx = await that.wallet.createTx({
            accountIndex: 0,
            address: await recipient.getPrimaryAddress(),
            amount: amount,
            relay: true
          });

          // test sender balances after
          let balance2 = await that.wallet.getBalance();
          let unlockedBalance2 = await that.wallet.getUnlockedBalance();
          (0, _assert.default)(unlockedBalance2 < unlockedBalance1); // unlocked balance should decrease
          let expectedBalance = balance1 - tx.getOutgoingAmount() - tx.getFee();
          _assert.default.equal(expectedBalance.toString(), balance2.toString(), "Balance after send was not balance before - net tx amount - fee (5 - 1 != 4 test)");

          // test recipient balance after
          await recipient.sync();
          (0, _assert.default)((await that.wallet.getTxs({ isConfirmed: false })).length > 0);
          _assert.default.equal(amount.toString(), (await recipient.getBalance()).toString());
        } catch (e) {
          err = e;
        }

        // finally 
        if (recipient && !(await recipient.isClosed())) await that.closeWallet(recipient);
        if (err) throw err;
      });

      if (testConfig.testRelays)
      it("Can send from multiple subaddresses in a single transaction", async function () {
        await testSendFromMultiple();
      });

      if (testConfig.testRelays)
      it("Can send from multiple subaddresses in split transactions", async function () {
        await testSendFromMultiple(new _index.MoneroTxConfig().setCanSplit(true));
      });

      async function testSendFromMultiple(config) {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        if (!config) config = new _index.MoneroTxConfig();

        let NUM_SUBADDRESSES = 2; // number of subaddresses to send from

        // get first account with (NUM_SUBADDRESSES + 1) subaddresses with unlocked balances
        let accounts = await that.wallet.getAccounts(true);
        (0, _assert.default)(accounts.length >= 2, "This test requires at least 2 accounts; run send-to-multiple tests");
        let srcAccount;
        let unlockedSubaddresses = [];
        let hasBalance = false;
        for (let account of accounts) {
          unlockedSubaddresses = [];
          let numSubaddressBalances = 0;
          for (let subaddress of account.getSubaddresses()) {
            if (subaddress.getBalance() > _TestUtils.default.MAX_FEE) numSubaddressBalances++;
            if (subaddress.getUnlockedBalance() > _TestUtils.default.MAX_FEE) unlockedSubaddresses.push(subaddress);
          }
          if (numSubaddressBalances >= NUM_SUBADDRESSES + 1) hasBalance = true;
          if (unlockedSubaddresses.length >= NUM_SUBADDRESSES + 1) {
            srcAccount = account;
            break;
          }
        }
        (0, _assert.default)(hasBalance, "Wallet does not have account with " + (NUM_SUBADDRESSES + 1) + " subaddresses with balances; run send-to-multiple tests");
        (0, _assert.default)(unlockedSubaddresses.length >= NUM_SUBADDRESSES + 1, "Wallet is waiting on unlocked funds");

        // determine the indices of the first two subaddresses with unlocked balances
        let fromSubaddressIndices = [];
        for (let i = 0; i < NUM_SUBADDRESSES; i++) {
          fromSubaddressIndices.push(unlockedSubaddresses[i].getIndex());
        }

        // determine the amount to send
        let sendAmount = BigInt(0);
        for (let fromSubaddressIdx of fromSubaddressIndices) {
          sendAmount = sendAmount + srcAccount.getSubaddresses()[fromSubaddressIdx].getUnlockedBalance();
        }
        sendAmount = sendAmount / SEND_DIVISOR;

        // send from the first subaddresses with unlocked balances
        let address = await that.wallet.getPrimaryAddress();
        config.setDestinations([new _index.MoneroDestination(address, sendAmount)]);
        config.setAccountIndex(srcAccount.getIndex());
        config.setSubaddressIndices(fromSubaddressIndices);
        config.setRelay(true);
        let configCopy = config.copy();
        let txs = [];
        if (config.getCanSplit() !== false) {
          for (let tx of await that.wallet.createTxs(config)) txs.push(tx);
        } else {
          txs.push(await that.wallet.createTx(config));
        }
        if (config.getCanSplit() === false) _assert.default.equal(txs.length, 1); // must have exactly one tx if no split

        // test that config is unchanged
        (0, _assert.default)(configCopy !== config);
        _assert.default.deepEqual(config, configCopy);

        // test that balances of intended subaddresses decreased
        let accountsAfter = await that.wallet.getAccounts(true);
        _assert.default.equal(accountsAfter.length, accounts.length);
        let srcUnlockedBalanceDecreased = false;
        for (let i = 0; i < accounts.length; i++) {
          _assert.default.equal(accountsAfter[i].getSubaddresses().length, accounts[i].getSubaddresses().length);
          for (let j = 0; j < accounts[i].getSubaddresses().length; j++) {
            let subaddressBefore = accounts[i].getSubaddresses()[j];
            let subaddressAfter = accountsAfter[i].getSubaddresses()[j];
            if (i === srcAccount.getIndex() && fromSubaddressIndices.includes(j)) {
              if (subaddressAfter.getUnlockedBalance() < subaddressBefore.getUnlockedBalance()) srcUnlockedBalanceDecreased = true;
            } else {
              _assert.default.equal(subaddressAfter.getUnlockedBalance(), subaddressBefore.getUnlockedBalance(), "Subaddress [" + i + "," + j + "] unlocked balance should not have changed");
            }
          }
        }
        (0, _assert.default)(srcUnlockedBalanceDecreased, "Subaddress unlocked balances should have decreased");

        // test each transaction
        (0, _assert.default)(txs.length > 0);
        let outgoingSum = BigInt(0);
        for (let tx of txs) {
          await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: true });
          outgoingSum = outgoingSum + tx.getOutgoingAmount();
          if (tx.getOutgoingTransfer() !== undefined && tx.getOutgoingTransfer().getDestinations()) {
            let destinationSum = BigInt(0);
            for (let destination of tx.getOutgoingTransfer().getDestinations()) {
              await testDestination(destination);
              _assert.default.equal(destination.getAddress(), address);
              destinationSum = destinationSum + destination.getAmount();
            }
            _assert.default.equal(tx.getOutgoingAmount(), destinationSum); // assert that transfers sum up to tx amount
          }
        }

        // assert that tx amounts sum up the amount sent within a small margin
        if (_index.GenUtils.abs(sendAmount - outgoingSum) > SEND_MAX_DIFF) {// send amounts may be slightly different
          throw new Error("Tx amounts are too different: " + sendAmount + " - " + outgoingSum + " = " + (sendAmount - outgoingSum));
        }
      }

      if (testConfig.testRelays)
      it("Can send to an address in a single transaction.", async function () {
        await testSendToSingle(new _index.MoneroTxConfig().setCanSplit(false));
      });

      // NOTE: this test will be invalid when payment ids are fully removed
      if (testConfig.testRelays)
      it("Can send to an address in a single transaction with a payment id", async function () {
        let integratedAddress = await that.wallet.getIntegratedAddress();
        let paymentId = integratedAddress.getPaymentId();
        try {
          await testSendToSingle(new _index.MoneroTxConfig().setCanSplit(false).setPaymentId(paymentId + paymentId + paymentId + paymentId)); // 64 character payment id
          throw new Error("fail");
        } catch (e) {
          _assert.default.equal(e.message, "Standalone payment IDs are obsolete. Use subaddresses or integrated addresses instead");
        }
      });

      if (testConfig.testRelays)
      it("Can send to an address with split transactions", async function () {
        await testSendToSingle(new _index.MoneroTxConfig().setCanSplit(true).setRelay(true));
      });

      if (testConfig.testRelays)
      it("Can create then relay a transaction to send to a single address", async function () {
        await testSendToSingle(new _index.MoneroTxConfig().setCanSplit(false));
      });

      if (testConfig.testRelays)
      it("Can create then relay split transactions to send to a single address", async function () {
        await testSendToSingle(new _index.MoneroTxConfig().setCanSplit(true));
      });

      async function testSendToSingle(config) {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        if (!config) config = new _index.MoneroTxConfig();

        // find a non-primary subaddress to send from
        let sufficientBalance = false;
        let fromAccount = undefined;
        let fromSubaddress = undefined;
        let accounts = await that.wallet.getAccounts(true);
        for (let account of accounts) {
          let subaddresses = account.getSubaddresses();
          for (let i = 1; i < subaddresses.length; i++) {
            if (subaddresses[i].getBalance() > _TestUtils.default.MAX_FEE) sufficientBalance = true;
            if (subaddresses[i].getUnlockedBalance() > _TestUtils.default.MAX_FEE) {
              fromAccount = account;
              fromSubaddress = subaddresses[i];
              break;
            }
          }
          if (fromAccount != undefined) break;
        }
        (0, _assert.default)(sufficientBalance, "No non-primary subaddress found with sufficient balance");
        (0, _assert.default)(fromSubaddress !== undefined, "Wallet is waiting on unlocked funds");

        // get balance before send
        let balanceBefore = fromSubaddress.getBalance();
        let unlockedBalanceBefore = fromSubaddress.getUnlockedBalance();

        // init tx config
        let sendAmount = (unlockedBalanceBefore - _TestUtils.default.MAX_FEE) / SEND_DIVISOR;
        let address = await that.wallet.getPrimaryAddress();
        config.setDestinations([new _index.MoneroDestination(address, sendAmount)]);
        config.setAccountIndex(fromAccount.getIndex());
        config.setSubaddressIndices([fromSubaddress.getIndex()]);
        let reqCopy = config.copy();

        // send to self
        let txs = [];
        if (config.getCanSplit() !== false) {
          for (let tx of await that.wallet.createTxs(config)) txs.push(tx);
        } else {
          txs.push(await that.wallet.createTx(config));
        }
        if (config.getCanSplit() === false) _assert.default.equal(txs.length, 1); // must have exactly one tx if no split

        // test that config is unchanged
        (0, _assert.default)(reqCopy !== config);
        _assert.default.deepEqual(config, reqCopy);

        // test common tx set among txs
        testCommonTxSets(txs, false, false, false);

        // handle non-relayed transaction
        if (config.getRelay() !== true) {

          // test transactions
          for (let tx of txs) {
            await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: true });
          }

          // txs are not in the pool
          for (let txCreated of txs) {
            for (let txPool of await that.daemon.getTxPool()) {
              (0, _assert.default)(txPool.getHash() !== txCreated.getHash(), "Created tx should not be in the pool");
            }
          }

          // relay txs
          let txHashes;
          if (config.getCanSplit() !== true) txHashes = [await that.wallet.relayTx(txs[0])]; // test relayTx() with single transaction
          else {
            let txMetadatas = [];
            for (let tx of txs) txMetadatas.push(tx.getMetadata());
            txHashes = await that.wallet.relayTxs(txMetadatas); // test relayTxs() with potentially multiple transactions
          }
          for (let txHash of txHashes) (0, _assert.default)(typeof txHash === "string" && txHash.length === 64);

          // fetch txs for testing
          txs = await that.wallet.getTxs({ hashes: txHashes });
        }

        // test that balance and unlocked balance decreased
        // TODO: test that other balances did not decrease
        let subaddress = await that.wallet.getSubaddress(fromAccount.getIndex(), fromSubaddress.getIndex());
        (0, _assert.default)(subaddress.getBalance() < balanceBefore);
        (0, _assert.default)(subaddress.getUnlockedBalance() < unlockedBalanceBefore);

        // query locked txs
        let lockedTxs = await that.getAndTestTxs(that.wallet, new _index.MoneroTxQuery().setIsLocked(true), true);
        for (let lockedTx of lockedTxs) _assert.default.equal(lockedTx.getIsLocked(), true);

        // test transactions
        (0, _assert.default)(txs.length > 0);
        for (let tx of txs) {
          await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: config.getRelay() === true });
          _assert.default.equal(tx.getOutgoingTransfer().getAccountIndex(), fromAccount.getIndex());
          _assert.default.equal(tx.getOutgoingTransfer().getSubaddressIndices().length, 1);
          _assert.default.equal(tx.getOutgoingTransfer().getSubaddressIndices()[0], fromSubaddress.getIndex());
          _assert.default.equal(sendAmount, tx.getOutgoingAmount());
          if (config.getPaymentId()) _assert.default.equal(config.getPaymentId(), tx.getPaymentId());

          // test outgoing destinations
          if (tx.getOutgoingTransfer() && tx.getOutgoingTransfer().getDestinations()) {
            _assert.default.equal(tx.getOutgoingTransfer().getDestinations().length, 1);
            for (let destination of tx.getOutgoingTransfer().getDestinations()) {
              await testDestination(destination);
              _assert.default.equal(destination.getAddress(), address);
              _assert.default.equal(sendAmount, destination.getAmount());
            }
          }

          // tx is among locked txs
          let found = false;
          for (let lockedTx of lockedTxs) {
            if (lockedTx.getHash() === tx.getHash()) {
              found = true;
              break;
            }
          }
          (0, _assert.default)(found, "Created txs should be among locked txs");
        }

        // if tx was relayed in separate step, all wallets will need to wait for tx to confirm in order to reliably sync
        if (config.getRelay() != true) {
          await _TestUtils.default.WALLET_TX_TRACKER.reset(); // TODO: resetExcept(that.wallet), or does this test wallet also need to be waited on?
        }
      }

      if (testConfig.testRelays)
      it("Can send to multiple addresses in split transactions.", async function () {
        await testSendToMultiple(3, 15, true);
      });

      if (testConfig.testRelays)
      it("Can send to multiple addresses in split transactions using a JavaScript object for configuration", async function () {
        await testSendToMultiple(3, 15, true, undefined, true);
      });

      if (testConfig.testRelays)
      it("Can send dust to multiple addresses in split transactions", async function () {
        let dustAmt = (await that.daemon.getFeeEstimate()).getFee() / BigInt(2);
        await testSendToMultiple(5, 3, true, dustAmt);
      });

      if (testConfig.testRelays)
      it("Can subtract fees from destinations", async function () {
        await testSendToMultiple(5, 3, false, undefined, false, true);
      });

      if (testConfig.testRelays)
      it("Cannot subtract fees from destinations in split transactions", async function () {
        await testSendToMultiple(3, 15, true, undefined, true, true);
      });

      /**
       * Sends funds from the first unlocked account to multiple accounts and subaddresses.
       * 
       * @param numAccounts is the number of accounts to receive funds
       * @param numSubaddressesPerAccount is the number of subaddresses per account to receive funds
       * @param canSplit specifies if the operation can be split into multiple transactions
       * @param sendAmountPerSubaddress is the amount to send to each subaddress (optional, computed if not given)
       * @param useJsConfig specifies if the api should be invoked with a JS object instead of a MoneroTxConfig
       * @param subtractFeeFromDestinations specifies to subtract the fee from destination addresses
       */
      async function testSendToMultiple(numAccounts, numSubaddressesPerAccount, canSplit, sendAmountPerSubaddress, useJsConfig, subtractFeeFromDestinations) {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // compute the minimum account unlocked balance needed in order to fulfill the request
        let minAccountAmount;
        let totalSubaddresses = numAccounts * numSubaddressesPerAccount;
        if (sendAmountPerSubaddress !== undefined) minAccountAmount = BigInt(totalSubaddresses) * sendAmountPerSubaddress + _TestUtils.default.MAX_FEE; // min account amount must cover the total amount being sent plus the tx fee = numAddresses * (amtPerSubaddress + fee)
        else minAccountAmount = _TestUtils.default.MAX_FEE * BigInt(totalSubaddresses) * SEND_DIVISOR + _TestUtils.default.MAX_FEE; // account balance must be more than fee * numAddresses * divisor + fee so each destination amount is at least a fee's worth (so dust is not sent)

        // send funds from first account with sufficient unlocked funds
        let srcAccount;
        let hasBalance = false;
        for (let account of await that.wallet.getAccounts()) {
          if (account.getBalance() > minAccountAmount) hasBalance = true;
          if (account.getUnlockedBalance() > minAccountAmount) {
            srcAccount = account;
            break;
          }
        }
        (0, _assert.default)(hasBalance, "Wallet does not have enough balance; load '" + _TestUtils.default.WALLET_NAME + "' with XMR in order to test sending");
        (0, _assert.default)(srcAccount, "Wallet is waiting on unlocked funds");
        let balance = srcAccount.getBalance();
        let unlockedBalance = srcAccount.getUnlockedBalance();

        // get amount to send total and per subaddress
        let sendAmount;
        if (sendAmountPerSubaddress === undefined) {
          sendAmount = _TestUtils.default.MAX_FEE * 5n * BigInt(totalSubaddresses);
          sendAmountPerSubaddress = sendAmount / BigInt(totalSubaddresses);
        } else {
          sendAmount = sendAmountPerSubaddress * BigInt(totalSubaddresses);
        }

        // create minimum number of accounts
        let accounts = await that.wallet.getAccounts();
        for (let i = 0; i < numAccounts - accounts.length; i++) {
          await that.wallet.createAccount();
        }

        // create minimum number of subaddresses per account and collect destination addresses
        let destinationAddresses = [];
        for (let i = 0; i < numAccounts; i++) {
          let subaddresses = await that.wallet.getSubaddresses(i);
          for (let j = 0; j < numSubaddressesPerAccount - subaddresses.length; j++) await that.wallet.createSubaddress(i);
          subaddresses = await that.wallet.getSubaddresses(i);
          (0, _assert.default)(subaddresses.length >= numSubaddressesPerAccount);
          for (let j = 0; j < numSubaddressesPerAccount; j++) destinationAddresses.push(subaddresses[j].getAddress());
        }

        // build tx config using MoneroTxConfig
        let config = new _index.MoneroTxConfig();
        config.setAccountIndex(srcAccount.getIndex());
        config.setSubaddressIndices([]); // test assigning undefined
        config.setDestinations([]);
        config.setRelay(true);
        config.setCanSplit(canSplit);
        config.setPriority(_index.MoneroTxPriority.NORMAL);
        let subtractFeeFrom = [];
        for (let i = 0; i < destinationAddresses.length; i++) {
          config.getDestinations().push(new _index.MoneroDestination(destinationAddresses[i], sendAmountPerSubaddress));
          subtractFeeFrom.push(i);
        }
        if (subtractFeeFromDestinations) config.setSubtractFeeFrom(subtractFeeFrom);

        // build tx config with JS object
        let jsConfig;
        if (useJsConfig) {
          jsConfig = {};
          jsConfig.accountIndex = srcAccount.getIndex();
          jsConfig.relay = true;
          jsConfig.destinations = [];
          for (let i = 0; i < destinationAddresses.length; i++) {
            jsConfig.destinations.push({ address: destinationAddresses[i], amount: sendAmountPerSubaddress });
          }
          if (subtractFeeFromDestinations) jsConfig.subtractFeeFrom = subtractFeeFrom;
        }

        // send tx(s) with config xor js object
        let configCopy = config.copy();
        let txs = undefined;
        try {
          if (canSplit) {
            txs = await that.wallet.createTxs(useJsConfig ? jsConfig : config);
          } else {
            txs = [await that.wallet.createTx(useJsConfig ? jsConfig : config)];
          }
        } catch (err) {

          // test error applying subtractFromFee with split txs
          if (subtractFeeFromDestinations && !txs) {
            if (err.message !== "subtractfeefrom transfers cannot be split over multiple transactions yet") throw err;
            return;
          }

          throw err;
        }

        // test that config is unchanged
        (0, _assert.default)(configCopy !== config);
        _assert.default.deepEqual(config, configCopy);

        // test that wallet balance decreased
        let account = await that.wallet.getAccount(srcAccount.getIndex());
        (0, _assert.default)(account.getBalance() < balance);
        (0, _assert.default)(account.getUnlockedBalance() < unlockedBalance);

        // build test context
        config.setCanSplit(canSplit);
        let ctx = {};
        ctx.wallet = that.wallet;
        ctx.config = config;
        ctx.isSendResponse = true;

        // test each transaction
        (0, _assert.default)(txs.length > 0);
        let feeSum = BigInt(0);
        let outgoingSum = BigInt(0);
        await that.testTxsWallet(txs, ctx);
        for (let tx of txs) {
          feeSum = feeSum + tx.getFee();
          outgoingSum = outgoingSum + tx.getOutgoingAmount();
          if (tx.getOutgoingTransfer() !== undefined && tx.getOutgoingTransfer().getDestinations()) {
            let destinationSum = BigInt(0);
            for (let destination of tx.getOutgoingTransfer().getDestinations()) {
              await testDestination(destination);
              (0, _assert.default)(destinationAddresses.includes(destination.getAddress()));
              destinationSum = destinationSum + destination.getAmount();
            }
            _assert.default.equal(tx.getOutgoingAmount(), destinationSum); // assert that transfers sum up to tx amount
          }
        }

        // assert that outgoing amounts sum up to the amount sent within a small margin
        if (_index.GenUtils.abs(sendAmount - (subtractFeeFromDestinations ? feeSum : BigInt(0)) - outgoingSum) > SEND_MAX_DIFF) {// send amounts may be slightly different
          throw new Error("Actual send amount is too different from requested send amount: " + sendAmount + " - " + (subtractFeeFromDestinations ? feeSum : BigInt(0)) + " - " + outgoingSum + " = " + sendAmount.subtract(subtractFeeFromDestinations ? feeSum : BigInt(0)).subtract(outgoingSum));
        }
      }

      if (!testConfig.liteMode && (testConfig.testNonRelays || testConfig.testRelays))
      it("Supports view-only and offline wallets to create, sign, and submit transactions", async function () {

        // create view-only and offline wallets
        let viewOnlyWallet = await that.createWallet({ primaryAddress: await that.wallet.getPrimaryAddress(), privateViewKey: await that.wallet.getPrivateViewKey(), restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT });
        let offlineWallet = await that.createWallet({ primaryAddress: await that.wallet.getPrimaryAddress(), privateViewKey: await that.wallet.getPrivateViewKey(), privateSpendKey: await that.wallet.getPrivateSpendKey(), server: _TestUtils.default.OFFLINE_SERVER_URI, restoreHeight: 0 });
        await viewOnlyWallet.sync();

        // test tx signing with wallets
        let err;
        try {
          await that.testViewOnlyAndOfflineWallets(viewOnlyWallet, offlineWallet);
        } catch (e) {
          err = e;
        }

        // finally
        await that.closeWallet(viewOnlyWallet);
        await that.closeWallet(offlineWallet);
        if (err) throw err;
      });

      if (testConfig.testRelays)
      it("Can sweep individual outputs identified by their key images", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // test config
        let numOutputs = 3;

        // get outputs to sweep (not spent, unlocked, and amount >= fee)
        let spendableUnlockedOutputs = await that.wallet.getOutputs(new _index.MoneroOutputQuery().setIsSpent(false).setTxQuery(new _index.MoneroTxQuery().setIsLocked(false)));
        let outputsToSweep = [];
        for (let i = 0; i < spendableUnlockedOutputs.length && outputsToSweep.length < numOutputs; i++) {
          if (spendableUnlockedOutputs[i].getAmount() > _TestUtils.default.MAX_FEE) outputsToSweep.push(spendableUnlockedOutputs[i]); // output cannot be swept if amount does not cover fee
        }
        (0, _assert.default)(outputsToSweep.length >= numOutputs, "Wallet does not have enough sweepable outputs; run send tests");

        // sweep each output by key image
        for (let output of outputsToSweep) {
          testOutputWallet(output);
          _assert.default.equal(output.getIsSpent(), false);
          _assert.default.equal(output.getIsLocked(), false);
          if (output.getAmount() <= _TestUtils.default.MAX_FEE) continue;

          // sweep output to address
          let address = await that.wallet.getAddress(output.getAccountIndex(), output.getSubaddressIndex());
          let config = new _index.MoneroTxConfig({ address: address, keyImage: output.getKeyImage().getHex(), relay: true });
          let tx = await that.wallet.sweepOutput(config);

          // test resulting tx
          config.setCanSplit(false);
          await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: true, isSweepResponse: true, isSweepOutputResponse: true });
        }

        // get outputs after sweeping
        let afterOutputs = await that.wallet.getOutputs();

        // swept output are now spent
        for (let afterOutput of afterOutputs) {
          for (let output of outputsToSweep) {
            if (output.getKeyImage().getHex() === afterOutput.getKeyImage().getHex()) {
              (0, _assert.default)(afterOutput.getIsSpent(), "Output should be spent");
            }
          }
        }
      });

      if (testConfig.testRelays)
      it("Can sweep dust without relaying", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // sweep dust which returns empty list if no dust to sweep (dust does not exist after rct)
        let txs = await that.wallet.sweepDust(false);
        if (txs.length == 0) return;

        // test txs
        let ctx = { config: new _index.MoneroTxConfig(), isSendResponse: true, isSweepResponse: true };
        for (let tx of txs) {
          await that.testTxWallet(tx, ctx);
        }

        // relay txs
        let metadatas = [];
        for (let tx of txs) metadatas.push(tx.getMetadata());
        let txHashes = await that.wallet.relayTxs(metadatas);
        _assert.default.equal(txs.length, txHashes.length);
        for (let txHash of txHashes) _assert.default.equal(txHash.length, 64);

        // fetch and test txs
        txs = await that.wallet.getTxs(new _index.MoneroTxQuery().setHashes(txHashes));
        ctx.config.setRelay(true);
        for (let tx of txs) {
          await that.testTxWallet(tx, ctx);
        }
      });

      if (testConfig.testRelays)
      it("Can sweep dust", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // sweep dust which returns empty list if no dust to sweep (dust does not exist after rct)
        let txs = await that.wallet.sweepDust(true);

        // test any txs
        let ctx = { wallet: that.wallet, isSendResponse: true, isSweepResponse: true };
        for (let tx of txs) {
          await that.testTxWallet(tx, ctx);
        }
      });

      it("Supports multisig wallets", async function () {
        await that.testMultisig(2, 2, false); // n/n
        await that.testMultisig(2, 3, false); // (n-1)/n
        await that.testMultisig(2, 4, testConfig.testRelays && !testConfig.liteMode); // m/n
      });

      // ---------------------------- TEST RESETS -----------------------------

      if (testConfig.testResets)
      it("Can sweep subaddresses", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        const NUM_SUBADDRESSES_TO_SWEEP = 2;

        // collect subaddresses with balance and unlocked balance
        let subaddresses = [];
        let subaddressesBalance = [];
        let subaddressesUnlocked = [];
        for (let account of await that.wallet.getAccounts(true)) {
          if (account.getIndex() === 0) continue; // skip default account
          for (let subaddress of account.getSubaddresses()) {
            subaddresses.push(subaddress);
            if (subaddress.getBalance() > _TestUtils.default.MAX_FEE) subaddressesBalance.push(subaddress);
            if (subaddress.getUnlockedBalance() > _TestUtils.default.MAX_FEE) subaddressesUnlocked.push(subaddress);
          }
        }

        // test requires at least one more subaddresses than the number being swept to verify it does not change
        (0, _assert.default)(subaddressesBalance.length >= NUM_SUBADDRESSES_TO_SWEEP + 1, "Test requires balance in at least " + (NUM_SUBADDRESSES_TO_SWEEP + 1) + " subaddresses from non-default acccount; run send-to-multiple tests");
        (0, _assert.default)(subaddressesUnlocked.length >= NUM_SUBADDRESSES_TO_SWEEP + 1, "Wallet is waiting on unlocked funds");

        // sweep from first unlocked subaddresses
        for (let i = 0; i < NUM_SUBADDRESSES_TO_SWEEP; i++) {

          // sweep unlocked account
          let unlockedSubaddress = subaddressesUnlocked[i];
          let config = new _index.MoneroTxConfig({
            address: await that.wallet.getPrimaryAddress(),
            accountIndex: unlockedSubaddress.getAccountIndex(),
            subaddressIndex: unlockedSubaddress.getIndex(),
            relay: true
          });
          let txs = await that.wallet.sweepUnlocked(config);

          // test transactions
          (0, _assert.default)(txs.length > 0);
          for (let tx of txs) {
            (0, _assert.default)(_index.GenUtils.arrayContains(tx.getTxSet().getTxs(), tx));
            await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: true, isSweepResponse: true });
          }

          // assert unlocked balance is less than max fee
          let subaddress = await that.wallet.getSubaddress(unlockedSubaddress.getAccountIndex(), unlockedSubaddress.getIndex());
          (0, _assert.default)(subaddress.getUnlockedBalance() < _TestUtils.default.MAX_FEE);
        }

        // test subaddresses after sweeping
        let subaddressesAfter = [];
        for (let account of await that.wallet.getAccounts(true)) {
          if (account.getIndex() === 0) continue; // skip default account
          for (let subaddress of account.getSubaddresses()) {
            subaddressesAfter.push(subaddress);
          }
        }
        _assert.default.equal(subaddressesAfter.length, subaddresses.length);
        for (let i = 0; i < subaddresses.length; i++) {
          let subaddressBefore = subaddresses[i];
          let subaddressAfter = subaddressesAfter[i];

          // determine if subaddress was swept
          let swept = false;
          for (let j = 0; j < NUM_SUBADDRESSES_TO_SWEEP; j++) {
            if (subaddressesUnlocked[j].getAccountIndex() === subaddressBefore.getAccountIndex() && subaddressesUnlocked[j].getIndex() === subaddressBefore.getIndex()) {
              swept = true;
              break;
            }
          }

          // assert unlocked balance is less than max fee if swept, unchanged otherwise
          if (swept) {
            (0, _assert.default)(subaddressAfter.getUnlockedBalance() < _TestUtils.default.MAX_FEE);
          } else {
            _assert.default.equal(subaddressBefore.getUnlockedBalance(), subaddressAfter.getUnlockedBalance());
          }
        }
      });

      if (testConfig.testResets)
      it("Can sweep accounts", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        const NUM_ACCOUNTS_TO_SWEEP = 1;

        // collect accounts with sufficient balance and unlocked balance to cover the fee
        let accounts = await that.wallet.getAccounts(true);
        let accountsBalance = [];
        let accountsUnlocked = [];
        for (let account of accounts) {
          if (account.getIndex() === 0) continue; // skip default account
          if (account.getBalance() > _TestUtils.default.MAX_FEE) accountsBalance.push(account);
          if (account.getUnlockedBalance() > _TestUtils.default.MAX_FEE) accountsUnlocked.push(account);
        }

        // test requires at least one more accounts than the number being swept to verify it does not change
        (0, _assert.default)(accountsBalance.length >= NUM_ACCOUNTS_TO_SWEEP + 1, "Test requires balance greater than the fee in at least " + (NUM_ACCOUNTS_TO_SWEEP + 1) + " non-default accounts; run send-to-multiple tests");
        (0, _assert.default)(accountsUnlocked.length >= NUM_ACCOUNTS_TO_SWEEP + 1, "Wallet is waiting on unlocked funds");

        // sweep from first unlocked accounts
        for (let i = 0; i < NUM_ACCOUNTS_TO_SWEEP; i++) {

          // sweep unlocked account
          let unlockedAccount = accountsUnlocked[i];
          let config = new _index.MoneroTxConfig().setAddress(await that.wallet.getPrimaryAddress()).setAccountIndex(unlockedAccount.getIndex()).setRelay(true);
          let txs = await that.wallet.sweepUnlocked(config);

          // test transactions
          (0, _assert.default)(txs.length > 0);
          for (let tx of txs) {
            await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: true, isSweepResponse: true });
          }

          // assert unlocked account balance less than max fee
          let account = await that.wallet.getAccount(unlockedAccount.getIndex());
          (0, _assert.default)(account.getUnlockedBalance() < _TestUtils.default.MAX_FEE);
        }

        // test accounts after sweeping
        let accountsAfter = await that.wallet.getAccounts(true);
        _assert.default.equal(accountsAfter.length, accounts.length);
        for (let i = 0; i < accounts.length; i++) {
          let accountBefore = accounts[i];
          let accountAfter = accountsAfter[i];

          // determine if account was swept
          let swept = false;
          for (let j = 0; j < NUM_ACCOUNTS_TO_SWEEP; j++) {
            if (accountsUnlocked[j].getIndex() === accountBefore.getIndex()) {
              swept = true;
              break;
            }
          }

          // assert unlocked balance is less than max fee if swept, unchanged otherwise
          if (swept) {
            (0, _assert.default)(accountAfter.getUnlockedBalance() < _TestUtils.default.MAX_FEE);
          } else {
            _assert.default.equal(accountBefore.getUnlockedBalance(), accountAfter.getUnlockedBalance());
          }
        }
      });

      if (testConfig.testResets)
      it("Can sweep the whole wallet by accounts", async function () {
        (0, _assert.default)(false, "Are you sure you want to sweep the whole wallet?");
        await testSweepWallet();
      });

      if (testConfig.testResets)
      it("Can sweep the whole wallet by subaddresses", async function () {
        (0, _assert.default)(false, "Are you sure you want to sweep the whole wallet?");
        await testSweepWallet(true);
      });

      async function testSweepWallet(sweepEachSubaddress = false) {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // verify 2 subaddresses with enough unlocked balance to cover the fee
        let subaddressesBalance = [];
        let subaddressesUnlocked = [];
        for (let account of await that.wallet.getAccounts(true)) {
          for (let subaddress of account.getSubaddresses()) {
            if (subaddress.getBalance() > _TestUtils.default.MAX_FEE) subaddressesBalance.push(subaddress);
            if (subaddress.getUnlockedBalance() > _TestUtils.default.MAX_FEE) subaddressesUnlocked.push(subaddress);
          }
        }
        (0, _assert.default)(subaddressesBalance.length >= 2, "Test requires multiple accounts with a balance greater than the fee; run send to multiple first");
        (0, _assert.default)(subaddressesUnlocked.length >= 2, "Wallet is waiting on unlocked funds");

        // sweep
        let destination = await that.wallet.getPrimaryAddress();
        let config = new _index.MoneroTxConfig().setAddress(destination).setSweepEachSubaddress(sweepEachSubaddress).setRelay(true);
        let copy = config.copy();
        let txs = await that.wallet.sweepUnlocked(config);
        _assert.default.deepEqual(config, copy); // config is unchanged
        for (let tx of txs) {
          (0, _assert.default)(_index.GenUtils.arrayContains(tx.getTxSet().getTxs(), tx));
          _assert.default.equal(tx.getTxSet().getMultisigTxHex(), undefined);
          _assert.default.equal(tx.getTxSet().getSignedTxHex(), undefined);
          _assert.default.equal(tx.getTxSet().getUnsignedTxHex(), undefined);
        }
        (0, _assert.default)(txs.length > 0);
        for (let tx of txs) {
          config = new _index.MoneroTxConfig({
            address: destination,
            accountIndex: tx.getOutgoingTransfer().getAccountIndex(),
            sweepEachSubaddress: sweepEachSubaddress,
            relay: true
          });
          await that.testTxWallet(tx, { wallet: that.wallet, config: config, isSendResponse: true, isSweepResponse: true });
        }

        // all unspent, unlocked outputs must be less than fee
        let spendableOutputs = await that.wallet.getOutputs(new _index.MoneroOutputQuery().setIsSpent(false).setTxQuery(new _index.MoneroTxQuery().setIsLocked(false)));
        for (let spendableOutput of spendableOutputs) {
          (0, _assert.default)(spendableOutput.getAmount() < _TestUtils.default.MAX_FEE, "Unspent output should have been swept\n" + spendableOutput.toString());
        }

        // all subaddress unlocked balances must be less than fee
        subaddressesBalance = [];
        subaddressesUnlocked = [];
        for (let account of await that.wallet.getAccounts(true)) {
          for (let subaddress of account.getSubaddresses()) {
            (0, _assert.default)(subaddress.getUnlockedBalance() < _TestUtils.default.MAX_FEE, "No subaddress should have more unlocked than the fee");
          }
        }
      }

      it("Can scan transactions by id", async function () {

        // get a few tx hashes
        let txHashes = [];
        let txs = await that.wallet.getTxs();
        if (txs.length < 3) throw new Error("Not enough txs to scan");
        for (let i = 0; i < 3; i++) txHashes.push(txs[i].getHash());

        // start wallet without scanning
        let scanWallet = await that.createWallet(new _index.MoneroWalletConfig().setSeed(await that.wallet.getSeed()).setRestoreHeight(0));
        await scanWallet.stopSyncing(); // TODO: create wallet without daemon connection (offline does not reconnect, default connects to localhost, offline then online causes confirmed txs to disappear)
        (0, _assert.default)(await scanWallet.isConnectedToDaemon());

        // scan txs
        await scanWallet.scanTxs(txHashes);

        // TODO: scanning txs causes merge problems reconciling 0 fee, isMinerTx with test txs

        //    // txs are scanned
        //    assertEquals(txHashes.size(), scanWallet.getTxs().size());
        //    for (int i = 0; i < txHashes.size(); i++) {
        //      assertEquals(wallet.getTx(txHashes.get(i)), scanWallet.getTx(txHashes.get(i)));
        //    }
        //    List<MoneroTxWallet> scannedTxs = scanWallet.getTxs(txHashes);
        //    assertEquals(txHashes.size(), scannedTxs.size());

        // close wallet
        await that.closeWallet(scanWallet, false);
      });

      // disabled so tests don't delete local cache
      if (testConfig.testResets)
      it("Can rescan the blockchain", async function () {
        //assert(false, "Are you sure you want to discard local wallet data and rescan the blockchain?");
        await that.wallet.rescanBlockchain();
        for (let tx of await that.wallet.getTxs()) {
          await that.testTxWallet(tx);
        }
      });

      if (testConfig.testNonRelays)
      it("Can freeze and thaw outputs", async function () {

        // get an available output
        let outputs = await that.wallet.getOutputs(new _index.MoneroOutputQuery().setIsSpent(false).setIsFrozen(false).setTxQuery(new _index.MoneroTxQuery().setIsLocked(false)));
        for (let output of outputs) _assert.default.equal(false, output.getIsFrozen());
        (0, _assert.default)(outputs.length > 0);
        let output = outputs[0];
        _assert.default.equal(false, output.getTx().getIsLocked());
        _assert.default.equal(false, output.getIsSpent());
        _assert.default.equal(false, output.getIsFrozen());
        _assert.default.equal(false, await that.wallet.isOutputFrozen(output.getKeyImage().getHex()));

        // freeze output by key image
        let numFrozenBefore = (await that.wallet.getOutputs(new _index.MoneroOutputQuery().setIsFrozen(true))).length;
        await that.wallet.freezeOutput(output.getKeyImage().getHex());
        _assert.default.equal(true, await that.wallet.isOutputFrozen(output.getKeyImage().getHex()));

        // test querying
        _assert.default.equal(numFrozenBefore + 1, (await that.wallet.getOutputs(new _index.MoneroOutputQuery().setIsFrozen(true))).length);
        outputs = await that.wallet.getOutputs(new _index.MoneroOutputQuery().setKeyImage(new _index.MoneroKeyImage().setHex(output.getKeyImage().getHex())).setIsFrozen(true));
        _assert.default.equal(1, outputs.length);
        let outputFrozen = outputs[0];
        _assert.default.equal(true, outputFrozen.getIsFrozen());
        _assert.default.equal(output.getKeyImage().getHex(), outputFrozen.getKeyImage().getHex());

        // try to sweep frozen output
        try {
          await that.wallet.sweepOutput(new _index.MoneroTxConfig().setAddress(await that.wallet.getPrimaryAddress()).setKeyImage(output.getKeyImage().getHex()));
          throw new Error("Should have thrown error");
        } catch (e) {
          _assert.default.equal("No outputs found", e.message);
        }

        // try to freeze empty key image
        try {
          await that.wallet.freezeOutput("");
          throw new Error("Should have thrown error");
        } catch (e) {
          _assert.default.equal("Must specify key image to freeze", e.message);
        }

        // try to freeze bad key image
        try {
          await that.wallet.freezeOutput("123");
          throw new Error("Should have thrown error");
        } catch (e) {

          //assert.equal("Bad key image", e.message);
        }
        // thaw output by key image
        await that.wallet.thawOutput(output.getKeyImage().getHex());
        _assert.default.equal(false, await that.wallet.isOutputFrozen(output.getKeyImage().getHex()));

        // test querying
        _assert.default.equal(numFrozenBefore, (await that.wallet.getOutputs(new _index.MoneroOutputQuery().setIsFrozen(true))).length);
        outputs = await that.wallet.getOutputs(new _index.MoneroOutputQuery().setKeyImage(new _index.MoneroKeyImage().setHex(output.getKeyImage().getHex())).setIsFrozen(true));
        _assert.default.equal(0, outputs.length);
        outputs = await that.wallet.getOutputs(new _index.MoneroOutputQuery().setKeyImage(new _index.MoneroKeyImage().setHex(output.getKeyImage().getHex())).setIsFrozen(false));
        _assert.default.equal(1, outputs.length);
        let outputThawed = outputs[0];
        _assert.default.equal(false, outputThawed.getIsFrozen());
        _assert.default.equal(output.getKeyImage().getHex(), outputThawed.getKeyImage().getHex());
      });

      if (testConfig.testNonRelays)
      it("Provides key images of spent outputs", async function () {
        let accountIndex = 0;
        let subaddressIndex = (await that.wallet.getSubaddresses(0)).length > 1 ? 1 : 0; // TODO: avoid subaddress 0 which is more likely to fail transaction sanity check

        // test unrelayed single transaction
        testSpendTx(await that.wallet.createTx(new _index.MoneroTxConfig().addDestination(await that.wallet.getPrimaryAddress(), _TestUtils.default.MAX_FEE).setAccountIndex(accountIndex)));

        // test unrelayed split transactions
        for (let tx of await that.wallet.createTxs(new _index.MoneroTxConfig().addDestination(await that.wallet.getPrimaryAddress(), _TestUtils.default.MAX_FEE).setAccountIndex(accountIndex))) {
          testSpendTx(tx);
        }

        // test unrelayed sweep dust
        let dustKeyImages = [];
        for (let tx of await that.wallet.sweepDust(false)) {
          testSpendTx(tx);
          for (let input of tx.getInputs()) dustKeyImages.push(input.getKeyImage().getHex());
        }

        // get available outputs above min amount
        let outputs = await that.wallet.getOutputs(new _index.MoneroOutputQuery().setAccountIndex(accountIndex).setSubaddressIndex(subaddressIndex).setIsSpent(false).setIsFrozen(false).setTxQuery(new _index.MoneroTxQuery().setIsLocked(false)).setMinAmount(_TestUtils.default.MAX_FEE));

        // filter dust outputs
        let dustOutputs = [];
        for (let output of outputs) {
          if (dustKeyImages.includes(output.getKeyImage().getHex())) dustOutputs.push(output);
        }
        outputs = outputs.filter((output) => !dustOutputs.includes(output)); // remove dust outputs

        // test unrelayed sweep output
        testSpendTx(await that.wallet.sweepOutput(new _index.MoneroTxConfig().setAddress(await that.wallet.getPrimaryAddress()).setKeyImage(outputs[0].getKeyImage().getHex())));

        // test unrelayed sweep wallet ensuring all non-dust outputs are spent
        let availableKeyImages = new Set();
        for (let output of outputs) availableKeyImages.add(output.getKeyImage().getHex());
        let sweptKeyImages = new Set();
        let txs = await that.wallet.sweepUnlocked(new _index.MoneroTxConfig().setAccountIndex(accountIndex).setSubaddressIndex(subaddressIndex).setAddress(await that.wallet.getPrimaryAddress()));
        for (let tx of txs) {
          testSpendTx(tx);
          for (let input of tx.getInputs()) sweptKeyImages.add(input.getKeyImage().getHex());
        }
        (0, _assert.default)(sweptKeyImages.size > 0);

        // max skipped output is less than max fee amount
        let maxSkippedOutput = undefined;
        for (let output of outputs) {
          if (!sweptKeyImages.has(output.getKeyImage().getHex())) {
            if (maxSkippedOutput === undefined || maxSkippedOutput.getAmount() < output.getAmount()) {
              maxSkippedOutput = output;
            }
          }
        }
        (0, _assert.default)(maxSkippedOutput === undefined || maxSkippedOutput.getAmount() < _TestUtils.default.MAX_FEE);
      });

      function testSpendTx(spendTx) {
        _assert.default.notEqual(undefined, spendTx.getInputs());
        (0, _assert.default)(spendTx.getInputs().length > 0);
        for (let input of spendTx.getInputs()) (0, _assert.default)(input.getKeyImage().getHex());
      }

      if (testConfig.testNonRelays)
      it("Can prove unrelayed txs", async function () {

        // create unrelayed tx to verify
        let address1 = await _TestUtils.default.getExternalWalletAddress();
        let address2 = await that.wallet.getAddress(0, 0);
        let address3 = await that.wallet.getAddress(1, 0);
        let tx = await that.wallet.createTx(new _index.MoneroTxConfig().
        setAccountIndex(0).
        addDestination(address1, _TestUtils.default.MAX_FEE).
        addDestination(address2, _TestUtils.default.MAX_FEE * 2n).
        addDestination(address3, _TestUtils.default.MAX_FEE * 3n));

        // submit tx to daemon but do not relay
        let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
        _assert.default.equal(result.getIsGood(), true);

        // create random wallet to verify transfers
        let verifyingWallet = await that.createWallet(new _index.MoneroWalletConfig());

        // verify transfer 1
        let check = await verifyingWallet.checkTxKey(tx.getHash(), tx.getKey(), address1);
        _assert.default.equal(check.getIsGood(), true);
        _assert.default.equal(check.getInTxPool(), true);
        _assert.default.equal(check.getNumConfirmations(), 0);
        _assert.default.equal(check.getReceivedAmount().toString(), _TestUtils.default.MAX_FEE.toString());

        // verify transfer 2
        check = await verifyingWallet.checkTxKey(tx.getHash(), tx.getKey(), address2);
        _assert.default.equal(check.getIsGood(), true);
        _assert.default.equal(check.getInTxPool(), true);
        _assert.default.equal(check.getNumConfirmations(), 0);
        (0, _assert.default)(check.getReceivedAmount() >= _TestUtils.default.MAX_FEE * 2n); // + change amount

        // verify transfer 3
        check = await verifyingWallet.checkTxKey(tx.getHash(), tx.getKey(), address3);
        _assert.default.equal(check.getIsGood(), true);
        _assert.default.equal(check.getInTxPool(), true);
        _assert.default.equal(check.getNumConfirmations(), 0);
        _assert.default.equal(check.getReceivedAmount().toString(), (_TestUtils.default.MAX_FEE * 3n).toString());

        // cleanup
        await that.daemon.flushTxPool(tx.getHash());
        await that.closeWallet(verifyingWallet);
      });
    });
  }

  // -------------------------------- PRIVATE ---------------------------------

  async getSubaddressesWithBalance() {
    let subaddresses = [];
    for (let account of await this.wallet.getAccounts(true)) {
      for (let subaddress of account.getSubaddresses()) {
        if (subaddress.getBalance() > 0) subaddresses.push(subaddress);
      }
    }
    return subaddresses;
  }

  async getSubaddressesWithUnlockedBalance() {
    let subaddresses = [];
    for (let account of await this.wallet.getAccounts(true)) {
      for (let subaddress of account.getSubaddresses()) {
        if (subaddress.getUnlockedBalance() > 0n) subaddresses.push(subaddress);
      }
    }
    return subaddresses;
  }

  async testGetSubaddressAddressOutOfRange() {
    let accounts = await this.wallet.getAccounts(true);
    let accountIdx = accounts.length - 1;
    let subaddressIdx = accounts[accountIdx].getSubaddresses().length;
    let address = await this.wallet.getAddress(accountIdx, subaddressIdx);
    _assert.default.notEqual(address, undefined); // subclass my override with custom behavior (e.g. jni returns subaddress but wallet rpc does not)
    (0, _assert.default)(address.length > 0);
  }

  /**
   * Fetches and tests transactions according to the given query.
   * 
   * TODO: convert query to query object and ensure each tx passes filter, same with getAndTestTransfer, getAndTestOutputs
   */
  async getAndTestTxs(wallet, query, isExpected) {
    let copy;
    if (query !== undefined) {
      if (query instanceof _index.MoneroTxQuery) copy = query.copy();else
      copy = Object.assign({}, query);
    }
    let txs = await wallet.getTxs(query);
    (0, _assert.default)(Array.isArray(txs));
    if (isExpected === false) _assert.default.equal(txs.length, 0);
    if (isExpected === true) (0, _assert.default)(txs.length > 0, "Transactions were expected but not found; run send tests?");
    for (let tx of txs) await this.testTxWallet(tx, Object.assign({ wallet: wallet }, query));
    testGetTxsStructure(txs, query);
    if (query !== undefined) {
      if (query instanceof _index.MoneroTxQuery) _assert.default.deepEqual(query.toJson(), copy.toJson());else
      _assert.default.deepEqual(query, copy);
    }
    return txs;
  }

  /**
   * Fetches and tests transfers according to the given query.
   */
  async getAndTestTransfers(wallet, query, isExpected) {
    let copy;
    if (query !== undefined) {
      if (query instanceof _index.MoneroTransferQuery) copy = query.copy();else
      copy = Object.assign({}, query);
    }
    let transfers = await wallet.getTransfers(query);
    (0, _assert.default)(Array.isArray(transfers));
    if (isExpected === false) _assert.default.equal(transfers.length, 0);
    if (isExpected === true) (0, _assert.default)(transfers.length > 0, "Transfers were expected but not found; run send tests?");
    for (let transfer of transfers) await this.testTxWallet(transfer.getTx(), Object.assign({ wallet: wallet }, query));
    if (query !== undefined) {
      if (query instanceof _index.MoneroTransferQuery) _assert.default.deepEqual(query.toJson(), copy.toJson());else
      _assert.default.deepEqual(query, copy);
    }
    return transfers;
  }

  /**
   * Fetches and tests outputs according to the given query.
   */
  async getAndTestOutputs(wallet, query, isExpected) {
    let copy;
    if (query !== undefined) {
      if (query instanceof _index.MoneroOutputQuery) copy = query.copy();else
      copy = Object.assign({}, query);
    }
    let outputs = await wallet.getOutputs(query);
    (0, _assert.default)(Array.isArray(outputs));
    if (isExpected === false) _assert.default.equal(outputs.length, 0);
    if (isExpected === true) (0, _assert.default)(outputs.length > 0, "Outputs were expected but not found; run send tests?");
    for (let output of outputs) testOutputWallet(output);
    if (query !== undefined) {
      if (query instanceof _index.MoneroOutputQuery) _assert.default.deepEqual(query.toJson(), copy.toJson());else
      _assert.default.deepEqual(query, copy);
    }
    return outputs;
  }

  async testTxsWallet(txs, ctx) {

    // test each transaction
    (0, _assert.default)(txs.length > 0);
    for (let tx of txs) await this.testTxWallet(tx, ctx);

    // test destinations across transactions
    if (ctx.config && ctx.config.getDestinations()) {
      let destinationIdx = 0;
      let subtractFeeFromDestinations = ctx.config.getSubtractFeeFrom() && ctx.config.getSubtractFeeFrom().length > 0;
      for (let tx of txs) {

        // TODO: remove this after >18.3.1 when amounts_by_dest_list is official
        if (tx.getOutgoingTransfer().getDestinations() === undefined) {
          console.warn("Tx missing destinations");
          return;
        }

        let amountDiff = BigInt(0);
        for (let destination of tx.getOutgoingTransfer().getDestinations()) {
          let ctxDestination = ctx.config.getDestinations()[destinationIdx];
          _assert.default.equal(destination.getAddress(), ctxDestination.getAddress());
          if (subtractFeeFromDestinations) amountDiff = amountDiff + ctxDestination.getAmount() - destination.getAmount();else
          _assert.default.equal(destination.getAmount().toString(), ctxDestination.getAmount().toString());
          destinationIdx++;
        }
        if (subtractFeeFromDestinations) _assert.default.equal(tx.getFee().toString(), amountDiff.toString());
      }
      _assert.default.equal(ctx.config.getDestinations().length, destinationIdx);
    }
  }

  /**
   * Tests a wallet transaction with a test configuration.
   * 
   * @param tx is the wallet transaction to test
   * @param ctx specifies test configuration
   *        ctx.wallet is used to cross reference tx info if available
   *        ctx.config specifies the tx's originating send configuration
   *        ctx.isSendResponse indicates if the tx is built from a send response, which contains additional fields (e.g. key)
   *        ctx.hasDestinations specifies if the tx has an outgoing transfer with destinations, undefined if doesn't matter
   *        ctx.includeOutputs specifies if outputs were fetched and should therefore be expected with incoming transfers
   */
  async testTxWallet(tx, ctx) {

    // validate / sanitize inputs
    ctx = Object.assign({}, ctx);
    delete ctx.wallet; // TODO: re-enable
    if (!(tx instanceof _index.MoneroTxWallet)) {
      console.log("Tx is not a MoneroTxWallet!");
      console.log(tx);
    }
    (0, _assert.default)(tx instanceof _index.MoneroTxWallet);
    if (ctx.wallet) (0, _assert.default)(ctx.wallet instanceof _index.MoneroWallet);
    (0, _assert.default)(ctx.hasDestinations == undefined || typeof ctx.hasDestinations === "boolean");
    if (ctx.isSendResponse === undefined || ctx.config === undefined) {
      _assert.default.equal(ctx.isSendResponse, undefined, "if either config or isSendResponse is defined, they must both be defined");
      _assert.default.equal(ctx.config, undefined, "if either config or isSendResponse is defined, they must both be defined");
    }

    // test common field types
    _assert.default.equal(typeof tx.getHash(), "string");
    _assert.default.equal(typeof tx.getIsConfirmed(), "boolean");
    _assert.default.equal(typeof tx.getIsMinerTx(), "boolean");
    _assert.default.equal(typeof tx.getIsFailed(), "boolean");
    _assert.default.equal(typeof tx.getIsRelayed(), "boolean");
    _assert.default.equal(typeof tx.getInTxPool(), "boolean");
    _assert.default.equal(typeof tx.getIsLocked(), "boolean");
    _TestUtils.default.testUnsignedBigInt(tx.getFee());
    if (tx.getPaymentId()) _assert.default.notEqual(tx.getPaymentId(), _index.MoneroTx.DEFAULT_PAYMENT_ID); // default payment id converted to undefined
    if (tx.getNote()) (0, _assert.default)(tx.getNote().length > 0); // empty notes converted to undefined
    (0, _assert.default)(tx.getUnlockTime() >= BigInt(0));
    _assert.default.equal(tx.getSize(), undefined); // TODO monero-wallet-rpc: add tx_size to get_transfers and get_transfer_by_txid
    _assert.default.equal(tx.getReceivedTimestamp(), undefined); // TODO monero-wallet-rpc: return received timestamp (asked to file issue if wanted)

    // test send tx
    if (ctx.isSendResponse) {
      (0, _assert.default)(tx.getWeight() > 0);
      _assert.default.notEqual(tx.getInputs(), undefined);
      (0, _assert.default)(tx.getInputs().length > 0);
      for (let input of tx.getInputs()) (0, _assert.default)(input.getTx() === tx);
    } else {
      _assert.default.equal(tx.getWeight(), undefined);
      _assert.default.equal(tx.getInputs(), undefined);
    }

    // test confirmed
    if (tx.getIsConfirmed()) {
      (0, _assert.default)(tx.getBlock());
      (0, _assert.default)(tx.getBlock().getTxs().includes(tx));
      (0, _assert.default)(tx.getBlock().getHeight() > 0);
      (0, _assert.default)(tx.getBlock().getTimestamp() > 0);
      _assert.default.equal(tx.getIsRelayed(), true);
      _assert.default.equal(tx.getIsFailed(), false);
      _assert.default.equal(tx.getInTxPool(), false);
      _assert.default.equal(tx.getRelay(), true);
      _assert.default.equal(tx.getIsDoubleSpendSeen(), false);
      (0, _assert.default)(tx.getNumConfirmations() > 0);
    } else {
      _assert.default.equal(undefined, tx.getBlock());
      _assert.default.equal(0, tx.getNumConfirmations());
    }

    // test in tx pool
    if (tx.getInTxPool()) {
      _assert.default.equal(tx.getIsConfirmed(), false);
      _assert.default.equal(tx.getRelay(), true);
      _assert.default.equal(tx.getIsRelayed(), true);
      _assert.default.equal(tx.getIsDoubleSpendSeen(), false); // TODO: test double spend attempt
      _assert.default.equal(tx.getIsLocked(), true);

      // these should be initialized unless a response from sending
      if (!ctx.isSendResponse) {

        //assert(tx.getReceivedTimestamp() > 0);    // TODO: re-enable when received timestamp returned in wallet rpc
      }} else {
      _assert.default.equal(tx.getLastRelayedTimestamp(), undefined);
    }

    // test miner tx
    if (tx.getIsMinerTx()) {
      _assert.default.equal(tx.getFee(), 0n);
      (0, _assert.default)(tx.getIncomingTransfers().length > 0);
    }

    // test failed  // TODO: what else to test associated with failed
    if (tx.getIsFailed()) {
      (0, _assert.default)(tx.getOutgoingTransfer() instanceof _index.MoneroTransfer);
      //assert(tx.getReceivedTimestamp() > 0);    // TODO: re-enable when received timestamp returned in wallet rpc
    } else {
      if (tx.getIsRelayed()) _assert.default.equal(tx.getIsDoubleSpendSeen(), false);else
      {
        _assert.default.equal(tx.getIsRelayed(), false);
        _assert.default.notEqual(tx.getRelay(), true);
        _assert.default.equal(tx.getIsDoubleSpendSeen(), undefined);
      }
    }
    _assert.default.equal(tx.getLastFailedHeight(), undefined);
    _assert.default.equal(tx.getLastFailedHash(), undefined);

    // received time only for tx pool or failed txs
    if (tx.getReceivedTimestamp() !== undefined) {
      (0, _assert.default)(tx.getInTxPool() || tx.getIsFailed());
    }

    // test relayed tx
    if (tx.getIsRelayed()) _assert.default.equal(tx.getRelay(), true);
    if (tx.getRelay() !== true) _assert.default.equal(tx.getIsRelayed(), false);

    // test outgoing transfer per configuration
    if (ctx.isOutgoing === false) (0, _assert.default)(tx.getOutgoingTransfer() === undefined);
    if (ctx.hasDestinations) (0, _assert.default)(tx.getOutgoingTransfer() && tx.getOutgoingTransfer().getDestinations().length > 0); // TODO: this was typo with getDestionations so is this actually being tested?

    // test outgoing transfer
    if (tx.getOutgoingTransfer()) {
      (0, _assert.default)(tx.getIsOutgoing());
      await testTransfer(tx.getOutgoingTransfer(), ctx);
      if (ctx.isSweepResponse) _assert.default.equal(tx.getOutgoingTransfer().getDestinations().length, 1);

      // TODO: handle special cases
    } else {
      (0, _assert.default)(tx.getIncomingTransfers().length > 0);
      _assert.default.equal(tx.getOutgoingAmount(), undefined);
      _assert.default.equal(tx.getOutgoingTransfer(), undefined);
      _assert.default.equal(tx.getRingSize(), undefined);
      _assert.default.equal(tx.getFullHex(), undefined);
      _assert.default.equal(tx.getMetadata(), undefined);
      _assert.default.equal(tx.getKey(), undefined);
    }

    // test incoming transfers
    if (tx.getIncomingTransfers()) {
      (0, _assert.default)(tx.getIsIncoming());
      (0, _assert.default)(tx.getIncomingTransfers().length > 0);
      _TestUtils.default.testUnsignedBigInt(tx.getIncomingAmount());
      _assert.default.equal(tx.getIsFailed(), false);

      // test each transfer and collect transfer sum
      let transferSum = BigInt(0);
      for (let transfer of tx.getIncomingTransfers()) {
        await testTransfer(transfer, ctx);
        transferSum += transfer.getAmount();
        if (ctx.wallet) _assert.default.equal(transfer.getAddress(), await ctx.wallet.getAddress(transfer.getAccountIndex(), transfer.getSubaddressIndex()));

        // TODO special case: transfer amount of 0
      }

      // incoming transfers add up to incoming tx amount
      _assert.default.equal(transferSum, tx.getIncomingAmount());
    } else {
      (0, _assert.default)(tx.getOutgoingTransfer());
      _assert.default.equal(tx.getIncomingAmount(), undefined);
      _assert.default.equal(tx.getIncomingTransfers(), undefined);
    }

    // test tx results from send or relay
    if (ctx.isSendResponse) {

      // test tx set
      _assert.default.notEqual(tx.getTxSet(), undefined);
      let found = false;
      for (let aTx of tx.getTxSet().getTxs()) {
        if (aTx === tx) {
          found = true;
          break;
        }
      }
      if (ctx.isCopy) (0, _assert.default)(!found); // copy will not have back reference from tx set
      else (0, _assert.default)(found);

      // test common attributes
      let config = ctx.config;
      _assert.default.equal(tx.getIsConfirmed(), false);
      await testTransfer(tx.getOutgoingTransfer(), ctx);
      _assert.default.equal(tx.getRingSize(), _index.MoneroUtils.RING_SIZE);
      _assert.default.equal(tx.getUnlockTime().toString(), (config.getUnlockTime() ? config.getUnlockTime() : BigInt(0)).toString());
      _assert.default.equal(tx.getBlock(), undefined);
      (0, _assert.default)(tx.getKey().length > 0);
      _assert.default.equal(typeof tx.getFullHex(), "string");
      (0, _assert.default)(tx.getFullHex().length > 0);
      (0, _assert.default)(tx.getMetadata());
      _assert.default.equal(tx.getReceivedTimestamp(), undefined);
      _assert.default.equal(tx.getIsLocked(), true);

      // test locked state
      if (BigInt(0) === tx.getUnlockTime()) _assert.default.equal(!tx.getIsLocked(), tx.getIsConfirmed());else
      _assert.default.equal(tx.getIsLocked(), true);
      if (tx.getOutputs() !== undefined) {
        for (let output of tx.getOutputsWallet()) {
          _assert.default.equal(output.getIsLocked(), tx.getIsLocked());
        }
      }

      // test destinations of sent tx
      if (tx.getOutgoingTransfer().getDestinations() === undefined) {
        (0, _assert.default)(config.getCanSplit());
        console.warn("Destinations not returned from split transactions"); // TODO: remove this after >18.3.1 when amounts_by_dest_list official
      } else {
        (0, _assert.default)(tx.getOutgoingTransfer().getDestinations());
        (0, _assert.default)(tx.getOutgoingTransfer().getDestinations().length > 0);
        let subtractFeeFromDestinations = ctx.config.getSubtractFeeFrom() && ctx.config.getSubtractFeeFrom().length > 0;
        if (ctx.isSweepResponse) {
          _assert.default.equal(config.getDestinations().length, 1);
          _assert.default.equal(undefined, config.getDestinations()[0].getAmount());
          if (!subtractFeeFromDestinations) {
            _assert.default.equal(tx.getOutgoingTransfer().getDestinations()[0].getAmount().toString(), tx.getOutgoingTransfer().getAmount().toString());
          }
        }
      }

      // test relayed txs
      if (config.getRelay()) {
        _assert.default.equal(tx.getInTxPool(), true);
        _assert.default.equal(tx.getRelay(), true);
        _assert.default.equal(tx.getIsRelayed(), true);
        (0, _assert.default)(tx.getLastRelayedTimestamp() > 0);
        _assert.default.equal(tx.getIsDoubleSpendSeen(), false);
      }

      // test non-relayed txs
      else {
        _assert.default.equal(tx.getInTxPool(), false);
        _assert.default.notEqual(tx.getRelay(), true);
        _assert.default.equal(tx.getIsRelayed(), false);
        _assert.default.equal(tx.getLastRelayedTimestamp(), undefined);
        _assert.default.equal(tx.getIsDoubleSpendSeen(), undefined);
      }
    }

    // test tx result query
    else {
      _assert.default.equal(tx.getTxSet(), undefined); // tx set only initialized on send responses
      _assert.default.equal(tx.getRingSize(), undefined);
      _assert.default.equal(tx.getKey(), undefined);
      _assert.default.equal(tx.getFullHex(), undefined);
      _assert.default.equal(tx.getMetadata(), undefined);
      _assert.default.equal(tx.getLastRelayedTimestamp(), undefined);
    }

    // test inputs
    if (tx.getIsOutgoing() && ctx.isSendResponse) {
      (0, _assert.default)(tx.getInputs() !== undefined);
      (0, _assert.default)(tx.getInputs().length > 0);
    } else {
      if (tx.getInputs()) for (let input of tx.getInputs()) testInputWallet(input);
    }

    // test outputs
    if (tx.getIsIncoming() && ctx.includeOutputs) {
      if (tx.getIsConfirmed()) {
        (0, _assert.default)(tx.getOutputs() !== undefined);
        (0, _assert.default)(tx.getOutputs().length > 0);
      } else {
        (0, _assert.default)(tx.getOutputs() === undefined);
      }

    }
    if (tx.getOutputs()) for (let output of tx.getOutputs()) testOutputWallet(output);

    // test deep copy
    if (!ctx.isCopy) await this.testTxWalletCopy(tx, ctx);
  }

  // TODO: move below testTxWalletCopy
  async testTxWalletCopy(tx, ctx) {

    // copy tx and assert deep equality
    let copy = tx.copy();
    (0, _assert.default)(copy instanceof _index.MoneroTxWallet);
    _assert.default.deepEqual(copy.toJson(), tx.toJson());

    // test different references
    if (tx.getOutgoingTransfer()) {
      (0, _assert.default)(tx.getOutgoingTransfer() !== copy.getOutgoingTransfer());
      (0, _assert.default)(tx.getOutgoingTransfer().getTx() !== copy.getOutgoingTransfer().getTx());
      if (tx.getOutgoingTransfer().getDestinations()) {
        (0, _assert.default)(tx.getOutgoingTransfer().getDestinations() !== copy.getOutgoingTransfer().getDestinations());
        for (let i = 0; i < tx.getOutgoingTransfer().getDestinations().length; i++) {
          _assert.default.deepEqual(copy.getOutgoingTransfer().getDestinations()[i], tx.getOutgoingTransfer().getDestinations()[i]);
          (0, _assert.default)(tx.getOutgoingTransfer().getDestinations()[i] !== copy.getOutgoingTransfer().getDestinations()[i]);
        }
      }
    }
    if (tx.getIncomingTransfers()) {
      for (let i = 0; i < tx.getIncomingTransfers().length; i++) {
        _assert.default.deepEqual(copy.getIncomingTransfers()[i].toJson(), tx.getIncomingTransfers()[i].toJson());
        (0, _assert.default)(tx.getIncomingTransfers()[i] !== copy.getIncomingTransfers()[i]);
      }
    }
    if (tx.getInputs()) {
      for (let i = 0; i < tx.getInputs().length; i++) {
        _assert.default.deepEqual(copy.getInputs()[i].toJson(), tx.getInputs()[i].toJson());
        (0, _assert.default)(tx.getInputs()[i] !== copy.getInputs()[i]);
      }
    }
    if (tx.getOutputs()) {
      for (let i = 0; i < tx.getOutputs().length; i++) {
        _assert.default.deepEqual(copy.getOutputs()[i].toJson(), tx.getOutputs()[i].toJson());
        (0, _assert.default)(tx.getOutputs()[i] !== copy.getOutputs()[i]);
      }
    }

    // test copied tx
    ctx = Object.assign({}, ctx);
    ctx.isCopy = true;
    if (tx.getBlock()) copy.setBlock(tx.getBlock().copy().setTxs([copy])); // copy block for testing
    await this.testTxWallet(copy, ctx);

    // test merging with copy
    let merged = copy.merge(copy.copy());
    _assert.default.equal(merged.toString(), tx.toString());
  }

  async testMultisig(M, N, testTx) {

    // create N participants
    let participants = [];
    for (let i = 0; i < N; i++) participants.push(await this.createWallet(new _index.MoneroWalletConfig()));

    // test multisig
    let err;
    try {
      await this.testMultisigParticipants(participants, M, N, testTx);
    } catch (e) {
      err = e;
    }

    // stop mining at end of test
    try {await this.daemon.stopMining();}
    catch (err2) {}

    // save and close participants
    for (let participant of participants) await this.closeWallet(participant, true);
    if (err) throw err;
  }

  async testMultisigParticipants(participants, M, N, testTx) {
    console.log("testMultisig(" + M + ", " + N + ")");
    _assert.default.equal(N, participants.length);

    // prepare multisig hexes
    let preparedMultisigHexes = [];
    for (let i = 0; i < N; i++) {
      let participant = participants[i];
      preparedMultisigHexes.push(await participant.prepareMultisig());
    }

    // make wallets multisig
    let madeMultisigHexes = [];
    for (let i = 0; i < participants.length; i++) {
      let participant = participants[i];

      // collect prepared multisig hexes from wallet's peers
      let peerMultisigHexes = [];
      for (let j = 0; j < participants.length; j++) if (j !== i) peerMultisigHexes.push(preparedMultisigHexes[j]);

      // test bad input
      try {
        await participant.makeMultisig(["asd", "dsa"], M, _TestUtils.default.WALLET_PASSWORD);
        throw new Error("Should have thrown error making wallet multisig with bad input");
      } catch (err) {
        if (!(err instanceof _index.MoneroError)) throw err;
        if (err.message !== "Kex message unexpectedly small.") console.warn("Unexpected error message: " + err.message);
      }

      // make the wallet multisig
      let multisigHex = await participant.makeMultisig(peerMultisigHexes, M, _TestUtils.default.WALLET_PASSWORD);
      madeMultisigHexes.push(multisigHex);
    }

    // try to get seed before wallet initialized
    try {
      await participants[0].getSeed();
      throw new Error("Should have thrown exception getting multisig seed before initialized");
    } catch (err) {
      _assert.default.equal("This wallet is multisig, but not yet finalized", err.message);
    }

    // exchange keys N - M + 1 times
    let address = undefined;
    _assert.default.equal(madeMultisigHexes.length, N);
    let prevMultisigHexes = madeMultisigHexes;
    for (let i = 0; i < N - M + 1; i++) {
      //console.log("Exchanging multisig keys round " + (i + 1) + " / " + (N - M));

      // exchange multisig keys with each wallet and collect results
      let exchangeMultisigHexes = [];
      for (let j = 0; j < participants.length; j++) {
        let participant = participants[j];

        // test bad input
        try {
          await participant.exchangeMultisigKeys([], _TestUtils.default.WALLET_PASSWORD);
          throw new Error("Should have thrown error exchanging multisig keys with bad input");
        } catch (err) {
          if (!(err instanceof _index.MoneroError)) throw err;
          (0, _assert.default)(err.message.length > 0);
        }

        // collect the multisig hexes of the wallet's peers from last round
        let peerMultisigHexes = [];
        for (let k = 0; k < participants.length; k++) if (k !== j) peerMultisigHexes.push(prevMultisigHexes[k]);

        // import the multisig hexes of the wallet's peers
        let result = await participant.exchangeMultisigKeys(peerMultisigHexes, _TestUtils.default.WALLET_PASSWORD);

        // test result
        _assert.default.notEqual(result.getMultisigHex(), undefined);
        (0, _assert.default)(result.getMultisigHex().length > 0);
        if (i === N - M) {// result on last round has address
          _assert.default.notEqual(result.getAddress(), undefined);
          (0, _assert.default)(result.getAddress().length > 0);
          if (address === undefined) address = result.getAddress();else
          _assert.default.equal(result.getAddress(), address);
        } else {
          _assert.default.equal(result.getAddress(), undefined);
          exchangeMultisigHexes.push(result.getMultisigHex());
        }
      }

      // use results for next round of exchange
      prevMultisigHexes = exchangeMultisigHexes;
    }

    // validate final multisig
    let participant = participants[0];
    await _index.MoneroUtils.validateAddress(await participant.getPrimaryAddress(), _TestUtils.default.NETWORK_TYPE);
    this.testMultisigInfo(await participant.getMultisigInfo(), M, N);
    let seed = await participant.getSeed();
    (0, _assert.default)(seed.length > 0);

    // restore participant from multisig seed
    await this.closeWallet(participant);
    participant = await this.createWallet(new _index.MoneroWalletConfig().setSeed(seed).setIsMultisig(true));
    await _index.MoneroUtils.validateAddress(await participant.getPrimaryAddress(), _TestUtils.default.NETWORK_TYPE);
    _assert.default.equal(await participant.getPrimaryAddress(), address);
    this.testMultisigInfo(await participant.getMultisigInfo(), M, N);
    _assert.default.equal(await participant.getSeed(), seed);
    participants[0] = participant;

    // test sending a multisig transaction if configured
    if (testTx) {

      // create accounts in the first multisig wallet to receive funds
      let accountIdx = 0;
      for (let i = 0; i < accountIdx; i++) await participant.createAccount();

      // get destinations to subaddresses within the account of the multisig wallet
      let numSubaddresses = 3;
      let destinations = [];
      for (let i = 0; i < numSubaddresses; i++) {
        destinations.push(new _index.MoneroDestination(await participant.getAddress(accountIdx, i), _TestUtils.default.MAX_FEE * BigInt(2)));
        if (i + 1 < numSubaddresses) participant.createSubaddress(accountIdx);
      }

      // wait for txs to confirm and for sufficient unlocked balance
      await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(this.wallet);
      await _TestUtils.default.WALLET_TX_TRACKER.waitForUnlockedBalance(this.wallet, 0, undefined, _TestUtils.default.MAX_FEE * 20n);

      // send funds from the main test wallet to destinations in the first multisig wallet
      (0, _assert.default)((await this.wallet.getBalance()) > 0n);
      console.log("Sending funds from main wallet");
      await this.wallet.createTx({ accountIndex: 0, destinations: destinations, relay: true });
      let returnAddress = await this.wallet.getPrimaryAddress(); // funds will be returned to this address from the multisig wallet

      console.log("Starting mining");

      // start mining to push the network along
      await _StartMining.default.startMining();

      // wait for the multisig wallet's funds to unlock // TODO: replace with MoneroWalletListener.onOutputReceived() which is called when output unlocked
      let lastNumConfirmations = undefined;
      while (true) {

        // wait for a moment
        await new Promise(function (resolve) {setTimeout(resolve, _TestUtils.default.SYNC_PERIOD_IN_MS);});

        // fetch and test outputs
        let outputs = await participant.getOutputs();
        if (outputs.length === 0) console.log("No outputs reported yet");else
        {

          // print num confirmations
          let height = await this.daemon.getHeight();
          let numConfirmations = height - outputs[0].getTx().getHeight();
          if (lastNumConfirmations === undefined || lastNumConfirmations !== numConfirmations) console.log("Output has " + (height - outputs[0].getTx().getHeight()) + " confirmations");
          lastNumConfirmations = numConfirmations;

          // outputs are not spent
          for (let output of outputs) (0, _assert.default)(output.getIsSpent() === false);

          // break if output is unlocked
          if (!outputs[0].getIsLocked()) break;
        }
      }

      // stop mining
      await this.daemon.stopMining();

      // multisig wallet should have unlocked balance in subaddresses 0-3
      for (let i = 0; i < numSubaddresses; i++) {
        (0, _assert.default)((await participant.getUnlockedBalance(accountIdx, i)) > BigInt(0));
      }
      let outputs = await participant.getOutputs({ accountIndex: accountIdx });
      (0, _assert.default)(outputs.length > 0);
      if (outputs.length < 3) console.log("WARNING: not one output per subaddress?");
      //assert(outputs.length >= 3);  // TODO
      for (let output of outputs) _assert.default.equal(output.getIsLocked(), false);

      // wallet requires importing multisig to be reliable
      (0, _assert.default)(await participant.isMultisigImportNeeded());

      // attempt creating and relaying transaction without synchronizing with participants
      try {
        await participant.createTx({ accountIndex: accountIdx, address: returnAddress, amount: _TestUtils.default.MAX_FEE * BigInt(3) });
        throw new Error("Should have failed sending funds without synchronizing with peers");
      } catch (e) {
        if (e.message !== "No transaction created") throw new Error(e);
      }

      // synchronize the multisig participants since receiving outputs
      console.log("Synchronizing participants");
      await this.synchronizeMultisigParticipants(participants);

      // expect error exporting key images
      try {
        await participant.exportKeyImages(true);
      } catch (e) {
        if (e.message.indexOf("key_image generated not matched with cached key image") < 0) throw new Error(e);
      }

      // attempt relaying created transactions without co-signing
      try {
        await participant.createTxs({ address: returnAddress, amount: _TestUtils.default.MAX_FEE, accountIndex: accountIdx, subaddressIndex: 0, relay: true });
        throw new Error("Should have failed");
      } catch (e) {
        if (e.message !== "Cannot relay multisig transaction until co-signed") throw new Error(e);
      }

      // create txs to send funds from a subaddress in the multisig wallet
      console.log("Sending");
      let txs = await participant.createTxs({ address: returnAddress, amount: _TestUtils.default.MAX_FEE, accountIndex: accountIdx, subaddressIndex: 0 });
      (0, _assert.default)(txs.length > 0);
      let txSet = txs[0].getTxSet();
      _assert.default.notEqual(txSet.getMultisigTxHex(), undefined);
      _assert.default.equal(txSet.getSignedTxHex(), undefined);
      _assert.default.equal(txSet.getUnsignedTxHex(), undefined);

      // parse multisig tx hex and test
      await testDescribedTxSet(await participant.describeMultisigTxSet(txSet.getMultisigTxHex()));

      // sign the tx with participants 1 through M - 1 to meet threshold
      let multisigTxHex = txSet.getMultisigTxHex();
      console.log("Signing");
      for (let i = 1; i < M; i++) {
        let result = await participants[i].signMultisigTxHex(multisigTxHex);
        multisigTxHex = result.getSignedMultisigTxHex();
      }

      //console.log("Submitting signed multisig tx hex: " + multisigTxHex);

      // submit the signed multisig tx hex to the network
      console.log("Submitting");
      let txHashes = await participant.submitMultisigTxHex(multisigTxHex);
      (0, _assert.default)(txHashes.length > 0);

      // synchronize the multisig participants since spending outputs
      console.log("Synchronizing participants");
      await this.synchronizeMultisigParticipants(participants);

      // fetch the wallet's multisig txs
      let multisigTxs = await participant.getTxs({ hashes: txHashes });
      _assert.default.equal(txHashes.length, multisigTxs.length);

      // sweep an output from subaddress [accountIdx,1]
      outputs = await participant.getOutputs({ accountIndex: accountIdx, subaddressIndex: 1 });
      (0, _assert.default)(outputs.length > 0);
      (0, _assert.default)(outputs[0].getIsSpent() === false);
      txSet = (await participant.sweepOutput({ address: returnAddress, keyImage: outputs[0].getKeyImage().getHex(), relay: true })).getTxSet();
      _assert.default.notEqual(txSet.getMultisigTxHex(), undefined);
      _assert.default.equal(txSet.getSignedTxHex(), undefined);
      _assert.default.equal(txSet.getUnsignedTxHex(), undefined);
      (0, _assert.default)(txSet.getTxs().length > 0);

      // parse multisig tx hex and test
      await testDescribedTxSet(await participant.describeMultisigTxSet(txSet.getMultisigTxHex()));

      // sign the tx with participants 1 through M - 1 to meet threshold
      multisigTxHex = txSet.getMultisigTxHex();
      console.log("Signing sweep output");
      for (let i = 1; i < M; i++) {
        let result = await participants[i].signMultisigTxHex(multisigTxHex);
        multisigTxHex = result.getSignedMultisigTxHex();
      }

      // submit the signed multisig tx hex to the network
      console.log("Submitting sweep output");
      txHashes = await participant.submitMultisigTxHex(multisigTxHex);

      // synchronize the multisig participants since spending outputs
      console.log("Synchronizing participants");
      await this.synchronizeMultisigParticipants(participants);

      // fetch the wallet's multisig txs
      multisigTxs = await participant.getTxs({ hashes: txHashes });
      _assert.default.equal(txHashes.length, multisigTxs.length);

      // sweep remaining balance
      console.log("Sweeping");
      txs = await participant.sweepUnlocked({ address: returnAddress, accountIndex: accountIdx, relay: true }); // TODO: test multisig with sweepEachSubaddress which will generate multiple tx sets without synchronizing participants
      (0, _assert.default)(txs.length > 0, "No txs created on sweepUnlocked");
      txSet = txs[0].getTxSet();
      for (let tx of txs) {
        (0, _assert.default)(tx.getTxSet() === txSet); // only one tx set created per account
        let found = false;
        for (let aTx of tx.getTxSet().getTxs()) {
          if (aTx === tx) {
            found = true;
            break;
          }
        }
        (0, _assert.default)(found); // tx is contained in tx set
      }
      _assert.default.notEqual(txSet.getMultisigTxHex(), undefined);
      _assert.default.equal(txSet.getSignedTxHex(), undefined);
      _assert.default.equal(txSet.getUnsignedTxHex(), undefined);

      // parse multisig tx hex and test
      await testDescribedTxSet(await participant.describeTxSet(txSet));

      // sign the tx with participants 1 through M - 1 to meet threshold
      multisigTxHex = txSet.getMultisigTxHex();
      console.log("Signing sweep");
      for (let i = 1; i < M; i++) {
        let result = await participants[i].signMultisigTxHex(multisigTxHex);
        multisigTxHex = result.getSignedMultisigTxHex();
      }

      // submit the signed multisig tx hex to the network
      console.log("Submitting sweep");
      txHashes = await participant.submitMultisigTxHex(multisigTxHex);

      // synchronize the multisig participants since spending outputs
      console.log("Synchronizing participants");
      await this.synchronizeMultisigParticipants(participants);

      // fetch the wallet's multisig txs
      multisigTxs = await participant.getTxs({ hashes: txHashes });
      _assert.default.equal(txHashes.length, multisigTxs.length);
    }
  }

  async synchronizeMultisigParticipants(wallets) {

    // collect multisig hex of all participants to synchronize
    let multisigHexes = [];
    for (let wallet of wallets) {
      await wallet.sync();
      multisigHexes.push(await wallet.exportMultisigHex());
    }

    // import each wallet's peer multisig hex 
    for (let i = 0; i < wallets.length; i++) {
      let peerMultisigHexes = [];
      for (let j = 0; j < wallets.length; j++) if (j !== i) peerMultisigHexes.push(multisigHexes[j]);
      let wallet = wallets[i];
      await wallet.sync();
      await wallet.importMultisigHex(peerMultisigHexes);
    }
  }

  async testMultisigInfo(info, M, N) {
    (0, _assert.default)(info.getIsMultisig());
    (0, _assert.default)(info.getIsReady());
    _assert.default.equal(info.getThreshold(), M);
    _assert.default.equal(info.getNumParticipants(), N);
  }

  async testViewOnlyAndOfflineWallets(viewOnlyWallet, offlineWallet) {

    // wait for txs to confirm and for sufficient unlocked balance
    await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(this.wallet);
    await _TestUtils.default.WALLET_TX_TRACKER.waitForUnlockedBalance(this.wallet, 0, undefined, _TestUtils.default.MAX_FEE * 4n);

    // test getting txs, transfers, and outputs from view-only wallet
    (0, _assert.default)((await viewOnlyWallet.getTxs()).length, "View-only wallet has no transactions");
    (0, _assert.default)((await viewOnlyWallet.getTransfers()).length, "View-only wallet has no transfers");
    (0, _assert.default)((await viewOnlyWallet.getOutputs()).length, "View-only wallet has no outputs");

    // collect info from main test wallet
    let primaryAddress = await this.wallet.getPrimaryAddress();
    let privateViewKey = await this.wallet.getPrivateViewKey();

    // test and sync view-only wallet
    _assert.default.equal(await viewOnlyWallet.getPrimaryAddress(), primaryAddress);
    _assert.default.equal(await viewOnlyWallet.getPrivateViewKey(), privateViewKey);
    (0, _assert.default)(await viewOnlyWallet.isViewOnly());
    let errMsg = "Should have failed";
    try {
      await await viewOnlyWallet.getSeed();
      throw new Error(errMsg);
    } catch (e) {
      if (e.message === errMsg) throw e;
    }
    try {
      await await viewOnlyWallet.getSeedLanguage();
      throw new Error(errMsg);
    } catch (e) {
      if (e.message === errMsg) throw e;
    }
    try {
      await await viewOnlyWallet.getPrivateSpendKey();
      throw new Error(errMsg);
    } catch (e) {
      if (e.message === errMsg) throw e;
    }
    (0, _assert.default)(await viewOnlyWallet.isConnectedToDaemon(), "Wallet created from keys is not connected to authenticated daemon"); // TODO
    await viewOnlyWallet.sync();
    (0, _assert.default)((await viewOnlyWallet.getTxs()).length > 0);

    // export outputs from view-only wallet
    let outputsHex = await viewOnlyWallet.exportOutputs();

    // test offline wallet
    (0, _assert.default)(!(await offlineWallet.isConnectedToDaemon()));
    (0, _assert.default)(!(await offlineWallet.isViewOnly()));
    if (!(offlineWallet instanceof _index.MoneroWalletRpc)) _assert.default.equal(await offlineWallet.getSeed(), _TestUtils.default.SEED); // TODO monero-project: cannot get seed from offline wallet rpc
    _assert.default.equal((await offlineWallet.getTxs(new _index.MoneroTxQuery().setInTxPool(false))).length, 0);

    // import outputs to offline wallet
    let numOutputsImported = await offlineWallet.importOutputs(outputsHex);
    (0, _assert.default)(numOutputsImported > 0, "No outputs imported");

    // export key images from offline wallet
    let keyImages = await offlineWallet.exportKeyImages();
    (0, _assert.default)(keyImages.length > 0);

    // import key images to view-only wallet
    (0, _assert.default)(await viewOnlyWallet.isConnectedToDaemon());
    await viewOnlyWallet.importKeyImages(keyImages);
    _assert.default.equal((await viewOnlyWallet.getBalance()).toString(), (await this.wallet.getBalance()).toString());

    // create unsigned tx using view-only wallet
    let unsignedTx = await viewOnlyWallet.createTx({ accountIndex: 0, address: primaryAddress, amount: _TestUtils.default.MAX_FEE * 3n });
    _assert.default.equal(typeof unsignedTx.getTxSet().getUnsignedTxHex(), "string");
    (0, _assert.default)(unsignedTx.getTxSet().getUnsignedTxHex());

    // sign tx using offline wallet
    let signedTxSet = await offlineWallet.signTxs(unsignedTx.getTxSet().getUnsignedTxHex());
    (0, _assert.default)(signedTxSet.getSignedTxHex().length > 0);
    _assert.default.equal(signedTxSet.getTxs().length, 1);
    (0, _assert.default)(signedTxSet.getTxs()[0].getHash().length > 0);

    // parse or "describe" unsigned tx set
    let describedTxSet = await offlineWallet.describeUnsignedTxSet(unsignedTx.getTxSet().getUnsignedTxHex());
    await testDescribedTxSet(describedTxSet);

    // submit signed tx using view-only wallet
    if (this.testConfig.testRelays) {
      let txHashes = await viewOnlyWallet.submitTxs(signedTxSet.getSignedTxHex());
      _assert.default.equal(txHashes.length, 1);
      _assert.default.equal(txHashes[0].length, 64);
      await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(viewOnlyWallet); // wait for confirmation for other tests
    }
  }

  testInvalidAddressError(err) {
    _assert.default.equal("Invalid address", err.message);
  }

  testInvalidTxHashError(err) {
    _assert.default.equal("TX hash has invalid format", err.message);
  }

  testInvalidTxKeyError(err) {
    _assert.default.equal("Tx key has invalid format", err.message);
  }

  testInvalidSignatureError(err) {
    _assert.default.equal("Signature size mismatch with additional tx pubkeys", err.message);
  }

  testNoSubaddressError(err) {
    _assert.default.equal("Address must not be a subaddress", err.message);
  }

  testSignatureHeaderCheckError(err) {
    _assert.default.equal("Signature header check error", err.message);
  }
}

// ------------------------------ PRIVATE STATIC ------------------------------
exports.default = TestMoneroWalletCommon;
async function testAccount(account) {

  // test account
  (0, _assert.default)(account);
  (0, _assert.default)(account.getIndex() >= 0);
  await _index.MoneroUtils.validateAddress(account.getPrimaryAddress(), _TestUtils.default.NETWORK_TYPE);
  _TestUtils.default.testUnsignedBigInt(account.getBalance());
  _TestUtils.default.testUnsignedBigInt(account.getUnlockedBalance());
  await _index.MoneroUtils.validateAddress(account.getPrimaryAddress(), _TestUtils.default.NETWORK_TYPE);
  _TestUtils.default.testUnsignedBigInt(account.getBalance());
  _TestUtils.default.testUnsignedBigInt(account.getUnlockedBalance());

  // if given, test subaddresses and that their balances add up to account balances
  if (account.getSubaddresses()) {
    let balance = BigInt(0);
    let unlockedBalance = BigInt(0);
    for (let i = 0; i < account.getSubaddresses().length; i++) {
      testSubaddress(account.getSubaddresses()[i]);
      _assert.default.equal(account.getSubaddresses()[i].getAccountIndex(), account.getIndex());
      _assert.default.equal(account.getSubaddresses()[i].getIndex(), i);
      balance = balance + account.getSubaddresses()[i].getBalance();
      unlockedBalance = unlockedBalance + account.getSubaddresses()[i].getUnlockedBalance();
    }
    _assert.default.equal(account.getBalance(), balance, "Subaddress balances " + balance.toString() + " != account " + account.getIndex() + " balance " + account.getBalance().toString());
    _assert.default.equal(account.getUnlockedBalance(), unlockedBalance, "Subaddress unlocked balances " + unlockedBalance.toString() + " != account " + account.getIndex() + " unlocked balance " + account.getUnlockedBalance().toString());
  }

  // tag must be undefined or non-empty
  let tag = account.getTag();
  (0, _assert.default)(tag === undefined || tag.length > 0);
}

function testSubaddress(subaddress) {
  (0, _assert.default)(subaddress.getAccountIndex() >= 0);
  (0, _assert.default)(subaddress.getIndex() >= 0);
  (0, _assert.default)(subaddress.getAddress());
  (0, _assert.default)(subaddress.getLabel() === undefined || typeof subaddress.getLabel() === "string");
  if (typeof subaddress.getLabel() === "string") (0, _assert.default)(subaddress.getLabel().length > 0);
  _TestUtils.default.testUnsignedBigInt(subaddress.getBalance());
  _TestUtils.default.testUnsignedBigInt(subaddress.getUnlockedBalance());
  (0, _assert.default)(subaddress.getNumUnspentOutputs() >= 0);
  (0, _assert.default)(typeof subaddress.getIsUsed() === "boolean");
  if (subaddress.getBalance() > 0n) (0, _assert.default)(subaddress.getIsUsed());
  (0, _assert.default)(subaddress.getNumBlocksToUnlock() >= 0);
}

/**
 * Gets random transactions.
 * 
 * @param wallet is the wallet to query for transactions
 * @param query configures the transactions to retrieve
 * @param minTxs specifies the minimum number of transactions (undefined for no minimum)
 * @param maxTxs specifies the maximum number of transactions (undefined for all filtered transactions)
 * @return {MoneroTxWallet[]} are the random transactions
 */
async function getRandomTransactions(wallet, query, minTxs, maxTxs) {
  let txs = await wallet.getTxs(query);
  if (minTxs !== undefined) (0, _assert.default)(txs.length >= minTxs, txs.length + "/" + minTxs + " transactions found with query: " + JSON.stringify(query));
  _index.GenUtils.shuffle(txs);
  if (maxTxs === undefined) return txs;else
  return txs.slice(0, Math.min(maxTxs, txs.length));
}

async function testTransfer(transfer, ctx) {
  if (ctx === undefined) ctx = {};
  (0, _assert.default)(transfer instanceof _index.MoneroTransfer);
  _TestUtils.default.testUnsignedBigInt(transfer.getAmount());
  if (!ctx.isSweepOutputResponse) (0, _assert.default)(transfer.getAccountIndex() >= 0);
  if (transfer.getIsIncoming()) testIncomingTransfer(transfer);else
  await testOutgoingTransfer(transfer, ctx);

  // transfer and tx reference each other
  (0, _assert.default)(transfer.getTx());
  if (transfer !== transfer.getTx().getOutgoingTransfer()) {
    (0, _assert.default)(transfer.getTx().getIncomingTransfers());
    (0, _assert.default)(transfer.getTx().getIncomingTransfers().includes(transfer), "Transaction does not reference given transfer");
  }
}

function testIncomingTransfer(transfer) {
  (0, _assert.default)(transfer.getIsIncoming());
  (0, _assert.default)(!transfer.getIsOutgoing());
  (0, _assert.default)(transfer.getAddress());
  (0, _assert.default)(transfer.getSubaddressIndex() >= 0);
  (0, _assert.default)(transfer.getNumSuggestedConfirmations() > 0);
}

async function testOutgoingTransfer(transfer, ctx) {
  (0, _assert.default)(!transfer.getIsIncoming());
  (0, _assert.default)(transfer.getIsOutgoing());
  if (!ctx.isSendResponse) (0, _assert.default)(transfer.getSubaddressIndices());
  if (transfer.getSubaddressIndices()) {
    (0, _assert.default)(transfer.getSubaddressIndices().length >= 1);
    for (let subaddressIdx of transfer.getSubaddressIndices()) (0, _assert.default)(subaddressIdx >= 0);
  }
  if (transfer.getAddresses()) {
    _assert.default.equal(transfer.getAddresses().length, transfer.getSubaddressIndices().length);
    for (let address of transfer.getAddresses()) (0, _assert.default)(address);
  }

  // test destinations sum to outgoing amount
  if (transfer.getDestinations()) {
    (0, _assert.default)(transfer.getDestinations().length > 0);
    let sum = BigInt(0);
    for (let destination of transfer.getDestinations()) {
      await testDestination(destination);
      _TestUtils.default.testUnsignedBigInt(destination.getAmount(), true);
      sum += destination.getAmount();
    }
    if (transfer.getAmount() !== sum) console.log(transfer.getTx().getTxSet() === undefined ? transfer.getTx().toString() : transfer.getTx().getTxSet().toString());
    _assert.default.equal(sum.toString(), transfer.getAmount().toString());
  }
}

async function testDestination(destination) {
  await _index.MoneroUtils.validateAddress(destination.getAddress(), _TestUtils.default.NETWORK_TYPE);
  _TestUtils.default.testUnsignedBigInt(destination.getAmount(), true);
}

function testInputWallet(input) {
  (0, _assert.default)(input);
  (0, _assert.default)(input.getKeyImage());
  (0, _assert.default)(input.getKeyImage().getHex());
  (0, _assert.default)(input.getKeyImage().getHex().length > 0);
  (0, _assert.default)(input.getAmount() === undefined); // must get info separately
}

function testOutputWallet(output) {
  (0, _assert.default)(output);
  (0, _assert.default)(output instanceof _index.MoneroOutputWallet);
  (0, _assert.default)(output.getAccountIndex() >= 0);
  (0, _assert.default)(output.getSubaddressIndex() >= 0);
  (0, _assert.default)(output.getIndex() >= 0);
  _assert.default.equal(typeof output.getIsSpent(), "boolean");
  _assert.default.equal(typeof output.getIsLocked(), "boolean");
  _assert.default.equal(typeof output.getIsFrozen(), "boolean");
  (0, _assert.default)(output.getKeyImage());
  (0, _assert.default)(output.getKeyImage() instanceof _index.MoneroKeyImage);
  (0, _assert.default)(output.getKeyImage().getHex());
  _TestUtils.default.testUnsignedBigInt(output.getAmount(), true);

  // output has circular reference to its transaction which has some initialized fields
  let tx = output.getTx();
  (0, _assert.default)(tx);
  (0, _assert.default)(tx instanceof _index.MoneroTxWallet);
  (0, _assert.default)(tx.getOutputs().includes(output));
  (0, _assert.default)(tx.getHash());
  _assert.default.equal(typeof tx.getIsLocked(), "boolean");
  _assert.default.equal(tx.getIsConfirmed(), true); // TODO monero-wallet-rpc: possible to get unconfirmed outputs?
  _assert.default.equal(tx.getIsRelayed(), true);
  _assert.default.equal(tx.getIsFailed(), false);
  (0, _assert.default)(tx.getHeight() > 0);

  // test copying
  let copy = output.copy();
  (0, _assert.default)(copy !== output);
  _assert.default.equal(copy.toString(), output.toString());
  _assert.default.equal(copy.getTx(), undefined); // TODO: should output copy do deep copy of tx so models are graph instead of tree?  Would need to work out circular references
}

function testCommonTxSets(txs, hasSigned, hasUnsigned, hasMultisig) {
  (0, _assert.default)(txs.length > 0);

  // assert that all sets are same reference
  let set;
  for (let i = 0; i < txs.length; i++) {
    (0, _assert.default)(txs[i] instanceof _index.MoneroTx);
    if (i === 0) set = txs[i].getTxSet();else
    (0, _assert.default)(txs[i].getTxSet() === set);
  }

  // test expected set
  (0, _assert.default)(set);
  if (hasSigned) {
    (0, _assert.default)(set.getSignedTxSet());
    (0, _assert.default)(set.getSignedTxSet().length > 0);
  }
  if (hasUnsigned) {
    (0, _assert.default)(set.getUnsignedTxSet());
    (0, _assert.default)(set.getUnsignedTxSet().length > 0);
  }
  if (hasMultisig) {
    (0, _assert.default)(set.getMultisigTxSet());
    (0, _assert.default)(set.getMultisigTxSet().length > 0);
  }
}

function testCheckTx(tx, check) {
  _assert.default.equal(typeof check.getIsGood(), "boolean");
  if (check.getIsGood()) {
    (0, _assert.default)(check.getNumConfirmations() >= 0);
    _assert.default.equal(typeof check.getInTxPool(), "boolean");
    _TestUtils.default.testUnsignedBigInt(check.getReceivedAmount());
    if (check.getInTxPool()) _assert.default.equal(0, check.getNumConfirmations());else
    (0, _assert.default)(check.getNumConfirmations() > 0); // TODO (monero-wall-rpc) this fails (confirmations is 0) for (at least one) transaction that has 1 confirmation on testCheckTxKey()
  } else {
    _assert.default.equal(check.getNumConfirmations(), undefined);
    _assert.default.equal(check.getInTxPool(), undefined);
    _assert.default.equal(check.getReceivedAmount(), undefined);
  }
}

function testCheckReserve(check) {
  _assert.default.equal(typeof check.getIsGood(), "boolean");
  if (check.getIsGood()) {
    _TestUtils.default.testUnsignedBigInt(check.getTotalAmount());
    (0, _assert.default)(check.getTotalAmount() >= 0n);
    _TestUtils.default.testUnsignedBigInt(check.getUnconfirmedSpentAmount());
    (0, _assert.default)(check.getUnconfirmedSpentAmount() >= 0n);
  } else {
    _assert.default.equal(check.getTotalAmount(), undefined);
    _assert.default.equal(check.getUnconfirmedSpentAmount(), undefined);
  }
}

async function testDescribedTxSet(describedTxSet) {
  _assert.default.notEqual(describedTxSet, undefined);
  (0, _assert.default)(describedTxSet.getTxs().length > 0);
  _assert.default.equal(describedTxSet.getSignedTxHex(), undefined);
  _assert.default.equal(describedTxSet.getUnsignedTxHex(), undefined);

  // test each transaction        
  // TODO: use common tx wallet test?
  _assert.default.equal(describedTxSet.getMultisigTxHex(), undefined);
  for (let describedTx of describedTxSet.getTxs()) {
    (0, _assert.default)(describedTx.getTxSet() === describedTxSet);
    _TestUtils.default.testUnsignedBigInt(describedTx.getInputSum(), true);
    _TestUtils.default.testUnsignedBigInt(describedTx.getOutputSum(), true);
    _TestUtils.default.testUnsignedBigInt(describedTx.getFee());
    _TestUtils.default.testUnsignedBigInt(describedTx.getChangeAmount());
    if (describedTx.getChangeAmount() === 0n) _assert.default.equal(describedTx.getChangeAddress(), undefined);else
    await _index.MoneroUtils.validateAddress(describedTx.getChangeAddress(), _TestUtils.default.NETWORK_TYPE);
    (0, _assert.default)(describedTx.getRingSize() > 1);
    (0, _assert.default)(describedTx.getUnlockTime() >= 0n);
    (0, _assert.default)(describedTx.getNumDummyOutputs() >= 0);
    (0, _assert.default)(describedTx.getExtraHex());
    (0, _assert.default)(describedTx.getPaymentId() === undefined || describedTx.getPaymentId().length > 0);
    (0, _assert.default)(describedTx.getIsOutgoing());
    _assert.default.notEqual(describedTx.getOutgoingTransfer(), undefined);
    _assert.default.notEqual(describedTx.getOutgoingTransfer().getDestinations(), undefined);
    (0, _assert.default)(describedTx.getOutgoingTransfer().getDestinations().length > 0);
    _assert.default.equal(describedTx.getIsIncoming(), undefined);
    for (let destination of describedTx.getOutgoingTransfer().getDestinations()) {
      await testDestination(destination);
    }
  }
}

async function testAddressBookEntry(entry) {
  (0, _assert.default)(entry.getIndex() >= 0);
  await _index.MoneroUtils.validateAddress(entry.getAddress(), _TestUtils.default.NETWORK_TYPE);
  _assert.default.equal(typeof entry.getDescription(), "string");
}

/**
 * Tests the integrity of the full structure in the given txs from the block down
 * to transfers / destinations.
 */
function testGetTxsStructure(txs, query) {

  // normalize query
  if (query === undefined) query = new _index.MoneroTxQuery();
  if (!(query instanceof _index.MoneroTxQuery)) query = new _index.MoneroTxQuery(query);

  // collect unique blocks in order (using set and list instead of TreeSet for direct portability to other languages)
  let seenBlocks = new Set();
  let blocks = [];
  let unconfirmedTxs = [];
  for (let tx of txs) {
    if (tx.getBlock() === undefined) unconfirmedTxs.push(tx);else
    {
      (0, _assert.default)(tx.getBlock().getTxs().includes(tx));
      if (!seenBlocks.has(tx.getBlock())) {
        seenBlocks.add(tx.getBlock());
        blocks.push(tx.getBlock());
      }
    }
  }

  // tx hashes must be in order if requested
  if (query.getHashes() !== undefined) {
    _assert.default.equal(txs.length, query.getHashes().length);
    for (let i = 0; i < query.getHashes().length; i++) {
      _assert.default.equal(txs[i].getHash(), query.getHashes()[i]);
    }
  }

  // test that txs and blocks reference each other and blocks are in ascending order unless specific tx hashes requested
  let index = 0;
  let prevBlockHeight = undefined;
  for (let block of blocks) {
    if (prevBlockHeight === undefined) prevBlockHeight = block.getHeight();else
    if (query.getHashes() === undefined) (0, _assert.default)(block.getHeight() > prevBlockHeight, "Blocks are not in order of heights: " + prevBlockHeight + " vs " + block.getHeight());
    for (let tx of block.getTxs()) {
      (0, _assert.default)(tx.getBlock() === block);
      if (query.getHashes() === undefined) {
        _assert.default.equal(tx.getHash(), txs[index].getHash()); // verify tx order is self-consistent with blocks unless txs manually re-ordered by requesting by hash
        (0, _assert.default)(tx === txs[index]);
      }
      index++;
    }
  }
  _assert.default.equal(index + unconfirmedTxs.length, txs.length);

  // test that incoming transfers are in order of ascending accounts and subaddresses
  for (let tx of txs) {
    let prevAccountIdx = undefined;
    let prevSubaddressIdx = undefined;
    if (tx.getIncomingTransfers() === undefined) continue;
    for (let transfer of tx.getIncomingTransfers()) {
      if (prevAccountIdx === undefined) prevAccountIdx = transfer.getAccountIndex();else
      {
        (0, _assert.default)(prevAccountIdx <= transfer.getAccountIndex());
        if (prevAccountIdx < transfer.getAccountIndex()) {
          prevSubaddressIdx = undefined;
          prevAccountIdx = transfer.getAccountIndex();
        }
        if (prevSubaddressIdx === undefined) prevSubaddressIdx = transfer.getSubaddressIndex();else
        (0, _assert.default)(prevSubaddressIdx < transfer.getSubaddressIndex());
      }
    }
  }
}

function countNumInstances(instances) {
  let counts = new Map();
  for (let instance of instances) {
    let count = counts.get(instance);
    counts.set(instance, count === undefined ? 1 : count + 1);
  }
  return counts;
}

function getModes(counts) {
  let modes = new Set();
  let maxCount;
  for (let key of counts.keys()) {
    let count = counts.get(key);
    if (maxCount === undefined || count > maxCount) maxCount = count;
  }
  for (let key of counts.keys()) {
    let count = counts.get(key);
    if (count === maxCount) modes.add(key);
  }
  return modes;
}

/**
 * Internal tester for output notifications.
 */
class ReceivedOutputNotificationTester extends _index.MoneroWalletListener {









  constructor(txHash) {
    super();
    this.txHash = txHash;
    this.testComplete = false;
    this.unlockedSeen = false;
  }

  async onNewBlock(height) {
    this.lastOnNewBlockHeight = height;
  }

  async onBalancesChanged(newBalance, newUnlockedBalance) {
    this.lastOnBalancesChangedBalance = newBalance;
    this.lastOnBalancesChangedUnlockedBalance = newUnlockedBalance;
  }

  async onOutputReceived(output) {
    if (output.getTx().getHash() === this.txHash) this.lastNotifiedOutput = output;
  }
}

/**
 * Wallet listener to collect output notifications.
 */
class WalletNotificationCollector extends _index.MoneroWalletListener {








  constructor() {
    super();
    this.listening = true;
    this.blockNotifications = [];
    this.balanceNotifications = [];
    this.outputsReceived = [];
    this.outputsSpent = [];
  }

  async onNewBlock(height) {
    (0, _assert.default)(this.listening);
    if (this.blockNotifications.length > 0) (0, _assert.default)(height === this.blockNotifications[this.blockNotifications.length - 1] + 1);
    this.blockNotifications.push(height);
  }

  async onBalancesChanged(newBalance, newUnlockedBalance) {
    (0, _assert.default)(this.listening);
    if (this.balanceNotifications.length > 0) {
      this.lastNotification = this.balanceNotifications[this.balanceNotifications.length - 1];
      (0, _assert.default)(newBalance.toString() !== this.lastNotification.balance.toString() || newUnlockedBalance.toString() !== this.lastNotification.unlockedBalance.toString());
    }
    this.balanceNotifications.push({ balance: newBalance, unlockedBalance: newUnlockedBalance });
  }

  async onOutputReceived(output) {
    (0, _assert.default)(this.listening);
    this.outputsReceived.push(output);
  }

  async onOutputSpent(output) {
    (0, _assert.default)(this.listening);
    this.outputsSpent.push(output);
  }

  getBlockNotifications() {
    return this.blockNotifications;
  }

  getBalanceNotifications() {
    return this.balanceNotifications;
  }

  getOutputsReceived(query) {
    return _index.Filter.apply(query, this.outputsReceived);
  }

  getOutputsSpent(query) {
    return _index.Filter.apply(query, this.outputsSpent);
  }

  setListening(listening) {
    this.listening = listening;
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYXNzZXJ0IiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfU3RhcnRNaW5pbmciLCJfVGVzdFV0aWxzIiwiX2luZGV4IiwiU0VORF9ESVZJU09SIiwiQmlnSW50IiwiU0VORF9NQVhfRElGRiIsIk1BWF9UWF9QUk9PRlMiLCJOVU1fQkxPQ0tTX0xPQ0tFRCIsIlRlc3RNb25lcm9XYWxsZXRDb21tb24iLCJjb25zdHJ1Y3RvciIsInRlc3RDb25maWciLCJiZWZvcmVBbGwiLCJjb25zb2xlIiwibG9nIiwid2FsbGV0IiwiZ2V0VGVzdFdhbGxldCIsImRhZW1vbiIsImdldFRlc3REYWVtb24iLCJUZXN0VXRpbHMiLCJXQUxMRVRfVFhfVFJBQ0tFUiIsInJlc2V0IiwiTGlicmFyeVV0aWxzIiwibG9hZEtleXNNb2R1bGUiLCJiZWZvcmVFYWNoIiwiY3VycmVudFRlc3QiLCJ0aXRsZSIsImFmdGVyQWxsIiwic3RvcE1pbmluZyIsImVyciIsImNsb3NlIiwiYWZ0ZXJFYWNoIiwiZ2V0RGFlbW9uUnBjIiwiRXJyb3IiLCJvcGVuV2FsbGV0IiwiY29uZmlnIiwiY3JlYXRlV2FsbGV0IiwiY2xvc2VXYWxsZXQiLCJzYXZlIiwiZ2V0U2VlZExhbmd1YWdlcyIsInJ1bkNvbW1vblRlc3RzIiwidGhhdCIsIk9iamVjdCIsImFzc2lnbiIsImRlc2NyaWJlIiwibGl0ZU1vZGUiLCJ0ZXN0UmVsYXlzIiwiaXQiLCJ0ZXN0U2VuZFRvTXVsdGlwbGUiLCJ0ZXN0Tm9uUmVsYXlzIiwiZTEiLCJ1bmRlZmluZWQiLCJwYXRoIiwiZ2V0UGF0aCIsImUiLCJlMiIsIk1vbmVyb1V0aWxzIiwidmFsaWRhdGVBZGRyZXNzIiwiZ2V0UHJpbWFyeUFkZHJlc3MiLCJORVRXT1JLX1RZUEUiLCJ2YWxpZGF0ZVByaXZhdGVWaWV3S2V5IiwiZ2V0UHJpdmF0ZVZpZXdLZXkiLCJ2YWxpZGF0ZVByaXZhdGVTcGVuZEtleSIsImdldFByaXZhdGVTcGVuZEtleSIsInZhbGlkYXRlTW5lbW9uaWMiLCJnZXRTZWVkIiwiTW9uZXJvV2FsbGV0UnBjIiwiYXNzZXJ0IiwiZXF1YWwiLCJnZXRTZWVkTGFuZ3VhZ2UiLCJNb25lcm9XYWxsZXQiLCJERUZBVUxUX0xBTkdVQUdFIiwibWVzc2FnZSIsImxhbmd1YWdlIiwicHJpbWFyeUFkZHJlc3MiLCJwcml2YXRlVmlld0tleSIsInByaXZhdGVTcGVuZEtleSIsInNlZWQiLCJTRUVEIiwicmVzdG9yZUhlaWdodCIsIkZJUlNUX1JFQ0VJVkVfSEVJR0hUIiwiaW52YWxpZE1uZW1vbmljIiwiTW9uZXJvV2FsbGV0Q29uZmlnIiwic2V0U2VlZCIsInNldFJlc3RvcmVIZWlnaHQiLCJzZWVkT2Zmc2V0Iiwibm90RXF1YWwiLCJBRERSRVNTIiwiZ2V0SGVpZ2h0IiwiTW9uZXJvV2FsbGV0S2V5cyIsImlzQ29ubmVjdGVkVG9EYWVtb24iLCJyZWNlaXZlciIsImFjY291bnRMb29rYWhlYWQiLCJzdWJhZGRyZXNzTG9va2FoZWFkIiwiY3JlYXRlVHgiLCJNb25lcm9UeENvbmZpZyIsInNldEFjY291bnRJbmRleCIsImFkZERlc3RpbmF0aW9uIiwiZ2V0U3ViYWRkcmVzcyIsImdldEFkZHJlc3MiLCJNQVhfRkVFIiwic2V0UmVsYXkiLCJHZW5VdGlscyIsIndhaXRGb3IiLCJzeW5jIiwiZ2V0QmFsYW5jZSIsInZlcnNpb24iLCJnZXRWZXJzaW9uIiwiZ2V0TnVtYmVyIiwiZ2V0SXNSZWxlYXNlIiwidXVpZCIsImdldFVVSUQiLCJzZXRBdHRyaWJ1dGUiLCJnZXRBdHRyaWJ1dGUiLCJkZWVwRXF1YWwiLCJnZXREYWVtb25Db25uZWN0aW9uIiwiTW9uZXJvUnBjQ29ubmVjdGlvbiIsIkRBRU1PTl9SUENfQ09ORklHIiwic2V0RGFlbW9uQ29ubmVjdGlvbiIsIk9GRkxJTkVfU0VSVkVSX1VSSSIsInVyaSIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJnZXRDb25maWciLCJjb25uZWN0aW9uTWFuYWdlciIsIk1vbmVyb0Nvbm5lY3Rpb25NYW5hZ2VyIiwiY29ubmVjdGlvbjEiLCJnZXRScGNDb25uZWN0aW9uIiwic2V0UHJpb3JpdHkiLCJjb25uZWN0aW9uMiIsInNldENvbm5lY3Rpb24iLCJhZGRDb25uZWN0aW9uIiwic2V0U2VydmVyIiwic2V0Q29ubmVjdGlvbk1hbmFnZXIiLCJnZXRVcmkiLCJBVVRPX0NPTk5FQ1RfVElNRU9VVF9NUyIsInNldFBhdGgiLCJzdGFydFBvbGxpbmciLCJTWU5DX1BFUklPRF9JTl9NUyIsImFkZExpc3RlbmVyIiwiTW9uZXJvV2FsbGV0TGlzdGVuZXIiLCJzZXRBdXRvU3dpdGNoIiwiY29ubmVjdGlvbk1hbmFnZXIyIiwiZ2V0Q29ubmVjdGlvbk1hbmFnZXIiLCJzdG9wUG9sbGluZyIsIm1uZW1vbmljIiwibGFuZ3VhZ2VzIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwicHVibGljVmlld0tleSIsImdldFB1YmxpY1ZpZXdLZXkiLCJ2YWxpZGF0ZVB1YmxpY1ZpZXdLZXkiLCJwdWJsaWNTcGVuZEtleSIsImdldFB1YmxpY1NwZW5kS2V5IiwidmFsaWRhdGVQdWJsaWNTcGVuZEtleSIsImFjY291bnQiLCJnZXRBY2NvdW50cyIsInN1YmFkZHJlc3MiLCJnZXRTdWJhZGRyZXNzZXMiLCJnZXRJbmRleCIsInRlc3RHZXRTdWJhZGRyZXNzQWRkcmVzc091dE9mUmFuZ2UiLCJhY2NvdW50cyIsImFjY291bnRJZHgiLCJzdWJhZGRyZXNzSWR4IiwiYWRkcmVzcyIsImdldEFkZHJlc3NJbmRleCIsImdldEFjY291bnRJbmRleCIsIm5vbldhbGxldEFkZHJlc3MiLCJnZXRFeHRlcm5hbFdhbGxldEFkZHJlc3MiLCJwYXltZW50SWQiLCJpbnRlZ3JhdGVkQWRkcmVzcyIsImdldEludGVncmF0ZWRBZGRyZXNzIiwiZ2V0U3RhbmRhcmRBZGRyZXNzIiwiZ2V0UGF5bWVudElkIiwiY3JlYXRlU3ViYWRkcmVzcyIsImludmFsaWRQYXltZW50SWQiLCJkZWNvZGVkQWRkcmVzcyIsImRlY29kZUludGVncmF0ZWRBZGRyZXNzIiwidG9TdHJpbmciLCJudW1CbG9ja3MiLCJjaGFpbkhlaWdodCIsInJlc3VsdCIsIk1vbmVyb1N5bmNSZXN1bHQiLCJnZXROdW1CbG9ja3NGZXRjaGVkIiwiZ2V0UmVjZWl2ZWRNb25leSIsImhlaWdodCIsIkRBWV9NUyIsInllc3RlcmRheSIsIkRhdGUiLCJnZXRUaW1lIiwiZGF0ZXMiLCJpIiwicHVzaCIsImxhc3RIZWlnaHQiLCJkYXRlIiwiZ2V0SGVpZ2h0QnlEYXRlIiwiZ2V0WWVhciIsImdldE1vbnRoIiwiZ2V0RGF0ZSIsInRvbW9ycm93IiwiZ2V0RnVsbFllYXIiLCJhY2NvdW50c0JhbGFuY2UiLCJhY2NvdW50c1VubG9ja2VkQmFsYW5jZSIsImdldFVubG9ja2VkQmFsYW5jZSIsInN1YmFkZHJlc3Nlc0JhbGFuY2UiLCJzdWJhZGRyZXNzZXNVbmxvY2tlZEJhbGFuY2UiLCJ0ZXN0VW5zaWduZWRCaWdJbnQiLCJtYXAiLCJ0ZXN0QWNjb3VudCIsInJldHJpZXZlZCIsImdldEFjY291bnQiLCJhY2NvdW50c0JlZm9yZSIsImNyZWF0ZWRBY2NvdW50IiwiY3JlYXRlQWNjb3VudCIsImxhYmVsIiwiZ2V0TGFiZWwiLCJzZXRBY2NvdW50TGFiZWwiLCJzdWJhZGRyZXNzZXMiLCJ0ZXN0U3ViYWRkcmVzcyIsInNwbGljZSIsInN1YmFkZHJlc3NJbmRpY2VzIiwiZmV0Y2hlZFN1YmFkZHJlc3NlcyIsInN1YmFkZHJlc3Nlc05ldyIsInNldFN1YmFkZHJlc3NMYWJlbCIsIm5vbkRlZmF1bHRJbmNvbWluZyIsInR4cyIsImdldEFuZFRlc3RUeHMiLCJibG9ja3NQZXJIZWlnaHQiLCJ0ZXN0VHhXYWxsZXQiLCJjb3B5MSIsImNvcHkiLCJjb3B5MiIsImdldElzQ29uZmlybWVkIiwic2V0QmxvY2siLCJnZXRCbG9jayIsInNldFR4cyIsIm1lcmdlZCIsIm1lcmdlIiwiZ2V0SW5jb21pbmdUcmFuc2ZlcnMiLCJ0cmFuc2ZlciIsImdldFN1YmFkZHJlc3NJbmRleCIsImJsb2NrIiwibWF4TnVtVHhzIiwiZ2V0VHhzIiwic2h1ZmZsZSIsInNsaWNlIiwiTWF0aCIsIm1pbiIsImZldGNoZWRUeCIsImdldFR4IiwiZ2V0SGFzaCIsInR4SWQxIiwidHhJZDIiLCJmZXRjaGVkVHhzIiwidHhIYXNoZXMiLCJ0eCIsIm1pc3NpbmdUeEhhc2giLCJyYW5kb21UeHMiLCJnZXRSYW5kb21UcmFuc2FjdGlvbnMiLCJyYW5kb21UeCIsImhhc2giLCJoYXNoZXMiLCJpbmNsdWRlcyIsImlzT3V0Z29pbmciLCJnZXRJc091dGdvaW5nIiwiZ2V0T3V0Z29pbmdUcmFuc2ZlciIsIk1vbmVyb1RyYW5zZmVyIiwidGVzdFRyYW5zZmVyIiwiaXNJbmNvbWluZyIsInRyYW5zZmVyUXVlcnkiLCJhY2NvdW50SW5kZXgiLCJmb3VuZCIsInR4UXVlcnkiLCJNb25lcm9UeFF1ZXJ5Iiwic2V0SXNDb25maXJtZWQiLCJzZXRUcmFuc2ZlclF1ZXJ5IiwiTW9uZXJvVHJhbnNmZXJRdWVyeSIsInNldElzT3V0Z29pbmciLCJoYXNEZXN0aW5hdGlvbnMiLCJnZXREZXN0aW5hdGlvbnMiLCJpbmNsdWRlT3V0cHV0cyIsImdldE91dHB1dHMiLCJnZXRJc0luY29taW5nIiwib3V0cHV0UXVlcnkiLCJNb25lcm9PdXRwdXRRdWVyeSIsInNldElzU3BlbnQiLCJzZXRTdWJhZGRyZXNzSW5kZXgiLCJzZXRPdXRwdXRRdWVyeSIsIm91dHB1dCIsImdldE91dHB1dHNXYWxsZXQiLCJnZXRJc1NwZW50Iiwic2V0SXNMb2NrZWQiLCJnZXRJc0xvY2tlZCIsImlzQ29uZmlybWVkIiwidHhIZWlnaHRzIiwiaGVpZ2h0Q291bnRzIiwiY291bnROdW1JbnN0YW5jZXMiLCJoZWlnaHRNb2RlcyIsImdldE1vZGVzIiwibW9kZUhlaWdodCIsInZhbHVlcyIsIm5leHQiLCJ2YWx1ZSIsIm1vZGVUeHMiLCJzZXRIZWlnaHQiLCJnZXQiLCJtb2RlVHhzQnlSYW5nZSIsInNldE1pbkhlaWdodCIsInNldE1heEhlaWdodCIsImZldGNoZWQiLCJoZWlnaHRzIiwic29ydCIsIm1pbkhlaWdodCIsIm1heEhlaWdodCIsInVuZmlsdGVyZWRDb3VudCIsImhhc1BheW1lbnRJZCIsInBheW1lbnRJZHMiLCJ2YWxpZGF0ZVBheW1lbnRJZCIsImZpbHRlcmVkVHhzIiwiZmlsdGVyZWRUeCIsIkZpbHRlciIsImFwcGx5Iiwic2V0SGFzaGVzIiwidHhIYXNoIiwiaW52YWxpZEhhc2giLCJ1bmtub3duSGFzaDEiLCJ1bmtub3duSGFzaDIiLCJzZXRIYXNoIiwiZ2V0QW5kVGVzdFRyYW5zZmVycyIsImFjY291bnRUcmFuc2ZlcnMiLCJzdWJhZGRyZXNzVHJhbnNmZXJzIiwidHJhbnNmZXJzIiwic3ViYWRkcmVzc0luZGV4IiwiaW5UcmFuc2ZlciIsIm91dFRyYW5zZmVyIiwiZ2V0U3ViYWRkcmVzc0luZGljZXMiLCJzdWJhZGRySWR4Iiwic3ViYWRkcmVzc1RyYW5zZmVyIiwiU2V0IiwiYWRkIiwic2V0U3ViYWRkcmVzc0luZGljZXMiLCJmcm9tIiwiaGFzIiwib3ZlcmxhcHMiLCJvdXRTdWJhZGRyZXNzSWR4IiwiaW5UeFBvb2wiLCJnZXRJblR4UG9vbCIsInNldEhhc0Rlc3RpbmF0aW9ucyIsInNldFR4UXVlcnkiLCJnZXRUcmFuc2ZlcnMiLCJNb25lcm9JbmNvbWluZ1RyYW5zZmVyIiwiaW5UcmFuc2ZlcnMiLCJhbW91bnQiLCJnZXRBbW91bnQiLCJzZXRJc0luY29taW5nIiwib3V0VHJhbnNmZXJzIiwiZ2V0T3V0Z29pbmdUcmFuc2ZlcnMiLCJnZXRBbmRUZXN0T3V0cHV0cyIsImlzVXNlZCIsImdldElzVXNlZCIsImFjY291bnRPdXRwdXRzIiwic3ViYWRkcmVzc091dHB1dHMiLCJvdXRwdXRzIiwiaXNTcGVudCIsInF1ZXJ5Iiwic2V0TWluQW1vdW50Iiwia2V5SW1hZ2UiLCJnZXRLZXlJbWFnZSIsImdldEhleCIsInNldEtleUltYWdlIiwiTW9uZXJvS2V5SW1hZ2UiLCJhcnJheUNvbnRhaW5zIiwib3V0cHV0c0hleCIsImV4cG9ydE91dHB1dHMiLCJvdXRwdXRzSGV4QWxsIiwibnVtSW1wb3J0ZWQiLCJpbXBvcnRPdXRwdXRzIiwid2FsbGV0QmFsYW5jZSIsIndhbGxldFVubG9ja2VkQmFsYW5jZSIsImhhc1VuY29uZmlybWVkVHgiLCJ3YWxsZXRTdW0iLCJhY2NvdW50U3VtIiwic3ViYWRkcmVzc1N1bSIsInNldFR4Tm90ZSIsImdldFR4Tm90ZSIsInR4Tm90ZXMiLCJzZXRUeE5vdGVzIiwiZ2V0VHhOb3RlcyIsIndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbCIsImluZGV4T2YiLCJrZXkiLCJnZXRUeEtleSIsImRlc3RpbmF0aW9uIiwiY2hlY2siLCJjaGVja1R4S2V5IiwiZ2V0UmVjZWl2ZWRBbW91bnQiLCJ0ZXN0Q2hlY2tUeCIsInRlc3RJbnZhbGlkVHhIYXNoRXJyb3IiLCJ0ZXN0SW52YWxpZFR4S2V5RXJyb3IiLCJ0ZXN0SW52YWxpZEFkZHJlc3NFcnJvciIsImRpZmZlcmVudEFkZHJlc3MiLCJhVHgiLCJhRGVzdGluYXRpb24iLCJnZXRJc0dvb2QiLCJzaWduYXR1cmUiLCJnZXRUeFByb29mIiwiY2hlY2tUeFByb29mIiwid3JvbmdTaWduYXR1cmUiLCJ0ZXN0SW52YWxpZFNpZ25hdHVyZUVycm9yIiwiaXNGYWlsZWQiLCJnZXRTcGVuZFByb29mIiwiY2hlY2tTcGVuZFByb29mIiwiZ2V0UmVzZXJ2ZVByb29mV2FsbGV0IiwiY2hlY2tSZXNlcnZlUHJvb2YiLCJ0ZXN0Q2hlY2tSZXNlcnZlIiwiYmFsYW5jZSIsImdldFRvdGFsQW1vdW50IiwidW5jb25maXJtZWRUeHMiLCJ0ZXN0Tm9TdWJhZGRyZXNzRXJyb3IiLCJ0ZXN0U2lnbmF0dXJlSGVhZGVyQ2hlY2tFcnJvciIsIm51bU5vblplcm9UZXN0cyIsIm1zZyIsImNoZWNrQW1vdW50IiwiZ2V0UmVzZXJ2ZVByb29mQWNjb3VudCIsImdldENvZGUiLCJyZXNlcnZlUHJvb2YiLCJpbWFnZXMiLCJleHBvcnRLZXlJbWFnZXMiLCJpbWFnZSIsImdldFNpZ25hdHVyZSIsImltYWdlc0FsbCIsImdldE5ld0tleUltYWdlc0Zyb21MYXN0SW1wb3J0IiwiaW1wb3J0S2V5SW1hZ2VzIiwiaGFzU3BlbnQiLCJoYXNVbnNwZW50IiwiZ2V0U3BlbnRBbW91bnQiLCJnZXRVbnNwZW50QW1vdW50IiwiTW9uZXJvU3ViYWRkcmVzcyIsImluZGV4Iiwic2lnbk1lc3NhZ2UiLCJNb25lcm9NZXNzYWdlU2lnbmF0dXJlVHlwZSIsIlNJR05fV0lUSF9TUEVORF9LRVkiLCJ2ZXJpZnlNZXNzYWdlIiwiTW9uZXJvTWVzc2FnZVNpZ25hdHVyZVJlc3VsdCIsImlzR29vZCIsImlzT2xkIiwic2lnbmF0dXJlVHlwZSIsIlNJR05fV0lUSF9WSUVXX0tFWSIsImVudHJpZXMiLCJnZXRBZGRyZXNzQm9va0VudHJpZXMiLCJudW1FbnRyaWVzU3RhcnQiLCJlbnRyeSIsInRlc3RBZGRyZXNzQm9va0VudHJ5IiwiTlVNX0VOVFJJRVMiLCJpbmRpY2VzIiwiYWRkQWRkcmVzc0Jvb2tFbnRyeSIsImlkeCIsImdldERlc2NyaXB0aW9uIiwiZWRpdEFkZHJlc3NCb29rRW50cnkiLCJkZWxldGVJZHgiLCJkZWxldGVBZGRyZXNzQm9va0VudHJ5IiwiaW50ZWdyYXRlZEFkZHJlc3NlcyIsImludGVncmF0ZWREZXNjcmlwdGlvbnMiLCJhdHRycyIsInZhbCIsImtleXMiLCJjb25maWcxIiwiZ2V0UGF5bWVudFVyaSIsImNvbmZpZzIiLCJwYXJzZVBheW1lbnRVcmkiLCJkZWxldGVVbmRlZmluZWRLZXlzIiwiSlNPTiIsInBhcnNlIiwic3RyaW5naWZ5IiwidG9Kc29uIiwic2V0QWRkcmVzcyIsInNldEFtb3VudCIsInNldFJlY2lwaWVudE5hbWUiLCJzZXROb3RlIiwic2V0UGF5bWVudElkIiwic3RhdHVzIiwiZ2V0TWluaW5nU3RhdHVzIiwiZ2V0SXNBY3RpdmUiLCJzdGFydE1pbmluZyIsInNldFBhc3N3b3JkIiwiV0FMTEVUX1BBU1NXT1JEIiwibmV3UGFzc3dvcmQiLCJjaGFuZ2VQYXNzd29yZCIsInRlc3ROb3RpZmljYXRpb25zIiwidGVzdFdhbGxldE5vdGlmaWNhdGlvbnMiLCJ0ZXN0TmFtZSIsInNhbWVXYWxsZXQiLCJzYW1lQWNjb3VudCIsInN3ZWVwT3V0cHV0IiwiY3JlYXRlVGhlblJlbGF5IiwidW5sb2NrRGVsYXkiLCJpc3N1ZXMiLCJ0ZXN0V2FsbGV0Tm90aWZpY2F0aW9uc0F1eCIsImlzc3Vlc1RvU3RyIiwiTUFYX1BPTExfVElNRSIsInNlbmRlciIsIm51bUFjY291bnRzIiwid2FpdEZvclVubG9ja2VkQmFsYW5jZSIsInNlbmRlckJhbGFuY2VCZWZvcmUiLCJzZW5kZXJVbmxvY2tlZEJhbGFuY2VCZWZvcmUiLCJyZWNlaXZlckJhbGFuY2VCZWZvcmUiLCJyZWNlaXZlclVubG9ja2VkQmFsYW5jZUJlZm9yZSIsInNlbmRlck5vdGlmaWNhdGlvbkNvbGxlY3RvciIsIldhbGxldE5vdGlmaWNhdGlvbkNvbGxlY3RvciIsInJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yIiwiY3R4IiwiaXNTZW5kUmVzcG9uc2UiLCJzZW5kZXJUeCIsImRlc3RpbmF0aW9uQWNjb3VudHMiLCJleHBlY3RlZE91dHB1dHMiLCJpc1N3ZWVwUmVzcG9uc2UiLCJpc1N3ZWVwT3V0cHV0UmVzcG9uc2UiLCJtaW5BbW91bnQiLCJpc0xvY2tlZCIsInJlbGF5IiwiTW9uZXJvT3V0cHV0V2FsbGV0IiwiZGVzdGluYXRpb25BY2NvdW50IiwicmVsYXlUeCIsInN0YXJ0VGltZSIsIm5vdyIsImdldEluY29taW5nQW1vdW50IiwiZ2V0T3V0Z29pbmdBbW91bnQiLCJnZXRGZWUiLCJzZXRJbmNsdWRlT3V0cHV0cyIsImdldEJhbGFuY2VOb3RpZmljYXRpb25zIiwidW5sb2NrZWRCYWxhbmNlIiwiZ2V0T3V0cHV0c1NwZW50IiwicmVjZWl2ZXJUeCIsImdldE91dHB1dHNSZWNlaXZlZCIsImdldE1pc3NpbmdPdXRwdXRzIiwiU3RhcnRNaW5pbmciLCJ0aHJlYWRzIiwiZXhwZWN0ZWRVbmxvY2tUaW1lIiwiY29uZmlybUhlaWdodCIsInRlc3RTdGFydEhlaWdodCIsInRocmVhZEZuIiwic2VuZGVyQmxvY2tOb3RpZmljYXRpb25zIiwiZ2V0QmxvY2tOb3RpZmljYXRpb25zIiwicmVjZWl2ZXJCbG9ja05vdGlmaWNhdGlvbnMiLCJnZXRJc0ZhaWxlZCIsIm1heCIsImNvbmZpcm1lZFF1ZXJ5IiwiZ2V0VHhRdWVyeSIsImdldE91dHB1dFF1ZXJ5IiwibmV0QW1vdW50Iiwib3V0cHV0U3BlbnQiLCJvdXRwdXRSZWNlaXZlZCIsInVubG9ja2VkUXVlcnkiLCJQcm9taXNlIiwiYWxsIiwidGVzdE5vdGlmaWVkT3V0cHV0IiwicmVtb3ZlTGlzdGVuZXIiLCJzZXRMaXN0ZW5pbmciLCJhY3R1YWxPdXRwdXRzIiwibWF0Y2hTdWJhZGRyZXNzIiwibWlzc2luZyIsInVzZWQiLCJleHBlY3RlZE91dHB1dCIsImFjdHVhbE91dHB1dCIsInN0ciIsImlzVHhJbnB1dCIsImdldElucHV0cyIsImdldE91dHB1dFN0YXRlIiwibGlzdGVuZXIiLCJyZXNvbHZlIiwic2V0VGltZW91dCIsIm15TGlzdGVuZXIiLCJzZW50VHgiLCJ3YWl0Rm9yTmV4dEJsb2NrSGVhZGVyIiwidW5sb2NrVGltZSIsImNhblNwbGl0IiwidGVzdFNlbmRBbmRVcGRhdGVUeHMiLCJzZW50VHhzIiwiZ2V0Q2FuU3BsaXQiLCJjcmVhdGVUeHMiLCJ1cGRhdGVkVHhzIiwibnVtQ29uZmlybWF0aW9ucyIsIm51bUNvbmZpcm1hdGlvbnNUb3RhbCIsImhlYWRlciIsInRlc3RPdXRJblBhaXJzIiwidXBkYXRlZFR4IiwidGVzdEdldFR4c1N0cnVjdHVyZSIsImdldE51bUNvbmZpcm1hdGlvbnMiLCJ0eE91dCIsInRlc3RVbmxvY2tUeCIsInR4SW4iLCJ0eDIiLCJ0ZXN0T3V0SW5QYWlyIiwicmVjaXBpZW50IiwiYmFsYW5jZTEiLCJ1bmxvY2tlZEJhbGFuY2UxIiwiYmFsYW5jZTIiLCJ1bmxvY2tlZEJhbGFuY2UyIiwiZXhwZWN0ZWRCYWxhbmNlIiwiaXNDbG9zZWQiLCJ0ZXN0U2VuZEZyb21NdWx0aXBsZSIsInNldENhblNwbGl0IiwiTlVNX1NVQkFERFJFU1NFUyIsInNyY0FjY291bnQiLCJ1bmxvY2tlZFN1YmFkZHJlc3NlcyIsImhhc0JhbGFuY2UiLCJudW1TdWJhZGRyZXNzQmFsYW5jZXMiLCJmcm9tU3ViYWRkcmVzc0luZGljZXMiLCJzZW5kQW1vdW50IiwiZnJvbVN1YmFkZHJlc3NJZHgiLCJzZXREZXN0aW5hdGlvbnMiLCJNb25lcm9EZXN0aW5hdGlvbiIsImNvbmZpZ0NvcHkiLCJhY2NvdW50c0FmdGVyIiwic3JjVW5sb2NrZWRCYWxhbmNlRGVjcmVhc2VkIiwiaiIsInN1YmFkZHJlc3NCZWZvcmUiLCJzdWJhZGRyZXNzQWZ0ZXIiLCJvdXRnb2luZ1N1bSIsImRlc3RpbmF0aW9uU3VtIiwidGVzdERlc3RpbmF0aW9uIiwiYWJzIiwidGVzdFNlbmRUb1NpbmdsZSIsInN1ZmZpY2llbnRCYWxhbmNlIiwiZnJvbUFjY291bnQiLCJmcm9tU3ViYWRkcmVzcyIsImJhbGFuY2VCZWZvcmUiLCJ1bmxvY2tlZEJhbGFuY2VCZWZvcmUiLCJyZXFDb3B5IiwidGVzdENvbW1vblR4U2V0cyIsImdldFJlbGF5IiwidHhDcmVhdGVkIiwidHhQb29sIiwiZ2V0VHhQb29sIiwidHhNZXRhZGF0YXMiLCJnZXRNZXRhZGF0YSIsInJlbGF5VHhzIiwibG9ja2VkVHhzIiwibG9ja2VkVHgiLCJkdXN0QW10IiwiZ2V0RmVlRXN0aW1hdGUiLCJudW1TdWJhZGRyZXNzZXNQZXJBY2NvdW50Iiwic2VuZEFtb3VudFBlclN1YmFkZHJlc3MiLCJ1c2VKc0NvbmZpZyIsInN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucyIsIm1pbkFjY291bnRBbW91bnQiLCJ0b3RhbFN1YmFkZHJlc3NlcyIsIldBTExFVF9OQU1FIiwiZGVzdGluYXRpb25BZGRyZXNzZXMiLCJNb25lcm9UeFByaW9yaXR5IiwiTk9STUFMIiwic3VidHJhY3RGZWVGcm9tIiwic2V0U3VidHJhY3RGZWVGcm9tIiwianNDb25maWciLCJkZXN0aW5hdGlvbnMiLCJmZWVTdW0iLCJ0ZXN0VHhzV2FsbGV0Iiwic3VidHJhY3QiLCJ2aWV3T25seVdhbGxldCIsIm9mZmxpbmVXYWxsZXQiLCJzZXJ2ZXIiLCJ0ZXN0Vmlld09ubHlBbmRPZmZsaW5lV2FsbGV0cyIsIm51bU91dHB1dHMiLCJzcGVuZGFibGVVbmxvY2tlZE91dHB1dHMiLCJvdXRwdXRzVG9Td2VlcCIsInRlc3RPdXRwdXRXYWxsZXQiLCJhZnRlck91dHB1dHMiLCJhZnRlck91dHB1dCIsInN3ZWVwRHVzdCIsIm1ldGFkYXRhcyIsInRlc3RNdWx0aXNpZyIsInRlc3RSZXNldHMiLCJOVU1fU1VCQUREUkVTU0VTX1RPX1NXRUVQIiwic3ViYWRkcmVzc2VzVW5sb2NrZWQiLCJ1bmxvY2tlZFN1YmFkZHJlc3MiLCJzd2VlcFVubG9ja2VkIiwiZ2V0VHhTZXQiLCJzdWJhZGRyZXNzZXNBZnRlciIsInN3ZXB0IiwiTlVNX0FDQ09VTlRTX1RPX1NXRUVQIiwiYWNjb3VudHNVbmxvY2tlZCIsInVubG9ja2VkQWNjb3VudCIsImFjY291bnRCZWZvcmUiLCJhY2NvdW50QWZ0ZXIiLCJ0ZXN0U3dlZXBXYWxsZXQiLCJzd2VlcEVhY2hTdWJhZGRyZXNzIiwic2V0U3dlZXBFYWNoU3ViYWRkcmVzcyIsImdldE11bHRpc2lnVHhIZXgiLCJnZXRTaWduZWRUeEhleCIsImdldFVuc2lnbmVkVHhIZXgiLCJzcGVuZGFibGVPdXRwdXRzIiwic3BlbmRhYmxlT3V0cHV0Iiwic2NhbldhbGxldCIsInN0b3BTeW5jaW5nIiwic2NhblR4cyIsInJlc2NhbkJsb2NrY2hhaW4iLCJzZXRJc0Zyb3plbiIsImdldElzRnJvemVuIiwiaXNPdXRwdXRGcm96ZW4iLCJudW1Gcm96ZW5CZWZvcmUiLCJmcmVlemVPdXRwdXQiLCJzZXRIZXgiLCJvdXRwdXRGcm96ZW4iLCJ0aGF3T3V0cHV0Iiwib3V0cHV0VGhhd2VkIiwidGVzdFNwZW5kVHgiLCJkdXN0S2V5SW1hZ2VzIiwiaW5wdXQiLCJkdXN0T3V0cHV0cyIsImZpbHRlciIsImF2YWlsYWJsZUtleUltYWdlcyIsInN3ZXB0S2V5SW1hZ2VzIiwic2l6ZSIsIm1heFNraXBwZWRPdXRwdXQiLCJzcGVuZFR4IiwiYWRkcmVzczEiLCJhZGRyZXNzMiIsImFkZHJlc3MzIiwic3VibWl0VHhIZXgiLCJnZXRGdWxsSGV4IiwidmVyaWZ5aW5nV2FsbGV0IiwiZ2V0S2V5IiwiZmx1c2hUeFBvb2wiLCJnZXRTdWJhZGRyZXNzZXNXaXRoQmFsYW5jZSIsImdldFN1YmFkZHJlc3Nlc1dpdGhVbmxvY2tlZEJhbGFuY2UiLCJpc0V4cGVjdGVkIiwiZGVzdGluYXRpb25JZHgiLCJnZXRTdWJ0cmFjdEZlZUZyb20iLCJ3YXJuIiwiYW1vdW50RGlmZiIsImN0eERlc3RpbmF0aW9uIiwiTW9uZXJvVHhXYWxsZXQiLCJnZXRJc01pbmVyVHgiLCJnZXRJc1JlbGF5ZWQiLCJNb25lcm9UeCIsIkRFRkFVTFRfUEFZTUVOVF9JRCIsImdldE5vdGUiLCJnZXRVbmxvY2tUaW1lIiwiZ2V0U2l6ZSIsImdldFJlY2VpdmVkVGltZXN0YW1wIiwiZ2V0V2VpZ2h0IiwiZ2V0VGltZXN0YW1wIiwiZ2V0SXNEb3VibGVTcGVuZFNlZW4iLCJnZXRMYXN0UmVsYXllZFRpbWVzdGFtcCIsImdldExhc3RGYWlsZWRIZWlnaHQiLCJnZXRMYXN0RmFpbGVkSGFzaCIsImdldFJpbmdTaXplIiwidHJhbnNmZXJTdW0iLCJpc0NvcHkiLCJSSU5HX1NJWkUiLCJ0ZXN0SW5wdXRXYWxsZXQiLCJ0ZXN0VHhXYWxsZXRDb3B5IiwiTSIsIk4iLCJ0ZXN0VHgiLCJwYXJ0aWNpcGFudHMiLCJ0ZXN0TXVsdGlzaWdQYXJ0aWNpcGFudHMiLCJlcnIyIiwicGFydGljaXBhbnQiLCJwcmVwYXJlZE11bHRpc2lnSGV4ZXMiLCJwcmVwYXJlTXVsdGlzaWciLCJtYWRlTXVsdGlzaWdIZXhlcyIsInBlZXJNdWx0aXNpZ0hleGVzIiwibWFrZU11bHRpc2lnIiwiTW9uZXJvRXJyb3IiLCJtdWx0aXNpZ0hleCIsInByZXZNdWx0aXNpZ0hleGVzIiwiZXhjaGFuZ2VNdWx0aXNpZ0hleGVzIiwiZXhjaGFuZ2VNdWx0aXNpZ0tleXMiLCJrIiwiZ2V0TXVsdGlzaWdIZXgiLCJ0ZXN0TXVsdGlzaWdJbmZvIiwiZ2V0TXVsdGlzaWdJbmZvIiwic2V0SXNNdWx0aXNpZyIsIm51bVN1YmFkZHJlc3NlcyIsInJldHVybkFkZHJlc3MiLCJsYXN0TnVtQ29uZmlybWF0aW9ucyIsImlzTXVsdGlzaWdJbXBvcnROZWVkZWQiLCJzeW5jaHJvbml6ZU11bHRpc2lnUGFydGljaXBhbnRzIiwidHhTZXQiLCJ0ZXN0RGVzY3JpYmVkVHhTZXQiLCJkZXNjcmliZU11bHRpc2lnVHhTZXQiLCJtdWx0aXNpZ1R4SGV4Iiwic2lnbk11bHRpc2lnVHhIZXgiLCJnZXRTaWduZWRNdWx0aXNpZ1R4SGV4Iiwic3VibWl0TXVsdGlzaWdUeEhleCIsIm11bHRpc2lnVHhzIiwiZGVzY3JpYmVUeFNldCIsIndhbGxldHMiLCJtdWx0aXNpZ0hleGVzIiwiZXhwb3J0TXVsdGlzaWdIZXgiLCJpbXBvcnRNdWx0aXNpZ0hleCIsImluZm8iLCJnZXRJc011bHRpc2lnIiwiZ2V0SXNSZWFkeSIsImdldFRocmVzaG9sZCIsImdldE51bVBhcnRpY2lwYW50cyIsImlzVmlld09ubHkiLCJlcnJNc2ciLCJzZXRJblR4UG9vbCIsIm51bU91dHB1dHNJbXBvcnRlZCIsImtleUltYWdlcyIsInVuc2lnbmVkVHgiLCJzaWduZWRUeFNldCIsInNpZ25UeHMiLCJkZXNjcmliZWRUeFNldCIsImRlc2NyaWJlVW5zaWduZWRUeFNldCIsInN1Ym1pdFR4cyIsImV4cG9ydHMiLCJkZWZhdWx0IiwidGFnIiwiZ2V0VGFnIiwiZ2V0TnVtVW5zcGVudE91dHB1dHMiLCJnZXROdW1CbG9ja3NUb1VubG9jayIsIm1pblR4cyIsIm1heFR4cyIsInRlc3RJbmNvbWluZ1RyYW5zZmVyIiwidGVzdE91dGdvaW5nVHJhbnNmZXIiLCJnZXROdW1TdWdnZXN0ZWRDb25maXJtYXRpb25zIiwiZ2V0QWRkcmVzc2VzIiwic3VtIiwiaGFzU2lnbmVkIiwiaGFzVW5zaWduZWQiLCJoYXNNdWx0aXNpZyIsInNldCIsImdldFNpZ25lZFR4U2V0IiwiZ2V0VW5zaWduZWRUeFNldCIsImdldE11bHRpc2lnVHhTZXQiLCJnZXRVbmNvbmZpcm1lZFNwZW50QW1vdW50IiwiZGVzY3JpYmVkVHgiLCJnZXRJbnB1dFN1bSIsImdldE91dHB1dFN1bSIsImdldENoYW5nZUFtb3VudCIsImdldENoYW5nZUFkZHJlc3MiLCJnZXROdW1EdW1teU91dHB1dHMiLCJnZXRFeHRyYUhleCIsInNlZW5CbG9ja3MiLCJibG9ja3MiLCJnZXRIYXNoZXMiLCJwcmV2QmxvY2tIZWlnaHQiLCJwcmV2QWNjb3VudElkeCIsInByZXZTdWJhZGRyZXNzSWR4IiwiaW5zdGFuY2VzIiwiY291bnRzIiwiTWFwIiwiaW5zdGFuY2UiLCJjb3VudCIsIm1vZGVzIiwibWF4Q291bnQiLCJSZWNlaXZlZE91dHB1dE5vdGlmaWNhdGlvblRlc3RlciIsInRlc3RDb21wbGV0ZSIsInVubG9ja2VkU2VlbiIsIm9uTmV3QmxvY2siLCJsYXN0T25OZXdCbG9ja0hlaWdodCIsIm9uQmFsYW5jZXNDaGFuZ2VkIiwibmV3QmFsYW5jZSIsIm5ld1VubG9ja2VkQmFsYW5jZSIsImxhc3RPbkJhbGFuY2VzQ2hhbmdlZEJhbGFuY2UiLCJsYXN0T25CYWxhbmNlc0NoYW5nZWRVbmxvY2tlZEJhbGFuY2UiLCJvbk91dHB1dFJlY2VpdmVkIiwibGFzdE5vdGlmaWVkT3V0cHV0IiwibGlzdGVuaW5nIiwiYmxvY2tOb3RpZmljYXRpb25zIiwiYmFsYW5jZU5vdGlmaWNhdGlvbnMiLCJvdXRwdXRzUmVjZWl2ZWQiLCJvdXRwdXRzU3BlbnQiLCJsYXN0Tm90aWZpY2F0aW9uIiwib25PdXRwdXRTcGVudCJdLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90ZXN0L1Rlc3RNb25lcm9XYWxsZXRDb21tb24udHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFzc2VydCBmcm9tIFwiYXNzZXJ0XCI7XG5pbXBvcnQgU3RhcnRNaW5pbmcgZnJvbSBcIi4vdXRpbHMvU3RhcnRNaW5pbmdcIjtcbmltcG9ydCBUZXN0VXRpbHMgZnJvbSBcIi4vdXRpbHMvVGVzdFV0aWxzXCI7XG5pbXBvcnQge0ZpbHRlcixcbiAgICAgICAgR2VuVXRpbHMsXG4gICAgICAgIExpYnJhcnlVdGlscyxcbiAgICAgICAgTW9uZXJvQWNjb3VudCxcbiAgICAgICAgTW9uZXJvQmxvY2ssXG4gICAgICAgIE1vbmVyb0RhZW1vblJwYyxcbiAgICAgICAgTW9uZXJvRXJyb3IsXG4gICAgICAgIE1vbmVyb1R4UHJpb3JpdHksXG4gICAgICAgIE1vbmVyb1dhbGxldFJwYyxcbiAgICAgICAgTW9uZXJvV2FsbGV0S2V5cyxcbiAgICAgICAgTW9uZXJvV2FsbGV0LFxuICAgICAgICBNb25lcm9XYWxsZXRMaXN0ZW5lcixcbiAgICAgICAgTW9uZXJvV2FsbGV0Q29uZmlnLFxuICAgICAgICBNb25lcm9VdGlscyxcbiAgICAgICAgTW9uZXJvTXVsdGlzaWdJbmZvLFxuICAgICAgICBNb25lcm9TeW5jUmVzdWx0LFxuICAgICAgICBNb25lcm9ScGNDb25uZWN0aW9uLFxuICAgICAgICBNb25lcm9Db25uZWN0aW9uTWFuYWdlcixcbiAgICAgICAgTW9uZXJvQ2hlY2tUeCxcbiAgICAgICAgTW9uZXJvVHhRdWVyeSxcbiAgICAgICAgTW9uZXJvVHJhbnNmZXIsXG4gICAgICAgIE1vbmVyb0luY29taW5nVHJhbnNmZXIsXG4gICAgICAgIE1vbmVyb091dGdvaW5nVHJhbnNmZXIsXG4gICAgICAgIE1vbmVyb1RyYW5zZmVyUXVlcnksXG4gICAgICAgIE1vbmVyb091dHB1dFF1ZXJ5LFxuICAgICAgICBNb25lcm9PdXRwdXRXYWxsZXQsXG4gICAgICAgIE1vbmVyb1R4Q29uZmlnLFxuICAgICAgICBNb25lcm9UeFdhbGxldCxcbiAgICAgICAgTW9uZXJvRGVzdGluYXRpb24sXG4gICAgICAgIE1vbmVyb1N1YmFkZHJlc3MsXG4gICAgICAgIE1vbmVyb0tleUltYWdlLFxuICAgICAgICBNb25lcm9UeCxcbiAgICAgICAgTW9uZXJvTWVzc2FnZVNpZ25hdHVyZVR5cGUsXG4gICAgICAgIE1vbmVyb01lc3NhZ2VTaWduYXR1cmVSZXN1bHQsXG4gICAgICAgIE1vbmVyb0NoZWNrUmVzZXJ2ZX0gZnJvbSBcIi4uLy4uL2luZGV4XCI7XG5cbi8vIHRlc3QgY29uc3RhbnRzXG5jb25zdCBTRU5EX0RJVklTT1IgPSBCaWdJbnQoMTApO1xuY29uc3QgU0VORF9NQVhfRElGRiA9IEJpZ0ludCg2MCk7XG5jb25zdCBNQVhfVFhfUFJPT0ZTID0gMjU7IC8vIG1heGltdW0gbnVtYmVyIG9mIHRyYW5zYWN0aW9ucyB0byBjaGVjayBmb3IgZWFjaCBwcm9vZiwgdW5kZWZpbmVkIHRvIGNoZWNrIGFsbFxuY29uc3QgTlVNX0JMT0NLU19MT0NLRUQgPSAxMDtcblxuLyoqXG4gKiBUZXN0IGEgd2FsbGV0IGZvciBjb21tb24gZnVuY3Rpb25hbGl0eS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVGVzdE1vbmVyb1dhbGxldENvbW1vbiB7XG5cbiAgLy8gaW5zdGFuY2UgdmFyaWFibGVzXG4gIHRlc3RDb25maWc6IGFueTtcbiAgd2FsbGV0OiBNb25lcm9XYWxsZXQ7XG4gIGRhZW1vbjogTW9uZXJvRGFlbW9uUnBjO1xuICBcbiAgLyoqXG4gICAqIENvbnN0cnVjdCB0aGUgdGVzdGVyLlxuICAgKiBcbiAgICogQHBhcmFtIHtvYmplY3R9IHRlc3RDb25maWcgLSB0ZXN0IGNvbmZpZ3VyYXRpb25cbiAgICovXG4gIGNvbnN0cnVjdG9yKHRlc3RDb25maWcpIHtcbiAgICB0aGlzLnRlc3RDb25maWcgPSB0ZXN0Q29uZmlnO1xuICB9XG4gIFxuICAvKipcbiAgICogQ2FsbGVkIGJlZm9yZSBhbGwgd2FsbGV0IHRlc3RzLlxuICAgKi9cbiAgYXN5bmMgYmVmb3JlQWxsKCkge1xuICAgIGNvbnNvbGUubG9nKFwiQmVmb3JlIGFsbFwiKTtcbiAgICB0aGlzLndhbGxldCA9IGF3YWl0IHRoaXMuZ2V0VGVzdFdhbGxldCgpO1xuICAgIHRoaXMuZGFlbW9uID0gYXdhaXQgdGhpcy5nZXRUZXN0RGFlbW9uKCk7XG4gICAgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLnJlc2V0KCk7IC8vIGFsbCB3YWxsZXRzIG5lZWQgdG8gd2FpdCBmb3IgdHhzIHRvIGNvbmZpcm0gdG8gcmVsaWFibHkgc3luY1xuICAgIGF3YWl0IExpYnJhcnlVdGlscy5sb2FkS2V5c01vZHVsZSgpOyAvLyBmb3Igd2FzbSBkZXBlbmRlbnRzIGxpa2UgYWRkcmVzcyB2YWxpZGF0aW9uXG4gIH1cbiAgXG4gIC8qKlxuICAgKiBDYWxsZWQgYmVmb3JlIGVhY2ggd2FsbGV0IHRlc3QuXG4gICAqIFxuICAgQHBhcmFtIHtvYmplY3R9IGN1cnJlbnRUZXN0IC0gaW52b2tlZCB3aXRoIE1vY2hhIGN1cnJlbnQgdGVzdFxuICAgKi9cbiAgYXN5bmMgYmVmb3JlRWFjaChjdXJyZW50VGVzdCkge1xuICAgIGNvbnNvbGUubG9nKFwiQmVmb3JlIHRlc3QgXFxcIlwiICsgY3VycmVudFRlc3QudGl0bGUgKyBcIlxcXCJcIik7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBDYWxsZWQgYWZ0ZXIgYWxsIHdhbGxldCB0ZXN0cy5cbiAgICovXG4gIGFzeW5jIGFmdGVyQWxsKCkge1xuICAgIGNvbnNvbGUubG9nKFwiQWZ0ZXIgYWxsXCIpO1xuICAgIFxuICAgIC8vIHRyeSB0byBzdG9wIG1pbmluZ1xuICAgIHRyeSB7IGF3YWl0IHRoaXMuZGFlbW9uLnN0b3BNaW5pbmcoKTsgfVxuICAgIGNhdGNoIChlcnI6IGFueSkgeyB9XG4gICAgXG4gICAgLy8gY2xvc2Ugd2FsbGV0XG4gICAgYXdhaXQgdGhpcy53YWxsZXQuY2xvc2UodHJ1ZSk7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBDYWxsZWQgYWZ0ZXIgZWFjaCB3YWxsZXQgdGVzdC5cbiAgICogXG4gICBAcGFyYW0ge29iamVjdH0gY3VycmVudFRlc3QgLSBpbnZva2VkIHdpdGggTW9jaGEgY3VycmVudCB0ZXN0XG4gICAqL1xuICBhc3luYyBhZnRlckVhY2goY3VycmVudFRlc3QpIHtcbiAgICBjb25zb2xlLmxvZyhcIkFmdGVyIHRlc3QgXFxcIlwiICsgY3VycmVudFRlc3QudGl0bGUgKyBcIlxcXCJcIik7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRhZW1vbiB0byB0ZXN0LlxuICAgKiBcbiAgICogQHJldHVybiB0aGUgZGFlbW9uIHRvIHRlc3RcbiAgICovXG4gIGFzeW5jIGdldFRlc3REYWVtb24oKSB7XG4gICAgcmV0dXJuIFRlc3RVdGlscy5nZXREYWVtb25ScGMoKTtcbiAgfVxuICBcbiAgLyoqXG4gICAqIEdldCB0aGUgbWFpbiB3YWxsZXQgdG8gdGVzdC5cbiAgICogXG4gICAqIEByZXR1cm4ge1Byb21pc2U8TW9uZXJvV2FsbGV0Pn0gdGhlIHdhbGxldCB0byB0ZXN0XG4gICAqL1xuICBhc3luYyBnZXRUZXN0V2FsbGV0KCk6IFByb21pc2U8TW9uZXJvV2FsbGV0PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU3ViY2xhc3MgbXVzdCBpbXBsZW1lbnRcIik7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBPcGVuIGEgdGVzdCB3YWxsZXQgd2l0aCBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIGVhY2ggd2FsbGV0IHR5cGUuXG4gICAqIFxuICAgKiBAcGFyYW0gY29uZmlnIC0gY29uZmlndXJlcyB0aGUgd2FsbGV0IHRvIG9wZW5cbiAgICogQHJldHVybiBNb25lcm9XYWxsZXQgaXMgdGhlIG9wZW5lZCB3YWxsZXRcbiAgICovXG4gIGFzeW5jIG9wZW5XYWxsZXQoY29uZmlnKTogUHJvbWlzZTxNb25lcm9XYWxsZXQ+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdWJjbGFzcyBtdXN0IGltcGxlbWVudFwiKTtcbiAgfVxuICBcbiAgLyoqXG4gICAqIENyZWF0ZSBhIHRlc3Qgd2FsbGV0IHdpdGggZGVmYXVsdCBjb25maWd1cmF0aW9uIGZvciBlYWNoIHdhbGxldCB0eXBlLlxuICAgKiBcbiAgICogQHBhcmFtIFtjb25maWddIC0gY29uZmlndXJlcyB0aGUgd2FsbGV0IHRvIGNyZWF0ZVxuICAgKiBAcmV0dXJuIHtQcm9taXNlPE1vbmVyb1dhbGxldD59IGlzIHRoZSBjcmVhdGVkIHdhbGxldFxuICAgKi9cbiAgYXN5bmMgY3JlYXRlV2FsbGV0KGNvbmZpZz86IFBhcnRpYWw8TW9uZXJvV2FsbGV0Q29uZmlnPik6IFByb21pc2U8TW9uZXJvV2FsbGV0PiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU3ViY2xhc3MgbXVzdCBpbXBsZW1lbnRcIik7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBDbG9zZSBhIHRlc3Qgd2FsbGV0IHdpdGggY3VzdG9taXphdGlvbiBmb3IgZWFjaCB3YWxsZXQgdHlwZS4gXG4gICAqIFxuICAgKiBAcGFyYW0ge01vbmVyb1dhbGxldH0gd2FsbGV0IC0gdGhlIHdhbGxldCB0byBjbG9zZVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtzYXZlXSAtIHdoZXRoZXIgb3Igbm90IHRvIHNhdmUgdGhlIHdhbGxldFxuICAgKiBAcmV0dXJuIHtQcm9taXNlPHZvaWQ+fVxuICAgKi9cbiAgIGFzeW5jIGNsb3NlV2FsbGV0KHdhbGxldCwgc2F2ZT8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdWJjbGFzcyBtdXN0IGltcGxlbWVudFwiKTtcbiAgIH1cbiAgXG4gIC8qKlxuICAgKiBHZXQgdGhlIHdhbGxldCdzIHN1cHBvcnRlZCBsYW5ndWFnZXMgZm9yIHRoZSBzZWVkIHBocmFzZS4gIFRoaXMgaXMgYW5cbiAgICogaW5zdGFuY2UgbWV0aG9kIGZvciB3YWxsZXQgcnBjIGFuZCBhIHN0YXRpYyB1dGlsaXR5IGZvciBvdGhlciB3YWxsZXRzLlxuICAgKiBcbiAgICogQHJldHVybiB7UHJvbWlzZTxzdHJpbmdbXT59IHRoZSB3YWxsZXQncyBzdXBwb3J0ZWQgbGFuZ3VhZ2VzXG4gICAqL1xuICBhc3luYyBnZXRTZWVkTGFuZ3VhZ2VzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdWJjbGFzcyBtdXN0IGltcGxlbWVudFwiKTtcbiAgfVxuICBcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIEJFR0lOIFRFU1RTIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgXG4gIHJ1bkNvbW1vblRlc3RzKHRlc3RDb25maWc/KSB7XG4gICAgbGV0IHRoYXQgPSB0aGlzO1xuICAgIHRlc3RDb25maWcgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnRlc3RDb25maWcsIHRlc3RDb25maWcpXG4gICAgZGVzY3JpYmUoXCJDb21tb24gV2FsbGV0IFRlc3RzXCIgKyAodGVzdENvbmZpZy5saXRlTW9kZSA/IFwiIChsaXRlIG1vZGUpXCIgOiBcIlwiKSwgZnVuY3Rpb24oKSB7XG4gICAgICBcbiAgICAgIC8vIHN0YXJ0IHRlc3RzIGJ5IHNlbmRpbmcgdG8gbXVsdGlwbGUgYWRkcmVzc2VzXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc2VuZCB0byBtdWx0aXBsZSBhZGRyZXNzZXMgaW4gYSBzaW5nbGUgdHJhbnNhY3Rpb25cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RTZW5kVG9NdWx0aXBsZSg1LCAzLCBmYWxzZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBURVNUIE5PTiBSRUxBWVMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gY3JlYXRlIGEgcmFuZG9tIHdhbGxldFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGUxID0gdW5kZWZpbmVkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCB3YWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCgpO1xuICAgICAgICAgIGxldCBwYXRoOyB0cnkgeyBwYXRoID0gYXdhaXQgd2FsbGV0LmdldFBhdGgoKTsgfSBjYXRjaCAoZTogYW55KSB7IH0gIC8vIFRPRE86IGZhY3RvciBvdXQga2V5cy1vbmx5IHRlc3RzP1xuICAgICAgICAgIGxldCBlMiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVBZGRyZXNzKGF3YWl0IHdhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBUZXN0VXRpbHMuTkVUV09SS19UWVBFKTtcbiAgICAgICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlUHJpdmF0ZVZpZXdLZXkoYXdhaXQgd2FsbGV0LmdldFByaXZhdGVWaWV3S2V5KCkpO1xuICAgICAgICAgICAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVQcml2YXRlU3BlbmRLZXkoYXdhaXQgd2FsbGV0LmdldFByaXZhdGVTcGVuZEtleSgpKTtcbiAgICAgICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlTW5lbW9uaWMoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSk7XG4gICAgICAgICAgICBpZiAoISh3YWxsZXQgaW5zdGFuY2VvZiBNb25lcm9XYWxsZXRScGMpKSBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWRMYW5ndWFnZSgpLCBNb25lcm9XYWxsZXQuREVGQVVMVF9MQU5HVUFHRSk7IC8vIFRPRE8gbW9uZXJvLXdhbGxldC1ycGM6IGdldCBtbmVtb25pYyBsYW5ndWFnZVxuICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgZTIgPSBlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHdhbGxldCk7XG4gICAgICAgICAgaWYgKGUyICE9PSB1bmRlZmluZWQpIHRocm93IGUyO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGF0dGVtcHQgdG8gY3JlYXRlIHdhbGxldCBhdCBzYW1lIHBhdGhcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3BhdGg6IHBhdGh9KTtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGVycm9yXCIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlLm1lc3NhZ2UsIFwiV2FsbGV0IGFscmVhZHkgZXhpc3RzOiBcIiArIHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBhdHRlbXB0IHRvIGNyZWF0ZSB3YWxsZXQgd2l0aCB1bmtub3duIGxhbmd1YWdlXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtsYW5ndWFnZTogXCJlbmdsaXNoXCJ9KTsgLy8gVE9ETzogc3VwcG9ydCBsb3dlcmNhc2U/XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXJyb3JcIik7XG4gICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5tZXNzYWdlLCBcIlVua25vd24gbGFuZ3VhZ2U6IGVuZ2xpc2hcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBlMSA9IGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChlMSAhPT0gdW5kZWZpbmVkKSB0aHJvdyBlMTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gY3JlYXRlIGEgd2FsbGV0IGZyb20gYSBtbmVtb25pYyBwaHJhc2UuXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgZTEgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc2F2ZSBmb3IgY29tcGFyaXNvblxuICAgICAgICAgIGxldCBwcmltYXJ5QWRkcmVzcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCk7XG4gICAgICAgICAgbGV0IHByaXZhdGVWaWV3S2V5ID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpdmF0ZVZpZXdLZXkoKTtcbiAgICAgICAgICBsZXQgcHJpdmF0ZVNwZW5kS2V5ID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpdmF0ZVNwZW5kS2V5KCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gcmVjcmVhdGUgdGVzdCB3YWxsZXQgZnJvbSBzZWVkXG4gICAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtzZWVkOiBUZXN0VXRpbHMuU0VFRCwgcmVzdG9yZUhlaWdodDogVGVzdFV0aWxzLkZJUlNUX1JFQ0VJVkVfSEVJR0hUfSk7XG4gICAgICAgICAgbGV0IHBhdGg7IHRyeSB7IHBhdGggPSBhd2FpdCB3YWxsZXQuZ2V0UGF0aCgpOyB9IGNhdGNoIChlOiBhbnkpIHsgfSAgLy8gVE9ETzogZmFjdG9yIG91dCBrZXlzLW9ubHkgdGVzdHM/XG4gICAgICAgICAgbGV0IGUyID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIHByaW1hcnlBZGRyZXNzKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UHJpdmF0ZVZpZXdLZXkoKSwgcHJpdmF0ZVZpZXdLZXkpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRQcml2YXRlU3BlbmRLZXkoKSwgcHJpdmF0ZVNwZW5kS2V5KTtcbiAgICAgICAgICAgIGlmICghKHdhbGxldCBpbnN0YW5jZW9mIE1vbmVyb1dhbGxldFJwYykpIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZExhbmd1YWdlKCksIE1vbmVyb1dhbGxldC5ERUZBVUxUX0xBTkdVQUdFKTtcbiAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIGUyID0gZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgICAgIGlmIChlMiAhPT0gdW5kZWZpbmVkKSB0aHJvdyBlMjtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBhdHRlbXB0IHRvIGNyZWF0ZSB3YWxsZXQgd2l0aCB0d28gbWlzc2luZyB3b3Jkc1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgaW52YWxpZE1uZW1vbmljID0gXCJtZW1vaXIgZGVzayBhbGdlYnJhIGluYm91bmQgaW5ub2NlbnQgdW5wbHVncyBmdWxseSBva2F5IGZpdmUgaW5mbGFtZWQgZ2lhbnQgZmFjdHVhbCByaXR1YWwgdG95ZWQgdG9waWMgc25ha2UgdW5oYXBweSBndWFyZGVkIHR3ZWV6ZXJzIGhhdW50ZWQgaW51bmRhdGUgZ2lhbnRcIjtcbiAgICAgICAgICAgIGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KG5ldyBNb25lcm9XYWxsZXRDb25maWcoKS5zZXRTZWVkKGludmFsaWRNbmVtb25pYykuc2V0UmVzdG9yZUhlaWdodChUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQpKTtcbiAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKFwiSW52YWxpZCBtbmVtb25pY1wiLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIGF0dGVtcHQgdG8gY3JlYXRlIHdhbGxldCBhdCBzYW1lIHBhdGhcbiAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3BhdGg6IHBhdGh9KTtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGVycm9yXCIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlLm1lc3NhZ2UsIFwiV2FsbGV0IGFscmVhZHkgZXhpc3RzOiBcIiArIHBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgZTEgPSBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZTEgIT09IHVuZGVmaW5lZCkgdGhyb3cgZTE7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGNyZWF0ZSBhIHdhbGxldCBmcm9tIGEgbW5lbW9uaWMgcGhyYXNlIHdpdGggYSBzZWVkIG9mZnNldFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGUxID0gdW5kZWZpbmVkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGNyZWF0ZSB0ZXN0IHdhbGxldCB3aXRoIG9mZnNldFxuICAgICAgICAgIGxldCB3YWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7c2VlZDogVGVzdFV0aWxzLlNFRUQsIHJlc3RvcmVIZWlnaHQ6IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCwgc2VlZE9mZnNldDogXCJteSBzZWNyZXQgb2Zmc2V0IVwifSk7XG4gICAgICAgICAgbGV0IGUyID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBNb25lcm9VdGlscy52YWxpZGF0ZU1uZW1vbmljKGF3YWl0IHdhbGxldC5nZXRTZWVkKCkpO1xuICAgICAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkKCksIFRlc3RVdGlscy5TRUVEKTtcbiAgICAgICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlQWRkcmVzcyhhd2FpdCB3YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgVGVzdFV0aWxzLk5FVFdPUktfVFlQRSk7XG4gICAgICAgICAgICBhc3NlcnQubm90RXF1YWwoYXdhaXQgd2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIFRlc3RVdGlscy5BRERSRVNTKTtcbiAgICAgICAgICAgIGlmICghKHdhbGxldCBpbnN0YW5jZW9mIE1vbmVyb1dhbGxldFJwYykpIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZExhbmd1YWdlKCksIE1vbmVyb1dhbGxldC5ERUZBVUxUX0xBTkdVQUdFKTsgIC8vIFRPRE8gbW9uZXJvLXdhbGxldC1ycGM6IHN1cHBvcnRcbiAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIGUyID0gZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgICAgIGlmIChlMiAhPT0gdW5kZWZpbmVkKSB0aHJvdyBlMjtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgZTEgPSBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZTEgIT09IHVuZGVmaW5lZCkgdGhyb3cgZTE7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGNyZWF0ZSBhIHdhbGxldCBmcm9tIGtleXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBlMSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzYXZlIGZvciBjb21wYXJpc29uXG4gICAgICAgICAgbGV0IHByaW1hcnlBZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKTtcbiAgICAgICAgICBsZXQgcHJpdmF0ZVZpZXdLZXkgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQcml2YXRlVmlld0tleSgpO1xuICAgICAgICAgIGxldCBwcml2YXRlU3BlbmRLZXkgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQcml2YXRlU3BlbmRLZXkoKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyByZWNyZWF0ZSB0ZXN0IHdhbGxldCBmcm9tIGtleXNcbiAgICAgICAgICBsZXQgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3ByaW1hcnlBZGRyZXNzOiBwcmltYXJ5QWRkcmVzcywgcHJpdmF0ZVZpZXdLZXk6IHByaXZhdGVWaWV3S2V5LCBwcml2YXRlU3BlbmRLZXk6IHByaXZhdGVTcGVuZEtleSwgcmVzdG9yZUhlaWdodDogYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCl9KTtcbiAgICAgICAgICBsZXQgcGF0aDsgdHJ5IHsgcGF0aCA9IGF3YWl0IHdhbGxldC5nZXRQYXRoKCk7IH0gY2F0Y2ggKGU6IGFueSkgeyB9IC8vIFRPRE86IGZhY3RvciBvdXQga2V5cy1vbmx5IHRlc3RzP1xuICAgICAgICAgIGxldCBlMiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBwcmltYXJ5QWRkcmVzcyk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFByaXZhdGVWaWV3S2V5KCksIHByaXZhdGVWaWV3S2V5KTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UHJpdmF0ZVNwZW5kS2V5KCksIHByaXZhdGVTcGVuZEtleSk7XG4gICAgICAgICAgICBpZiAoISh3YWxsZXQgaW5zdGFuY2VvZiBNb25lcm9XYWxsZXRLZXlzKSAmJiAhYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSkgY29uc29sZS5sb2coXCJXQVJOSU5HOiB3YWxsZXQgY3JlYXRlZCBmcm9tIGtleXMgaXMgbm90IGNvbm5lY3RlZCB0byBhdXRoZW50aWNhdGVkIGRhZW1vblwiKTsgIC8vIFRPRE8gbW9uZXJvLXByb2plY3Q6IGtleXMgd2FsbGV0cyBub3QgY29ubmVjdGVkXG4gICAgICAgICAgICBpZiAoISh3YWxsZXQgaW5zdGFuY2VvZiBNb25lcm9XYWxsZXRScGMpKSB7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZCgpLCBUZXN0VXRpbHMuU0VFRCk7IC8vIFRPRE8gbW9uZXJvLXdhbGxldC1ycGM6IGNhbm5vdCBnZXQgbW5lbW9uaWMgZnJvbSB3YWxsZXQgY3JlYXRlZCBmcm9tIGtleXM/XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0U2VlZExhbmd1YWdlKCksIE1vbmVyb1dhbGxldC5ERUZBVUxUX0xBTkdVQUdFKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIGUyID0gZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgICAgIGlmIChlMiAhPT0gdW5kZWZpbmVkKSB0aHJvdyBlMjtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyByZWNyZWF0ZSB0ZXN0IHdhbGxldCBmcm9tIHNwZW5kIGtleVxuICAgICAgICAgIGlmICghKHdhbGxldCBpbnN0YW5jZW9mIE1vbmVyb1dhbGxldFJwYykpIHsgLy8gVE9ETyBtb25lcm8td2FsbGV0LXJwYzogY2Fubm90IGNyZWF0ZSB3YWxsZXQgZnJvbSBzcGVuZCBrZXk/XG4gICAgICAgICAgICB3YWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7cHJpdmF0ZVNwZW5kS2V5OiBwcml2YXRlU3BlbmRLZXksIHJlc3RvcmVIZWlnaHQ6IGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpfSk7XG4gICAgICAgICAgICB0cnkgeyBwYXRoID0gYXdhaXQgd2FsbGV0LmdldFBhdGgoKTsgfSBjYXRjaCAoZTogYW55KSB7IH0gLy8gVE9ETzogZmFjdG9yIG91dCBrZXlzLW9ubHkgdGVzdHM/XG4gICAgICAgICAgICBlMiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgcHJpbWFyeUFkZHJlc3MpO1xuICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFByaXZhdGVWaWV3S2V5KCksIHByaXZhdGVWaWV3S2V5KTtcbiAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRQcml2YXRlU3BlbmRLZXkoKSwgcHJpdmF0ZVNwZW5kS2V5KTtcbiAgICAgICAgICAgICAgaWYgKCEod2FsbGV0IGluc3RhbmNlb2YgTW9uZXJvV2FsbGV0S2V5cykgJiYgIWF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpIGNvbnNvbGUubG9nKFwiV0FSTklORzogd2FsbGV0IGNyZWF0ZWQgZnJvbSBrZXlzIGlzIG5vdCBjb25uZWN0ZWQgdG8gYXV0aGVudGljYXRlZCBkYWVtb25cIik7IC8vIFRPRE8gbW9uZXJvLXByb2plY3Q6IGtleXMgd2FsbGV0cyBub3QgY29ubmVjdGVkXG4gICAgICAgICAgICAgIGlmICghKHdhbGxldCBpbnN0YW5jZW9mIE1vbmVyb1dhbGxldFJwYykpIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldFNlZWQoKSwgVGVzdFV0aWxzLlNFRUQpOyAvLyBUT0RPIG1vbmVyby13YWxsZXQtcnBjOiBjYW5ub3QgZ2V0IHNlZWQgZnJvbSB3YWxsZXQgY3JlYXRlZCBmcm9tIGtleXM/XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRTZWVkTGFuZ3VhZ2UoKSwgTW9uZXJvV2FsbGV0LkRFRkFVTFRfTEFOR1VBR0UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgZTIgPSBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgICAgICAgaWYgKGUyICE9PSB1bmRlZmluZWQpIHRocm93IGUyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBhdHRlbXB0IHRvIGNyZWF0ZSB3YWxsZXQgYXQgc2FtZSBwYXRoXG4gICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KHtwYXRoOiBwYXRofSk7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBlcnJvclwiKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5tZXNzYWdlLCBcIldhbGxldCBhbHJlYWR5IGV4aXN0czogXCIgKyBwYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGUxID0gZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGUxICE9PSB1bmRlZmluZWQpIHRocm93IGUxO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZWxheXMpXG4gICAgICBpdChcIkNhbiBjcmVhdGUgd2FsbGV0cyB3aXRoIHN1YmFkZHJlc3MgbG9va2FoZWFkXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICBsZXQgcmVjZWl2ZXI6IE1vbmVyb1dhbGxldCB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBjcmVhdGUgd2FsbGV0IHdpdGggaGlnaCBzdWJhZGRyZXNzIGxvb2thaGVhZFxuICAgICAgICAgIHJlY2VpdmVyID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe1xuICAgICAgICAgICAgYWNjb3VudExvb2thaGVhZDogMSxcbiAgICAgICAgICAgIHN1YmFkZHJlc3NMb29rYWhlYWQ6IDEwMDAwMFxuICAgICAgICAgIH0pO1xuICAgICAgICAgXG4gICAgICAgICAgLy8gdHJhbnNmZXIgZnVuZHMgdG8gc3ViYWRkcmVzcyB3aXRoIGhpZ2ggaW5kZXhcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5jcmVhdGVUeChuZXcgTW9uZXJvVHhDb25maWcoKVxuICAgICAgICAgICAgICAgICAgLnNldEFjY291bnRJbmRleCgwKVxuICAgICAgICAgICAgICAgICAgLmFkZERlc3RpbmF0aW9uKChhd2FpdCByZWNlaXZlci5nZXRTdWJhZGRyZXNzKDAsIDg1MDAwKSkuZ2V0QWRkcmVzcygpLCBUZXN0VXRpbHMuTUFYX0ZFRSlcbiAgICAgICAgICAgICAgICAgIC5zZXRSZWxheSh0cnVlKSk7XG4gICAgICAgICBcbiAgICAgICAgICAvLyBvYnNlcnZlIHVuY29uZmlybWVkIGZ1bmRzXG4gICAgICAgICAgYXdhaXQgR2VuVXRpbHMud2FpdEZvcigxMDAwKTtcbiAgICAgICAgICBhd2FpdCByZWNlaXZlci5zeW5jKCk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHJlY2VpdmVyLmdldEJhbGFuY2UoKSA+IDBuKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gY2xvc2Ugd2FsbGV0IGFuZCB0aHJvdyBpZiBlcnJvciBvY2N1cnJlZFxuICAgICAgICBpZiAocmVjZWl2ZXIpIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQocmVjZWl2ZXIpO1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCB0aGUgd2FsbGV0J3MgdmVyc2lvblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IHZlcnNpb24gPSBhd2FpdCB0aGF0LndhbGxldC5nZXRWZXJzaW9uKCk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgdmVyc2lvbi5nZXROdW1iZXIoKSwgXCJudW1iZXJcIik7XG4gICAgICAgIGFzc2VydCh2ZXJzaW9uLmdldE51bWJlcigpID4gMCk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgdmVyc2lvbi5nZXRJc1JlbGVhc2UoKSwgXCJib29sZWFuXCIpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdGhlIHdhbGxldCdzIHBhdGhcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGUgcmFuZG9tIHdhbGxldFxuICAgICAgICBsZXQgd2FsbGV0ID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHNldCBhIHJhbmRvbSBhdHRyaWJ1dGVcbiAgICAgICAgbGV0IHV1aWQgPSBHZW5VdGlscy5nZXRVVUlEKCk7XG4gICAgICAgIGF3YWl0IHdhbGxldC5zZXRBdHRyaWJ1dGUoXCJ1dWlkXCIsIHV1aWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmVjb3JkIHRoZSB3YWxsZXQncyBwYXRoIHRoZW4gc2F2ZSBhbmQgY2xvc2VcbiAgICAgICAgbGV0IHBhdGggPSBhd2FpdCB3YWxsZXQuZ2V0UGF0aCgpO1xuICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHdhbGxldCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyByZS1vcGVuIHRoZSB3YWxsZXQgdXNpbmcgaXRzIHBhdGhcbiAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5vcGVuV2FsbGV0KHtwYXRoOiBwYXRofSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHRoZSBhdHRyaWJ1dGVcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRBdHRyaWJ1dGUoXCJ1dWlkXCIpLCB1dWlkKTtcbiAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBzZXQgdGhlIGRhZW1vbiBjb25uZWN0aW9uXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICBsZXQgd2FsbGV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGNyZWF0ZSByYW5kb20gd2FsbGV0IHdpdGggZGVmYXVsdCBkYWVtb24gY29ubmVjdGlvblxuICAgICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KCk7XG4gICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpLCBuZXcgTW9uZXJvUnBjQ29ubmVjdGlvbihUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSwgdHJ1ZSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc2V0IGVtcHR5IHNlcnZlciB1cmlcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2V0RGFlbW9uQ29ubmVjdGlvbihcIlwiKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSwgZmFsc2UpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHNldCBvZmZsaW5lIHNlcnZlciB1cmlcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2V0RGFlbW9uQ29ubmVjdGlvbihUZXN0VXRpbHMuT0ZGTElORV9TRVJWRVJfVVJJKTtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCksIG5ldyBNb25lcm9ScGNDb25uZWN0aW9uKFRlc3RVdGlscy5PRkZMSU5FX1NFUlZFUl9VUkkpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSwgZmFsc2UpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHNldCBkYWVtb24gd2l0aCB3cm9uZyBjcmVkZW50aWFsc1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zZXREYWVtb25Db25uZWN0aW9uKHt1cmk6IFRlc3RVdGlscy5EQUVNT05fUlBDX0NPTkZJRy51cmksIHVzZXJuYW1lOiBcIndyb25ndXNlclwiLCBwYXNzd29yZDogXCJ3cm9uZ3Bhc3NcIn0pO1xuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldENvbmZpZygpLCBuZXcgTW9uZXJvUnBjQ29ubmVjdGlvbihUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcudXJpLCBcIndyb25ndXNlclwiLCBcIndyb25ncGFzc1wiKS5nZXRDb25maWcoKSk7XG4gICAgICAgICAgaWYgKCFUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcudXNlcm5hbWUpIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuaXNDb25uZWN0ZWRUb0RhZW1vbigpLCB0cnVlKTsgLy8gVE9ETzogbW9uZXJvZCB3aXRob3V0IGF1dGhlbnRpY2F0aW9uIHdvcmtzIHdpdGggYmFkIGNyZWRlbnRpYWxzP1xuICAgICAgICAgIGVsc2UgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCksIGZhbHNlKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzZXQgZGFlbW9uIHdpdGggYXV0aGVudGljYXRpb25cbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2V0RGFlbW9uQ29ubmVjdGlvbihUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcpO1xuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSwgbmV3IE1vbmVyb1JwY0Nvbm5lY3Rpb24oVGVzdFV0aWxzLkRBRU1PTl9SUENfQ09ORklHLnVyaSwgVGVzdFV0aWxzLkRBRU1PTl9SUENfQ09ORklHLnVzZXJuYW1lLCBUZXN0VXRpbHMuREFFTU9OX1JQQ19DT05GSUcucGFzc3dvcmQpKTtcbiAgICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gbnVsbGlmeSBkYWVtb24gY29ubmVjdGlvblxuICAgICAgICAgIGF3YWl0IHdhbGxldC5zZXREYWVtb25Db25uZWN0aW9uKHVuZGVmaW5lZCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgYXdhaXQgd2FsbGV0LnNldERhZW1vbkNvbm5lY3Rpb24oVGVzdFV0aWxzLkRBRU1PTl9SUENfQ09ORklHLnVyaSk7XG4gICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0Q29uZmlnKCksIG5ldyBNb25lcm9ScGNDb25uZWN0aW9uKFRlc3RVdGlscy5EQUVNT05fUlBDX0NPTkZJRy51cmkpLmdldENvbmZpZygpKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2V0RGFlbW9uQ29ubmVjdGlvbih1bmRlZmluZWQpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpLCB1bmRlZmluZWQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHNldCBkYWVtb24gdXJpIHRvIG5vbi1kYWVtb25cbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2V0RGFlbW9uQ29ubmVjdGlvbihcInd3dy5nZXRtb25lcm8ub3JnXCIpO1xuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldENvbmZpZygpLCBuZXcgTW9uZXJvUnBjQ29ubmVjdGlvbihcInd3dy5nZXRtb25lcm8ub3JnXCIpLmdldENvbmZpZygpKTtcbiAgICAgICAgICBhc3NlcnQoIWF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHNldCBkYWVtb24gdG8gaW52YWxpZCB1cmlcbiAgICAgICAgICBhd2FpdCB3YWxsZXQuc2V0RGFlbW9uQ29ubmVjdGlvbihcImFiYzEyM1wiKTtcbiAgICAgICAgICBhc3NlcnQoIWF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGF0dGVtcHQgdG8gc3luY1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB3YWxsZXQuc3luYygpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhjZXB0aW9uIGV4cGVjdGVkXCIpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUxOiBhbnkpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChlMS5tZXNzYWdlLCBcIldhbGxldCBpcyBub3QgY29ubmVjdGVkIHRvIGRhZW1vblwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGVyciA9IGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGNsb3NlIHdhbGxldCBhbmQgdGhyb3cgaWYgZXJyb3Igb2NjdXJyZWRcbiAgICAgICAgaWYgKHdhbGxldCkgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHVzZSBhIGNvbm5lY3Rpb24gbWFuYWdlclwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGVycjtcbiAgICAgICAgbGV0IHdhbGxldDogTW9uZXJvV2FsbGV0IHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgICB0cnkge1xuXG4gICAgICAgICAgLy8gY3JlYXRlIGNvbm5lY3Rpb24gbWFuYWdlciB3aXRoIG1vbmVyb2QgY29ubmVjdGlvbnNcbiAgICAgICAgICBsZXQgY29ubmVjdGlvbk1hbmFnZXIgPSBuZXcgTW9uZXJvQ29ubmVjdGlvbk1hbmFnZXIoKTtcbiAgICAgICAgICBsZXQgY29ubmVjdGlvbjEgPSBuZXcgTW9uZXJvUnBjQ29ubmVjdGlvbihhd2FpdCB0aGF0LmRhZW1vbi5nZXRScGNDb25uZWN0aW9uKCkpLnNldFByaW9yaXR5KDEpO1xuICAgICAgICAgIGxldCBjb25uZWN0aW9uMiA9IG5ldyBNb25lcm9ScGNDb25uZWN0aW9uKFwibG9jYWxob3N0OjQ4MDgxXCIpLnNldFByaW9yaXR5KDIpO1xuICAgICAgICAgIGF3YWl0IGNvbm5lY3Rpb25NYW5hZ2VyLnNldENvbm5lY3Rpb24oY29ubmVjdGlvbjEpO1xuICAgICAgICAgIGF3YWl0IGNvbm5lY3Rpb25NYW5hZ2VyLmFkZENvbm5lY3Rpb24oY29ubmVjdGlvbjIpO1xuXG4gICAgICAgICAgLy8gY3JlYXRlIHdhbGxldCB3aXRoIGNvbm5lY3Rpb24gbWFuYWdlclxuICAgICAgICAgIHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KG5ldyBNb25lcm9XYWxsZXRDb25maWcoKS5zZXRTZXJ2ZXIoXCJcIikuc2V0Q29ubmVjdGlvbk1hbmFnZXIoY29ubmVjdGlvbk1hbmFnZXIpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldFVyaSgpLCAoYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpKS5nZXRVcmkoKSk7XG4gICAgICAgICAgYXNzZXJ0KGF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuXG4gICAgICAgICAgLy8gc2V0IG1hbmFnZXIncyBjb25uZWN0aW9uXG4gICAgICAgICAgYXdhaXQgY29ubmVjdGlvbk1hbmFnZXIuc2V0Q29ubmVjdGlvbihjb25uZWN0aW9uMik7XG4gICAgICAgICAgYXdhaXQgR2VuVXRpbHMud2FpdEZvcihUZXN0VXRpbHMuQVVUT19DT05ORUNUX1RJTUVPVVRfTVMpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0VXJpKCksIGNvbm5lY3Rpb24yLmdldFVyaSgpKTtcblxuICAgICAgICAgIC8vIHJlb3BlbiB3YWxsZXQgd2l0aCBjb25uZWN0aW9uIG1hbmFnZXJcbiAgICAgICAgICBsZXQgcGF0aCA9IGF3YWl0IHdhbGxldC5nZXRQYXRoKCk7XG4gICAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgICAgIHdhbGxldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB3YWxsZXQgPSBhd2FpdCB0aGF0Lm9wZW5XYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpLnNldFNlcnZlcihcIlwiKS5zZXRDb25uZWN0aW9uTWFuYWdlcihjb25uZWN0aW9uTWFuYWdlcikuc2V0UGF0aChwYXRoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpKS5nZXRVcmkoKSwgY29ubmVjdGlvbjIuZ2V0VXJpKCkpO1xuXG4gICAgICAgICAgLy8gZGlzY29ubmVjdFxuICAgICAgICAgIGF3YWl0IGNvbm5lY3Rpb25NYW5hZ2VyLnNldENvbm5lY3Rpb24odW5kZWZpbmVkKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICBhc3NlcnQoIWF3YWl0IHdhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuXG4gICAgICAgICAgLy8gc3RhcnQgcG9sbGluZyBjb25uZWN0aW9uc1xuICAgICAgICAgIGNvbm5lY3Rpb25NYW5hZ2VyLnN0YXJ0UG9sbGluZyhUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMpO1xuXG4gICAgICAgICAgLy8gdGVzdCB0aGF0IHdhbGxldCBhdXRvIGNvbm5lY3RzXG4gICAgICAgICAgYXdhaXQgR2VuVXRpbHMud2FpdEZvcihUZXN0VXRpbHMuQVVUT19DT05ORUNUX1RJTUVPVVRfTVMpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0VXJpKCksIGNvbm5lY3Rpb24xLmdldFVyaSgpKTtcbiAgICAgICAgICBhc3NlcnQoYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG5cbiAgICAgICAgICAvLyB0ZXN0IG92ZXJyaWRlIHdpdGggYmFkIGNvbm5lY3Rpb25cbiAgICAgICAgICB3YWxsZXQuYWRkTGlzdGVuZXIobmV3IE1vbmVyb1dhbGxldExpc3RlbmVyKCkpO1xuICAgICAgICAgIGNvbm5lY3Rpb25NYW5hZ2VyLnNldEF1dG9Td2l0Y2goZmFsc2UpO1xuICAgICAgICAgIGF3YWl0IGNvbm5lY3Rpb25NYW5hZ2VyLnNldENvbm5lY3Rpb24oXCJodHRwOi8vZm9vLmJhci54eXpcIik7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB3YWxsZXQuZ2V0RGFlbW9uQ29ubmVjdGlvbigpKS5nZXRVcmkoKSwgXCJodHRwOi8vZm9vLmJhci54eXpcIik7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGZhbHNlLCBhd2FpdCB3YWxsZXQuaXNDb25uZWN0ZWRUb0RhZW1vbigpKTtcbiAgICAgICAgICBhd2FpdCBHZW5VdGlscy53YWl0Rm9yKDUwMDApO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChmYWxzZSwgYXdhaXQgd2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG5cbiAgICAgICAgICAvLyBzZXQgdG8gYW5vdGhlciBjb25uZWN0aW9uIG1hbmFnZXJcbiAgICAgICAgICBsZXQgY29ubmVjdGlvbk1hbmFnZXIyID0gbmV3IE1vbmVyb0Nvbm5lY3Rpb25NYW5hZ2VyKCk7XG4gICAgICAgICAgYXdhaXQgY29ubmVjdGlvbk1hbmFnZXIyLnNldENvbm5lY3Rpb24oY29ubmVjdGlvbjIpO1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5zZXRDb25uZWN0aW9uTWFuYWdlcihjb25uZWN0aW9uTWFuYWdlcjIpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgd2FsbGV0LmdldERhZW1vbkNvbm5lY3Rpb24oKSkuZ2V0VXJpKCksIGNvbm5lY3Rpb24yLmdldFVyaSgpKTtcblxuICAgICAgICAgIC8vIHVuc2V0IGNvbm5lY3Rpb24gbWFuYWdlclxuICAgICAgICAgIGF3YWl0IHdhbGxldC5zZXRDb25uZWN0aW9uTWFuYWdlcigpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB3YWxsZXQuZ2V0Q29ubmVjdGlvbk1hbmFnZXIoKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHdhbGxldC5nZXREYWVtb25Db25uZWN0aW9uKCkpLmdldFVyaSgpLCBjb25uZWN0aW9uMi5nZXRVcmkoKSk7XG5cbiAgICAgICAgICAvLyBzdG9wIHBvbGxpbmcgYW5kIGNsb3NlXG4gICAgICAgICAgY29ubmVjdGlvbk1hbmFnZXIuc3RvcFBvbGxpbmcoKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gY2xvc2Ugd2FsbGV0IGFuZCB0aHJvdyBpZiBlcnJvciBvY2N1cnJlZFxuICAgICAgICBpZiAod2FsbGV0KSBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHdhbGxldCk7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRoZSBzZWVkIGFzIGEgbW5lbW9uaWMgcGhyYXNlXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgbW5lbW9uaWMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRTZWVkKCk7XG4gICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlTW5lbW9uaWMobW5lbW9uaWMpO1xuICAgICAgICBhc3NlcnQuZXF1YWwobW5lbW9uaWMsIFRlc3RVdGlscy5TRUVEKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRoZSBsYW5ndWFnZSBvZiB0aGUgc2VlZFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGxhbmd1YWdlID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0U2VlZExhbmd1YWdlKCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChsYW5ndWFnZSwgXCJFbmdsaXNoXCIpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYSBsaXN0IG9mIHN1cHBvcnRlZCBsYW5ndWFnZXMgZm9yIHRoZSBzZWVkXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgbGFuZ3VhZ2VzID0gYXdhaXQgdGhhdC5nZXRTZWVkTGFuZ3VhZ2VzKCk7XG4gICAgICAgIGFzc2VydChBcnJheS5pc0FycmF5KGxhbmd1YWdlcykpO1xuICAgICAgICBhc3NlcnQobGFuZ3VhZ2VzLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGxhbmd1YWdlIG9mIGxhbmd1YWdlcykgYXNzZXJ0KGxhbmd1YWdlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRoZSBwcml2YXRlIHZpZXcga2V5XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgcHJpdmF0ZVZpZXdLZXkgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQcml2YXRlVmlld0tleSgpXG4gICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlUHJpdmF0ZVZpZXdLZXkocHJpdmF0ZVZpZXdLZXkpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdGhlIHByaXZhdGUgc3BlbmQga2V5XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgcHJpdmF0ZVNwZW5kS2V5ID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpdmF0ZVNwZW5kS2V5KClcbiAgICAgICAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVQcml2YXRlU3BlbmRLZXkocHJpdmF0ZVNwZW5kS2V5KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRoZSBwdWJsaWMgdmlldyBrZXlcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBwdWJsaWNWaWV3S2V5ID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHVibGljVmlld0tleSgpXG4gICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlUHVibGljVmlld0tleShwdWJsaWNWaWV3S2V5KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRoZSBwdWJsaWMgc3BlbmQga2V5XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgcHVibGljU3BlbmRLZXkgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQdWJsaWNTcGVuZEtleSgpXG4gICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlUHVibGljU3BlbmRLZXkocHVibGljU3BlbmRLZXkpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdGhlIHByaW1hcnkgYWRkcmVzc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IHByaW1hcnlBZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKTtcbiAgICAgICAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVBZGRyZXNzKHByaW1hcnlBZGRyZXNzLCBUZXN0VXRpbHMuTkVUV09SS19UWVBFKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHByaW1hcnlBZGRyZXNzLCBhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzKDAsIDApKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRoZSBhZGRyZXNzIG9mIGEgc3ViYWRkcmVzcyBhdCBhIHNwZWNpZmllZCBhY2NvdW50IGFuZCBzdWJhZGRyZXNzIGluZGV4XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3MoMCwgMCkpLmdldEFkZHJlc3MoKSwgYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSk7XG4gICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSkpIHtcbiAgICAgICAgICBmb3IgKGxldCBzdWJhZGRyZXNzIG9mIGFjY291bnQuZ2V0U3ViYWRkcmVzc2VzKCkpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzKGFjY291bnQuZ2V0SW5kZXgoKSwgc3ViYWRkcmVzcy5nZXRJbmRleCgpKSwgc3ViYWRkcmVzcy5nZXRBZGRyZXNzKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYWRkcmVzc2VzIG91dCBvZiByYW5nZSBvZiB1c2VkIGFjY291bnRzIGFuZCBzdWJhZGRyZXNzZXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRoYXQudGVzdEdldFN1YmFkZHJlc3NBZGRyZXNzT3V0T2ZSYW5nZSgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdGhlIGFjY291bnQgYW5kIHN1YmFkZHJlc3MgaW5kaWNlcyBvZiBhbiBhZGRyZXNzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGxhc3Qgc3ViYWRkcmVzcyB0byB0ZXN0XG4gICAgICAgIGxldCBhY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKHRydWUpO1xuICAgICAgICBsZXQgYWNjb3VudElkeCA9IGFjY291bnRzLmxlbmd0aCAtIDE7XG4gICAgICAgIGxldCBzdWJhZGRyZXNzSWR4ID0gYWNjb3VudHNbYWNjb3VudElkeF0uZ2V0U3ViYWRkcmVzc2VzKCkubGVuZ3RoIC0gMTtcbiAgICAgICAgbGV0IGFkZHJlc3MgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzKGFjY291bnRJZHgsIHN1YmFkZHJlc3NJZHgpO1xuICAgICAgICBhc3NlcnQoYWRkcmVzcyk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgYWRkcmVzcywgXCJzdHJpbmdcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgYWRkcmVzcyBpbmRleFxuICAgICAgICBsZXQgc3ViYWRkcmVzcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFkZHJlc3NJbmRleChhZGRyZXNzKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHN1YmFkZHJlc3MuZ2V0QWNjb3VudEluZGV4KCksIGFjY291bnRJZHgpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoc3ViYWRkcmVzcy5nZXRJbmRleCgpLCBzdWJhZGRyZXNzSWR4KTtcblxuICAgICAgICAvLyB0ZXN0IHZhbGlkIGJ1dCB1bmZvdW5kIGFkZHJlc3NcbiAgICAgICAgbGV0IG5vbldhbGxldEFkZHJlc3MgPSBhd2FpdCBUZXN0VXRpbHMuZ2V0RXh0ZXJuYWxXYWxsZXRBZGRyZXNzKCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc3ViYWRkcmVzcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFkZHJlc3NJbmRleChub25XYWxsZXRBZGRyZXNzKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmYWlsXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5tZXNzYWdlLCBcIkFkZHJlc3MgZG9lc24ndCBiZWxvbmcgdG8gdGhlIHdhbGxldFwiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBpbnZhbGlkIGFkZHJlc3NcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzdWJhZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWRkcmVzc0luZGV4KFwidGhpcyBpcyBkZWZpbml0ZWx5IG5vdCBhbiBhZGRyZXNzXCIpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImZhaWxcIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChlLm1lc3NhZ2UsIFwiSW52YWxpZCBhZGRyZXNzXCIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBhbiBpbnRlZ3JhdGVkIGFkZHJlc3MgZ2l2ZW4gYSBwYXltZW50IGlkXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gc2F2ZSBhZGRyZXNzIGZvciBsYXRlciBjb21wYXJpc29uXG4gICAgICAgIGxldCBhZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdmFsaWQgcGF5bWVudCBpZFxuICAgICAgICBsZXQgcGF5bWVudElkID0gXCIwMzI4NGU0MWMzNDJmMDM2XCI7XG4gICAgICAgIGxldCBpbnRlZ3JhdGVkQWRkcmVzcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEludGVncmF0ZWRBZGRyZXNzKHVuZGVmaW5lZCwgcGF5bWVudElkKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVncmF0ZWRBZGRyZXNzLmdldFN0YW5kYXJkQWRkcmVzcygpLCBhZGRyZXNzKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVncmF0ZWRBZGRyZXNzLmdldFBheW1lbnRJZCgpLCBwYXltZW50SWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB1bmRlZmluZWQgcGF5bWVudCBpZCB3aGljaCBnZW5lcmF0ZXMgYSBuZXcgb25lXG4gICAgICAgIGludGVncmF0ZWRBZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0SW50ZWdyYXRlZEFkZHJlc3MoKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGludGVncmF0ZWRBZGRyZXNzLmdldFN0YW5kYXJkQWRkcmVzcygpLCBhZGRyZXNzKTtcbiAgICAgICAgYXNzZXJ0KGludGVncmF0ZWRBZGRyZXNzLmdldFBheW1lbnRJZCgpLmxlbmd0aCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHdpdGggcHJpbWFyeSBhZGRyZXNzXG4gICAgICAgIGxldCBwcmltYXJ5QWRkcmVzcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCk7XG4gICAgICAgIGludGVncmF0ZWRBZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0SW50ZWdyYXRlZEFkZHJlc3MocHJpbWFyeUFkZHJlc3MsIHBheW1lbnRJZCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChpbnRlZ3JhdGVkQWRkcmVzcy5nZXRTdGFuZGFyZEFkZHJlc3MoKSwgcHJpbWFyeUFkZHJlc3MpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoaW50ZWdyYXRlZEFkZHJlc3MuZ2V0UGF5bWVudElkKCksIHBheW1lbnRJZCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHdpdGggc3ViYWRkcmVzc1xuICAgICAgICBpZiAoKGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3NlcygwKSkubGVuZ3RoIDwgMikgYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlU3ViYWRkcmVzcygwKTtcbiAgICAgICAgbGV0IHN1YmFkZHJlc3MgPSAoYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzcygwLCAxKSkuZ2V0QWRkcmVzcygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGludGVncmF0ZWRBZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0SW50ZWdyYXRlZEFkZHJlc3Moc3ViYWRkcmVzcyk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR2V0dGluZyBpbnRlZ3JhdGVkIGFkZHJlc3MgZnJvbSBzdWJhZGRyZXNzIHNob3VsZCBoYXZlIGZhaWxlZFwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJTdWJhZGRyZXNzIHNob3VsZG4ndCBiZSB1c2VkXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGludmFsaWQgcGF5bWVudCBpZFxuICAgICAgICBsZXQgaW52YWxpZFBheW1lbnRJZCA9IFwiaW52YWxpZF9wYXltZW50X2lkXzEyMzQ1NlwiO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGludGVncmF0ZWRBZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0SW50ZWdyYXRlZEFkZHJlc3ModW5kZWZpbmVkLCBpbnZhbGlkUGF5bWVudElkKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHZXR0aW5nIGludGVncmF0ZWQgYWRkcmVzcyB3aXRoIGludmFsaWQgcGF5bWVudCBpZCBcIiArIGludmFsaWRQYXltZW50SWQgKyBcIiBzaG91bGQgaGF2ZSB0aHJvd24gYSBSUEMgZXhjZXB0aW9uXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAvL2Fzc2VydC5lcXVhbChlLmdldENvZGUoKSwgLTUpOyAgLy8gVE9ETzogZXJyb3IgY29kZXMgcGFydCBvZiBycGMgb25seT9cbiAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5tZXNzYWdlLCBcIkludmFsaWQgcGF5bWVudCBJRDogXCIgKyBpbnZhbGlkUGF5bWVudElkKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBkZWNvZGUgYW4gaW50ZWdyYXRlZCBhZGRyZXNzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgaW50ZWdyYXRlZEFkZHJlc3MgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRJbnRlZ3JhdGVkQWRkcmVzcyh1bmRlZmluZWQsIFwiMDMyODRlNDFjMzQyZjAzNlwiKTtcbiAgICAgICAgbGV0IGRlY29kZWRBZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZGVjb2RlSW50ZWdyYXRlZEFkZHJlc3MoaW50ZWdyYXRlZEFkZHJlc3MudG9TdHJpbmcoKSk7XG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoZGVjb2RlZEFkZHJlc3MsIGludGVncmF0ZWRBZGRyZXNzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGRlY29kZSBpbnZhbGlkIGFkZHJlc3NcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhhd2FpdCB0aGF0LndhbGxldC5kZWNvZGVJbnRlZ3JhdGVkQWRkcmVzcyhcImJhZCBhZGRyZXNzXCIpKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSBmYWlsZWQgZGVjb2RpbmcgYmFkIGFkZHJlc3NcIik7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGVyci5tZXNzYWdlLCBcIkludmFsaWQgYWRkcmVzc1wiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIFRPRE86IHRlc3Qgc3luY2luZyBmcm9tIHN0YXJ0IGhlaWdodFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHN5bmMgKHdpdGhvdXQgcHJvZ3Jlc3MpXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgbnVtQmxvY2tzID0gMTAwO1xuICAgICAgICBsZXQgY2hhaW5IZWlnaHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKTtcbiAgICAgICAgYXNzZXJ0KGNoYWluSGVpZ2h0ID49IG51bUJsb2Nrcyk7XG4gICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGF0LndhbGxldC5zeW5jKGNoYWluSGVpZ2h0IC0gbnVtQmxvY2tzKTsgIC8vIHN5bmMgdG8gZW5kIG9mIGNoYWluXG4gICAgICAgIGFzc2VydChyZXN1bHQgaW5zdGFuY2VvZiBNb25lcm9TeW5jUmVzdWx0KTtcbiAgICAgICAgYXNzZXJ0KHJlc3VsdC5nZXROdW1CbG9ja3NGZXRjaGVkKCkgPj0gMCk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVzdWx0LmdldFJlY2VpdmVkTW9uZXkoKSwgXCJib29sZWFuXCIpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdGhlIGN1cnJlbnQgaGVpZ2h0IHRoYXQgdGhlIHdhbGxldCBpcyBzeW5jaHJvbml6ZWQgdG9cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBoZWlnaHQgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRIZWlnaHQoKTtcbiAgICAgICAgYXNzZXJ0KGhlaWdodCA+PSAwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGEgYmxvY2tjaGFpbiBoZWlnaHQgYnkgZGF0ZVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNvbGxlY3QgZGF0ZXMgdG8gdGVzdCBzdGFydGluZyAxMDAgZGF5cyBhZ29cbiAgICAgICAgY29uc3QgREFZX01TID0gMjQgKiA2MCAqIDYwICogMTAwMDtcbiAgICAgICAgbGV0IHllc3RlcmRheSA9IG5ldyBEYXRlKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gREFZX01TKTsgLy8gVE9ETyBtb25lcm8tcHJvamVjdDogdG9kYXkncyBkYXRlIGNhbiB0aHJvdyBleGNlcHRpb24gYXMgXCJpbiBmdXR1cmVcIiBzbyB3ZSB0ZXN0IHVwIHRvIHllc3RlcmRheVxuICAgICAgICBsZXQgZGF0ZXM6IGFueSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gOTk7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgZGF0ZXMucHVzaChuZXcgRGF0ZSh5ZXN0ZXJkYXkuZ2V0VGltZSgpIC0gREFZX01TICogaSkpOyAvLyBzdWJ0cmFjdCBpIGRheXNcbiAgICAgICAgfVxuICAgIFxuICAgICAgICAvLyB0ZXN0IGhlaWdodHMgYnkgZGF0ZVxuICAgICAgICBsZXQgbGFzdEhlaWdodDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgICAgICBmb3IgKGxldCBkYXRlIG9mIGRhdGVzKSB7XG4gICAgICAgICAgbGV0IGhlaWdodCA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEhlaWdodEJ5RGF0ZShkYXRlLmdldFllYXIoKSArIDE5MDAsIGRhdGUuZ2V0TW9udGgoKSArIDEsIGRhdGUuZ2V0RGF0ZSgpKTtcbiAgICAgICAgICBhc3NlcnQoaGVpZ2h0ID49IDApO1xuICAgICAgICAgIGlmIChsYXN0SGVpZ2h0ICE9IHVuZGVmaW5lZCkgYXNzZXJ0KGhlaWdodCA+PSBsYXN0SGVpZ2h0KTtcbiAgICAgICAgICBsYXN0SGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGFzc2VydChsYXN0SGVpZ2h0ISA+PSAwKTtcbiAgICAgICAgbGV0IGhlaWdodCA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEhlaWdodCgpO1xuICAgICAgICBhc3NlcnQoaGVpZ2h0ID49IDApO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBmdXR1cmUgZGF0ZVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCB0b21vcnJvdyA9IG5ldyBEYXRlKHllc3RlcmRheS5nZXRUaW1lKCkgKyBEQVlfTVMgKiAyKTtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5nZXRIZWlnaHRCeURhdGUodG9tb3Jyb3cuZ2V0RnVsbFllYXIoKSwgdG9tb3Jyb3cuZ2V0TW9udGgoKSArIDEsIHRvbW9ycm93LmdldERhdGUoKSk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgZXhjZXB0aW9uIG9uIGZ1dHVyZSBkYXRlXCIpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChlcnIubWVzc2FnZSwgXCJzcGVjaWZpZWQgZGF0ZSBpcyBpbiB0aGUgZnV0dXJlXCIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCB0aGUgbG9ja2VkIGFuZCB1bmxvY2tlZCBiYWxhbmNlcyBvZiB0aGUgd2FsbGV0LCBhY2NvdW50cywgYW5kIHN1YmFkZHJlc3Nlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIGFjY291bnRzIHdpdGggYWxsIGluZm8gYXMgcmVmZXJlbmNlXG4gICAgICAgIGxldCBhY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB0aGF0IGJhbGFuY2VzIGFkZCB1cCBiZXR3ZWVuIGFjY291bnRzIGFuZCB3YWxsZXRcbiAgICAgICAgbGV0IGFjY291bnRzQmFsYW5jZSA9IEJpZ0ludCgwKTtcbiAgICAgICAgbGV0IGFjY291bnRzVW5sb2NrZWRCYWxhbmNlID0gQmlnSW50KDApO1xuICAgICAgICBmb3IgKGxldCBhY2NvdW50IG9mIGFjY291bnRzKSB7XG4gICAgICAgICAgYWNjb3VudHNCYWxhbmNlID0gYWNjb3VudHNCYWxhbmNlICsgKGFjY291bnQuZ2V0QmFsYW5jZSgpKTtcbiAgICAgICAgICBhY2NvdW50c1VubG9ja2VkQmFsYW5jZSA9IGFjY291bnRzVW5sb2NrZWRCYWxhbmNlICsgKGFjY291bnQuZ2V0VW5sb2NrZWRCYWxhbmNlKCkpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgdGhhdCBiYWxhbmNlcyBhZGQgdXAgYmV0d2VlbiBzdWJhZGRyZXNzZXMgYW5kIGFjY291bnRzXG4gICAgICAgICAgbGV0IHN1YmFkZHJlc3Nlc0JhbGFuY2UgPSBCaWdJbnQoMCk7XG4gICAgICAgICAgbGV0IHN1YmFkZHJlc3Nlc1VubG9ja2VkQmFsYW5jZSA9IEJpZ0ludCgwKTtcbiAgICAgICAgICBmb3IgKGxldCBzdWJhZGRyZXNzIG9mIGFjY291bnQuZ2V0U3ViYWRkcmVzc2VzKCkpIHtcbiAgICAgICAgICAgIHN1YmFkZHJlc3Nlc0JhbGFuY2UgPSBzdWJhZGRyZXNzZXNCYWxhbmNlICsgKHN1YmFkZHJlc3MuZ2V0QmFsYW5jZSgpKTtcbiAgICAgICAgICAgIHN1YmFkZHJlc3Nlc1VubG9ja2VkQmFsYW5jZSA9IHN1YmFkZHJlc3Nlc1VubG9ja2VkQmFsYW5jZSArIChzdWJhZGRyZXNzLmdldFVubG9ja2VkQmFsYW5jZSgpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdGVzdCB0aGF0IGJhbGFuY2VzIGFyZSBjb25zaXN0ZW50IHdpdGggZ2V0QWNjb3VudHMoKSBjYWxsXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldEJhbGFuY2Uoc3ViYWRkcmVzcy5nZXRBY2NvdW50SW5kZXgoKSwgc3ViYWRkcmVzcy5nZXRJbmRleCgpKSkudG9TdHJpbmcoKSwgc3ViYWRkcmVzcy5nZXRCYWxhbmNlKCkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldFVubG9ja2VkQmFsYW5jZShzdWJhZGRyZXNzLmdldEFjY291bnRJbmRleCgpLCBzdWJhZGRyZXNzLmdldEluZGV4KCkpKS50b1N0cmluZygpLCBzdWJhZGRyZXNzLmdldFVubG9ja2VkQmFsYW5jZSgpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldEJhbGFuY2UoYWNjb3VudC5nZXRJbmRleCgpKSkudG9TdHJpbmcoKSwgc3ViYWRkcmVzc2VzQmFsYW5jZS50b1N0cmluZygpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldFVubG9ja2VkQmFsYW5jZShhY2NvdW50LmdldEluZGV4KCkpKS50b1N0cmluZygpLCBzdWJhZGRyZXNzZXNVbmxvY2tlZEJhbGFuY2UudG9TdHJpbmcoKSk7XG4gICAgICAgIH1cbiAgICAgICAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChhY2NvdW50c0JhbGFuY2UpO1xuICAgICAgICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGFjY291bnRzVW5sb2NrZWRCYWxhbmNlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB0aGF0LndhbGxldC5nZXRCYWxhbmNlKCkpLnRvU3RyaW5nKCksIGFjY291bnRzQmFsYW5jZS50b1N0cmluZygpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB0aGF0LndhbGxldC5nZXRVbmxvY2tlZEJhbGFuY2UoKSkudG9TdHJpbmcoKSwgYWNjb3VudHNVbmxvY2tlZEJhbGFuY2UudG9TdHJpbmcoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGludmFsaWQgaW5wdXRcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5nZXRCYWxhbmNlKHVuZGVmaW5lZCwgMCk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgZmFpbGVkXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQubm90RXF1YWwoZS5tZXNzYWdlLCBcIlNob3VsZCBoYXZlIGZhaWxlZFwiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYWNjb3VudHMgd2l0aG91dCBzdWJhZGRyZXNzZXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBhY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKCk7XG4gICAgICAgIGFzc2VydChhY2NvdW50cy5sZW5ndGggPiAwKTtcbiAgICAgICAgYWNjb3VudHMubWFwKGFzeW5jIChhY2NvdW50KSA9PiB7XG4gICAgICAgICAgYXdhaXQgdGVzdEFjY291bnQoYWNjb3VudClcbiAgICAgICAgICBhc3NlcnQoYWNjb3VudC5nZXRTdWJhZGRyZXNzZXMoKSA9PT0gdW5kZWZpbmVkKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBhY2NvdW50cyB3aXRoIHN1YmFkZHJlc3Nlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGFjY291bnRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSk7XG4gICAgICAgIGFzc2VydChhY2NvdW50cy5sZW5ndGggPiAwKTtcbiAgICAgICAgYWNjb3VudHMubWFwKGFzeW5jIChhY2NvdW50KSA9PiB7XG4gICAgICAgICAgYXdhaXQgdGVzdEFjY291bnQoYWNjb3VudCk7XG4gICAgICAgICAgYXNzZXJ0KGFjY291bnQuZ2V0U3ViYWRkcmVzc2VzKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYW4gYWNjb3VudCBhdCBhIHNwZWNpZmllZCBpbmRleFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGFjY291bnRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHMoKTtcbiAgICAgICAgYXNzZXJ0KGFjY291bnRzLmxlbmd0aCA+IDApO1xuICAgICAgICBmb3IgKGxldCBhY2NvdW50IG9mIGFjY291bnRzKSB7XG4gICAgICAgICAgYXdhaXQgdGVzdEFjY291bnQoYWNjb3VudCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCB3aXRob3V0IHN1YmFkZHJlc3Nlc1xuICAgICAgICAgIGxldCByZXRyaWV2ZWQgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50KGFjY291bnQuZ2V0SW5kZXgoKSk7XG4gICAgICAgICAgYXNzZXJ0KHJldHJpZXZlZC5nZXRTdWJhZGRyZXNzZXMoKSA9PT0gdW5kZWZpbmVkKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IHdpdGggc3ViYWRkcmVzc2VzXG4gICAgICAgICAgcmV0cmlldmVkID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudChhY2NvdW50LmdldEluZGV4KCksIHRydWUpO1xuICAgICAgICAgIGFzc2VydChyZXRyaWV2ZWQuZ2V0U3ViYWRkcmVzc2VzKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gY3JlYXRlIGEgbmV3IGFjY291bnQgd2l0aG91dCBhIGxhYmVsXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgYWNjb3VudHNCZWZvcmUgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cygpO1xuICAgICAgICBsZXQgY3JlYXRlZEFjY291bnQgPSBhd2FpdCB0aGF0LndhbGxldC5jcmVhdGVBY2NvdW50KCk7XG4gICAgICAgIGF3YWl0IHRlc3RBY2NvdW50KGNyZWF0ZWRBY2NvdW50KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cygpKS5sZW5ndGggLSAxLCBhY2NvdW50c0JlZm9yZS5sZW5ndGgpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBjcmVhdGUgYSBuZXcgYWNjb3VudCB3aXRoIGEgbGFiZWxcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGUgYWNjb3VudCB3aXRoIGxhYmVsXG4gICAgICAgIGxldCBhY2NvdW50c0JlZm9yZSA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKCk7XG4gICAgICAgIGxldCBsYWJlbCA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgbGV0IGNyZWF0ZWRBY2NvdW50ID0gYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlQWNjb3VudChsYWJlbCk7XG4gICAgICAgIGF3YWl0IHRlc3RBY2NvdW50KGNyZWF0ZWRBY2NvdW50KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cygpKS5sZW5ndGggLSAxLCBhY2NvdW50c0JlZm9yZS5sZW5ndGgpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3MoY3JlYXRlZEFjY291bnQuZ2V0SW5kZXgoKSwgMCkpLmdldExhYmVsKCksIGxhYmVsKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIGFuZCB0ZXN0IGFjY291bnRcbiAgICAgICAgY3JlYXRlZEFjY291bnQgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50KGNyZWF0ZWRBY2NvdW50LmdldEluZGV4KCkpO1xuICAgICAgICBhd2FpdCB0ZXN0QWNjb3VudChjcmVhdGVkQWNjb3VudCk7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGUgYWNjb3VudCB3aXRoIHNhbWUgbGFiZWxcbiAgICAgICAgY3JlYXRlZEFjY291bnQgPSBhd2FpdCB0aGF0LndhbGxldC5jcmVhdGVBY2NvdW50KGxhYmVsKTtcbiAgICAgICAgYXdhaXQgdGVzdEFjY291bnQoY3JlYXRlZEFjY291bnQpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKCkpLmxlbmd0aCAtIDIsIGFjY291bnRzQmVmb3JlLmxlbmd0aCk7XG4gICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzcyhjcmVhdGVkQWNjb3VudC5nZXRJbmRleCgpLCAwKSkuZ2V0TGFiZWwoKSwgbGFiZWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggYW5kIHRlc3QgYWNjb3VudFxuICAgICAgICBjcmVhdGVkQWNjb3VudCA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnQoY3JlYXRlZEFjY291bnQuZ2V0SW5kZXgoKSk7XG4gICAgICAgIGF3YWl0IHRlc3RBY2NvdW50KGNyZWF0ZWRBY2NvdW50KTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc2V0IGFjY291bnQgbGFiZWxzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8vIGNyZWF0ZSBhY2NvdW50XG4gICAgICAgIGlmICgoYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHMoKSkubGVuZ3RoIDwgMikgYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlQWNjb3VudCgpO1xuXG4gICAgICAgIC8vIHNldCBhY2NvdW50IGxhYmVsXG4gICAgICAgIGNvbnN0IGxhYmVsID0gR2VuVXRpbHMuZ2V0VVVJRCgpO1xuICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5zZXRBY2NvdW50TGFiZWwoMSwgbGFiZWwpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3MoMSwgMCkpLmdldExhYmVsKCksIGxhYmVsKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHN1YmFkZHJlc3NlcyBhdCBhIHNwZWNpZmllZCBhY2NvdW50IGluZGV4XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgYWNjb3VudHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cygpO1xuICAgICAgICBhc3NlcnQoYWNjb3VudHMubGVuZ3RoID4gMCk7XG4gICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgYWNjb3VudHMpIHtcbiAgICAgICAgICBsZXQgc3ViYWRkcmVzc2VzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzc2VzKGFjY291bnQuZ2V0SW5kZXgoKSk7XG4gICAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3Nlcy5sZW5ndGggPiAwKTtcbiAgICAgICAgICBzdWJhZGRyZXNzZXMubWFwKHN1YmFkZHJlc3MgPT4ge1xuICAgICAgICAgICAgdGVzdFN1YmFkZHJlc3Moc3ViYWRkcmVzcyk7XG4gICAgICAgICAgICBhc3NlcnQoYWNjb3VudC5nZXRJbmRleCgpID09PSBzdWJhZGRyZXNzLmdldEFjY291bnRJbmRleCgpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgc3ViYWRkcmVzc2VzIGF0IHNwZWNpZmllZCBhY2NvdW50IGFuZCBzdWJhZGRyZXNzIGluZGljZXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBhY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKCk7XG4gICAgICAgIGFzc2VydChhY2NvdW50cy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgYWNjb3VudCBvZiBhY2NvdW50cykge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGdldCBzdWJhZGRyZXNzZXNcbiAgICAgICAgICBsZXQgc3ViYWRkcmVzc2VzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzc2VzKGFjY291bnQuZ2V0SW5kZXgoKSk7XG4gICAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3Nlcy5sZW5ndGggPiAwKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyByZW1vdmUgYSBzdWJhZGRyZXNzIGZvciBxdWVyeSBpZiBwb3NzaWJsZVxuICAgICAgICAgIGlmIChzdWJhZGRyZXNzZXMubGVuZ3RoID4gMSkgc3ViYWRkcmVzc2VzLnNwbGljZSgwLCAxKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBnZXQgc3ViYWRkcmVzcyBpbmRpY2VzXG4gICAgICAgICAgbGV0IHN1YmFkZHJlc3NJbmRpY2VzID0gc3ViYWRkcmVzc2VzLm1hcChzdWJhZGRyZXNzID0+IHN1YmFkZHJlc3MuZ2V0SW5kZXgoKSk7XG4gICAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3NJbmRpY2VzLmxlbmd0aCA+IDApO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGZldGNoIHN1YmFkZHJlc3NlcyBieSBpbmRpY2VzXG4gICAgICAgICAgbGV0IGZldGNoZWRTdWJhZGRyZXNzZXMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzZXMoYWNjb3VudC5nZXRJbmRleCgpLCBzdWJhZGRyZXNzSW5kaWNlcyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gb3JpZ2luYWwgc3ViYWRkcmVzc2VzIChtaW51cyBvbmUgcmVtb3ZlZCBpZiBhcHBsaWNhYmxlKSBpcyBlcXVhbCB0byBmZXRjaGVkIHN1YmFkZHJlc3Nlc1xuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoZmV0Y2hlZFN1YmFkZHJlc3Nlcywgc3ViYWRkcmVzc2VzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYSBzdWJhZGRyZXNzIGF0IGEgc3BlY2lmaWVkIGFjY291bnQgYW5kIHN1YmFkZHJlc3MgaW5kZXhcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBhY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKCk7XG4gICAgICAgIGFzc2VydChhY2NvdW50cy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgYWNjb3VudCBvZiBhY2NvdW50cykge1xuICAgICAgICAgIGxldCBzdWJhZGRyZXNzZXMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzZXMoYWNjb3VudC5nZXRJbmRleCgpKTtcbiAgICAgICAgICBhc3NlcnQoc3ViYWRkcmVzc2VzLmxlbmd0aCA+IDApO1xuICAgICAgICAgIGZvciAobGV0IHN1YmFkZHJlc3Mgb2Ygc3ViYWRkcmVzc2VzKSB7XG4gICAgICAgICAgICB0ZXN0U3ViYWRkcmVzcyhzdWJhZGRyZXNzKTtcbiAgICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzcyhhY2NvdW50LmdldEluZGV4KCksIHN1YmFkZHJlc3MuZ2V0SW5kZXgoKSksIHN1YmFkZHJlc3MpO1xuICAgICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbCgoYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzc2VzKGFjY291bnQuZ2V0SW5kZXgoKSwgW3N1YmFkZHJlc3MuZ2V0SW5kZXgoKV0pKVswXSwgc3ViYWRkcmVzcyk7IC8vIHRlc3QgcGx1cmFsIGNhbGwgd2l0aCBzaW5nbGUgc3ViYWRkciBudW1iZXJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gY3JlYXRlIGEgc3ViYWRkcmVzcyB3aXRoIGFuZCB3aXRob3V0IGEgbGFiZWxcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGUgc3ViYWRkcmVzc2VzIGFjcm9zcyBhY2NvdW50c1xuICAgICAgICBsZXQgYWNjb3VudHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cygpO1xuICAgICAgICBpZiAoYWNjb3VudHMubGVuZ3RoIDwgMikgYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlQWNjb3VudCgpO1xuICAgICAgICBhY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKCk7XG4gICAgICAgIGFzc2VydChhY2NvdW50cy5sZW5ndGggPiAxKTtcbiAgICAgICAgZm9yIChsZXQgYWNjb3VudElkeCA9IDA7IGFjY291bnRJZHggPCAyOyBhY2NvdW50SWR4KyspIHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBjcmVhdGUgc3ViYWRkcmVzcyB3aXRoIG5vIGxhYmVsXG4gICAgICAgICAgbGV0IHN1YmFkZHJlc3NlcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3NlcyhhY2NvdW50SWR4KTtcbiAgICAgICAgICBsZXQgc3ViYWRkcmVzcyA9IGF3YWl0IHRoYXQud2FsbGV0LmNyZWF0ZVN1YmFkZHJlc3MoYWNjb3VudElkeCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHN1YmFkZHJlc3MuZ2V0TGFiZWwoKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICB0ZXN0U3ViYWRkcmVzcyhzdWJhZGRyZXNzKTtcbiAgICAgICAgICBsZXQgc3ViYWRkcmVzc2VzTmV3ID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzc2VzKGFjY291bnRJZHgpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChzdWJhZGRyZXNzZXNOZXcubGVuZ3RoIC0gMSwgc3ViYWRkcmVzc2VzLmxlbmd0aCk7XG4gICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChzdWJhZGRyZXNzZXNOZXdbc3ViYWRkcmVzc2VzTmV3Lmxlbmd0aCAtIDFdLnRvU3RyaW5nKCksIHN1YmFkZHJlc3MudG9TdHJpbmcoKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY3JlYXRlIHN1YmFkZHJlc3Mgd2l0aCBsYWJlbFxuICAgICAgICAgIHN1YmFkZHJlc3NlcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3NlcyhhY2NvdW50SWR4KTtcbiAgICAgICAgICBsZXQgdXVpZCA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgICBzdWJhZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlU3ViYWRkcmVzcyhhY2NvdW50SWR4LCB1dWlkKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodXVpZCwgc3ViYWRkcmVzcy5nZXRMYWJlbCgpKTtcbiAgICAgICAgICB0ZXN0U3ViYWRkcmVzcyhzdWJhZGRyZXNzKTtcbiAgICAgICAgICBzdWJhZGRyZXNzZXNOZXcgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzZXMoYWNjb3VudElkeCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHN1YmFkZHJlc3Nlc05ldy5sZW5ndGggLSAxLCBzdWJhZGRyZXNzZXMubGVuZ3RoKTtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKHN1YmFkZHJlc3Nlc05ld1tzdWJhZGRyZXNzZXNOZXcubGVuZ3RoIC0gMV0udG9TdHJpbmcoKSwgc3ViYWRkcmVzcy50b1N0cmluZygpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBzZXQgc3ViYWRkcmVzcyBsYWJlbHNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLy8gY3JlYXRlIHN1YmFkZHJlc3Nlc1xuICAgICAgICB3aGlsZSAoKGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3NlcygwKSkubGVuZ3RoIDwgMykgYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlU3ViYWRkcmVzcygwKTtcblxuICAgICAgICAvLyBzZXQgc3ViYWRkcmVzcyBsYWJlbHNcbiAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzc0lkeCA9IDA7IHN1YmFkZHJlc3NJZHggPCAoYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzc2VzKDApKS5sZW5ndGg7IHN1YmFkZHJlc3NJZHgrKykge1xuICAgICAgICAgIGNvbnN0IGxhYmVsID0gR2VuVXRpbHMuZ2V0VVVJRCgpO1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnNldFN1YmFkZHJlc3NMYWJlbCgwLCBzdWJhZGRyZXNzSWR4LCBsYWJlbCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzKDAsIHN1YmFkZHJlc3NJZHgpKS5nZXRMYWJlbCgpLCBsYWJlbCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRyYW5zYWN0aW9ucyBpbiB0aGUgd2FsbGV0XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgbm9uRGVmYXVsdEluY29taW5nID0gZmFsc2U7XG4gICAgICAgIGxldCB0eHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICAgIGFzc2VydCh0eHMubGVuZ3RoID4gMCwgXCJXYWxsZXQgaGFzIG5vIHR4cyB0byB0ZXN0XCIpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHhzWzBdLmdldEhlaWdodCgpLCBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQsIFwiRmlyc3QgdHgncyByZXN0b3JlIGhlaWdodCBtdXN0IG1hdGNoIHRoZSByZXN0b3JlIGhlaWdodCBpbiBUZXN0VXRpbHNcIik7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGVhY2ggdHJhbmFzY3Rpb25cbiAgICAgICAgbGV0IGJsb2Nrc1BlckhlaWdodCA9IHt9O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHR4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGF3YWl0IHRoYXQudGVzdFR4V2FsbGV0KHR4c1tpXSwge3dhbGxldDogdGhhdC53YWxsZXR9KTtcbiAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldCh0eHNbaV0sIHt3YWxsZXQ6IHRoYXQud2FsbGV0fSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHR4c1tpXS50b1N0cmluZygpLCB0eHNbaV0udG9TdHJpbmcoKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCBtZXJnaW5nIGVxdWl2YWxlbnQgdHhzXG4gICAgICAgICAgbGV0IGNvcHkxID0gdHhzW2ldLmNvcHkoKTtcbiAgICAgICAgICBsZXQgY29weTIgPSB0eHNbaV0uY29weSgpO1xuICAgICAgICAgIGlmIChjb3B5MS5nZXRJc0NvbmZpcm1lZCgpKSBjb3B5MS5zZXRCbG9jayh0eHNbaV0uZ2V0QmxvY2soKS5jb3B5KCkuc2V0VHhzKFtjb3B5MV0pKTtcbiAgICAgICAgICBpZiAoY29weTIuZ2V0SXNDb25maXJtZWQoKSkgY29weTIuc2V0QmxvY2sodHhzW2ldLmdldEJsb2NrKCkuY29weSgpLnNldFR4cyhbY29weTJdKSk7XG4gICAgICAgICAgbGV0IG1lcmdlZCA9IGNvcHkxLm1lcmdlKGNvcHkyKTtcbiAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldChtZXJnZWQsIHt3YWxsZXQ6IHRoYXQud2FsbGV0fSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gZmluZCBub24tZGVmYXVsdCBpbmNvbWluZ1xuICAgICAgICAgIGlmICh0eHNbaV0uZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKSkge1xuICAgICAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgdHhzW2ldLmdldEluY29taW5nVHJhbnNmZXJzKCkpIHtcbiAgICAgICAgICAgICAgaWYgKHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpICE9PSAwICYmIHRyYW5zZmVyLmdldFN1YmFkZHJlc3NJbmRleCgpICE9PSAwKSBub25EZWZhdWx0SW5jb21pbmcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBlbnN1cmUgdW5pcXVlIGJsb2NrIHJlZmVyZW5jZSBwZXIgaGVpZ2h0XG4gICAgICAgICAgaWYgKHR4c1tpXS5nZXRJc0NvbmZpcm1lZCgpKSB7XG4gICAgICAgICAgICBsZXQgYmxvY2sgPSBibG9ja3NQZXJIZWlnaHRbdHhzW2ldLmdldEhlaWdodCgpXTtcbiAgICAgICAgICAgIGlmIChibG9jayA9PT0gdW5kZWZpbmVkKSBibG9ja3NQZXJIZWlnaHRbdHhzW2ldLmdldEhlaWdodCgpXSA9IHR4c1tpXS5nZXRCbG9jaygpO1xuICAgICAgICAgICAgZWxzZSBhc3NlcnQoYmxvY2sgPT09IHR4c1tpXS5nZXRCbG9jaygpLCBcIkJsb2NrIHJlZmVyZW5jZXMgZm9yIHNhbWUgaGVpZ2h0IG11c3QgYmUgc2FtZVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGVuc3VyZSBub24tZGVmYXVsdCBhY2NvdW50IGFuZCBzdWJhZGRyZXNzIHRlc3RlZFxuICAgICAgICBhc3NlcnQobm9uRGVmYXVsdEluY29taW5nLCBcIk5vIGluY29taW5nIHRyYW5zZmVycyBmb3VuZCB0byBub24tZGVmYXVsdCBhY2NvdW50IGFuZCBzdWJhZGRyZXNzOyBydW4gc2VuZC10by1tdWx0aXBsZSB0ZXN0cyBmaXJzdFwiKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRyYW5zYWN0aW9ucyBieSBoYXNoXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgbGV0IG1heE51bVR4cyA9IDEwOyAgLy8gbWF4IG51bWJlciBvZiB0eHMgdG8gdGVzdFxuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggYWxsIHR4cyBmb3IgdGVzdGluZ1xuICAgICAgICBsZXQgdHhzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKCk7XG4gICAgICAgIGFzc2VydCh0eHMubGVuZ3RoID4gMSwgXCJUZXN0IHJlcXVpcmVzIGF0IGxlYXN0IDIgdHhzIHRvIGZldGNoIGJ5IGhhc2hcIik7XG4gICAgICAgIFxuICAgICAgICAvLyByYW5kb21seSBwaWNrIGEgZmV3IGZvciBmZXRjaGluZyBieSBoYXNoXG4gICAgICAgIEdlblV0aWxzLnNodWZmbGUodHhzKTtcbiAgICAgICAgdHhzID0gdHhzLnNsaWNlKDAsIE1hdGgubWluKHR4cy5sZW5ndGgsIG1heE51bVR4cykpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBmZXRjaGluZyBieSBoYXNoXG4gICAgICAgIGxldCBmZXRjaGVkVHggPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeCh0eHNbMF0uZ2V0SGFzaCgpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGZldGNoZWRUeC5nZXRIYXNoKCksIHR4c1swXS5nZXRIYXNoKCkpO1xuICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldChmZXRjaGVkVHgpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBmZXRjaGluZyBieSBoYXNoZXNcbiAgICAgICAgbGV0IHR4SWQxID0gdHhzWzBdLmdldEhhc2goKTtcbiAgICAgICAgbGV0IHR4SWQyID0gdHhzWzFdLmdldEhhc2goKTtcbiAgICAgICAgbGV0IGZldGNoZWRUeHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeHMoW3R4SWQxLCB0eElkMl0pO1xuICAgICAgICBhc3NlcnQuZXF1YWwoMiwgZmV0Y2hlZFR4cy5sZW5ndGgpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBmZXRjaGluZyBieSBoYXNoZXMgYXMgY29sbGVjdGlvblxuICAgICAgICBsZXQgdHhIYXNoZXM6IGFueSA9IFtdO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHR4SGFzaGVzLnB1c2godHguZ2V0SGFzaCgpKTtcbiAgICAgICAgZmV0Y2hlZFR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyh0eEhhc2hlcyk7XG4gICAgICAgIGFzc2VydC5lcXVhbChmZXRjaGVkVHhzLmxlbmd0aCwgdHhzLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGZldGNoZWRUeHNbaV0uZ2V0SGFzaCgpLCB0eHNbaV0uZ2V0SGFzaCgpKTtcbiAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldChmZXRjaGVkVHhzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBmZXRjaGluZyB3aXRoIG1pc3NpbmcgdHggaGFzaGVzXG4gICAgICAgIGxldCBtaXNzaW5nVHhIYXNoID0gXCJkMDFlZGU5Y2RlODEzYjJhNjkzMDY5YjY0MGM0Yjk5YzVhZGJkYjQ5ZmJiZDhkYTJjMTZjODA4N2QwYzNlMzIwXCI7XG4gICAgICAgIHR4SGFzaGVzLnB1c2gobWlzc2luZ1R4SGFzaCk7XG4gICAgICAgIGZldGNoZWRUeHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeHModHhIYXNoZXMpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHhzLmxlbmd0aCwgZmV0Y2hlZFR4cy5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHR4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0eHNbaV0uZ2V0SGFzaCgpLCBmZXRjaGVkVHhzW2ldLmdldEhhc2goKSk7XG4gICAgICAgICAgYXdhaXQgdGhhdC50ZXN0VHhXYWxsZXQoZmV0Y2hlZFR4c1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzICYmICF0ZXN0Q29uZmlnLmxpdGVNb2RlKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRyYW5zYWN0aW9ucyB3aXRoIGFkZGl0aW9uYWwgY29uZmlndXJhdGlvblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCByYW5kb20gdHJhbnNhY3Rpb25zIGZvciB0ZXN0aW5nXG4gICAgICAgIGxldCByYW5kb21UeHMgPSBhd2FpdCBnZXRSYW5kb21UcmFuc2FjdGlvbnModGhhdC53YWxsZXQsIHVuZGVmaW5lZCwgMywgNSk7XG4gICAgICAgIGZvciAobGV0IHJhbmRvbVR4IG9mIHJhbmRvbVR4cykgYXdhaXQgdGhhdC50ZXN0VHhXYWxsZXQocmFuZG9tVHgpO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHRyYW5zYWN0aW9ucyBieSBoYXNoXG4gICAgICAgIGxldCB0eEhhc2hlczogYW55ID0gW107XG4gICAgICAgIGZvciAobGV0IHJhbmRvbVR4IG9mIHJhbmRvbVR4cykge1xuICAgICAgICAgIHR4SGFzaGVzLnB1c2gocmFuZG9tVHguZ2V0SGFzaCgpKTtcbiAgICAgICAgICBsZXQgdHhzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHhzKHRoYXQud2FsbGV0LCB7aGFzaDogcmFuZG9tVHguZ2V0SGFzaCgpfSwgdHJ1ZSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHR4cy5sZW5ndGgsIDEpO1xuICAgICAgICAgIGxldCBtZXJnZWQgPSB0eHNbMF0ubWVyZ2UocmFuZG9tVHguY29weSgpKTsgLy8gdHhzIGNoYW5nZSB3aXRoIGNoYWluIHNvIGNoZWNrIG1lcmdlYWJpbGl0eVxuICAgICAgICAgIGF3YWl0IHRoYXQudGVzdFR4V2FsbGV0KG1lcmdlZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0cmFuc2FjdGlvbnMgYnkgaGFzaGVzXG4gICAgICAgIGxldCB0eHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIHtoYXNoZXM6IHR4SGFzaGVzfSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eHMubGVuZ3RoLCByYW5kb21UeHMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSBhc3NlcnQodHhIYXNoZXMuaW5jbHVkZXModHguZ2V0SGFzaCgpKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdHJhbnNhY3Rpb25zIHdpdGggYW4gb3V0Z29pbmcgdHJhbnNmZXJcbiAgICAgICAgdHhzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHhzKHRoYXQud2FsbGV0LCB7aXNPdXRnb2luZzogdHJ1ZX0sIHRydWUpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBhc3NlcnQodHguZ2V0SXNPdXRnb2luZygpKTtcbiAgICAgICAgICBhc3NlcnQodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpIGluc3RhbmNlb2YgTW9uZXJvVHJhbnNmZXIpO1xuICAgICAgICAgIGF3YWl0IHRlc3RUcmFuc2Zlcih0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdHJhbnNhY3Rpb25zIHdpdGhvdXQgYW4gb3V0Z29pbmcgdHJhbnNmZXJcbiAgICAgICAgdHhzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHhzKHRoYXQud2FsbGV0LCB7aXNPdXRnb2luZzogZmFsc2V9LCB0cnVlKTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSBhc3NlcnQuZXF1YWwodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLCB1bmRlZmluZWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHRyYW5zYWN0aW9ucyB3aXRoIGluY29taW5nIHRyYW5zZmVyc1xuICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIHtpc0luY29taW5nOiB0cnVlfSwgdHJ1ZSk7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIGFzc2VydCh0eC5nZXRJbmNvbWluZ1RyYW5zZmVycygpLmxlbmd0aCA+IDApO1xuICAgICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHR4LmdldEluY29taW5nVHJhbnNmZXJzKCkpIGFzc2VydCh0cmFuc2ZlciBpbnN0YW5jZW9mIE1vbmVyb1RyYW5zZmVyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHRyYW5zYWN0aW9ucyB3aXRob3V0IGluY29taW5nIHRyYW5zZmVyc1xuICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIHtpc0luY29taW5nOiBmYWxzZX0sIHRydWUpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIGFzc2VydC5lcXVhbCh0eC5nZXRJbmNvbWluZ1RyYW5zZmVycygpLCB1bmRlZmluZWQpO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHRyYW5zYWN0aW9ucyBhc3NvY2lhdGVkIHdpdGggYW4gYWNjb3VudFxuICAgICAgICBsZXQgYWNjb3VudElkeCA9IDE7XG4gICAgICAgIHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyh7dHJhbnNmZXJRdWVyeToge2FjY291bnRJbmRleDogYWNjb3VudElkeH19KTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKSAmJiB0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0QWNjb3VudEluZGV4KCkgPT09IGFjY291bnRJZHgpIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBlbHNlIGlmICh0eC5nZXRJbmNvbWluZ1RyYW5zZmVycygpKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiB0eC5nZXRJbmNvbWluZ1RyYW5zZmVycygpKSB7XG4gICAgICAgICAgICAgIGlmICh0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKSA9PT0gYWNjb3VudElkeCkge1xuICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBhc3NlcnQoZm91bmQsIChcIlRyYW5zYWN0aW9uIGlzIG5vdCBhc3NvY2lhdGVkIHdpdGggYWNjb3VudCBcIiArIGFjY291bnRJZHggKyBcIjpcXG5cIiArIHR4LnRvU3RyaW5nKCkpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHRyYW5zYWN0aW9ucyB3aXRoIGluY29taW5nIHRyYW5zZmVycyB0byBhbiBhY2NvdW50XG4gICAgICAgIHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyh7dHJhbnNmZXJRdWVyeToge2lzSW5jb21pbmc6IHRydWUsIGFjY291bnRJbmRleDogYWNjb3VudElkeH19KTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgYXNzZXJ0KHR4LmdldEluY29taW5nVHJhbnNmZXJzKCkubGVuZ3RoID4gMCk7XG4gICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgdHguZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKSkge1xuICAgICAgICAgICAgaWYgKHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpID09PSBhY2NvdW50SWR4KSB7XG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFzc2VydChmb3VuZCwgXCJObyBpbmNvbWluZyB0cmFuc2ZlcnMgdG8gYWNjb3VudCBcIiArIGFjY291bnRJZHggKyBcIiBmb3VuZDpcXG5cIiArIHR4LnRvU3RyaW5nKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdHhzIHdpdGggbWFudWFsbHkgYnVpbHQgcXVlcnkgdGhhdCBhcmUgY29uZmlybWVkIGFuZCBoYXZlIGFuIG91dGdvaW5nIHRyYW5zZmVyIGZyb20gYWNjb3VudCAwXG4gICAgICAgIGxldCB0eFF1ZXJ5ID0gbmV3IE1vbmVyb1R4UXVlcnkoKTtcbiAgICAgICAgdHhRdWVyeS5zZXRJc0NvbmZpcm1lZCh0cnVlKTtcbiAgICAgICAgdHhRdWVyeS5zZXRUcmFuc2ZlclF1ZXJ5KG5ldyBNb25lcm9UcmFuc2ZlclF1ZXJ5KCkuc2V0QWNjb3VudEluZGV4KDApLnNldElzT3V0Z29pbmcodHJ1ZSkpO1xuICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIHR4UXVlcnksIHRydWUpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBpZiAoIXR4LmdldElzQ29uZmlybWVkKCkpIGNvbnNvbGUubG9nKHR4LnRvU3RyaW5nKCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJc0NvbmZpcm1lZCgpLCB0cnVlKTtcbiAgICAgICAgICBhc3NlcnQodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldEFjY291bnRJbmRleCgpLCAwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHR4cyB3aXRoIG91dGdvaW5nIHRyYW5zZmVycyB0aGF0IGhhdmUgZGVzdGluYXRpb25zIHRvIGFjY291bnQgMVxuICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIHt0cmFuc2ZlclF1ZXJ5OiB7aGFzRGVzdGluYXRpb25zOiB0cnVlLCBhY2NvdW50SW5kZXg6IDB9fSk7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkpO1xuICAgICAgICAgIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGluY2x1ZGUgb3V0cHV0cyB3aXRoIHRyYW5zYWN0aW9uc1xuICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIHtpbmNsdWRlT3V0cHV0czogdHJ1ZX0sIHRydWUpO1xuICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgaWYgKHR4LmdldE91dHB1dHMoKSkge1xuICAgICAgICAgICAgYXNzZXJ0KHR4LmdldE91dHB1dHMoKS5sZW5ndGggPiAwKTtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXNzZXJ0KHR4LmdldElzT3V0Z29pbmcoKSB8fCAodHguZ2V0SXNJbmNvbWluZygpICYmICF0eC5nZXRJc0NvbmZpcm1lZCgpKSk7IC8vIFRPRE86IG1vbmVyby13YWxsZXQtcnBjOiByZXR1cm4gb3V0cHV0cyBmb3IgdW5jb25maXJtZWQgdHhzXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFzc2VydChmb3VuZCwgXCJObyBvdXRwdXRzIGZvdW5kIGluIHR4c1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0eHMgd2l0aCBpbnB1dCBxdWVyeSAvLyBUT0RPOiBubyBpbnB1dHMgcmV0dXJuZWQgdG8gZmlsdGVyXG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdHhzIHdpdGggb3V0cHV0IHF1ZXJ5XG4gICAgICAgIGxldCBvdXRwdXRRdWVyeSA9IG5ldyBNb25lcm9PdXRwdXRRdWVyeSgpLnNldElzU3BlbnQoZmFsc2UpLnNldEFjY291bnRJbmRleCgxKS5zZXRTdWJhZGRyZXNzSW5kZXgoMik7XG4gICAgICAgIHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyhuZXcgTW9uZXJvVHhRdWVyeSgpLnNldE91dHB1dFF1ZXJ5KG91dHB1dFF1ZXJ5KSk7XG4gICAgICAgIGFzc2VydCh0eHMubGVuZ3RoID4gMCk7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIGFzc2VydCh0eC5nZXRPdXRwdXRzKCkubGVuZ3RoID4gMCk7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2YgdHguZ2V0T3V0cHV0c1dhbGxldCgpKSB7XG4gICAgICAgICAgICBpZiAob3V0cHV0LmdldElzU3BlbnQoKSA9PT0gZmFsc2UgJiYgb3V0cHV0LmdldEFjY291bnRJbmRleCgpID09PSAxICYmIG91dHB1dC5nZXRTdWJhZGRyZXNzSW5kZXgoKSA9PT0gMikge1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWZvdW5kKSB0aHJvdyBuZXcgRXJyb3IoXCJUeCBkb2VzIG5vdCBjb250YWluIHNwZWNpZmllZCBvdXRwdXRcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB1bmxvY2tlZCB0eHNcbiAgICAgICAgdHhzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0SXNMb2NrZWQoZmFsc2UpKTtcbiAgICAgICAgYXNzZXJ0KHR4cy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldElzTG9ja2VkKCksIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGNvbmZpcm1lZCB0cmFuc2FjdGlvbnMgc2VudCBmcm9tL3RvIHNhbWUgd2FsbGV0IHdpdGggYSB0cmFuc2ZlciB3aXRoIGRlc3RpbmF0aW9uc1xuICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeHMoe2lzSW5jb21pbmc6IHRydWUsIGlzT3V0Z29pbmc6IHRydWUsIGlzQ29uZmlybWVkOiB0cnVlLCBpbmNsdWRlT3V0cHV0czogdHJ1ZSwgdHJhbnNmZXJRdWVyeTogeyBoYXNEZXN0aW5hdGlvbnM6IHRydWUgfX0pO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBhc3NlcnQodHguZ2V0SXNJbmNvbWluZygpKTtcbiAgICAgICAgICBhc3NlcnQodHguZ2V0SXNPdXRnb2luZygpKTtcbiAgICAgICAgICBhc3NlcnQodHguZ2V0SXNDb25maXJtZWQoKSk7XG4gICAgICAgICAgYXNzZXJ0KHR4LmdldE91dHB1dHMoKS5sZW5ndGggPiAwKTtcbiAgICAgICAgICBhc3NlcnQubm90RXF1YWwodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLCB1bmRlZmluZWQpO1xuICAgICAgICAgIGFzc2VydC5ub3RFcXVhbCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgYXNzZXJ0KHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKS5sZW5ndGggPiAwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdHJhbnNhY3Rpb25zIGJ5IGhlaWdodFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBhbGwgY29uZmlybWVkIHR4cyBmb3IgdGVzdGluZ1xuICAgICAgICBsZXQgdHhzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHhzKHRoYXQud2FsbGV0LCBuZXcgTW9uZXJvVHhRdWVyeSgpLnNldElzQ29uZmlybWVkKHRydWUpKTtcbiAgICAgICAgYXNzZXJ0KHR4cy5sZW5ndGggPiAwLCBcIldhbGxldCBoYXMgbm8gY29uZmlybWVkIHR4czsgcnVuIHNlbmQgdGVzdHNcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBjb2xsZWN0IGFsbCB0eCBoZWlnaHRzXG4gICAgICAgIGxldCB0eEhlaWdodHM6IGFueSA9IFtdO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHR4SGVpZ2h0cy5wdXNoKHR4LmdldEhlaWdodCgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBoZWlnaHQgdGhhdCBtb3N0IHR4cyBvY2N1ciBhdFxuICAgICAgICBsZXQgaGVpZ2h0Q291bnRzID0gY291bnROdW1JbnN0YW5jZXModHhIZWlnaHRzKTtcbiAgICAgICAgbGV0IGhlaWdodE1vZGVzID0gZ2V0TW9kZXMoaGVpZ2h0Q291bnRzKTtcbiAgICAgICAgbGV0IG1vZGVIZWlnaHQgPSBoZWlnaHRNb2Rlcy52YWx1ZXMoKS5uZXh0KCkudmFsdWU7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCB0eHMgYXQgbW9kZSBoZWlnaHRcbiAgICAgICAgbGV0IG1vZGVUeHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0SGVpZ2h0KG1vZGVIZWlnaHQpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVUeHMubGVuZ3RoLCBoZWlnaHRDb3VudHMuZ2V0KG1vZGVIZWlnaHQpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIHR4cyBhdCBtb2RlIGhlaWdodCBieSByYW5nZVxuICAgICAgICBsZXQgbW9kZVR4c0J5UmFuZ2UgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0TWluSGVpZ2h0KG1vZGVIZWlnaHQpLnNldE1heEhlaWdodChtb2RlSGVpZ2h0KSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChtb2RlVHhzQnlSYW5nZS5sZW5ndGgsIG1vZGVUeHMubGVuZ3RoKTtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChtb2RlVHhzQnlSYW5nZSwgbW9kZVR4cyk7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCBhbGwgdHhzIGJ5IHJhbmdlXG4gICAgICAgIGxldCBmZXRjaGVkID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHhzKHRoYXQud2FsbGV0LCBuZXcgTW9uZXJvVHhRdWVyeSgpLnNldE1pbkhlaWdodCh0eHNbMF0uZ2V0SGVpZ2h0KCkpLnNldE1heEhlaWdodCh0eHNbdHhzLmxlbmd0aCAtIDFdLmdldEhlaWdodCgpKSk7XG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwodHhzLCBmZXRjaGVkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgc29tZSBmaWx0ZXJlZCBieSByYW5nZSAgLy8gVE9ETzogdGhlc2UgYXJlIHNlcGFyYXRlZCBpbiBKYXZhP1xuICAgICAgICB7XG4gICAgICAgICAgdHhzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKHtpc0NvbmZpcm1lZDogdHJ1ZX0pO1xuICAgICAgICAgIGFzc2VydCh0eHMubGVuZ3RoID4gMCwgXCJObyB0cmFuc2FjdGlvbnM7IHJ1biBzZW5kIHRvIG11bHRpcGxlIHRlc3RcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAvLyBnZXQgYW5kIHNvcnQgYmxvY2sgaGVpZ2h0cyBpbiBhc2NlbmRpbmcgb3JkZXJcbiAgICAgICAgICBsZXQgaGVpZ2h0czogYW55ID0gW107XG4gICAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgICBoZWlnaHRzLnB1c2godHguZ2V0QmxvY2soKS5nZXRIZWlnaHQoKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIEdlblV0aWxzLnNvcnQoaGVpZ2h0cyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gcGljayBtaW5pbXVtIGFuZCBtYXhpbXVtIGhlaWdodHMgZm9yIGZpbHRlcmluZ1xuICAgICAgICAgIGxldCBtaW5IZWlnaHQgPSAtMTtcbiAgICAgICAgICBsZXQgbWF4SGVpZ2h0ID0gLTE7XG4gICAgICAgICAgaWYgKGhlaWdodHMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgIG1pbkhlaWdodCA9IDA7XG4gICAgICAgICAgICBtYXhIZWlnaHQgPSBoZWlnaHRzWzBdIC0gMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWluSGVpZ2h0ID0gaGVpZ2h0c1swXSArIDE7XG4gICAgICAgICAgICBtYXhIZWlnaHQgPSBoZWlnaHRzW2hlaWdodHMubGVuZ3RoIC0gMV0gLSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBhc3NlcnQgc29tZSB0cmFuc2FjdGlvbnMgZmlsdGVyZWRcbiAgICAgICAgICBsZXQgdW5maWx0ZXJlZENvdW50ID0gdHhzLmxlbmd0aDtcbiAgICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUeHModGhhdC53YWxsZXQsIHttaW5IZWlnaHQ6IG1pbkhlaWdodCwgbWF4SGVpZ2h0OiBtYXhIZWlnaHR9LCB0cnVlKTtcbiAgICAgICAgICBhc3NlcnQodHhzLmxlbmd0aCA8IHVuZmlsdGVyZWRDb3VudCk7XG4gICAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgICBsZXQgaGVpZ2h0ID0gdHguZ2V0QmxvY2soKS5nZXRIZWlnaHQoKTtcbiAgICAgICAgICAgIGFzc2VydChoZWlnaHQgPj0gbWluSGVpZ2h0ICYmIGhlaWdodCA8PSBtYXhIZWlnaHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdHJhbnNhY3Rpb25zIGJ5IHBheW1lbnQgaWRzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHJhbmRvbSB0cmFuc2FjdGlvbnMgd2l0aCBwYXltZW50IGhhc2hlcyBmb3IgdGVzdGluZ1xuICAgICAgICBsZXQgcmFuZG9tVHhzID0gYXdhaXQgZ2V0UmFuZG9tVHJhbnNhY3Rpb25zKHRoYXQud2FsbGV0LCB7aGFzUGF5bWVudElkOiB0cnVlfSwgMiwgNSk7XG4gICAgICAgIGZvciAobGV0IHJhbmRvbVR4IG9mIHJhbmRvbVR4cykge1xuICAgICAgICAgIGFzc2VydChyYW5kb21UeC5nZXRQYXltZW50SWQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0cmFuc2FjdGlvbnMgYnkgcGF5bWVudCBpZFxuICAgICAgICBsZXQgcGF5bWVudElkcyA9IHJhbmRvbVR4cy5tYXAodHggPT4gdHguZ2V0UGF5bWVudElkKCkpO1xuICAgICAgICBhc3NlcnQocGF5bWVudElkcy5sZW5ndGggPiAxKTtcbiAgICAgICAgZm9yIChsZXQgcGF5bWVudElkIG9mIHBheW1lbnRJZHMpIHtcbiAgICAgICAgICBsZXQgdHhzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHhzKHRoYXQud2FsbGV0LCB7cGF5bWVudElkOiBwYXltZW50SWR9KTtcbiAgICAgICAgICBhc3NlcnQodHhzLmxlbmd0aCA+IDApO1xuICAgICAgICAgIGFzc2VydCh0eHNbMF0uZ2V0UGF5bWVudElkKCkpO1xuICAgICAgICAgIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlUGF5bWVudElkKHR4c1swXS5nZXRQYXltZW50SWQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0cmFuc2FjdGlvbnMgYnkgcGF5bWVudCBoYXNoZXNcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdFR4cyh0aGF0LndhbGxldCwge3BheW1lbnRJZHM6IHBheW1lbnRJZHN9KTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgYXNzZXJ0KHBheW1lbnRJZHMuaW5jbHVkZXModHguZ2V0UGF5bWVudElkKCkpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIlJldHVybnMgYWxsIGtub3duIGZpZWxkcyBvZiB0eHMgcmVnYXJkbGVzcyBvZiBmaWx0ZXJpbmdcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCB3YWxsZXQgdHhzXG4gICAgICAgIGxldCB0eHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeHMoe2lzQ29uZmlybWVkOiB0cnVlfSk7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGZpbmQgdHggc2VudCB0byBzYW1lIHdhbGxldCB3aXRoIGluY29taW5nIHRyYW5zZmVyIGluIGRpZmZlcmVudCBhY2NvdW50IHRoYW4gc3JjIGFjY291bnRcbiAgICAgICAgICBpZiAoIXR4LmdldE91dGdvaW5nVHJhbnNmZXIoKSB8fCAhdHguZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKSkgY29udGludWU7XG4gICAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgdHguZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKSkge1xuICAgICAgICAgICAgaWYgKHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpID09PSB0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0QWNjb3VudEluZGV4KCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBmZXRjaCB0eCB3aXRoIGZpbHRlcmluZ1xuICAgICAgICAgICAgbGV0IGZpbHRlcmVkVHhzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKHt0cmFuc2ZlclF1ZXJ5OiB7aXNJbmNvbWluZzogdHJ1ZSwgYWNjb3VudEluZGV4OiB0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKX19KTtcbiAgICAgICAgICAgIGxldCBmaWx0ZXJlZFR4ID0gRmlsdGVyLmFwcGx5KG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0SGFzaGVzKFt0eC5nZXRIYXNoKCldKSwgZmlsdGVyZWRUeHMpWzBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB0eHMgc2hvdWxkIGJlIHRoZSBzYW1lIChtZXJnZWFibGUpXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoZmlsdGVyZWRUeC5nZXRIYXNoKCksIHR4LmdldEhhc2goKSk7XG4gICAgICAgICAgICB0eC5tZXJnZShmaWx0ZXJlZFR4KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdGVzdCBpcyBkb25lXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGRpZCBub3QgZnVsbHkgZXhlY3V0ZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZXN0IHJlcXVpcmVzIHR4IHNlbnQgZnJvbS90byBkaWZmZXJlbnQgYWNjb3VudHMgb2Ygc2FtZSB3YWxsZXQgYnV0IG5vbmUgZm91bmQ7IHJ1biBzZW5kIHRlc3RzXCIpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgJiYgIXRlc3RDb25maWcubGl0ZU1vZGUpXG4gICAgICBpdChcIlZhbGlkYXRlcyBpbnB1dHMgd2hlbiBnZXR0aW5nIHRyYW5zYWN0aW9uc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIHJhbmRvbSB0eHMgZm9yIHRlc3RpbmdcbiAgICAgICAgbGV0IHJhbmRvbVR4cyA9IGF3YWl0IGdldFJhbmRvbVRyYW5zYWN0aW9ucyh0aGF0LndhbGxldCwgdW5kZWZpbmVkLCAzLCA1KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHZhbGlkLCBpbnZhbGlkLCBhbmQgdW5rbm93biB0eCBoYXNoZXMgZm9yIHRlc3RzXG4gICAgICAgIGxldCB0eEhhc2ggPSByYW5kb21UeHNbMF0uZ2V0SGFzaCgpO1xuICAgICAgICBsZXQgaW52YWxpZEhhc2ggPSBcImludmFsaWRfaWRcIjtcbiAgICAgICAgbGV0IHVua25vd25IYXNoMSA9IFwiNmM0OTgyZjI0OTllY2U4MGUxMGI2MjcwODNjNGY5Yjk5MmEwMDE1NWU5OGJjYmE3MmE5NTg4Y2NiOTFkMGE2MVwiO1xuICAgICAgICBsZXQgdW5rbm93bkhhc2gyID0gXCJmZjM5NzEwNGRkODc1ODgyZjVlN2M2NmU0Zjg1MmVlMTM0ZjhjZjQ1ZTIxZjBjNDA3NzdjOTE4OGJjOTJlOTQzXCI7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCB1bmtub3duIHR4IGhhc2hcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHRoYXQud2FsbGV0LmdldFR4KHVua25vd25IYXNoMSksIHVuZGVmaW5lZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCB1bmtub3duIHR4IGhhc2ggdXNpbmcgcXVlcnlcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyhuZXcgTW9uZXJvVHhRdWVyeSgpLnNldEhhc2godW5rbm93bkhhc2gxKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eHMubGVuZ3RoLCAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIHVua25vd24gdHggaGFzaCBpbiBjb2xsZWN0aW9uXG4gICAgICAgIHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyhbdHhIYXNoLCB1bmtub3duSGFzaDFdKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHR4cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHhzWzBdLmdldEhhc2goKSwgdHhIYXNoKTtcblxuICAgICAgICAvLyBmZXRjaCB1bmtub3duIHR4IGhhc2hlcyBpbiBjb2xsZWN0aW9uXG4gICAgICAgIHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyhbdHhIYXNoLCB1bmtub3duSGFzaDEsIHVua25vd25IYXNoMl0pO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHhzLmxlbmd0aCwgMSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eHNbMF0uZ2V0SGFzaCgpLCB0eEhhc2gpO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggaW52YWxpZCBoYXNoXG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB0aGF0LndhbGxldC5nZXRUeChpbnZhbGlkSGFzaCksIHVuZGVmaW5lZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCBpbnZhbGlkIGhhc2ggY29sbGVjdGlvblxuICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeHMoW3R4SGFzaCwgaW52YWxpZEhhc2hdKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHR4cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHhzWzBdLmdldEhhc2goKSwgdHhIYXNoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIGludmFsaWQgaGFzaGVzIGluIGNvbGxlY3Rpb25cbiAgICAgICAgdHhzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKFt0eEhhc2gsIGludmFsaWRIYXNoLCBcImludmFsaWRfaGFzaF8yXCJdKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHR4cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHhzWzBdLmdldEhhc2goKSwgdHhIYXNoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgY29sbGVjdGlvbiBvZiBpbnZhbGlkIGhhc2hlc1xuICAgICAgICB0eHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeHMobmV3IE1vbmVyb1R4UXVlcnkoKS5zZXRIYXNoZXMoW3R4SGFzaCwgaW52YWxpZEhhc2gsIFwiaW52YWxpZF9oYXNoXzJcIl0pKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKDEsIHR4cy5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIGF3YWl0IHRoYXQudGVzdFR4V2FsbGV0KHR4KTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRyYW5zZmVycyBpbiB0aGUgd2FsbGV0LCBhY2NvdW50cywgYW5kIHN1YmFkZHJlc3Nlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBhbGwgdHJhbnNmZXJzXG4gICAgICAgIGF3YWl0IHRoYXQuZ2V0QW5kVGVzdFRyYW5zZmVycyh0aGF0LndhbGxldCwgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0cmFuc2ZlcnMgYnkgYWNjb3VudCBpbmRleFxuICAgICAgICBsZXQgbm9uRGVmYXVsdEluY29taW5nID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSkpIHtcbiAgICAgICAgICBsZXQgYWNjb3VudFRyYW5zZmVycyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdFRyYW5zZmVycyh0aGF0LndhbGxldCwge2FjY291bnRJbmRleDogYWNjb3VudC5nZXRJbmRleCgpfSk7XG4gICAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgYWNjb3VudFRyYW5zZmVycykgYXNzZXJ0LmVxdWFsKHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpLCBhY2NvdW50LmdldEluZGV4KCkpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGdldCB0cmFuc2ZlcnMgYnkgc3ViYWRkcmVzcyBpbmRleFxuICAgICAgICAgIGxldCBzdWJhZGRyZXNzVHJhbnNmZXJzOiBNb25lcm9UcmFuc2ZlcltdID0gW107XG4gICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzcyBvZiBhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSB7XG4gICAgICAgICAgICBsZXQgdHJhbnNmZXJzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHJhbnNmZXJzKHRoYXQud2FsbGV0LCB7YWNjb3VudEluZGV4OiBzdWJhZGRyZXNzLmdldEFjY291bnRJbmRleCgpLCBzdWJhZGRyZXNzSW5kZXg6IHN1YmFkZHJlc3MuZ2V0SW5kZXgoKX0pO1xuICAgICAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgdHJhbnNmZXJzKSB7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAvLyB0ZXN0IGFjY291bnQgYW5kIHN1YmFkZHJlc3MgaW5kaWNlc1xuICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXIuZ2V0QWNjb3VudEluZGV4KCksIHN1YmFkZHJlc3MuZ2V0QWNjb3VudEluZGV4KCkpO1xuICAgICAgICAgICAgICBpZiAodHJhbnNmZXIuZ2V0SXNJbmNvbWluZygpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5UcmFuc2ZlciA9IHRyYW5zZmVyIGFzIE1vbmVyb0luY29taW5nVHJhbnNmZXI7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGluVHJhbnNmZXIuZ2V0U3ViYWRkcmVzc0luZGV4KCksIHN1YmFkZHJlc3MuZ2V0SW5kZXgoKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpICE9PSAwICYmIGluVHJhbnNmZXIuZ2V0U3ViYWRkcmVzc0luZGV4KCkgIT09IDApIG5vbkRlZmF1bHRJbmNvbWluZyA9IHRydWU7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3V0VHJhbnNmZXIgPSB0cmFuc2ZlciBhcyBNb25lcm9PdXRnb2luZ1RyYW5zZmVyO1xuICAgICAgICAgICAgICAgIGFzc2VydChvdXRUcmFuc2Zlci5nZXRTdWJhZGRyZXNzSW5kaWNlcygpLmluY2x1ZGVzKHN1YmFkZHJlc3MuZ2V0SW5kZXgoKSkpO1xuICAgICAgICAgICAgICAgIGlmIChvdXRUcmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgc3ViYWRkcklkeCBvZiBvdXRUcmFuc2Zlci5nZXRTdWJhZGRyZXNzSW5kaWNlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdWJhZGRySWR4ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgIG5vbkRlZmF1bHRJbmNvbWluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIGRvbid0IGFkZCBkdXBsaWNhdGVzIFRPRE8gbW9uZXJvLXdhbGxldC1ycGM6IGR1cGxpY2F0ZSBvdXRnb2luZyB0cmFuc2ZlcnMgcmV0dXJuZWQgZm9yIGRpZmZlcmVudCBzdWJhZGRyZXNzIGluZGljZXMsIHdheSB0byByZXR1cm4gb3V0Z29pbmcgc3ViYWRkcmVzcyBpbmRpY2VzP1xuICAgICAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzc1RyYW5zZmVyIG9mIHN1YmFkZHJlc3NUcmFuc2ZlcnMpIHtcbiAgICAgICAgICAgICAgICBpZiAodHJhbnNmZXIudG9TdHJpbmcoKSA9PT0gc3ViYWRkcmVzc1RyYW5zZmVyLnRvU3RyaW5nKCkgJiYgdHJhbnNmZXIuZ2V0VHgoKS5nZXRIYXNoKCkgPT09IHN1YmFkZHJlc3NUcmFuc2Zlci5nZXRUeCgpLmdldEhhc2goKSkge1xuICAgICAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICghZm91bmQpIHN1YmFkZHJlc3NUcmFuc2ZlcnMucHVzaCh0cmFuc2Zlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFzc2VydC5lcXVhbChzdWJhZGRyZXNzVHJhbnNmZXJzLmxlbmd0aCwgYWNjb3VudFRyYW5zZmVycy5sZW5ndGgpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGNvbGxlY3QgdW5pcXVlIHN1YmFkZHJlc3MgaW5kaWNlc1xuICAgICAgICAgIGxldCBzdWJhZGRyZXNzSW5kaWNlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiBzdWJhZGRyZXNzVHJhbnNmZXJzKSB7XG4gICAgICAgICAgICBpZiAodHJhbnNmZXIuZ2V0SXNJbmNvbWluZygpKSBzdWJhZGRyZXNzSW5kaWNlcy5hZGQoKHRyYW5zZmVyIGFzIE1vbmVyb0luY29taW5nVHJhbnNmZXIpLmdldFN1YmFkZHJlc3NJbmRleCgpKTtcbiAgICAgICAgICAgIGVsc2UgZm9yIChsZXQgc3ViYWRkcmVzc0lkeCBvZiAodHJhbnNmZXIgYXMgTW9uZXJvT3V0Z29pbmdUcmFuc2ZlcikuZ2V0U3ViYWRkcmVzc0luZGljZXMoKSkgc3ViYWRkcmVzc0luZGljZXMuYWRkKHN1YmFkZHJlc3NJZHgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBnZXQgYW5kIHRlc3QgdHJhbnNmZXJzIGJ5IHN1YmFkZHJlc3MgaW5kaWNlc1xuICAgICAgICAgIGxldCB0cmFuc2ZlcnMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUcmFuc2ZlcnModGhhdC53YWxsZXQsIG5ldyBNb25lcm9UcmFuc2ZlclF1ZXJ5KCkuc2V0QWNjb3VudEluZGV4KGFjY291bnQuZ2V0SW5kZXgoKSkuc2V0U3ViYWRkcmVzc0luZGljZXMoQXJyYXkuZnJvbShzdWJhZGRyZXNzSW5kaWNlcykgYXMgbnVtYmVyW10pKTtcbiAgICAgICAgICAvL2lmICh0cmFuc2ZlcnMubGVuZ3RoICE9PSBzdWJhZGRyZXNzVHJhbnNmZXJzLmxlbmd0aCkgY29uc29sZS5sb2coXCJXQVJOSU5HOiBvdXRnb2luZyB0cmFuc2ZlcnMgYWx3YXlzIGZyb20gc3ViYWRkcmVzcyAwIChtb25lcm8td2FsbGV0LXJwYyAjNTE3MSlcIik7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHRyYW5zZmVycy5sZW5ndGgsIHN1YmFkZHJlc3NUcmFuc2ZlcnMubGVuZ3RoKTsgLy8gVE9ETyBtb25lcm8td2FsbGV0LXJwYzogdGhlc2UgbWF5IG5vdCBiZSBlcXVhbCBiZWNhdXNlIG91dGdvaW5nIHRyYW5zZmVycyBhcmUgYWx3YXlzIGZyb20gc3ViYWRkcmVzcyAwICgjNTE3MSkgYW5kL29yIGluY29taW5nIHRyYW5zZmVycyBmcm9tL3RvIHNhbWUgYWNjb3VudCBhcmUgb2NjbHVkZWQgKCM0NTAwKVxuICAgICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHRyYW5zZmVycykge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGFjY291bnQuZ2V0SW5kZXgoKSwgdHJhbnNmZXIuZ2V0QWNjb3VudEluZGV4KCkpO1xuICAgICAgICAgICAgaWYgKHRyYW5zZmVyLmdldElzSW5jb21pbmcoKSkgYXNzZXJ0KHN1YmFkZHJlc3NJbmRpY2VzLmhhcygodHJhbnNmZXIgYXMgTW9uZXJvSW5jb21pbmdUcmFuc2ZlcikuZ2V0U3ViYWRkcmVzc0luZGV4KCkpKTtcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBsZXQgb3ZlcmxhcHMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzc0lkeCBvZiBzdWJhZGRyZXNzSW5kaWNlcykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IG91dFN1YmFkZHJlc3NJZHggb2YgKHRyYW5zZmVyIGFzIE1vbmVyb091dGdvaW5nVHJhbnNmZXIpLmdldFN1YmFkZHJlc3NJbmRpY2VzKCkpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChzdWJhZGRyZXNzSWR4ID09PSBvdXRTdWJhZGRyZXNzSWR4KSB7XG4gICAgICAgICAgICAgICAgICAgIG92ZXJsYXBzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFzc2VydChvdmVybGFwcywgXCJTdWJhZGRyZXNzZXMgbXVzdCBvdmVybGFwXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZW5zdXJlIHRyYW5zZmVyIGZvdW5kIHdpdGggbm9uLXplcm8gYWNjb3VudCBhbmQgc3ViYWRkcmVzcyBpbmRpY2VzXG4gICAgICAgIGFzc2VydChub25EZWZhdWx0SW5jb21pbmcsIFwiTm8gdHJhbnNmZXJzIGZvdW5kIGluIG5vbi1kZWZhdWx0IGFjY291bnQgYW5kIHN1YmFkZHJlc3M7IHJ1biBzZW5kLXRvLW11bHRpcGxlIHRlc3RzXCIpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgJiYgIXRlc3RDb25maWcubGl0ZU1vZGUpXG4gICAgICBpdChcIkNhbiBnZXQgdHJhbnNmZXJzIHdpdGggYWRkaXRpb25hbCBjb25maWd1cmF0aW9uXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGluY29taW5nIHRyYW5zZmVyc1xuICAgICAgICBsZXQgdHJhbnNmZXJzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHJhbnNmZXJzKHRoYXQud2FsbGV0LCB7aXNJbmNvbWluZzogdHJ1ZX0sIHRydWUpO1xuICAgICAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiB0cmFuc2ZlcnMpIGFzc2VydCh0cmFuc2Zlci5nZXRJc0luY29taW5nKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IG91dGdvaW5nIHRyYW5zZmVyc1xuICAgICAgICB0cmFuc2ZlcnMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RUcmFuc2ZlcnModGhhdC53YWxsZXQsIHtpc0luY29taW5nOiBmYWxzZX0sIHRydWUpO1xuICAgICAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiB0cmFuc2ZlcnMpIGFzc2VydCh0cmFuc2Zlci5nZXRJc091dGdvaW5nKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGNvbmZpcm1lZCB0cmFuc2ZlcnMgdG8gYWNjb3VudCAwXG4gICAgICAgIHRyYW5zZmVycyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdFRyYW5zZmVycyh0aGF0LndhbGxldCwge2FjY291bnRJbmRleDogMCwgdHhRdWVyeToge2lzQ29uZmlybWVkOiB0cnVlfX0sIHRydWUpO1xuICAgICAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiB0cmFuc2ZlcnMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXIuZ2V0QWNjb3VudEluZGV4KCksIDApO1xuICAgICAgICAgIGFzc2VydCh0cmFuc2Zlci5nZXRUeCgpLmdldElzQ29uZmlybWVkKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgY29uZmlybWVkIHRyYW5zZmVycyB0byBbMSwgMl1cbiAgICAgICAgdHJhbnNmZXJzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHJhbnNmZXJzKHRoYXQud2FsbGV0LCB7YWNjb3VudEluZGV4OiAxLCBzdWJhZGRyZXNzSW5kZXg6IDIsIHR4UXVlcnk6IHtpc0NvbmZpcm1lZDogdHJ1ZX19LCB0cnVlKTtcbiAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgdHJhbnNmZXJzKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpLCAxKTtcbiAgICAgICAgICBpZiAodHJhbnNmZXIuZ2V0SXNJbmNvbWluZygpKSBhc3NlcnQuZXF1YWwoKHRyYW5zZmVyIGFzIE1vbmVyb0luY29taW5nVHJhbnNmZXIpLmdldFN1YmFkZHJlc3NJbmRleCgpLCAyKTtcbiAgICAgICAgICBlbHNlIGFzc2VydCgodHJhbnNmZXIgYXMgTW9uZXJvT3V0Z29pbmdUcmFuc2ZlcikuZ2V0U3ViYWRkcmVzc0luZGljZXMoKS5pbmNsdWRlcygyKSk7XG4gICAgICAgICAgYXNzZXJ0KHRyYW5zZmVyLmdldFR4KCkuZ2V0SXNDb25maXJtZWQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0cmFuc2ZlcnMgaW4gdGhlIHR4IHBvb2xcbiAgICAgICAgdHJhbnNmZXJzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHJhbnNmZXJzKHRoYXQud2FsbGV0LCB7dHhRdWVyeToge2luVHhQb29sOiB0cnVlfX0pO1xuICAgICAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiB0cmFuc2ZlcnMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXIuZ2V0VHgoKS5nZXRJblR4UG9vbCgpLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHJhbmRvbSB0cmFuc2FjdGlvbnNcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IGdldFJhbmRvbVRyYW5zYWN0aW9ucyh0aGF0LndhbGxldCwgdW5kZWZpbmVkLCAzLCA1KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0cmFuc2ZlcnMgd2l0aCBhIHR4IGhhc2hcbiAgICAgICAgbGV0IHR4SGFzaGVzOiBhbnkgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgdHhIYXNoZXMucHVzaCh0eC5nZXRIYXNoKCkpO1xuICAgICAgICAgIHRyYW5zZmVycyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdFRyYW5zZmVycyh0aGF0LndhbGxldCwge3R4UXVlcnk6IHtoYXNoOiB0eC5nZXRIYXNoKCl9fSwgdHJ1ZSk7XG4gICAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgdHJhbnNmZXJzKSBhc3NlcnQuZXF1YWwodHJhbnNmZXIuZ2V0VHgoKS5nZXRIYXNoKCksIHR4LmdldEhhc2goKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0cmFuc2ZlcnMgd2l0aCB0eCBoYXNoZXNcbiAgICAgICAgdHJhbnNmZXJzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHJhbnNmZXJzKHRoYXQud2FsbGV0LCB7dHhRdWVyeToge2hhc2hlczogdHhIYXNoZXN9fSwgdHJ1ZSk7XG4gICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHRyYW5zZmVycykgYXNzZXJ0KHR4SGFzaGVzLmluY2x1ZGVzKHRyYW5zZmVyLmdldFR4KCkuZ2V0SGFzaCgpKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBUT0RPOiB0ZXN0IHRoYXQgdHJhbnNmZXJzIHdpdGggdGhlIHNhbWUgdHggaGFzaCBoYXZlIHRoZSBzYW1lIHR4IHJlZmVyZW5jZVxuICAgICAgICBcbiAgICAgICAgLy8gVE9ETzogdGVzdCB0cmFuc2ZlcnMgZGVzdGluYXRpb25zXG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdHJhbnNmZXJzIHdpdGggcHJlLWJ1aWx0IHF1ZXJ5IHRoYXQgYXJlIGNvbmZpcm1lZCBhbmQgaGF2ZSBvdXRnb2luZyBkZXN0aW5hdGlvbnNcbiAgICAgICAgbGV0IHRyYW5zZmVyUXVlcnkgPSBuZXcgTW9uZXJvVHJhbnNmZXJRdWVyeSgpO1xuICAgICAgICB0cmFuc2ZlclF1ZXJ5LnNldElzT3V0Z29pbmcodHJ1ZSk7XG4gICAgICAgIHRyYW5zZmVyUXVlcnkuc2V0SGFzRGVzdGluYXRpb25zKHRydWUpO1xuICAgICAgICB0cmFuc2ZlclF1ZXJ5LnNldFR4UXVlcnkobmV3IE1vbmVyb1R4UXVlcnkoKS5zZXRJc0NvbmZpcm1lZCh0cnVlKSk7XG4gICAgICAgIHRyYW5zZmVycyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdFRyYW5zZmVycyh0aGF0LndhbGxldCwgdHJhbnNmZXJRdWVyeSk7XG4gICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHRyYW5zZmVycykge1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0cmFuc2Zlci5nZXRJc091dGdvaW5nKCksIHRydWUpO1xuICAgICAgICAgIGFzc2VydCgodHJhbnNmZXIgYXMgTW9uZXJvT3V0Z29pbmdUcmFuc2ZlcikuZ2V0RGVzdGluYXRpb25zKCkubGVuZ3RoID4gMCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHRyYW5zZmVyLmdldFR4KCkuZ2V0SXNDb25maXJtZWQoKSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBpbmNvbWluZyB0cmFuc2ZlcnMgdG8gYWNjb3VudCAwIHdoaWNoIGhhcyBvdXRnb2luZyB0cmFuc2ZlcnMgKGkuZS4gb3JpZ2luYXRlZCBmcm9tIHRoZSBzYW1lIHdhbGxldClcbiAgICAgICAgdHJhbnNmZXJzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHJhbnNmZXJzKHthY2NvdW50SW5kZXg6IDEsIGlzSW5jb21pbmc6IHRydWUsIHR4UXVlcnk6IHtpc091dGdvaW5nOiB0cnVlfX0pXG4gICAgICAgIGFzc2VydCh0cmFuc2ZlcnMubGVuZ3RoID4gMCk7XG4gICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHRyYW5zZmVycykge1xuICAgICAgICAgIGFzc2VydCh0cmFuc2Zlci5nZXRJc0luY29taW5nKCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKSwgMSk7XG4gICAgICAgICAgYXNzZXJ0KHRyYW5zZmVyLmdldFR4KCkuZ2V0SXNPdXRnb2luZygpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXIuZ2V0VHgoKS5nZXRPdXRnb2luZ1RyYW5zZmVyKCksIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBpbmNvbWluZyB0cmFuc2ZlcnMgdG8gYSBzcGVjaWZpYyBhZGRyZXNzXG4gICAgICAgIGxldCBzdWJhZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWRkcmVzcygxLCAwKTtcbiAgICAgICAgdHJhbnNmZXJzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHJhbnNmZXJzKHtpc0luY29taW5nOiB0cnVlLCBhZGRyZXNzOiBzdWJhZGRyZXNzfSk7XG4gICAgICAgIGFzc2VydCh0cmFuc2ZlcnMubGVuZ3RoID4gMCk7XG4gICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHRyYW5zZmVycykge1xuICAgICAgICAgIGFzc2VydCh0cmFuc2ZlciBpbnN0YW5jZW9mIE1vbmVyb0luY29taW5nVHJhbnNmZXIpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCgxLCB0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKDAsIHRyYW5zZmVyLmdldFN1YmFkZHJlc3NJbmRleCgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoc3ViYWRkcmVzcywgdHJhbnNmZXIuZ2V0QWRkcmVzcygpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgJiYgIXRlc3RDb25maWcubGl0ZU1vZGUpXG4gICAgICBpdChcIlZhbGlkYXRlcyBpbnB1dHMgd2hlbiBnZXR0aW5nIHRyYW5zZmVyc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgd2l0aCBpbnZhbGlkIGhhc2hcbiAgICAgICAgbGV0IHRyYW5zZmVycyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFRyYW5zZmVycyh7dHhRdWVyeToge2hhc2g6IFwiaW52YWxpZF9pZFwifX0pO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXJzLmxlbmd0aCwgMCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGludmFsaWQgaGFzaCBpbiBjb2xsZWN0aW9uXG4gICAgICAgIGxldCByYW5kb21UeHMgPSBhd2FpdCBnZXRSYW5kb21UcmFuc2FjdGlvbnModGhhdC53YWxsZXQsIHVuZGVmaW5lZCwgMywgNSk7XG4gICAgICAgIHRyYW5zZmVycyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFRyYW5zZmVycyh7dHhRdWVyeToge2hhc2hlczogW3JhbmRvbVR4c1swXS5nZXRIYXNoKCksIFwiaW52YWxpZF9pZFwiXX19KTtcbiAgICAgICAgYXNzZXJ0KHRyYW5zZmVycy5sZW5ndGggPiAwKTtcbiAgICAgICAgbGV0IHR4ID0gdHJhbnNmZXJzWzBdLmdldFR4KCk7XG4gICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHRyYW5zZmVycykgYXNzZXJ0KHR4ID09PSB0cmFuc2Zlci5nZXRUeCgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdW51c2VkIHN1YmFkZHJlc3MgaW5kaWNlc1xuICAgICAgICB0cmFuc2ZlcnMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUcmFuc2ZlcnMoe2FjY291bnRJbmRleDogMCwgc3ViYWRkcmVzc0luZGljZXM6IFsxMjM0OTA3XX0pO1xuICAgICAgICBhc3NlcnQodHJhbnNmZXJzLmxlbmd0aCA9PT0gMCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGludmFsaWQgc3ViYWRkcmVzcyBpbmRleFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCB0cmFuc2ZlcnMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUcmFuc2ZlcnMoe2FjY291bnRJbmRleDogMCwgc3ViYWRkcmVzc0luZGV4OiAtMX0pO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIGZhaWxlZFwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKGUubWVzc2FnZSwgXCJTaG91bGQgaGF2ZSBmYWlsZWRcIik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGluY29taW5nIGFuZCBvdXRnb2luZyB0cmFuc2ZlcnMgdXNpbmcgY29udmVuaWVuY2UgbWV0aG9kc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBpbmNvbWluZyB0cmFuc2ZlcnNcbiAgICAgICAgbGV0IGluVHJhbnNmZXJzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKTtcbiAgICAgICAgYXNzZXJ0KGluVHJhbnNmZXJzLmxlbmd0aCA+IDApO1xuICAgICAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiBpblRyYW5zZmVycykge1xuICAgICAgICAgIGFzc2VydCh0cmFuc2Zlci5nZXRJc0luY29taW5nKCkpO1xuICAgICAgICAgIGF3YWl0IHRlc3RUcmFuc2Zlcih0cmFuc2ZlciwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGluY29taW5nIHRyYW5zZmVycyB3aXRoIHF1ZXJ5XG4gICAgICAgIGxldCBhbW91bnQgPSBpblRyYW5zZmVyc1swXS5nZXRBbW91bnQoKTtcbiAgICAgICAgbGV0IGFjY291bnRJZHggPSBpblRyYW5zZmVyc1swXS5nZXRBY2NvdW50SW5kZXgoKTtcbiAgICAgICAgbGV0IHN1YmFkZHJlc3NJZHggPSBpblRyYW5zZmVyc1swXS5nZXRTdWJhZGRyZXNzSW5kZXgoKTtcbiAgICAgICAgaW5UcmFuc2ZlcnMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRJbmNvbWluZ1RyYW5zZmVycyh7YW1vdW50OiBhbW91bnQsIGFjY291bnRJbmRleDogYWNjb3VudElkeCwgc3ViYWRkcmVzc0luZGV4OiBzdWJhZGRyZXNzSWR4fSk7XG4gICAgICAgIGFzc2VydChpblRyYW5zZmVycy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgaW5UcmFuc2ZlcnMpIHtcbiAgICAgICAgICBhc3NlcnQodHJhbnNmZXIuZ2V0SXNJbmNvbWluZygpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXIuZ2V0QW1vdW50KCkudG9TdHJpbmcoKSwgYW1vdW50LnRvU3RyaW5nKCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKSwgYWNjb3VudElkeCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHRyYW5zZmVyLmdldFN1YmFkZHJlc3NJbmRleCgpLCBzdWJhZGRyZXNzSWR4KTtcbiAgICAgICAgICBhd2FpdCB0ZXN0VHJhbnNmZXIodHJhbnNmZXIsIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBpbmNvbWluZyB0cmFuc2ZlcnMgd2l0aCBjb250cmFkaWN0b3J5IHF1ZXJ5XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaW5UcmFuc2ZlcnMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRJbmNvbWluZ1RyYW5zZmVycyhuZXcgTW9uZXJvVHJhbnNmZXJRdWVyeSgpLnNldElzSW5jb21pbmcoZmFsc2UpKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJUcmFuc2ZlciBxdWVyeSBjb250cmFkaWN0cyBnZXR0aW5nIGluY29taW5nIHRyYW5zZmVyc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IG91dGdvaW5nIHRyYW5zZmVyc1xuICAgICAgICBsZXQgb3V0VHJhbnNmZXJzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0Z29pbmdUcmFuc2ZlcnMoKTtcbiAgICAgICAgYXNzZXJ0KG91dFRyYW5zZmVycy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2Ygb3V0VHJhbnNmZXJzKSB7XG4gICAgICAgICAgYXNzZXJ0KHRyYW5zZmVyLmdldElzT3V0Z29pbmcoKSk7XG4gICAgICAgICAgYXdhaXQgdGVzdFRyYW5zZmVyKHRyYW5zZmVyLCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgb3V0Z29pbmcgdHJhbnNmZXJzIHdpdGggcXVlcnlcbiAgICAgICAgb3V0VHJhbnNmZXJzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0Z29pbmdUcmFuc2ZlcnMoe2FjY291bnRJbmRleDogYWNjb3VudElkeCwgc3ViYWRkcmVzc0luZGV4OiBzdWJhZGRyZXNzSWR4fSk7XG4gICAgICAgIGFzc2VydChvdXRUcmFuc2ZlcnMubGVuZ3RoID4gMCk7XG4gICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIG91dFRyYW5zZmVycykge1xuICAgICAgICAgIGFzc2VydCh0cmFuc2Zlci5nZXRJc091dGdvaW5nKCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKSwgYWNjb3VudElkeCk7XG4gICAgICAgICAgYXNzZXJ0KHRyYW5zZmVyLmdldFN1YmFkZHJlc3NJbmRpY2VzKCkuaW5jbHVkZXMoc3ViYWRkcmVzc0lkeCkpO1xuICAgICAgICAgIGF3YWl0IHRlc3RUcmFuc2Zlcih0cmFuc2ZlciwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IG91dGdvaW5nIHRyYW5zZmVycyB3aXRoIGNvbnRyYWRpY3RvcnkgcXVlcnlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBvdXRUcmFuc2ZlcnMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRPdXRnb2luZ1RyYW5zZmVycyhuZXcgTW9uZXJvVHJhbnNmZXJRdWVyeSgpLnNldElzT3V0Z29pbmcoZmFsc2UpKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJUcmFuc2ZlciBxdWVyeSBjb250cmFkaWN0cyBnZXR0aW5nIG91dGdvaW5nIHRyYW5zZmVyc1wiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgb3V0cHV0cyBpbiB0aGUgd2FsbGV0LCBhY2NvdW50cywgYW5kIHN1YmFkZHJlc3Nlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcblxuICAgICAgICAvLyBnZXQgYWxsIG91dHB1dHNcbiAgICAgICAgYXdhaXQgdGhhdC5nZXRBbmRUZXN0T3V0cHV0cyh0aGF0LndhbGxldCwgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBvdXRwdXRzIGZvciBlYWNoIGFjY291bnRcbiAgICAgICAgbGV0IG5vbkRlZmF1bHRJbmNvbWluZyA9IGZhbHNlO1xuICAgICAgICBsZXQgYWNjb3VudHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cyh0cnVlKTtcbiAgICAgICAgZm9yIChsZXQgYWNjb3VudCBvZiBhY2NvdW50cykge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGRldGVybWluZSBpZiBhY2NvdW50IGlzIHVzZWRcbiAgICAgICAgICBsZXQgaXNVc2VkID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzcyBvZiBhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSBpZiAoc3ViYWRkcmVzcy5nZXRJc1VzZWQoKSkgaXNVc2VkID0gdHJ1ZTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBnZXQgb3V0cHV0cyBieSBhY2NvdW50IGluZGV4XG4gICAgICAgICAgbGV0IGFjY291bnRPdXRwdXRzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0T3V0cHV0cyh0aGF0LndhbGxldCwge2FjY291bnRJbmRleDogYWNjb3VudC5nZXRJbmRleCgpfSwgaXNVc2VkKTtcbiAgICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2YgYWNjb3VudE91dHB1dHMpIGFzc2VydC5lcXVhbChvdXRwdXQuZ2V0QWNjb3VudEluZGV4KCksIGFjY291bnQuZ2V0SW5kZXgoKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gZ2V0IG91dHB1dHMgYnkgc3ViYWRkcmVzcyBpbmRleFxuICAgICAgICAgIGxldCBzdWJhZGRyZXNzT3V0cHV0czogYW55W10gPSBbXTtcbiAgICAgICAgICBmb3IgKGxldCBzdWJhZGRyZXNzIG9mIGFjY291bnQuZ2V0U3ViYWRkcmVzc2VzKCkpIHtcbiAgICAgICAgICAgIGxldCBvdXRwdXRzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0T3V0cHV0cyh0aGF0LndhbGxldCwge2FjY291bnRJbmRleDogYWNjb3VudC5nZXRJbmRleCgpLCBzdWJhZGRyZXNzSW5kZXg6IHN1YmFkZHJlc3MuZ2V0SW5kZXgoKX0sIHN1YmFkZHJlc3MuZ2V0SXNVc2VkKCkpO1xuICAgICAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHtcbiAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRBY2NvdW50SW5kZXgoKSwgc3ViYWRkcmVzcy5nZXRBY2NvdW50SW5kZXgoKSk7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChvdXRwdXQuZ2V0U3ViYWRkcmVzc0luZGV4KCksIHN1YmFkZHJlc3MuZ2V0SW5kZXgoKSk7XG4gICAgICAgICAgICAgIGlmIChvdXRwdXQuZ2V0QWNjb3VudEluZGV4KCkgIT09IDAgJiYgb3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpICE9PSAwKSBub25EZWZhdWx0SW5jb21pbmcgPSB0cnVlO1xuICAgICAgICAgICAgICBzdWJhZGRyZXNzT3V0cHV0cy5wdXNoKG91dHB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFzc2VydC5lcXVhbChzdWJhZGRyZXNzT3V0cHV0cy5sZW5ndGgsIGFjY291bnRPdXRwdXRzLmxlbmd0aCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gZ2V0IG91dHB1dHMgYnkgc3ViYWRkcmVzcyBpbmRpY2VzXG4gICAgICAgICAgbGV0IHN1YmFkZHJlc3NJbmRpY2VzID0gQXJyYXkuZnJvbShuZXcgU2V0KHN1YmFkZHJlc3NPdXRwdXRzLm1hcChvdXRwdXQgPT4gb3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpKSkpO1xuICAgICAgICAgIGxldCBvdXRwdXRzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0T3V0cHV0cyh0aGF0LndhbGxldCwge2FjY291bnRJbmRleDogYWNjb3VudC5nZXRJbmRleCgpLCBzdWJhZGRyZXNzSW5kaWNlczogc3ViYWRkcmVzc0luZGljZXN9LCBpc1VzZWQpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChvdXRwdXRzLmxlbmd0aCwgc3ViYWRkcmVzc091dHB1dHMubGVuZ3RoKTtcbiAgICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2Ygb3V0cHV0cykge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRBY2NvdW50SW5kZXgoKSwgYWNjb3VudC5nZXRJbmRleCgpKTtcbiAgICAgICAgICAgIGFzc2VydChzdWJhZGRyZXNzSW5kaWNlcy5pbmNsdWRlcyhvdXRwdXQuZ2V0U3ViYWRkcmVzc0luZGV4KCkpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGVuc3VyZSBvdXRwdXQgZm91bmQgd2l0aCBub24temVybyBhY2NvdW50IGFuZCBzdWJhZGRyZXNzIGluZGljZXNcbiAgICAgICAgYXNzZXJ0KG5vbkRlZmF1bHRJbmNvbWluZywgXCJObyBvdXRwdXRzIGZvdW5kIGluIG5vbi1kZWZhdWx0IGFjY291bnQgYW5kIHN1YmFkZHJlc3M7IHJ1biBzZW5kLXRvLW11bHRpcGxlIHRlc3RzXCIpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgJiYgIXRlc3RDb25maWcubGl0ZU1vZGUpXG4gICAgICBpdChcIkNhbiBnZXQgb3V0cHV0cyB3aXRoIGFkZGl0aW9uYWwgY29uZmlndXJhdGlvblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB1bnNwZW50IG91dHB1dHMgdG8gYWNjb3VudCAwXG4gICAgICAgIGxldCBvdXRwdXRzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0T3V0cHV0cyh0aGF0LndhbGxldCwge2FjY291bnRJbmRleDogMCwgaXNTcGVudDogZmFsc2V9KTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldEFjY291bnRJbmRleCgpLCAwKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldElzU3BlbnQoKSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgc3BlbnQgb3V0cHV0cyB0byBhY2NvdW50IDFcbiAgICAgICAgb3V0cHV0cyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdE91dHB1dHModGhhdC53YWxsZXQsIHthY2NvdW50SW5kZXg6IDEsIGlzU3BlbnQ6IHRydWV9LCB0cnVlKTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldEFjY291bnRJbmRleCgpLCAxKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldElzU3BlbnQoKSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCByYW5kb20gdHJhbnNhY3Rpb25zXG4gICAgICAgIGxldCB0eHMgPSBhd2FpdCBnZXRSYW5kb21UcmFuc2FjdGlvbnModGhhdC53YWxsZXQsIHtpc0NvbmZpcm1lZDogdHJ1ZX0sIDMsIDUpO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IG91dHB1dHMgd2l0aCBhIHR4IGhhc2hcbiAgICAgICAgbGV0IHR4SGFzaGVzOiBhbnkgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgdHhIYXNoZXMucHVzaCh0eC5nZXRIYXNoKCkpO1xuICAgICAgICAgIG91dHB1dHMgPSBhd2FpdCB0aGF0LmdldEFuZFRlc3RPdXRwdXRzKHRoYXQud2FsbGV0LCB7dHhRdWVyeToge2hhc2g6IHR4LmdldEhhc2goKX19LCB0cnVlKTtcbiAgICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2Ygb3V0cHV0cykgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRUeCgpLmdldEhhc2goKSwgdHguZ2V0SGFzaCgpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IG91dHB1dHMgd2l0aCB0eCBoYXNoZXNcbiAgICAgICAgb3V0cHV0cyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdE91dHB1dHModGhhdC53YWxsZXQsIHt0eFF1ZXJ5OiB7aGFzaGVzOiB0eEhhc2hlc319LCB0cnVlKTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIGFzc2VydCh0eEhhc2hlcy5pbmNsdWRlcyhvdXRwdXQuZ2V0VHgoKS5nZXRIYXNoKCkpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBjb25maXJtZWQgb3V0cHV0cyB0byBzcGVjaWZpYyBzdWJhZGRyZXNzIHdpdGggcHJlLWJ1aWx0IHF1ZXJ5XG4gICAgICAgIGxldCBhY2NvdW50SWR4ID0gMDtcbiAgICAgICAgbGV0IHN1YmFkZHJlc3NJZHggPSAxO1xuICAgICAgICBsZXQgcXVlcnkgPSBuZXcgTW9uZXJvT3V0cHV0UXVlcnkoKTtcbiAgICAgICAgcXVlcnkuc2V0QWNjb3VudEluZGV4KGFjY291bnRJZHgpLnNldFN1YmFkZHJlc3NJbmRleChzdWJhZGRyZXNzSWR4KTtcbiAgICAgICAgcXVlcnkuc2V0VHhRdWVyeShuZXcgTW9uZXJvVHhRdWVyeSgpLnNldElzQ29uZmlybWVkKHRydWUpKTtcbiAgICAgICAgcXVlcnkuc2V0TWluQW1vdW50KFRlc3RVdGlscy5NQVhfRkVFKTtcbiAgICAgICAgb3V0cHV0cyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdE91dHB1dHModGhhdC53YWxsZXQsIHF1ZXJ5LCB0cnVlKTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldEFjY291bnRJbmRleCgpLCBhY2NvdW50SWR4KTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpLCBzdWJhZGRyZXNzSWR4KTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldFR4KCkuZ2V0SXNDb25maXJtZWQoKSwgdHJ1ZSk7XG4gICAgICAgICAgYXNzZXJ0KG91dHB1dC5nZXRBbW91bnQoKSA+PSBUZXN0VXRpbHMuTUFYX0ZFRSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBvdXRwdXQgYnkga2V5IGltYWdlXG4gICAgICAgIGxldCBrZXlJbWFnZSA9IG91dHB1dHNbMF0uZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKTtcbiAgICAgICAgb3V0cHV0cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldE91dHB1dHMobmV3IE1vbmVyb091dHB1dFF1ZXJ5KCkuc2V0S2V5SW1hZ2UobmV3IE1vbmVyb0tleUltYWdlKGtleUltYWdlKSkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0c1swXS5nZXRLZXlJbWFnZSgpLmdldEhleCgpLCBrZXlJbWFnZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgb3V0cHV0cyB3aG9zZSB0cmFuc2FjdGlvbiBpcyBjb25maXJtZWQgYW5kIGhhcyBpbmNvbWluZyBhbmQgb3V0Z29pbmcgdHJhbnNmZXJzXG4gICAgICAgIG91dHB1dHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRPdXRwdXRzKHt0eFF1ZXJ5OiB7aXNDb25maXJtZWQ6IHRydWUsIGlzSW5jb21pbmc6IHRydWUsIGlzT3V0Z29pbmc6IHRydWUsIGluY2x1ZGVPdXRwdXRzOiB0cnVlfX0pO1xuICAgICAgICBhc3NlcnQob3V0cHV0cy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHtcbiAgICAgICAgICBhc3NlcnQob3V0cHV0LmdldFR4KCkuZ2V0SXNJbmNvbWluZygpKTtcbiAgICAgICAgICBhc3NlcnQob3V0cHV0LmdldFR4KCkuZ2V0SXNPdXRnb2luZygpKTtcbiAgICAgICAgICBhc3NlcnQob3V0cHV0LmdldFR4KCkuZ2V0SXNDb25maXJtZWQoKSk7XG4gICAgICAgICAgYXNzZXJ0KG91dHB1dC5nZXRUeCgpLmdldE91dHB1dHMoKS5sZW5ndGggPiAwKTtcbiAgICAgICAgICBhc3NlcnQoR2VuVXRpbHMuYXJyYXlDb250YWlucyhvdXRwdXQuZ2V0VHgoKS5nZXRPdXRwdXRzKCksIG91dHB1dCwgdHJ1ZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cyAmJiAhdGVzdENvbmZpZy5saXRlTW9kZSlcbiAgICAgIGl0KFwiVmFsaWRhdGVzIGlucHV0cyB3aGVuIGdldHRpbmcgb3V0cHV0c1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgd2l0aCBpbnZhbGlkIGhhc2hcbiAgICAgICAgbGV0IG91dHB1dHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRPdXRwdXRzKHt0eFF1ZXJ5OiB7aGFzaDogXCJpbnZhbGlkX2lkXCJ9fSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChvdXRwdXRzLmxlbmd0aCwgMCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGludmFsaWQgaGFzaCBpbiBjb2xsZWN0aW9uXG4gICAgICAgIGxldCByYW5kb21UeHMgPSBhd2FpdCBnZXRSYW5kb21UcmFuc2FjdGlvbnModGhhdC53YWxsZXQsIHtpc0NvbmZpcm1lZDogdHJ1ZSwgaW5jbHVkZU91dHB1dHM6IHRydWV9LCAzLCA1KTtcbiAgICAgICAgb3V0cHV0cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldE91dHB1dHMoe3R4UXVlcnk6IHtoYXNoZXM6IFtyYW5kb21UeHNbMF0uZ2V0SGFzaCgpLCBcImludmFsaWRfaWRcIl19fSk7XG4gICAgICAgIGFzc2VydChvdXRwdXRzLmxlbmd0aCA+IDApO1xuICAgICAgICBhc3NlcnQuZXF1YWwocmFuZG9tVHhzWzBdLmdldE91dHB1dHMoKS5sZW5ndGgsIG91dHB1dHMubGVuZ3RoKTtcbiAgICAgICAgbGV0IHR4ID0gb3V0cHV0c1swXS5nZXRUeCgpO1xuICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2Ygb3V0cHV0cykgYXNzZXJ0KHR4ID09PSBvdXRwdXQuZ2V0VHgoKSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGV4cG9ydCBvdXRwdXRzIGluIGhleCBmb3JtYXRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBvdXRwdXRzSGV4ID0gYXdhaXQgdGhhdC53YWxsZXQuZXhwb3J0T3V0cHV0cygpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHlwZW9mIG91dHB1dHNIZXgsIFwic3RyaW5nXCIpOyAgLy8gVE9ETzogdGhpcyB3aWxsIGZhaWwgaWYgd2FsbGV0IGhhcyBubyBvdXRwdXRzOyBydW4gdGhlc2UgdGVzdHMgb24gbmV3IHdhbGxldFxuICAgICAgICBhc3NlcnQob3V0cHV0c0hleC5sZW5ndGggPiAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHdhbGxldCBleHBvcnRzIG91dHB1dHMgc2luY2UgbGFzdCBleHBvcnQgYnkgZGVmYXVsdFxuICAgICAgICBvdXRwdXRzSGV4ID0gYXdhaXQgdGhhdC53YWxsZXQuZXhwb3J0T3V0cHV0cygpO1xuICAgICAgICBsZXQgb3V0cHV0c0hleEFsbCA9IGF3YWl0IHRoYXQud2FsbGV0LmV4cG9ydE91dHB1dHModHJ1ZSk7XG4gICAgICAgIGFzc2VydChvdXRwdXRzSGV4QWxsLmxlbmd0aCA+IG91dHB1dHNIZXgubGVuZ3RoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gaW1wb3J0IG91dHB1dHMgaW4gaGV4IGZvcm1hdFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGV4cG9ydCBvdXRwdXRzIGhleFxuICAgICAgICBsZXQgb3V0cHV0c0hleCA9IGF3YWl0IHRoYXQud2FsbGV0LmV4cG9ydE91dHB1dHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGltcG9ydCBvdXRwdXRzIGhleFxuICAgICAgICBpZiAob3V0cHV0c0hleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbGV0IG51bUltcG9ydGVkID0gYXdhaXQgdGhhdC53YWxsZXQuaW1wb3J0T3V0cHV0cyhvdXRwdXRzSGV4KTtcbiAgICAgICAgICBhc3NlcnQobnVtSW1wb3J0ZWQgPj0gMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJIYXMgY29ycmVjdCBhY2NvdW50aW5nIGFjcm9zcyBhY2NvdW50cywgc3ViYWRkcmVzc2VzLCB0eHMsIHRyYW5zZmVycywgYW5kIG91dHB1dHNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBwcmUtZmV0Y2ggd2FsbGV0IGJhbGFuY2VzLCBhY2NvdW50cywgc3ViYWRkcmVzc2VzLCBhbmQgdHhzXG4gICAgICAgIGxldCB3YWxsZXRCYWxhbmNlID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QmFsYW5jZSgpO1xuICAgICAgICBsZXQgd2FsbGV0VW5sb2NrZWRCYWxhbmNlID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VW5sb2NrZWRCYWxhbmNlKCk7XG4gICAgICAgIGxldCBhY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKHRydWUpOyAgLy8gaW5jbHVkZXMgc3ViYWRkcmVzc2VzXG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHdhbGxldCBiYWxhbmNlXG4gICAgICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQod2FsbGV0QmFsYW5jZSk7XG4gICAgICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQod2FsbGV0VW5sb2NrZWRCYWxhbmNlKTtcbiAgICAgICAgYXNzZXJ0KHdhbGxldEJhbGFuY2UgPj0gd2FsbGV0VW5sb2NrZWRCYWxhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdGhhdCB3YWxsZXQgYmFsYW5jZSBlcXVhbHMgc3VtIG9mIGFjY291bnQgYmFsYW5jZXNcbiAgICAgICAgbGV0IGFjY291bnRzQmFsYW5jZSA9IEJpZ0ludCgwKTtcbiAgICAgICAgbGV0IGFjY291bnRzVW5sb2NrZWRCYWxhbmNlID0gQmlnSW50KDApO1xuICAgICAgICBmb3IgKGxldCBhY2NvdW50IG9mIGFjY291bnRzKSB7XG4gICAgICAgICAgYXdhaXQgdGVzdEFjY291bnQoYWNjb3VudCk7IC8vIHRlc3QgdGhhdCBhY2NvdW50IGJhbGFuY2UgZXF1YWxzIHN1bSBvZiBzdWJhZGRyZXNzIGJhbGFuY2VzXG4gICAgICAgICAgYWNjb3VudHNCYWxhbmNlICs9IGFjY291bnQuZ2V0QmFsYW5jZSgpO1xuICAgICAgICAgIGFjY291bnRzVW5sb2NrZWRCYWxhbmNlICs9IGFjY291bnQuZ2V0VW5sb2NrZWRCYWxhbmNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0LmVxdWFsKGFjY291bnRzQmFsYW5jZSwgd2FsbGV0QmFsYW5jZSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhY2NvdW50c1VubG9ja2VkQmFsYW5jZSwgd2FsbGV0VW5sb2NrZWRCYWxhbmNlKTtcbiAgICAgICAgXG4vLyAgICAgICAgLy8gdGVzdCB0aGF0IHdhbGxldCBiYWxhbmNlIGVxdWFscyBuZXQgb2Ygd2FsbGV0J3MgaW5jb21pbmcgYW5kIG91dGdvaW5nIHR4IGFtb3VudHNcbi8vICAgICAgICAvLyBUT0RPIG1vbmVyby13YWxsZXQtcnBjOiB0aGVzZSB0ZXN0cyBhcmUgZGlzYWJsZWQgYmVjYXVzZSBpbmNvbWluZyB0cmFuc2ZlcnMgYXJlIG5vdCByZXR1cm5lZCB3aGVuIHNlbnQgZnJvbSB0aGUgc2FtZSBhY2NvdW50LCBzbyBkb2Vzbid0IGJhbGFuY2UgIzQ1MDBcbi8vICAgICAgICAvLyBUT0RPOiB0ZXN0IHVubG9ja2VkIGJhbGFuY2UgYmFzZWQgb24gdHhzLCByZXF1aXJlcyBlLmcuIHR4LmdldElzTG9ja2VkKClcbi8vICAgICAgICBsZXQgb3V0Z29pbmdTdW0gPSBCaWdJbnQoMCk7XG4vLyAgICAgICAgbGV0IGluY29taW5nU3VtID0gQmlnSW50KDApO1xuLy8gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuLy8gICAgICAgICAgaWYgKHR4LmdldE91dGdvaW5nQW1vdW50KCkpIG91dGdvaW5nU3VtID0gb3V0Z29pbmdTdW0gKyAodHguZ2V0T3V0Z29pbmdBbW91bnQoKSk7XG4vLyAgICAgICAgICBpZiAodHguZ2V0SW5jb21pbmdBbW91bnQoKSkgaW5jb21pbmdTdW0gPSBpbmNvbWluZ1N1bSArICh0eC5nZXRJbmNvbWluZ0Ftb3VudCgpKTtcbi8vICAgICAgICB9XG4vLyAgICAgICAgYXNzZXJ0LmVxdWFsKGluY29taW5nU3VtIC0gKG91dGdvaW5nU3VtKS50b1N0cmluZygpLCB3YWxsZXRCYWxhbmNlLnRvU3RyaW5nKCkpO1xuLy8gICAgICAgIFxuLy8gICAgICAgIC8vIHRlc3QgdGhhdCBlYWNoIGFjY291bnQncyBiYWxhbmNlIGVxdWFscyBuZXQgb2YgYWNjb3VudCdzIGluY29taW5nIGFuZCBvdXRnb2luZyB0eCBhbW91bnRzXG4vLyAgICAgICAgZm9yIChsZXQgYWNjb3VudCBvZiBhY2NvdW50cykge1xuLy8gICAgICAgICAgaWYgKGFjY291bnQuZ2V0SW5kZXgoKSAhPT0gMSkgY29udGludWU7IC8vIGZpbmQgMVxuLy8gICAgICAgICAgb3V0Z29pbmdTdW0gPSBCaWdJbnQoMCk7XG4vLyAgICAgICAgICBpbmNvbWluZ1N1bSA9IEJpZ0ludCgwKTtcbi8vICAgICAgICAgIGxldCBmaWx0ZXIgPSBuZXcgTW9uZXJvVHhRdWVyeSgpO1xuLy8gICAgICAgICAgZmlsdGVyLnNldEFjY291bnRJbmRleChhY2NvdW50LmdldEluZGV4KCkpO1xuLy8gICAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzLmZpbHRlcih0eCA9PiBmaWx0ZXIubWVldHNDcml0ZXJpYSh0eCkpKSB7IC8vIG5vcm1hbGx5IHdlJ2QgY2FsbCB3YWxsZXQuZ2V0VHhzKGZpbHRlcikgYnV0IHdlJ3JlIHVzaW5nIHByZS1mZXRjaGVkIHR4c1xuLy8gICAgICAgICAgICBpZiAodHguZ2V0SGFzaCgpID09PSBcIjhkMzkxOWQ5OGRkNWE3MzRkYThjNTJlZGRjNTU4ZGIzZmJmMDU5YWQ1NWQ0MzJmMDA1MmVjZDU5ZWYxMjJlY2JcIikgY29uc29sZS5sb2codHgudG9TdHJpbmcoMCkpO1xuLy8gICAgICAgICAgICBcbi8vICAgICAgICAgICAgLy9jb25zb2xlLmxvZygodHguZ2V0T3V0Z29pbmdBbW91bnQoKSA/IHR4LmdldE91dGdvaW5nQW1vdW50KCkudG9TdHJpbmcoKSA6IFwiXCIpICsgXCIsIFwiICsgKHR4LmdldEluY29taW5nQW1vdW50KCkgPyB0eC5nZXRJbmNvbWluZ0Ftb3VudCgpLnRvU3RyaW5nKCkgOiBcIlwiKSk7XG4vLyAgICAgICAgICAgIGlmICh0eC5nZXRPdXRnb2luZ0Ftb3VudCgpKSBvdXRnb2luZ1N1bSA9IG91dGdvaW5nU3VtICsgKHR4LmdldE91dGdvaW5nQW1vdW50KCkpO1xuLy8gICAgICAgICAgICBpZiAodHguZ2V0SW5jb21pbmdBbW91bnQoKSkgaW5jb21pbmdTdW0gPSBpbmNvbWluZ1N1bSArICh0eC5nZXRJbmNvbWluZ0Ftb3VudCgpKTtcbi8vICAgICAgICAgIH1cbi8vICAgICAgICAgIGFzc2VydC5lcXVhbChpbmNvbWluZ1N1bSAtIChvdXRnb2luZ1N1bSkudG9TdHJpbmcoKSwgYWNjb3VudC5nZXRCYWxhbmNlKCkudG9TdHJpbmcoKSk7XG4vLyAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gYmFsYW5jZSBtYXkgbm90IGVxdWFsIHN1bSBvZiB1bnNwZW50IG91dHB1dHMgaWYgdW5jb25maXJtZWQgdHhzXG4gICAgICAgIC8vIFRPRE8gbW9uZXJvLXdhbGxldC1ycGM6IHJlYXNvbiBub3QgdG8gcmV0dXJuIHVuc3BlbnQgb3V0cHV0cyBvbiB1bmNvbmZpcm1lZCB0eHM/IHRoZW4gdGhpcyBpc24ndCBuZWNlc3NhcnlcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cygpO1xuICAgICAgICBsZXQgaGFzVW5jb25maXJtZWRUeCA9IGZhbHNlO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIGlmICh0eC5nZXRJblR4UG9vbCgpKSBoYXNVbmNvbmZpcm1lZFR4ID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIHdhbGxldCBiYWxhbmNlIGlzIHN1bSBvZiBhbGwgdW5zcGVudCBvdXRwdXRzXG4gICAgICAgIGxldCB3YWxsZXRTdW0gPSBCaWdJbnQoMCk7XG4gICAgICAgIGZvciAobGV0IG91dHB1dCBvZiBhd2FpdCB0aGF0LndhbGxldC5nZXRPdXRwdXRzKHtpc1NwZW50OiBmYWxzZX0pKSB3YWxsZXRTdW0gPSB3YWxsZXRTdW0gKyAob3V0cHV0LmdldEFtb3VudCgpKTtcbiAgICAgICAgaWYgKHdhbGxldEJhbGFuY2UgIT09IHdhbGxldFN1bSkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHR4cyBtYXkgaGF2ZSBjaGFuZ2VkIGluIGJldHdlZW4gY2FsbHMgc28gcmV0cnkgdGVzdFxuICAgICAgICAgIHdhbGxldFN1bSA9IEJpZ0ludCgwKTtcbiAgICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2YgYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0cHV0cyh7aXNTcGVudDogZmFsc2V9KSkgd2FsbGV0U3VtID0gd2FsbGV0U3VtICsgKG91dHB1dC5nZXRBbW91bnQoKSk7XG4gICAgICAgICAgaWYgKHdhbGxldEJhbGFuY2UgIT09IHdhbGxldFN1bSkgYXNzZXJ0KGhhc1VuY29uZmlybWVkVHgsIFwiV2FsbGV0IGJhbGFuY2UgbXVzdCBlcXVhbCBzdW0gb2YgdW5zcGVudCBvdXRwdXRzIGlmIG5vIHVuY29uZmlybWVkIHR4c1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gYWNjb3VudCBiYWxhbmNlcyBhcmUgc3VtIG9mIHRoZWlyIHVuc3BlbnQgb3V0cHV0c1xuICAgICAgICBmb3IgKGxldCBhY2NvdW50IG9mIGFjY291bnRzKSB7XG4gICAgICAgICAgbGV0IGFjY291bnRTdW0gPSBCaWdJbnQoMCk7XG4gICAgICAgICAgbGV0IGFjY291bnRPdXRwdXRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0cHV0cyh7YWNjb3VudEluZGV4OiBhY2NvdW50LmdldEluZGV4KCksIGlzU3BlbnQ6IGZhbHNlfSk7XG4gICAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIGFjY291bnRPdXRwdXRzKSBhY2NvdW50U3VtID0gYWNjb3VudFN1bSArIChvdXRwdXQuZ2V0QW1vdW50KCkpO1xuICAgICAgICAgIGlmIChhY2NvdW50LmdldEJhbGFuY2UoKS50b1N0cmluZygpICE9PSBhY2NvdW50U3VtLnRvU3RyaW5nKCkpIGFzc2VydChoYXNVbmNvbmZpcm1lZFR4LCBcIkFjY291bnQgYmFsYW5jZSBtdXN0IGVxdWFsIHN1bSBvZiBpdHMgdW5zcGVudCBvdXRwdXRzIGlmIG5vIHVuY29uZmlybWVkIHR4c1wiKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzdWJhZGRyZXNzIGJhbGFuY2VzIGFyZSBzdW0gb2YgdGhlaXIgdW5zcGVudCBvdXRwdXRzXG4gICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzcyBvZiBhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSB7XG4gICAgICAgICAgICBsZXQgc3ViYWRkcmVzc1N1bSA9IEJpZ0ludCgwKTtcbiAgICAgICAgICAgIGxldCBzdWJhZGRyZXNzT3V0cHV0cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldE91dHB1dHMoe2FjY291bnRJbmRleDogYWNjb3VudC5nZXRJbmRleCgpLCBzdWJhZGRyZXNzSW5kZXg6IHN1YmFkZHJlc3MuZ2V0SW5kZXgoKSwgaXNTcGVudDogZmFsc2V9KTtcbiAgICAgICAgICAgIGZvciAobGV0IG91dHB1dCBvZiBzdWJhZGRyZXNzT3V0cHV0cykgc3ViYWRkcmVzc1N1bSA9IHN1YmFkZHJlc3NTdW0gKyAob3V0cHV0LmdldEFtb3VudCgpKTtcbiAgICAgICAgICAgIGlmIChzdWJhZGRyZXNzLmdldEJhbGFuY2UoKS50b1N0cmluZygpICE9PSBzdWJhZGRyZXNzU3VtLnRvU3RyaW5nKCkpIGFzc2VydChoYXNVbmNvbmZpcm1lZFR4LCBcIlN1YmFkZHJlc3MgYmFsYW5jZSBtdXN0IGVxdWFsIHN1bSBvZiBpdHMgdW5zcGVudCBvdXRwdXRzIGlmIG5vIHVuY29uZmlybWVkIHR4c1wiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGFuZCBzZXQgYSB0cmFuc2FjdGlvbiBub3RlXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgdHhzID0gYXdhaXQgZ2V0UmFuZG9tVHJhbnNhY3Rpb25zKHRoYXQud2FsbGV0LCB1bmRlZmluZWQsIDEsIDUpO1xuICAgICAgICBcbiAgICAgICAgLy8gc2V0IG5vdGVzXG4gICAgICAgIGxldCB1dWlkID0gR2VuVXRpbHMuZ2V0VVVJRCgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHR4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnNldFR4Tm90ZSh0eHNbaV0uZ2V0SGFzaCgpLCB1dWlkICsgaSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBub3Rlc1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHR4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB0aGF0LndhbGxldC5nZXRUeE5vdGUodHhzW2ldLmdldEhhc2goKSksIHV1aWQgKyBpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIFRPRE86IHdoeSBkb2VzIGdldHRpbmcgY2FjaGVkIHR4cyB0YWtlIDIgc2Vjb25kcyB3aGVuIHNob3VsZCBhbHJlYWR5IGJlIGNhY2hlZD9cbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYW5kIHNldCBtdWx0aXBsZSB0cmFuc2FjdGlvbiBub3Rlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHNldCB0eCBub3Rlc1xuICAgICAgICBsZXQgdXVpZCA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cygpO1xuICAgICAgICBhc3NlcnQodHhzLmxlbmd0aCA+PSAzLCBcIlRlc3QgcmVxdWlyZXMgMyBvciBtb3JlIHdhbGxldCB0cmFuc2FjdGlvbnM7IHJ1biBzZW5kIHRlc3RzXCIpO1xuICAgICAgICBsZXQgdHhIYXNoZXM6IGFueSA9IFtdO1xuICAgICAgICBsZXQgdHhOb3RlczogYW55ID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdHhIYXNoZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB0eEhhc2hlcy5wdXNoKHR4c1tpXS5nZXRIYXNoKCkpO1xuICAgICAgICAgIHR4Tm90ZXMucHVzaCh1dWlkICsgaSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuc2V0VHhOb3Rlcyh0eEhhc2hlcywgdHhOb3Rlcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdHggbm90ZXNcbiAgICAgICAgdHhOb3RlcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4Tm90ZXModHhIYXNoZXMpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHR4SGFzaGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHV1aWQgKyBpLCB0eE5vdGVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVE9ETzogdGVzdCB0aGF0IGdldCB0cmFuc2FjdGlvbiBoYXMgbm90ZVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBjaGVjayBhIHRyYW5zZmVyIHVzaW5nIHRoZSB0cmFuc2FjdGlvbidzIHNlY3JldCBrZXkgYW5kIHRoZSBkZXN0aW5hdGlvblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHdhaXQgZm9yIHBvb2wgdHhzIHRvIGNvbmZpcm0gaWYgbm8gY29uZmlybWVkIHR4cyB3aXRoIGRlc3RpbmF0aW9uc1xuICAgICAgICBpZiAoKGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyh7aXNDb25maXJtZWQ6IHRydWUsIGlzT3V0Z29pbmc6IHRydWUsIHRyYW5zZmVyUXVlcnk6IHtoYXNEZXN0aW5hdGlvbnM6IHRydWV9fSkpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi5yZXNldCgpO1xuICAgICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgcmFuZG9tIHR4cyB0aGF0IGFyZSBjb25maXJtZWQgYW5kIGhhdmUgb3V0Z29pbmcgZGVzdGluYXRpb25zXG4gICAgICAgIGxldCB0eHM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdHhzID0gYXdhaXQgZ2V0UmFuZG9tVHJhbnNhY3Rpb25zKHRoYXQud2FsbGV0LCB7aXNDb25maXJtZWQ6IHRydWUsIGlzT3V0Z29pbmc6IHRydWUsIHRyYW5zZmVyUXVlcnk6IHtoYXNEZXN0aW5hdGlvbnM6IHRydWV9fSwgMSwgTUFYX1RYX1BST09GUyk7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGlmIChlLm1lc3NhZ2UuaW5kZXhPZihcImZvdW5kIHdpdGhcIikgPj0gMCkgdGhyb3cgbmV3IEVycm9yKFwiTm8gdHhzIHdpdGggb3V0Z29pbmcgZGVzdGluYXRpb25zIGZvdW5kOyBydW4gc2VuZCB0ZXN0c1wiKVxuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgZ29vZCBjaGVja3NcbiAgICAgICAgYXNzZXJ0KHR4cy5sZW5ndGggPiAwLCBcIk5vIHRyYW5zYWN0aW9ucyBmb3VuZCB3aXRoIG91dGdvaW5nIGRlc3RpbmF0aW9uc1wiKTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgbGV0IGtleSA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4S2V5KHR4LmdldEhhc2goKSk7XG4gICAgICAgICAgYXNzZXJ0KGtleSwgXCJObyB0eCBrZXkgcmV0dXJuZWQgZm9yIHR4IGhhc2hcIik7XG4gICAgICAgICAgYXNzZXJ0KHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKS5sZW5ndGggPiAwKTtcbiAgICAgICAgICBmb3IgKGxldCBkZXN0aW5hdGlvbiBvZiB0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCkpIHtcbiAgICAgICAgICAgIGxldCBjaGVjayA9IGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrVHhLZXkodHguZ2V0SGFzaCgpLCBrZXksIGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSk7XG4gICAgICAgICAgICBpZiAoZGVzdGluYXRpb24uZ2V0QW1vdW50KCkgPiAwbikge1xuICAgICAgICAgICAgICAvLyBUT0RPIG1vbmVyby13YWxsZXQtcnBjOiBpbmRpY2F0ZXMgYW1vdW50IHJlY2VpdmVkIGFtb3VudCBpcyAwIGRlc3BpdGUgdHJhbnNhY3Rpb24gd2l0aCB0cmFuc2ZlciB0byB0aGlzIGFkZHJlc3NcbiAgICAgICAgICAgICAgLy8gVE9ETyBtb25lcm8td2FsbGV0LXJwYzogcmV0dXJucyAwLTQgZXJyb3JzLCBub3QgY29uc2lzdGVudFxuICAgICAgICAgICAgICAvL2Fzc2VydChjaGVjay5nZXRSZWNlaXZlZEFtb3VudCgpID4gMG4pO1xuICAgICAgICAgICAgICBpZiAoY2hlY2suZ2V0UmVjZWl2ZWRBbW91bnQoKSA9PT0gMG4pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIldBUk5JTkc6IGtleSBwcm9vZiBpbmRpY2F0ZXMgbm8gZnVuZHMgcmVjZWl2ZWQgZGVzcGl0ZSB0cmFuc2ZlciAodHhpZD1cIiArIHR4LmdldEhhc2goKSArIFwiLCBrZXk9XCIgKyBrZXkgKyBcIiwgYWRkcmVzcz1cIiArIGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSArIFwiLCBhbW91bnQ9XCIgKyBkZXN0aW5hdGlvbi5nZXRBbW91bnQoKSArIFwiKVwiKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBhc3NlcnQoY2hlY2suZ2V0UmVjZWl2ZWRBbW91bnQoKSA9PT0gMG4pO1xuICAgICAgICAgICAgdGVzdENoZWNrVHgodHgsIGNoZWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgZ2V0IHR4IGtleSB3aXRoIGludmFsaWQgaGFzaFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmdldFR4S2V5KFwiaW52YWxpZF90eF9pZFwiKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgdGhyb3cgZXhjZXB0aW9uIGZvciBpbnZhbGlkIGtleVwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgdGhhdC50ZXN0SW52YWxpZFR4SGFzaEVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGNoZWNrIHdpdGggaW52YWxpZCB0eCBoYXNoXG4gICAgICAgIGxldCB0eCA9IHR4c1swXTtcbiAgICAgICAgbGV0IGtleSA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4S2V5KHR4LmdldEhhc2goKSk7XG4gICAgICAgIGxldCBkZXN0aW5hdGlvbiA9IHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKVswXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5jaGVja1R4S2V5KFwiaW52YWxpZF90eF9pZFwiLCBrZXksIGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvblwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgdGhhdC50ZXN0SW52YWxpZFR4SGFzaEVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGNoZWNrIHdpdGggaW52YWxpZCBrZXlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5jaGVja1R4S2V5KHR4LmdldEhhc2goKSwgXCJpbnZhbGlkX3R4X2tleVwiLCBkZXN0aW5hdGlvbi5nZXRBZGRyZXNzKCkpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBleGNlcHRpb25cIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIHRoYXQudGVzdEludmFsaWRUeEtleUVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGNoZWNrIHdpdGggaW52YWxpZCBhZGRyZXNzXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tUeEtleSh0eC5nZXRIYXNoKCksIGtleSwgXCJpbnZhbGlkX3R4X2FkZHJlc3NcIik7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvblwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgdGhhdC50ZXN0SW52YWxpZEFkZHJlc3NFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBjaGVjayB3aXRoIGRpZmZlcmVudCBhZGRyZXNzXG4gICAgICAgIGxldCBkaWZmZXJlbnRBZGRyZXNzO1xuICAgICAgICBmb3IgKGxldCBhVHggb2YgYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKCkpIHtcbiAgICAgICAgICBpZiAoIWFUeC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgfHwgIWFUeC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCkpIGNvbnRpbnVlO1xuICAgICAgICAgIGZvciAobGV0IGFEZXN0aW5hdGlvbiBvZiBhVHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpKSB7XG4gICAgICAgICAgICBpZiAoYURlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSAhPT0gZGVzdGluYXRpb24uZ2V0QWRkcmVzcygpKSB7XG4gICAgICAgICAgICAgIGRpZmZlcmVudEFkZHJlc3MgPSBhRGVzdGluYXRpb24uZ2V0QWRkcmVzcygpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0KGRpZmZlcmVudEFkZHJlc3MsIFwiQ291bGQgbm90IGdldCBhIGRpZmZlcmVudCBvdXRnb2luZyBhZGRyZXNzIHRvIHRlc3Q7IHJ1biBzZW5kIHRlc3RzXCIpO1xuICAgICAgICBsZXQgY2hlY2sgPSBhd2FpdCB0aGF0LndhbGxldC5jaGVja1R4S2V5KHR4LmdldEhhc2goKSwga2V5LCBkaWZmZXJlbnRBZGRyZXNzKTtcbiAgICAgICAgYXNzZXJ0KGNoZWNrLmdldElzR29vZCgpKTtcbiAgICAgICAgYXNzZXJ0KGNoZWNrLmdldFJlY2VpdmVkQW1vdW50KCkgPj0gMG4pO1xuICAgICAgICB0ZXN0Q2hlY2tUeCh0eCwgY2hlY2spO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBwcm92ZSBhIHRyYW5zYWN0aW9uIGJ5IGdldHRpbmcgaXRzIHNpZ25hdHVyZVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCByYW5kb20gdHhzIHdpdGggb3V0Z29pbmcgZGVzdGluYXRpb25zXG4gICAgICAgIGxldCB0eHM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdHhzID0gYXdhaXQgZ2V0UmFuZG9tVHJhbnNhY3Rpb25zKHRoYXQud2FsbGV0LCB7dHJhbnNmZXJRdWVyeToge2hhc0Rlc3RpbmF0aW9uczogdHJ1ZX19LCAyLCBNQVhfVFhfUFJPT0ZTKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgaWYgKGUubWVzc2FnZS5pbmRleE9mKFwiZm91bmQgd2l0aFwiKSA+PSAwKSB0aHJvdyBuZXcgRXJyb3IoXCJObyB0eHMgd2l0aCBvdXRnb2luZyBkZXN0aW5hdGlvbnMgZm91bmQ7IHJ1biBzZW5kIHRlc3RzXCIpXG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBnb29kIGNoZWNrcyB3aXRoIG1lc3NhZ2VzXG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIGZvciAobGV0IGRlc3RpbmF0aW9uIG9mIHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKSkge1xuICAgICAgICAgICAgbGV0IHNpZ25hdHVyZSA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4UHJvb2YodHguZ2V0SGFzaCgpLCBkZXN0aW5hdGlvbi5nZXRBZGRyZXNzKCksIFwiVGhpcyB0cmFuc2FjdGlvbiBkZWZpbml0ZWx5IGhhcHBlbmVkLlwiKTtcbiAgICAgICAgICAgIGFzc2VydChzaWduYXR1cmUsIFwiTm8gc2lnbmF0dXJlIHJldHVybmVkIGZyb20gZ2V0VHhQcm9vZigpXCIpO1xuICAgICAgICAgICAgbGV0IGNoZWNrID0gYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tUeFByb29mKHR4LmdldEhhc2goKSwgZGVzdGluYXRpb24uZ2V0QWRkcmVzcygpLCBcIlRoaXMgdHJhbnNhY3Rpb24gZGVmaW5pdGVseSBoYXBwZW5lZC5cIiwgc2lnbmF0dXJlKTtcbiAgICAgICAgICAgIHRlc3RDaGVja1R4KHR4LCBjaGVjayk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGdvb2QgY2hlY2sgd2l0aG91dCBtZXNzYWdlXG4gICAgICAgIGxldCB0eCA9IHR4c1swXTtcbiAgICAgICAgbGV0IGRlc3RpbmF0aW9uID0gdHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpWzBdO1xuICAgICAgICBsZXQgc2lnbmF0dXJlID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhQcm9vZih0eC5nZXRIYXNoKCksIGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSk7XG4gICAgICAgIGxldCBjaGVjayA9IGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrVHhQcm9vZih0eC5nZXRIYXNoKCksIGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSwgdW5kZWZpbmVkLCBzaWduYXR1cmUpO1xuICAgICAgICB0ZXN0Q2hlY2tUeCh0eCwgY2hlY2spO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBnZXQgcHJvb2Ygd2l0aCBpbnZhbGlkIGhhc2hcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5nZXRUeFByb29mKFwiaW52YWxpZF90eF9pZFwiLCBkZXN0aW5hdGlvbi5nZXRBZGRyZXNzKCkpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCB0aHJvdyBleGNlcHRpb24gZm9yIGludmFsaWQga2V5XCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICB0aGF0LnRlc3RJbnZhbGlkVHhIYXNoRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgY2hlY2sgd2l0aCBpbnZhbGlkIHR4IGhhc2hcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5jaGVja1R4UHJvb2YoXCJpbnZhbGlkX3R4X2lkXCIsIGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSwgdW5kZWZpbmVkLCBzaWduYXR1cmUpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBleGNlcHRpb25cIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIHRoYXQudGVzdEludmFsaWRUeEhhc2hFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBjaGVjayB3aXRoIGludmFsaWQgYWRkcmVzc1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrVHhQcm9vZih0eC5nZXRIYXNoKCksIFwiaW52YWxpZF90eF9hZGRyZXNzXCIsIHVuZGVmaW5lZCwgc2lnbmF0dXJlKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXhjZXB0aW9uXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICB0aGF0LnRlc3RJbnZhbGlkQWRkcmVzc0Vycm9yKGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGNoZWNrIHdpdGggd3JvbmcgbWVzc2FnZVxuICAgICAgICBzaWduYXR1cmUgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeFByb29mKHR4LmdldEhhc2goKSwgZGVzdGluYXRpb24uZ2V0QWRkcmVzcygpLCBcIlRoaXMgaXMgdGhlIHJpZ2h0IG1lc3NhZ2VcIik7XG4gICAgICAgIGNoZWNrID0gYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tUeFByb29mKHR4LmdldEhhc2goKSwgZGVzdGluYXRpb24uZ2V0QWRkcmVzcygpLCBcIlRoaXMgaXMgdGhlIHdyb25nIG1lc3NhZ2VcIiwgc2lnbmF0dXJlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNoZWNrLmdldElzR29vZCgpLCBmYWxzZSk7XG4gICAgICAgIHRlc3RDaGVja1R4KHR4LCBjaGVjayk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGNoZWNrIHdpdGggd3Jvbmcgc2lnbmF0dXJlXG4gICAgICAgIGxldCB3cm9uZ1NpZ25hdHVyZSA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4UHJvb2YodHhzWzFdLmdldEhhc2goKSwgdHhzWzFdLmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKVswXS5nZXRBZGRyZXNzKCksIFwiVGhpcyBpcyB0aGUgcmlnaHQgbWVzc2FnZVwiKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjaGVjayA9IGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrVHhQcm9vZih0eC5nZXRIYXNoKCksIGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSwgXCJUaGlzIGlzIHRoZSByaWdodCBtZXNzYWdlXCIsIHdyb25nU2lnbmF0dXJlKTsgIFxuICAgICAgICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRJc0dvb2QoKSwgZmFsc2UpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICB0aGF0LnRlc3RJbnZhbGlkU2lnbmF0dXJlRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgY2hlY2sgd2l0aCBlbXB0eSBzaWduYXR1cmVcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjaGVjayA9IGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrVHhQcm9vZih0eC5nZXRIYXNoKCksIGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSwgXCJUaGlzIGlzIHRoZSByaWdodCBtZXNzYWdlXCIsIFwiXCIpOyAgXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGNoZWNrLmdldElzR29vZCgpLCBmYWxzZSk7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChcIk11c3QgcHJvdmlkZSBzaWduYXR1cmUgdG8gY2hlY2sgdHggcHJvb2ZcIiwgZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBwcm92ZSBhIHNwZW5kIHVzaW5nIGEgZ2VuZXJhdGVkIHNpZ25hdHVyZSBhbmQgbm8gZGVzdGluYXRpb24gcHVibGljIGFkZHJlc3NcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgcmFuZG9tIGNvbmZpcm1lZCBvdXRnb2luZyB0eHNcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IGdldFJhbmRvbVRyYW5zYWN0aW9ucyh0aGF0LndhbGxldCwge2lzSW5jb21pbmc6IGZhbHNlLCBpblR4UG9vbDogZmFsc2UsIGlzRmFpbGVkOiBmYWxzZX0sIDIsIE1BWF9UWF9QUk9PRlMpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNDb25maXJtZWQoKSwgdHJ1ZSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldEluY29taW5nVHJhbnNmZXJzKCksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgYXNzZXJ0KHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgZ29vZCBjaGVja3Mgd2l0aCBtZXNzYWdlc1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBsZXQgc2lnbmF0dXJlID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3BlbmRQcm9vZih0eC5nZXRIYXNoKCksIFwiSSBhbSBhIG1lc3NhZ2UuXCIpO1xuICAgICAgICAgIGFzc2VydChzaWduYXR1cmUsIFwiTm8gc2lnbmF0dXJlIHJldHVybmVkIGZvciBzcGVuZCBwcm9vZlwiKTtcbiAgICAgICAgICBhc3NlcnQoYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tTcGVuZFByb29mKHR4LmdldEhhc2goKSwgXCJJIGFtIGEgbWVzc2FnZS5cIiwgc2lnbmF0dXJlKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgZ29vZCBjaGVjayB3aXRob3V0IG1lc3NhZ2VcbiAgICAgICAgbGV0IHR4ID0gdHhzWzBdO1xuICAgICAgICBsZXQgc2lnbmF0dXJlID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3BlbmRQcm9vZih0eC5nZXRIYXNoKCkpO1xuICAgICAgICBhc3NlcnQoYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tTcGVuZFByb29mKHR4LmdldEhhc2goKSwgdW5kZWZpbmVkLCBzaWduYXR1cmUpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgZ2V0IHByb29mIHdpdGggaW52YWxpZCBoYXNoXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3BlbmRQcm9vZihcImludmFsaWRfdHhfaWRcIik7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIHRocm93IGV4Y2VwdGlvbiBmb3IgaW52YWxpZCBrZXlcIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIHRoYXQudGVzdEludmFsaWRUeEhhc2hFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBjaGVjayB3aXRoIGludmFsaWQgdHggaGFzaFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrU3BlbmRQcm9vZihcImludmFsaWRfdHhfaWRcIiwgdW5kZWZpbmVkLCBzaWduYXR1cmUpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBleGNlcHRpb25cIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIHRoYXQudGVzdEludmFsaWRUeEhhc2hFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBjaGVjayB3aXRoIGludmFsaWQgbWVzc2FnZVxuICAgICAgICBzaWduYXR1cmUgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRTcGVuZFByb29mKHR4LmdldEhhc2goKSwgXCJUaGlzIGlzIHRoZSByaWdodCBtZXNzYWdlXCIpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tTcGVuZFByb29mKHR4LmdldEhhc2goKSwgXCJUaGlzIGlzIHRoZSB3cm9uZyBtZXNzYWdlXCIsIHNpZ25hdHVyZSksIGZhbHNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgY2hlY2sgd2l0aCB3cm9uZyBzaWduYXR1cmVcbiAgICAgICAgc2lnbmF0dXJlID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3BlbmRQcm9vZih0eHNbMV0uZ2V0SGFzaCgpLCBcIlRoaXMgaXMgdGhlIHJpZ2h0IG1lc3NhZ2VcIik7XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB0aGF0LndhbGxldC5jaGVja1NwZW5kUHJvb2YodHguZ2V0SGFzaCgpLCBcIlRoaXMgaXMgdGhlIHJpZ2h0IG1lc3NhZ2VcIiwgc2lnbmF0dXJlKSwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBwcm92ZSByZXNlcnZlcyBpbiB0aGUgd2FsbGV0XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHByb29mIG9mIGVudGlyZSB3YWxsZXRcbiAgICAgICAgbGV0IHNpZ25hdHVyZSA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFJlc2VydmVQcm9vZldhbGxldChcIlRlc3QgbWVzc2FnZVwiKTtcbiAgICAgICAgYXNzZXJ0KHNpZ25hdHVyZSwgXCJObyBzaWduYXR1cmUgcmV0dXJuZWQgZm9yIHdhbGxldCByZXNlcnZlIHByb29mXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gY2hlY2sgcHJvb2Ygb2YgZW50aXJlIHdhbGxldFxuICAgICAgICBsZXQgY2hlY2sgPSBhd2FpdCB0aGF0LndhbGxldC5jaGVja1Jlc2VydmVQcm9vZihhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBcIlRlc3QgbWVzc2FnZVwiLCBzaWduYXR1cmUpO1xuICAgICAgICBhc3NlcnQoY2hlY2suZ2V0SXNHb29kKCkpO1xuICAgICAgICB0ZXN0Q2hlY2tSZXNlcnZlKGNoZWNrKTtcbiAgICAgICAgbGV0IGJhbGFuY2UgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRCYWxhbmNlKCk7XG4gICAgICAgIGlmIChiYWxhbmNlICE9PSBjaGVjay5nZXRUb3RhbEFtb3VudCgpKSB7IC8vIFRPRE8gbW9uZXJvLXdhbGxldC1ycGM6IHRoaXMgY2hlY2sgZmFpbHMgd2l0aCB1bmNvbmZpcm1lZCB0eHNcbiAgICAgICAgICBsZXQgdW5jb25maXJtZWRUeHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRUeHMoe2luVHhQb29sOiB0cnVlfSk7XG4gICAgICAgICAgYXNzZXJ0KHVuY29uZmlybWVkVHhzLmxlbmd0aCA+IDAsIFwiUmVzZXJ2ZSBhbW91bnQgbXVzdCBlcXVhbCBiYWxhbmNlIHVubGVzcyB3YWxsZXQgaGFzIHVuY29uZmlybWVkIHR4c1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBkaWZmZXJlbnQgd2FsbGV0IGFkZHJlc3NcbiAgICAgICAgbGV0IGRpZmZlcmVudEFkZHJlc3MgPSBhd2FpdCBUZXN0VXRpbHMuZ2V0RXh0ZXJuYWxXYWxsZXRBZGRyZXNzKCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tSZXNlcnZlUHJvb2YoZGlmZmVyZW50QWRkcmVzcywgXCJUZXN0IG1lc3NhZ2VcIiwgc2lnbmF0dXJlKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXhjZXB0aW9uXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICB0aGF0LnRlc3ROb1N1YmFkZHJlc3NFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBzdWJhZGRyZXNzXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tSZXNlcnZlUHJvb2YoKGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3MoMCwgMSkpLmdldEFkZHJlc3MoKSwgXCJUZXN0IG1lc3NhZ2VcIiwgc2lnbmF0dXJlKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXhjZXB0aW9uXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICB0aGF0LnRlc3ROb1N1YmFkZHJlc3NFcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB3cm9uZyBtZXNzYWdlXG4gICAgICAgIGNoZWNrID0gYXdhaXQgdGhhdC53YWxsZXQuY2hlY2tSZXNlcnZlUHJvb2YoYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgXCJXcm9uZyBtZXNzYWdlXCIsIHNpZ25hdHVyZSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRJc0dvb2QoKSwgZmFsc2UpOyAgLy8gVE9ETzogc3BlY2lmaWNhbGx5IHRlc3QgcmVzZXJ2ZSBjaGVja3MsIHByb2JhYmx5IHNlcGFyYXRlIG9iamVjdHNcbiAgICAgICAgdGVzdENoZWNrUmVzZXJ2ZShjaGVjayk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHdyb25nIHNpZ25hdHVyZVxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrUmVzZXJ2ZVByb29mKGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIFwiVGVzdCBtZXNzYWdlXCIsIFwid3Jvbmcgc2lnbmF0dXJlXCIpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBleGNlcHRpb25cIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIHRoYXQudGVzdFNpZ25hdHVyZUhlYWRlckNoZWNrRXJyb3IoZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gcHJvdmUgcmVzZXJ2ZXMgaW4gYW4gYWNjb3VudFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgcHJvb2ZzIG9mIGFjY291bnRzXG4gICAgICAgIGxldCBudW1Ob25aZXJvVGVzdHMgPSAwO1xuICAgICAgICBsZXQgbXNnID0gXCJUZXN0IG1lc3NhZ2VcIjtcbiAgICAgICAgbGV0IGFjY291bnRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHMoKTtcbiAgICAgICAgbGV0IHNpZ25hdHVyZTtcbiAgICAgICAgZm9yIChsZXQgYWNjb3VudCBvZiBhY2NvdW50cykge1xuICAgICAgICAgIGlmIChhY2NvdW50LmdldEJhbGFuY2UoKSA+IDBuKSB7XG4gICAgICAgICAgICBsZXQgY2hlY2tBbW91bnQgPSAoYXdhaXQgYWNjb3VudC5nZXRCYWxhbmNlKCkpIC8gKEJpZ0ludCgyKSk7XG4gICAgICAgICAgICBzaWduYXR1cmUgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRSZXNlcnZlUHJvb2ZBY2NvdW50KGFjY291bnQuZ2V0SW5kZXgoKSwgY2hlY2tBbW91bnQsIG1zZyk7XG4gICAgICAgICAgICBsZXQgY2hlY2sgPSBhd2FpdCB0aGF0LndhbGxldC5jaGVja1Jlc2VydmVQcm9vZihhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBtc2csIHNpZ25hdHVyZSk7XG4gICAgICAgICAgICBhc3NlcnQoY2hlY2suZ2V0SXNHb29kKCkpO1xuICAgICAgICAgICAgdGVzdENoZWNrUmVzZXJ2ZShjaGVjayk7XG4gICAgICAgICAgICBhc3NlcnQgKGNoZWNrLmdldFRvdGFsQW1vdW50KCkgPj0gY2hlY2tBbW91bnQpO1xuICAgICAgICAgICAgbnVtTm9uWmVyb1Rlc3RzKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmdldFJlc2VydmVQcm9vZkFjY291bnQoYWNjb3VudC5nZXRJbmRleCgpLCBhY2NvdW50LmdldEJhbGFuY2UoKSwgbXNnKTtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvblwiKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5nZXRDb2RlKCksIC0xKTtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5nZXRSZXNlcnZlUHJvb2ZBY2NvdW50KGFjY291bnQuZ2V0SW5kZXgoKSwgVGVzdFV0aWxzLk1BWF9GRUUsIG1zZyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvblwiKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZTI6IGFueSkge1xuICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlMi5nZXRDb2RlKCksIC0xKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQobnVtTm9uWmVyb1Rlc3RzID4gMSwgXCJNdXN0IGhhdmUgbW9yZSB0aGFuIG9uZSBhY2NvdW50IHdpdGggbm9uLXplcm8gYmFsYW5jZTsgcnVuIHNlbmQtdG8tbXVsdGlwbGUgdGVzdHNcIik7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGVycm9yIHdoZW4gbm90IGVub3VnaCBiYWxhbmNlIGZvciByZXF1ZXN0ZWQgbWluaW11bSByZXNlcnZlIGFtb3VudFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCByZXNlcnZlUHJvb2YgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRSZXNlcnZlUHJvb2ZBY2NvdW50KDAsIGFjY291bnRzWzBdLmdldEJhbGFuY2UoKSArIChUZXN0VXRpbHMuTUFYX0ZFRSksIFwiVGVzdCBtZXNzYWdlXCIpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInNob3VsZCBoYXZlIHRocm93biBlcnJvclwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgaWYgKGUubWVzc2FnZSA9PT0gXCJzaG91bGQgaGF2ZSB0aHJvd24gZXJyb3JcIikgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvbiBidXQgZ290IHJlc2VydmUgcHJvb2Y6IGh0dHBzOi8vZ2l0aHViLmNvbS9tb25lcm8tcHJvamVjdC9tb25lcm8vaXNzdWVzLzY1OTVcIik7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUuZ2V0Q29kZSgpLCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgZGlmZmVyZW50IHdhbGxldCBhZGRyZXNzXG4gICAgICAgIGxldCBkaWZmZXJlbnRBZGRyZXNzID0gYXdhaXQgVGVzdFV0aWxzLmdldEV4dGVybmFsV2FsbGV0QWRkcmVzcygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrUmVzZXJ2ZVByb29mKGRpZmZlcmVudEFkZHJlc3MsIFwiVGVzdCBtZXNzYWdlXCIsIHNpZ25hdHVyZSk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvblwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUuZ2V0Q29kZSgpLCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgc3ViYWRkcmVzc1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmNoZWNrUmVzZXJ2ZVByb29mKChhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzKDAsIDEpKS5nZXRBZGRyZXNzKCksIFwiVGVzdCBtZXNzYWdlXCIsIHNpZ25hdHVyZSk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvblwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUuZ2V0Q29kZSgpLCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgd3JvbmcgbWVzc2FnZVxuICAgICAgICBsZXQgY2hlY2sgPSBhd2FpdCB0aGF0LndhbGxldC5jaGVja1Jlc2VydmVQcm9vZihhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBcIldyb25nIG1lc3NhZ2VcIiwgc2lnbmF0dXJlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNoZWNrLmdldElzR29vZCgpLCBmYWxzZSk7IC8vIFRPRE86IHNwZWNpZmljYWxseSB0ZXN0IHJlc2VydmUgY2hlY2tzLCBwcm9iYWJseSBzZXBhcmF0ZSBvYmplY3RzXG4gICAgICAgIHRlc3RDaGVja1Jlc2VydmUoY2hlY2spO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB3cm9uZyBzaWduYXR1cmVcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5jaGVja1Jlc2VydmVQcm9vZihhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBcIlRlc3QgbWVzc2FnZVwiLCBcIndyb25nIHNpZ25hdHVyZVwiKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXhjZXB0aW9uXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5nZXRDb2RlKCksIC0xKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBleHBvcnQga2V5IGltYWdlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGltYWdlcyA9IGF3YWl0IHRoYXQud2FsbGV0LmV4cG9ydEtleUltYWdlcyh0cnVlKTtcbiAgICAgICAgYXNzZXJ0KEFycmF5LmlzQXJyYXkoaW1hZ2VzKSk7XG4gICAgICAgIGFzc2VydChpbWFnZXMubGVuZ3RoID4gMCwgXCJObyBzaWduZWQga2V5IGltYWdlcyBpbiB3YWxsZXRcIik7XG4gICAgICAgIGZvciAobGV0IGltYWdlIG9mIGltYWdlcykge1xuICAgICAgICAgIGFzc2VydChpbWFnZSBpbnN0YW5jZW9mIE1vbmVyb0tleUltYWdlKTtcbiAgICAgICAgICBhc3NlcnQoaW1hZ2UuZ2V0SGV4KCkpO1xuICAgICAgICAgIGFzc2VydChpbWFnZS5nZXRTaWduYXR1cmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHdhbGxldCBleHBvcnRzIGtleSBpbWFnZXMgc2luY2UgbGFzdCBleHBvcnQgYnkgZGVmYXVsdFxuICAgICAgICBpbWFnZXMgPSBhd2FpdCB0aGF0LndhbGxldC5leHBvcnRLZXlJbWFnZXMoKTtcbiAgICAgICAgbGV0IGltYWdlc0FsbCA9IGF3YWl0IHRoYXQud2FsbGV0LmV4cG9ydEtleUltYWdlcyh0cnVlKTtcbiAgICAgICAgYXNzZXJ0KGltYWdlc0FsbC5sZW5ndGggPiBpbWFnZXMubGVuZ3RoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IG5ldyBrZXkgaW1hZ2VzIGZyb20gdGhlIGxhc3QgaW1wb3J0XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IG91dHB1dHMgaGV4XG4gICAgICAgIGxldCBvdXRwdXRzSGV4ID0gYXdhaXQgdGhhdC53YWxsZXQuZXhwb3J0T3V0cHV0cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gaW1wb3J0IG91dHB1dHMgaGV4XG4gICAgICAgIGlmIChvdXRwdXRzSGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBsZXQgbnVtSW1wb3J0ZWQgPSBhd2FpdCB0aGF0LndhbGxldC5pbXBvcnRPdXRwdXRzKG91dHB1dHNIZXgpO1xuICAgICAgICAgIGFzc2VydChudW1JbXBvcnRlZCA+PSAwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGFuZCB0ZXN0IG5ldyBrZXkgaW1hZ2VzIGZyb20gbGFzdCBpbXBvcnRcbiAgICAgICAgbGV0IGltYWdlcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldE5ld0tleUltYWdlc0Zyb21MYXN0SW1wb3J0KCk7XG4gICAgICAgIGFzc2VydChBcnJheS5pc0FycmF5KGltYWdlcykpO1xuICAgICAgICBhc3NlcnQoaW1hZ2VzLmxlbmd0aCA+IDAsIFwiTm8gbmV3IGtleSBpbWFnZXMgaW4gbGFzdCBpbXBvcnRcIik7ICAvLyBUT0RPOiB0aGVzZSBhcmUgYWxyZWFkeSBrbm93biB0byB0aGUgd2FsbGV0LCBzbyBubyBuZXcga2V5IGltYWdlcyB3aWxsIGJlIGltcG9ydGVkXG4gICAgICAgIGZvciAobGV0IGltYWdlIG9mIGltYWdlcykge1xuICAgICAgICAgIGFzc2VydChpbWFnZS5nZXRIZXgoKSk7XG4gICAgICAgICAgYXNzZXJ0KGltYWdlLmdldFNpZ25hdHVyZSgpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgJiYgZmFsc2UpICAvLyBUT0RPIG1vbmVyby1wcm9qZWN0OiBpbXBvcnRpbmcga2V5IGltYWdlcyBjYW4gY2F1c2UgZXJhc3VyZSBvZiBpbmNvbWluZyB0cmFuc2ZlcnMgcGVyIHdhbGxldDIuY3BwOjExOTU3XG4gICAgICBpdChcIkNhbiBpbXBvcnQga2V5IGltYWdlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGltYWdlcyA9IGF3YWl0IHRoYXQud2FsbGV0LmV4cG9ydEtleUltYWdlcygpO1xuICAgICAgICBhc3NlcnQoQXJyYXkuaXNBcnJheShpbWFnZXMpKTtcbiAgICAgICAgYXNzZXJ0KGltYWdlcy5sZW5ndGggPiAwLCBcIldhbGxldCBkb2VzIG5vdCBoYXZlIGFueSBrZXkgaW1hZ2VzOyBydW4gc2VuZCB0ZXN0c1wiKTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQud2FsbGV0LmltcG9ydEtleUltYWdlcyhpbWFnZXMpO1xuICAgICAgICBhc3NlcnQocmVzdWx0LmdldEhlaWdodCgpID4gMCk7XG4gICAgICAgIFxuICAgICAgICAvLyBkZXRlcm1pbmUgaWYgbm9uLXplcm8gc3BlbnQgYW5kIHVuc3BlbnQgYW1vdW50cyBhcmUgZXhwZWN0ZWRcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyh7aXNDb25maXJtZWQ6IHRydWUsIHRyYW5zZmVyUXVlcnk6IHtpc0luY29taW5nOiBmYWxzZX19KTtcbiAgICAgICAgbGV0IGJhbGFuY2UgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRCYWxhbmNlKCk7XG4gICAgICAgIGxldCBoYXNTcGVudCA9IHR4cy5sZW5ndGggPiAwO1xuICAgICAgICBsZXQgaGFzVW5zcGVudCA9IGJhbGFuY2UgPiAwbjtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgYW1vdW50c1xuICAgICAgICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KHJlc3VsdC5nZXRTcGVudEFtb3VudCgpLCBoYXNTcGVudCk7XG4gICAgICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQocmVzdWx0LmdldFVuc3BlbnRBbW91bnQoKSwgaGFzVW5zcGVudCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHNpZ24gYW5kIHZlcmlmeSBtZXNzYWdlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIG1lc3NhZ2UgdG8gc2lnbiBhbmQgc3ViYWRkcmVzc2VzIHRvIHRlc3RcbiAgICAgICAgbGV0IG1zZyA9IFwiVGhpcyBpcyBhIHN1cGVyIGltcG9ydGFudCBtZXNzYWdlIHdoaWNoIG5lZWRzIHRvIGJlIHNpZ25lZCBhbmQgdmVyaWZpZWQuXCI7XG4gICAgICAgIGxldCBzdWJhZGRyZXNzZXMgPSBbbmV3IE1vbmVyb1N1YmFkZHJlc3Moe2FjY291bnRJbmRleDogMCwgaW5kZXg6IDB9KSwgbmV3IE1vbmVyb1N1YmFkZHJlc3Moe2FjY291bnRJbmRleDogMCwgaW5kZXg6IDF9KSwgbmV3IE1vbmVyb1N1YmFkZHJlc3Moe2FjY291bnRJbmRleDogMSwgaW5kZXg6IDB9KV07XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHNpZ25pbmcgbWVzc2FnZSB3aXRoIHN1YmFkZHJlc3Nlc1xuICAgICAgICBmb3IgKGxldCBzdWJhZGRyZXNzIG9mIHN1YmFkZHJlc3Nlcykge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHNpZ24gYW5kIHZlcmlmeSBtZXNzYWdlIHdpdGggc3BlbmQga2V5XG4gICAgICAgICAgbGV0IHNpZ25hdHVyZSA9IGF3YWl0IHRoYXQud2FsbGV0LnNpZ25NZXNzYWdlKG1zZywgTW9uZXJvTWVzc2FnZVNpZ25hdHVyZVR5cGUuU0lHTl9XSVRIX1NQRU5EX0tFWSwgc3ViYWRkcmVzcy5nZXRBY2NvdW50SW5kZXgoKSwgc3ViYWRkcmVzcy5nZXRJbmRleCgpKTtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhhdC53YWxsZXQudmVyaWZ5TWVzc2FnZShtc2csIGF3YWl0IHRoYXQud2FsbGV0LmdldEFkZHJlc3Moc3ViYWRkcmVzcy5nZXRBY2NvdW50SW5kZXgoKSwgc3ViYWRkcmVzcy5nZXRJbmRleCgpKSwgc2lnbmF0dXJlKTtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKHJlc3VsdCwgbmV3IE1vbmVyb01lc3NhZ2VTaWduYXR1cmVSZXN1bHQoe2lzR29vZDogdHJ1ZSwgaXNPbGQ6IGZhbHNlLCBzaWduYXR1cmVUeXBlOiBNb25lcm9NZXNzYWdlU2lnbmF0dXJlVHlwZS5TSUdOX1dJVEhfU1BFTkRfS0VZLCB2ZXJzaW9uOiAyfSkpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHZlcmlmeSBtZXNzYWdlIHdpdGggaW5jb3JyZWN0IGFkZHJlc3NcbiAgICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGF0LndhbGxldC52ZXJpZnlNZXNzYWdlKG1zZywgYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWRkcmVzcygwLCAyKSwgc2lnbmF0dXJlKTtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKHJlc3VsdCwgbmV3IE1vbmVyb01lc3NhZ2VTaWduYXR1cmVSZXN1bHQoe2lzR29vZDogZmFsc2V9KSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdmVyaWZ5IG1lc3NhZ2Ugd2l0aCBleHRlcm5hbCBhZGRyZXNzXG4gICAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhhdC53YWxsZXQudmVyaWZ5TWVzc2FnZShtc2csIGF3YWl0IFRlc3RVdGlscy5nZXRFeHRlcm5hbFdhbGxldEFkZHJlc3MoKSwgc2lnbmF0dXJlKTtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKHJlc3VsdCwgbmV3IE1vbmVyb01lc3NhZ2VTaWduYXR1cmVSZXN1bHQoe2lzR29vZDogZmFsc2V9KSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdmVyaWZ5IG1lc3NhZ2Ugd2l0aCBpbnZhbGlkIGFkZHJlc3NcbiAgICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGF0LndhbGxldC52ZXJpZnlNZXNzYWdlKG1zZywgXCJpbnZhbGlkIGFkZHJlc3NcIiwgc2lnbmF0dXJlKTtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKHJlc3VsdCwgbmV3IE1vbmVyb01lc3NhZ2VTaWduYXR1cmVSZXN1bHQoe2lzR29vZDogZmFsc2V9KSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc2lnbiBhbmQgdmVyaWZ5IG1lc3NhZ2Ugd2l0aCB2aWV3IGtleVxuICAgICAgICAgIHNpZ25hdHVyZSA9IGF3YWl0IHRoYXQud2FsbGV0LnNpZ25NZXNzYWdlKG1zZywgTW9uZXJvTWVzc2FnZVNpZ25hdHVyZVR5cGUuU0lHTl9XSVRIX1ZJRVdfS0VZLCBzdWJhZGRyZXNzLmdldEFjY291bnRJbmRleCgpLCBzdWJhZGRyZXNzLmdldEluZGV4KCkpO1xuICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoYXQud2FsbGV0LnZlcmlmeU1lc3NhZ2UobXNnLCBhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzKHN1YmFkZHJlc3MuZ2V0QWNjb3VudEluZGV4KCksIHN1YmFkZHJlc3MuZ2V0SW5kZXgoKSksIHNpZ25hdHVyZSk7XG4gICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChyZXN1bHQsIG5ldyBNb25lcm9NZXNzYWdlU2lnbmF0dXJlUmVzdWx0KHtpc0dvb2Q6IHRydWUsIGlzT2xkOiBmYWxzZSwgc2lnbmF0dXJlVHlwZTogTW9uZXJvTWVzc2FnZVNpZ25hdHVyZVR5cGUuU0lHTl9XSVRIX1ZJRVdfS0VZLCB2ZXJzaW9uOiAyfSkpO1xuXG4gICAgICAgICAgLy8gdmVyaWZ5IG1lc3NhZ2Ugd2l0aCBpbmNvcnJlY3QgYWRkcmVzc1xuICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoYXQud2FsbGV0LnZlcmlmeU1lc3NhZ2UobXNnLCBhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzKDAsIDIpLCBzaWduYXR1cmUpO1xuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwocmVzdWx0LCBuZXcgTW9uZXJvTWVzc2FnZVNpZ25hdHVyZVJlc3VsdCh7aXNHb29kOiBmYWxzZX0pKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB2ZXJpZnkgbWVzc2FnZSB3aXRoIGV4dGVybmFsIGFkZHJlc3NcbiAgICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGF0LndhbGxldC52ZXJpZnlNZXNzYWdlKG1zZywgYXdhaXQgVGVzdFV0aWxzLmdldEV4dGVybmFsV2FsbGV0QWRkcmVzcygpLCBzaWduYXR1cmUpO1xuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwocmVzdWx0LCBuZXcgTW9uZXJvTWVzc2FnZVNpZ25hdHVyZVJlc3VsdCh7aXNHb29kOiBmYWxzZX0pKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB2ZXJpZnkgbWVzc2FnZSB3aXRoIGludmFsaWQgYWRkcmVzc1xuICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoYXQud2FsbGV0LnZlcmlmeU1lc3NhZ2UobXNnLCBcImludmFsaWQgYWRkcmVzc1wiLCBzaWduYXR1cmUpO1xuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwocmVzdWx0LCBuZXcgTW9uZXJvTWVzc2FnZVNpZ25hdHVyZVJlc3VsdCh7aXNHb29kOiBmYWxzZX0pKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkhhcyBhbiBhZGRyZXNzIGJvb2tcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBpbml0aWFsIHN0YXRlXG4gICAgICAgIGxldCBlbnRyaWVzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWRkcmVzc0Jvb2tFbnRyaWVzKCk7XG4gICAgICAgIGxldCBudW1FbnRyaWVzU3RhcnQgPSBlbnRyaWVzLmxlbmd0aFxuICAgICAgICBmb3IgKGxldCBlbnRyeSBvZiBlbnRyaWVzKSBhd2FpdCB0ZXN0QWRkcmVzc0Jvb2tFbnRyeShlbnRyeSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGFkZGluZyBzdGFuZGFyZCBhZGRyZXNzZXNcbiAgICAgICAgY29uc3QgTlVNX0VOVFJJRVMgPSA1O1xuICAgICAgICBsZXQgYWRkcmVzcyA9IChhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzKDAsIDApKS5nZXRBZGRyZXNzKCk7XG4gICAgICAgIGxldCBpbmRpY2VzOiBhbnkgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOVU1fRU5UUklFUzsgaSsrKSB7XG4gICAgICAgICAgaW5kaWNlcy5wdXNoKGF3YWl0IHRoYXQud2FsbGV0LmFkZEFkZHJlc3NCb29rRW50cnkoYWRkcmVzcywgXCJoaSB0aGVyZSFcIikpO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzQm9va0VudHJpZXMoKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGVudHJpZXMubGVuZ3RoLCBudW1FbnRyaWVzU3RhcnQgKyBOVU1fRU5UUklFUyk7XG4gICAgICAgIGZvciAobGV0IGlkeCBvZiBpbmRpY2VzKSB7XG4gICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChsZXQgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgICAgICAgaWYgKGlkeCA9PT0gZW50cnkuZ2V0SW5kZXgoKSkge1xuICAgICAgICAgICAgICBhd2FpdCB0ZXN0QWRkcmVzc0Jvb2tFbnRyeShlbnRyeSk7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlbnRyeS5nZXRBZGRyZXNzKCksIGFkZHJlc3MpO1xuICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoZW50cnkuZ2V0RGVzY3JpcHRpb24oKSwgXCJoaSB0aGVyZSFcIik7XG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFzc2VydChmb3VuZCwgXCJJbmRleCBcIiArIGlkeCArIFwiIG5vdCBmb3VuZCBpbiBhZGRyZXNzIGJvb2sgaW5kaWNlc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZWRpdCBlYWNoIGFkZHJlc3MgYm9vayBlbnRyeVxuICAgICAgICBmb3IgKGxldCBpZHggb2YgaW5kaWNlcykge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmVkaXRBZGRyZXNzQm9va0VudHJ5KGlkeCwgZmFsc2UsIHVuZGVmaW5lZCwgdHJ1ZSwgXCJoZWxsbyB0aGVyZSEhXCIpO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzQm9va0VudHJpZXMoaW5kaWNlcyk7XG4gICAgICAgIGZvciAobGV0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoZW50cnkuZ2V0RGVzY3JpcHRpb24oKSwgXCJoZWxsbyB0aGVyZSEhXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBkZWxldGUgZW50cmllcyBhdCBzdGFydGluZyBpbmRleFxuICAgICAgICBsZXQgZGVsZXRlSWR4ID0gaW5kaWNlc1swXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuZGVsZXRlQWRkcmVzc0Jvb2tFbnRyeShkZWxldGVJZHgpO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzQm9va0VudHJpZXMoKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGVudHJpZXMubGVuZ3RoLCBudW1FbnRyaWVzU3RhcnQpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBhZGRpbmcgaW50ZWdyYXRlZCBhZGRyZXNzZXNcbiAgICAgICAgaW5kaWNlcyA9IFtdO1xuICAgICAgICBsZXQgcGF5bWVudElkID0gXCIwMzI4NGU0MWMzNDJmMDNcIjsgLy8gcGF5bWVudCBpZCBsZXNzIG9uZSBjaGFyYWN0ZXJcbiAgICAgICAgbGV0IGludGVncmF0ZWRBZGRyZXNzZXMgPSB7fTtcbiAgICAgICAgbGV0IGludGVncmF0ZWREZXNjcmlwdGlvbnMgPSB7fTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOVU1fRU5UUklFUzsgaSsrKSB7XG4gICAgICAgICAgbGV0IGludGVncmF0ZWRBZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0SW50ZWdyYXRlZEFkZHJlc3ModW5kZWZpbmVkLCBwYXltZW50SWQgKyBpKTsgLy8gY3JlYXRlIHVuaXF1ZSBpbnRlZ3JhdGVkIGFkZHJlc3NcbiAgICAgICAgICBsZXQgdXVpZCA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgICBsZXQgaWR4ID0gYXdhaXQgdGhhdC53YWxsZXQuYWRkQWRkcmVzc0Jvb2tFbnRyeShpbnRlZ3JhdGVkQWRkcmVzcy50b1N0cmluZygpLCB1dWlkKTtcbiAgICAgICAgICBpbmRpY2VzLnB1c2goaWR4KTtcbiAgICAgICAgICBpbnRlZ3JhdGVkQWRkcmVzc2VzW2lkeF0gPSBpbnRlZ3JhdGVkQWRkcmVzcztcbiAgICAgICAgICBpbnRlZ3JhdGVkRGVzY3JpcHRpb25zW2lkeF0gPSB1dWlkO1xuICAgICAgICB9XG4gICAgICAgIGVudHJpZXMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBZGRyZXNzQm9va0VudHJpZXMoKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGVudHJpZXMubGVuZ3RoLCBudW1FbnRyaWVzU3RhcnQgKyBOVU1fRU5UUklFUyk7XG4gICAgICAgIGZvciAobGV0IGlkeCBvZiBpbmRpY2VzKSB7XG4gICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChsZXQgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgICAgICAgaWYgKGlkeCA9PT0gZW50cnkuZ2V0SW5kZXgoKSkge1xuICAgICAgICAgICAgICBhd2FpdCB0ZXN0QWRkcmVzc0Jvb2tFbnRyeShlbnRyeSk7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlbnRyeS5nZXREZXNjcmlwdGlvbigpLCBpbnRlZ3JhdGVkRGVzY3JpcHRpb25zW2lkeF0pO1xuICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwoZW50cnkuZ2V0QWRkcmVzcygpLCBpbnRlZ3JhdGVkQWRkcmVzc2VzW2lkeF0udG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChlbnRyeS5nZXRQYXltZW50SWQoKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYXNzZXJ0KGZvdW5kLCBcIkluZGV4IFwiICsgaWR4ICsgXCIgbm90IGZvdW5kIGluIGFkZHJlc3MgYm9vayBpbmRpY2VzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBkZWxldGUgZW50cmllcyBhdCBzdGFydGluZyBpbmRleFxuICAgICAgICBkZWxldGVJZHggPSBpbmRpY2VzWzBdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGluZGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5kZWxldGVBZGRyZXNzQm9va0VudHJ5KGRlbGV0ZUlkeCk7XG4gICAgICAgIH1cbiAgICAgICAgZW50cmllcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFkZHJlc3NCb29rRW50cmllcygpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZW50cmllcy5sZW5ndGgsIG51bUVudHJpZXNTdGFydCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBhbmQgc2V0IGFyYml0cmFyeSBrZXkvdmFsdWUgYXR0cmlidXRlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHNldCBhdHRyaWJ1dGVzXG4gICAgICAgIGxldCBhdHRycyA9IHt9O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDU7IGkrKykge1xuICAgICAgICAgIGxldCBrZXkgPSBcImF0dHJcIiArIGk7XG4gICAgICAgICAgbGV0IHZhbCA9IEdlblV0aWxzLmdldFVVSUQoKTtcbiAgICAgICAgICBhdHRyc1trZXldID0gdmFsO1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnNldEF0dHJpYnV0ZShrZXksIHZhbCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgYXR0cmlidXRlc1xuICAgICAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoYXR0cnMpKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGF0dHJzW2tleV0sIGF3YWl0IHRoYXQud2FsbGV0LmdldEF0dHJpYnV0ZShrZXkpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGFuIHVuZGVmaW5lZCBhdHRyaWJ1dGVcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHRoYXQud2FsbGV0LmdldEF0dHJpYnV0ZShcInVuc2V0X2tleVwiKSwgdW5kZWZpbmVkKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gY29udmVydCBiZXR3ZWVuIGEgdHggY29uZmlnIGFuZCBwYXltZW50IFVSSVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgd2l0aCBhZGRyZXNzIGFuZCBhbW91bnRcbiAgICAgICAgbGV0IGNvbmZpZzEgPSBuZXcgTW9uZXJvVHhDb25maWcoe2FkZHJlc3M6IGF3YWl0IHRoYXQud2FsbGV0LmdldEFkZHJlc3MoMCwgMCksIGFtb3VudDogQmlnSW50KDApfSk7XG4gICAgICAgIGxldCB1cmkgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQYXltZW50VXJpKGNvbmZpZzEpO1xuICAgICAgICBsZXQgY29uZmlnMiA9IGF3YWl0IHRoYXQud2FsbGV0LnBhcnNlUGF5bWVudFVyaSh1cmkpO1xuICAgICAgICBHZW5VdGlscy5kZWxldGVVbmRlZmluZWRLZXlzKGNvbmZpZzEpO1xuICAgICAgICBHZW5VdGlscy5kZWxldGVVbmRlZmluZWRLZXlzKGNvbmZpZzIpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uZmlnMi50b0pzb24oKSkpLCBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbmZpZzEudG9Kc29uKCkpKSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHdpdGggc3ViYWRkcmVzcyBhbmQgYWxsIGZpZWxkc1xuICAgICAgICBjb25maWcxLmdldERlc3RpbmF0aW9ucygpWzBdLnNldEFkZHJlc3MoKGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3MoMCwgMSkpLmdldEFkZHJlc3MoKSk7XG4gICAgICAgIGNvbmZpZzEuZ2V0RGVzdGluYXRpb25zKClbMF0uc2V0QW1vdW50KDQyNTAwMDAwMDAwMG4pO1xuICAgICAgICBjb25maWcxLnNldFJlY2lwaWVudE5hbWUoXCJKb2huIERvZVwiKTtcbiAgICAgICAgY29uZmlnMS5zZXROb3RlKFwiT01aRyBYTVIgRlRXXCIpO1xuICAgICAgICB1cmkgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQYXltZW50VXJpKGNvbmZpZzEudG9Kc29uKCkpO1xuICAgICAgICBjb25maWcyID0gYXdhaXQgdGhhdC53YWxsZXQucGFyc2VQYXltZW50VXJpKHVyaSk7XG4gICAgICAgIEdlblV0aWxzLmRlbGV0ZVVuZGVmaW5lZEtleXMoY29uZmlnMSk7XG4gICAgICAgIEdlblV0aWxzLmRlbGV0ZVVuZGVmaW5lZEtleXMoY29uZmlnMik7XG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25maWcyLnRvSnNvbigpKSksIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uZmlnMS50b0pzb24oKSkpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgd2l0aCB1bmRlZmluZWQgYWRkcmVzc1xuICAgICAgICBsZXQgYWRkcmVzcyA9IGNvbmZpZzEuZ2V0RGVzdGluYXRpb25zKClbMF0uZ2V0QWRkcmVzcygpO1xuICAgICAgICBjb25maWcxLmdldERlc3RpbmF0aW9ucygpWzBdLnNldEFkZHJlc3ModW5kZWZpbmVkKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5nZXRQYXltZW50VXJpKGNvbmZpZzEpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBleGNlcHRpb24gd2l0aCBpbnZhbGlkIHBhcmFtZXRlcnNcIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGFzc2VydChlLm1lc3NhZ2UuaW5kZXhPZihcIkNhbm5vdCBtYWtlIFVSSSBmcm9tIHN1cHBsaWVkIHBhcmFtZXRlcnNcIikgPj0gMCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnMS5nZXREZXN0aW5hdGlvbnMoKVswXS5zZXRBZGRyZXNzKGFkZHJlc3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB3aXRoIHN0YW5kYWxvbmUgcGF5bWVudCBpZFxuICAgICAgICBjb25maWcxLnNldFBheW1lbnRJZChcIjAzMjg0ZTQxYzM0MmYwMzYwMzI4NGU0MWMzNDJmMDM2MDMyODRlNDFjMzQyZjAzNjAzMjg0ZTQxYzM0MmYwMzZcIik7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuZ2V0UGF5bWVudFVyaShjb25maWcxKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXhjZXB0aW9uIHdpdGggaW52YWxpZCBwYXJhbWV0ZXJzXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQoZS5tZXNzYWdlLmluZGV4T2YoXCJDYW5ub3QgbWFrZSBVUkkgZnJvbSBzdXBwbGllZCBwYXJhbWV0ZXJzXCIpID49IDApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHN0YXJ0IGFuZCBzdG9wIG1pbmluZ1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IHN0YXR1cyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldE1pbmluZ1N0YXR1cygpO1xuICAgICAgICBpZiAoc3RhdHVzLmdldElzQWN0aXZlKCkpIGF3YWl0IHRoYXQud2FsbGV0LnN0b3BNaW5pbmcoKTtcbiAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuc3RhcnRNaW5pbmcoMiwgZmFsc2UsIHRydWUpO1xuICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5zdG9wTWluaW5nKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGNoYW5nZSB0aGUgd2FsbGV0IHBhc3N3b3JkXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIHJhbmRvbSB3YWxsZXRcbiAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KG5ldyBNb25lcm9XYWxsZXRDb25maWcoKS5zZXRQYXNzd29yZChUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKSk7XG4gICAgICAgIGxldCBwYXRoID0gYXdhaXQgd2FsbGV0LmdldFBhdGgoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNoYW5nZSBwYXNzd29yZFxuICAgICAgICBsZXQgbmV3UGFzc3dvcmQgPSBcIlwiO1xuICAgICAgICBhd2FpdCB3YWxsZXQuY2hhbmdlUGFzc3dvcmQoVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCwgbmV3UGFzc3dvcmQpO1xuICAgICAgICBcbiAgICAgICAgLy8gY2xvc2Ugd2FsbGV0IHdpdGhvdXQgc2F2aW5nXG4gICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQod2FsbGV0LCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIG9sZCBwYXNzd29yZCBkb2VzIG5vdCB3b3JrIChwYXNzd29yZCBjaGFuZ2UgaXMgYXV0byBzYXZlZClcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0Lm9wZW5XYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpLnNldFBhdGgocGF0aCkuc2V0UGFzc3dvcmQoVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCkpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93blwiKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQoZXJyLm1lc3NhZ2UgPT09IFwiRmFpbGVkIHRvIG9wZW4gd2FsbGV0XCIgfHwgZXJyLm1lc3NhZ2UgPT09IFwiaW52YWxpZCBwYXNzd29yZFwiKTsgLy8gVE9ETzogZGlmZmVyZW50IGVycm9ycyBmcm9tIHJwYyBhbmQgd2FsbGV0MlxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBvcGVuIHdhbGxldCB3aXRoIG5ldyBwYXNzd29yZFxuICAgICAgICB3YWxsZXQgPSBhd2FpdCB0aGF0Lm9wZW5XYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpLnNldFBhdGgocGF0aCkuc2V0UGFzc3dvcmQobmV3UGFzc3dvcmQpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNoYW5nZSBwYXNzd29yZCB3aXRoIGluY29ycmVjdCBwYXNzd29yZFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHdhbGxldC5jaGFuZ2VQYXNzd29yZChcImJhZHBhc3N3b3JkXCIsIG5ld1Bhc3N3b3JkKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd25cIik7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGVyci5tZXNzYWdlLCBcIkludmFsaWQgb3JpZ2luYWwgcGFzc3dvcmQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBzYXZlIGFuZCBjbG9zZVxuICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHdhbGxldCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBvcGVuIHdhbGxldFxuICAgICAgICB3YWxsZXQgPSBhd2FpdCB0aGF0Lm9wZW5XYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpLnNldFBhdGgocGF0aCkuc2V0UGFzc3dvcmQobmV3UGFzc3dvcmQpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNsb3NlIHdhbGxldFxuICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHdhbGxldCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHNhdmUgYW5kIGNsb3NlIHRoZSB3YWxsZXQgaW4gYSBzaW5nbGUgY2FsbFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSByYW5kb20gd2FsbGV0XG4gICAgICAgIGxldCBwYXNzd29yZCA9IFwiXCI7IC8vIHVuZW5jcnlwdGVkXG4gICAgICAgIGxldCB3YWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7cGFzc3dvcmQ6IHBhc3N3b3JkfSk7XG4gICAgICAgIGxldCBwYXRoID0gYXdhaXQgd2FsbGV0LmdldFBhdGgoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHNldCBhbiBhdHRyaWJ1dGVcbiAgICAgICAgbGV0IHV1aWQgPSBHZW5VdGlscy5nZXRVVUlEKCk7XG4gICAgICAgIGF3YWl0IHdhbGxldC5zZXRBdHRyaWJ1dGUoXCJpZFwiLCB1dWlkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNsb3NlIHRoZSB3YWxsZXQgd2l0aG91dCBzYXZpbmdcbiAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmUtb3BlbiB0aGUgd2FsbGV0IGFuZCBlbnN1cmUgYXR0cmlidXRlIHdhcyBub3Qgc2F2ZWRcbiAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5vcGVuV2FsbGV0KHtwYXRoOiBwYXRoLCBwYXNzd29yZDogcGFzc3dvcmR9KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRBdHRyaWJ1dGUoXCJpZFwiKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHNldCB0aGUgYXR0cmlidXRlIGFuZCBjbG9zZSB3aXRoIHNhdmluZ1xuICAgICAgICBhd2FpdCB3YWxsZXQuc2V0QXR0cmlidXRlKFwiaWRcIiwgdXVpZCk7XG4gICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQod2FsbGV0LCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlLW9wZW4gdGhlIHdhbGxldCBhbmQgZW5zdXJlIGF0dHJpYnV0ZSB3YXMgc2F2ZWRcbiAgICAgICAgd2FsbGV0ID0gYXdhaXQgdGhhdC5vcGVuV2FsbGV0KHtwYXRoOiBwYXRoLCBwYXNzd29yZDogcGFzc3dvcmR9KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHdhbGxldC5nZXRBdHRyaWJ1dGUoXCJpZFwiKSwgdXVpZCk7XG4gICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQod2FsbGV0KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBOT1RJRklDQVRJT04gVEVTVFMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm90aWZpY2F0aW9ucylcbiAgICAgIGl0KFwiQ2FuIGdlbmVyYXRlIG5vdGlmaWNhdGlvbnMgc2VuZGluZyB0byBkaWZmZXJlbnQgd2FsbGV0LlwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgdGVzdFdhbGxldE5vdGlmaWNhdGlvbnMoXCJ0ZXN0Tm90aWZpY2F0aW9uc0RpZmZlcmVudFdhbGxldFwiLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vdGlmaWNhdGlvbnMpXG4gICAgICBpdChcIkNhbiBnZW5lcmF0ZSBub3RpZmljYXRpb25zIHNlbmRpbmcgdG8gZGlmZmVyZW50IHdhbGxldCB3aGVuIHJlbGF5ZWRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RXYWxsZXROb3RpZmljYXRpb25zKFwidGVzdE5vdGlmaWNhdGlvbnNEaWZmZXJlbnRXYWxsZXRXaGVuUmVsYXllZFwiLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCB0cnVlLCAzKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm90aWZpY2F0aW9ucylcbiAgICAgIGl0KFwiQ2FuIGdlbmVyYXRlIG5vdGlmaWNhdGlvbnMgc2VuZGluZyB0byBkaWZmZXJlbnQgYWNjb3VudC5cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RXYWxsZXROb3RpZmljYXRpb25zKFwidGVzdE5vdGlmaWNhdGlvbnNEaWZmZXJlbnRBY2NvdW50c1wiLCB0cnVlLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCAwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm90aWZpY2F0aW9ucylcbiAgICAgIGl0KFwiQ2FuIGdlbmVyYXRlIG5vdGlmaWNhdGlvbnMgc2VuZGluZyB0byBzYW1lIGFjY291bnRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RXYWxsZXROb3RpZmljYXRpb25zKFwidGVzdE5vdGlmaWNhdGlvbnNTYW1lQWNjb3VudFwiLCB0cnVlLCB0cnVlLCBmYWxzZSwgZmFsc2UsIDApO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb3RpZmljYXRpb25zKVxuICAgICAgaXQoXCJDYW4gZ2VuZXJhdGUgbm90aWZpY2F0aW9ucyBzd2VlcGluZyBvdXRwdXQgdG8gZGlmZmVyZW50IGFjY291bnRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RXYWxsZXROb3RpZmljYXRpb25zKFwidGVzdE5vdGlmaWNhdGlvbnNEaWZmZXJlbnRBY2NvdW50U3dlZXBPdXRwdXRcIiwgdHJ1ZSwgZmFsc2UsIHRydWUsIGZhbHNlLCAwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm90aWZpY2F0aW9ucylcbiAgICAgIGl0KFwiQ2FuIGdlbmVyYXRlIG5vdGlmaWNhdGlvbnMgc3dlZXBpbmcgb3V0cHV0IHRvIHNhbWUgYWNjb3VudCB3aGVuIHJlbGF5ZWRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RXYWxsZXROb3RpZmljYXRpb25zKFwidGVzdE5vdGlmaWNhdGlvbnNTYW1lQWNjb3VudFN3ZWVwT3V0cHV0V2hlblJlbGF5ZWRcIiwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgdHJ1ZSwgMCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgYXN5bmMgZnVuY3Rpb24gdGVzdFdhbGxldE5vdGlmaWNhdGlvbnModGVzdE5hbWUsIHNhbWVXYWxsZXQsIHNhbWVBY2NvdW50LCBzd2VlcE91dHB1dCwgY3JlYXRlVGhlblJlbGF5LCB1bmxvY2tEZWxheSkge1xuICAgICAgICBsZXQgaXNzdWVzID0gYXdhaXQgdGVzdFdhbGxldE5vdGlmaWNhdGlvbnNBdXgoc2FtZVdhbGxldCwgc2FtZUFjY291bnQsIHN3ZWVwT3V0cHV0LCBjcmVhdGVUaGVuUmVsYXksIHVubG9ja0RlbGF5KTtcbiAgICAgICAgaWYgKGlzc3Vlcy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgbGV0IG1zZyA9IHRlc3ROYW1lICsgXCIoXCIgKyBzYW1lV2FsbGV0ICsgXCIsIFwiICsgc2FtZUFjY291bnQgKyBcIiwgXCIgKyBzd2VlcE91dHB1dCArIFwiLCBcIiArIGNyZWF0ZVRoZW5SZWxheSArIFwiKSBnZW5lcmF0ZWQgXCIgKyBpc3N1ZXMubGVuZ3RoICsgXCIgaXNzdWVzOlxcblwiICsgaXNzdWVzVG9TdHIoaXNzdWVzKTtcbiAgICAgICAgY29uc29sZS5sb2cobXNnKTtcbiAgICAgICAgaWYgKG1zZy5pbmNsdWRlcyhcIkVSUk9SOlwiKSkgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIFRPRE86IHRlc3Qgc3dlZXBVbmxvY2tlZCgpXG4gICAgICBhc3luYyBmdW5jdGlvbiB0ZXN0V2FsbGV0Tm90aWZpY2F0aW9uc0F1eChzYW1lV2FsbGV0LCBzYW1lQWNjb3VudCwgc3dlZXBPdXRwdXQsIGNyZWF0ZVRoZW5SZWxheSwgdW5sb2NrRGVsYXkpIHtcbiAgICAgICAgbGV0IE1BWF9QT0xMX1RJTUUgPSA1MDAwOyAvLyBtYXhpbXVtIHRpbWUgZ3JhbnRlZCBmb3Igd2FsbGV0IHRvIHBvbGxcbiAgICAgICAgXG4gICAgICAgIC8vIGNvbGxlY3QgaXNzdWVzIGFzIHRlc3QgcnVuc1xuICAgICAgICBsZXQgaXNzdWVzOiBhbnlbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gc2V0IHNlbmRlciBhbmQgcmVjZWl2ZXJcbiAgICAgICAgbGV0IHNlbmRlciA9IHRoYXQud2FsbGV0O1xuICAgICAgICBsZXQgcmVjZWl2ZXIgPSBzYW1lV2FsbGV0ID8gc2VuZGVyIDogYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSByZWNlaXZlciBhY2NvdW50cyBpZiBuZWNlc3NhcnlcbiAgICAgICAgbGV0IG51bUFjY291bnRzID0gKGF3YWl0IHJlY2VpdmVyLmdldEFjY291bnRzKCkpLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCA0IC0gbnVtQWNjb3VudHM7IGkrKykgYXdhaXQgcmVjZWl2ZXIuY3JlYXRlQWNjb3VudCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gd2FpdCBmb3IgdW5sb2NrZWQgZnVuZHMgaW4gc291cmNlIGFjY291bnRcbiAgICAgICAgYXdhaXQgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbChzZW5kZXIpO1xuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvclVubG9ja2VkQmFsYW5jZShzZW5kZXIsIDAsIHVuZGVmaW5lZCwgVGVzdFV0aWxzLk1BWF9GRUUgKiAoMTBuKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgYmFsYW5jZXMgdG8gY29tcGFyZSBhZnRlciBzZW5kaW5nXG4gICAgICAgIGxldCBzZW5kZXJCYWxhbmNlQmVmb3JlID0gYXdhaXQgc2VuZGVyLmdldEJhbGFuY2UoKTtcbiAgICAgICAgbGV0IHNlbmRlclVubG9ja2VkQmFsYW5jZUJlZm9yZSA9IGF3YWl0IHNlbmRlci5nZXRVbmxvY2tlZEJhbGFuY2UoKTtcbiAgICAgICAgbGV0IHJlY2VpdmVyQmFsYW5jZUJlZm9yZSA9IGF3YWl0IHJlY2VpdmVyLmdldEJhbGFuY2UoKTtcbiAgICAgICAgbGV0IHJlY2VpdmVyVW5sb2NrZWRCYWxhbmNlQmVmb3JlID0gYXdhaXQgcmVjZWl2ZXIuZ2V0VW5sb2NrZWRCYWxhbmNlKCk7XG4gICAgICAgIGxldCBsYXN0SGVpZ2h0ID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBzdGFydCBjb2xsZWN0aW5nIG5vdGlmaWNhdGlvbnMgZnJvbSBzZW5kZXIgYW5kIHJlY2VpdmVyXG4gICAgICAgIGxldCBzZW5kZXJOb3RpZmljYXRpb25Db2xsZWN0b3IgPSBuZXcgV2FsbGV0Tm90aWZpY2F0aW9uQ29sbGVjdG9yKCk7XG4gICAgICAgIGxldCByZWNlaXZlck5vdGlmaWNhdGlvbkNvbGxlY3RvciA9IG5ldyBXYWxsZXROb3RpZmljYXRpb25Db2xsZWN0b3IoKTtcbiAgICAgICAgYXdhaXQgc2VuZGVyLmFkZExpc3RlbmVyKHNlbmRlck5vdGlmaWNhdGlvbkNvbGxlY3Rvcik7XG4gICAgICAgIGF3YWl0IEdlblV0aWxzLndhaXRGb3IoVGVzdFV0aWxzLlNZTkNfUEVSSU9EX0lOX01TIC8gMik7IC8vIFRPRE86IHJlbW92ZSB0aGlzLCBzaG91bGQgYmUgdW5uZWNlc3NhcnlcbiAgICAgICAgYXdhaXQgcmVjZWl2ZXIuYWRkTGlzdGVuZXIocmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3IpO1xuICAgICAgICBcbiAgICAgICAgLy8gc2VuZCBmdW5kc1xuICAgICAgICBsZXQgY3R4OiBhbnkgPSB7d2FsbGV0OiBzZW5kZXIsIGlzU2VuZFJlc3BvbnNlOiB0cnVlfTtcbiAgICAgICAgbGV0IHNlbmRlclR4O1xuICAgICAgICBsZXQgZGVzdGluYXRpb25BY2NvdW50cyA9IHNhbWVBY2NvdW50ID8gKHN3ZWVwT3V0cHV0ID8gWzBdIDogWzAsIDEsIDJdKSA6IChzd2VlcE91dHB1dCA/IFsxXSA6IFsxLCAyLCAzXSk7XG4gICAgICAgIGxldCBleHBlY3RlZE91dHB1dHM6IGFueSA9IFtdO1xuICAgICAgICBpZiAoc3dlZXBPdXRwdXQpIHtcbiAgICAgICAgICBjdHguaXNTd2VlcFJlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICBjdHguaXNTd2VlcE91dHB1dFJlc3BvbnNlID0gdHJ1ZTtcbiAgICAgICAgICBsZXQgb3V0cHV0cyA9IGF3YWl0IHNlbmRlci5nZXRPdXRwdXRzKHtpc1NwZW50OiBmYWxzZSwgYWNjb3VudEluZGV4OiAwLCBtaW5BbW91bnQ6IFRlc3RVdGlscy5NQVhfRkVFICogKDVuKSwgdHhRdWVyeToge2lzTG9ja2VkOiBmYWxzZX19KTtcbiAgICAgICAgICBpZiAob3V0cHV0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKFwiRVJST1I6IE5vIG91dHB1dHMgYXZhaWxhYmxlIHRvIHN3ZWVwIGZyb20gYWNjb3VudCAwXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGlzc3VlcztcbiAgICAgICAgICB9XG4gICAgICAgICAgbGV0IGNvbmZpZyA9IHthZGRyZXNzOiBhd2FpdCByZWNlaXZlci5nZXRBZGRyZXNzKGRlc3RpbmF0aW9uQWNjb3VudHNbMF0sIDApLCBrZXlJbWFnZTogb3V0cHV0c1swXS5nZXRLZXlJbWFnZSgpLmdldEhleCgpLCByZWxheTogIWNyZWF0ZVRoZW5SZWxheX07XG4gICAgICAgICAgc2VuZGVyVHggPSBhd2FpdCBzZW5kZXIuc3dlZXBPdXRwdXQoY29uZmlnKTtcbiAgICAgICAgICBleHBlY3RlZE91dHB1dHMucHVzaChuZXcgTW9uZXJvT3V0cHV0V2FsbGV0KCkuc2V0QW1vdW50KHNlbmRlclR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKVswXS5nZXRBbW91bnQoKSkuc2V0QWNjb3VudEluZGV4KGRlc3RpbmF0aW9uQWNjb3VudHNbMF0pLnNldFN1YmFkZHJlc3NJbmRleCgwKSk7XG4gICAgICAgICAgY3R4LmNvbmZpZyA9IG5ldyBNb25lcm9UeENvbmZpZyhjb25maWcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxldCBjb25maWcgPSBuZXcgTW9uZXJvVHhDb25maWcoKS5zZXRBY2NvdW50SW5kZXgoMCkuc2V0UmVsYXkoIWNyZWF0ZVRoZW5SZWxheSk7XG4gICAgICAgICAgZm9yIChsZXQgZGVzdGluYXRpb25BY2NvdW50IG9mIGRlc3RpbmF0aW9uQWNjb3VudHMpIHtcbiAgICAgICAgICAgIGNvbmZpZy5hZGREZXN0aW5hdGlvbihhd2FpdCByZWNlaXZlci5nZXRBZGRyZXNzKGRlc3RpbmF0aW9uQWNjb3VudCwgMCksIFRlc3RVdGlscy5NQVhfRkVFKTsgLy8gVE9ETzogc2VuZCBhbmQgY2hlY2sgcmFuZG9tIGFtb3VudHM/XG4gICAgICAgICAgICBleHBlY3RlZE91dHB1dHMucHVzaChuZXcgTW9uZXJvT3V0cHV0V2FsbGV0KCkuc2V0QW1vdW50KFRlc3RVdGlscy5NQVhfRkVFKS5zZXRBY2NvdW50SW5kZXgoZGVzdGluYXRpb25BY2NvdW50KS5zZXRTdWJhZGRyZXNzSW5kZXgoMCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZW5kZXJUeCA9IGF3YWl0IHNlbmRlci5jcmVhdGVUeChjb25maWcpO1xuICAgICAgICAgIGN0eC5jb25maWcgPSBjb25maWc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNyZWF0ZVRoZW5SZWxheSkgYXdhaXQgc2VuZGVyLnJlbGF5VHgoc2VuZGVyVHgpO1xuXG4gICAgICAgIC8vIHN0YXJ0IHRpbWVyIHRvIG1lYXN1cmUgZW5kIG9mIHN5bmMgcGVyaW9kXG4gICAgICAgIGxldCBzdGFydFRpbWUgPSBEYXRlLm5vdygpOyAvLyB0aW1lc3RhbXAgaW4gbXNcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgc2VuZCB0eFxuICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldChzZW5kZXJUeCwgY3R4KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qgc2VuZGVyIGFmdGVyIHNlbmRpbmdcbiAgICAgICAgbGV0IG91dHB1dFF1ZXJ5ID0gbmV3IE1vbmVyb091dHB1dFF1ZXJ5KCkuc2V0VHhRdWVyeShuZXcgTW9uZXJvVHhRdWVyeSgpLnNldEhhc2goc2VuZGVyVHguZ2V0SGFzaCgpKSk7IC8vIHF1ZXJ5IGZvciBvdXRwdXRzIGZyb20gc2VuZGVyIHR4XG4gICAgICAgIGlmIChzYW1lV2FsbGV0KSB7XG4gICAgICAgICAgaWYgKHNlbmRlclR4LmdldEluY29taW5nQW1vdW50KCkgPT09IHVuZGVmaW5lZCkgaXNzdWVzLnB1c2goXCJXQVJOSU5HOiBzZW5kZXIgdHggaW5jb21pbmcgYW1vdW50IGlzIG51bGwgd2hlbiBzZW50IHRvIHNhbWUgd2FsbGV0XCIpO1xuICAgICAgICAgIGVsc2UgaWYgKHNlbmRlclR4LmdldEluY29taW5nQW1vdW50KCkgPT09IDBuKSBpc3N1ZXMucHVzaChcIldBUk5JTkc6IHNlbmRlciB0eCBpbmNvbWluZyBhbW91bnQgaXMgMCB3aGVuIHNlbnQgdG8gc2FtZSB3YWxsZXRcIik7XG4gICAgICAgICAgZWxzZSBpZiAoc2VuZGVyVHguZ2V0SW5jb21pbmdBbW91bnQoKSAhPT0gc2VuZGVyVHguZ2V0T3V0Z29pbmdBbW91bnQoKSAtIChzZW5kZXJUeC5nZXRGZWUoKSkpIGlzc3Vlcy5wdXNoKFwiV0FSTklORzogc2VuZGVyIHR4IGluY29taW5nIGFtb3VudCAhPSBvdXRnb2luZyBhbW91bnQgLSBmZWUgd2hlbiBzZW50IHRvIHNhbWUgd2FsbGV0XCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChzZW5kZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpICE9PSB1bmRlZmluZWQpIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHR4IGluY29taW5nIGFtb3VudCBzaG91bGQgYmUgdW5kZWZpbmVkXCIpOyAvLyBUT0RPOiBzaG91bGQgYmUgMD8gdGhlbiBjYW4gcmVtb3ZlIHVuZGVmaW5lZCBjaGVja3MgaW4gdGhpcyBtZXRob2RcbiAgICAgICAgfVxuICAgICAgICBzZW5kZXJUeCA9IChhd2FpdCBzZW5kZXIuZ2V0VHhzKG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0SGFzaChzZW5kZXJUeC5nZXRIYXNoKCkpLnNldEluY2x1ZGVPdXRwdXRzKHRydWUpKSlbMF07XG4gICAgICAgIGlmIChhd2FpdCBzZW5kZXIuZ2V0QmFsYW5jZSgpICE9PSBzZW5kZXJCYWxhbmNlQmVmb3JlIC0gKHNlbmRlclR4LmdldEZlZSgpKSAtIChzZW5kZXJUeC5nZXRPdXRnb2luZ0Ftb3VudCgpKSArIChzZW5kZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpID09PSB1bmRlZmluZWQgPyAwbiA6IHNlbmRlclR4LmdldEluY29taW5nQW1vdW50KCkpKSBpc3N1ZXMucHVzaChcIkVSUk9SOiBzZW5kZXIgYmFsYW5jZSBhZnRlciBzZW5kICE9IGJhbGFuY2UgYmVmb3JlIC0gdHggZmVlIC0gb3V0Z29pbmcgYW1vdW50ICsgaW5jb21pbmcgYW1vdW50IChcIiArIGF3YWl0IHNlbmRlci5nZXRCYWxhbmNlKCkgKyBcIiAhPSBcIiArIHNlbmRlckJhbGFuY2VCZWZvcmUgKyBcIiAtIFwiICsgc2VuZGVyVHguZ2V0RmVlKCkgKyBcIiAtIFwiICsgc2VuZGVyVHguZ2V0T3V0Z29pbmdBbW91bnQoKSArIFwiICsgXCIgKyBzZW5kZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpICsgXCIpXCIpO1xuICAgICAgICBpZiAoYXdhaXQgc2VuZGVyLmdldFVubG9ja2VkQmFsYW5jZSgpID49IHNlbmRlclVubG9ja2VkQmFsYW5jZUJlZm9yZSkgaXNzdWVzLnB1c2goXCJFUlJPUjogc2VuZGVyIHVubG9ja2VkIGJhbGFuY2Ugc2hvdWxkIGhhdmUgZGVjcmVhc2VkIGFmdGVyIHNlbmRpbmdcIik7XG4gICAgICAgIGlmIChzZW5kZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKS5sZW5ndGggPT09IDApIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHNlbmRlciBkaWQgbm90IG5vdGlmeSBiYWxhbmNlIGNoYW5nZSBhZnRlciBzZW5kaW5nXCIpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAoYXdhaXQgc2VuZGVyLmdldEJhbGFuY2UoKSAhPT0gc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKClbc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKCkubGVuZ3RoIC0gMV0uYmFsYW5jZSkgaXNzdWVzLnB1c2goXCJFUlJPUjogc2VuZGVyIGJhbGFuY2UgIT0gbGFzdCBub3RpZmllZCBiYWxhbmNlIGFmdGVyIHNlbmRpbmcgKFwiICsgYXdhaXQgc2VuZGVyLmdldEJhbGFuY2UoKSArIFwiICE9IFwiICsgc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKClbc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKCkubGVuZ3RoIC0gMV1bMF0pICsgXCIpXCI7XG4gICAgICAgICAgaWYgKGF3YWl0IHNlbmRlci5nZXRVbmxvY2tlZEJhbGFuY2UoKSAhPT0gc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKClbc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKCkubGVuZ3RoIC0gMV0udW5sb2NrZWRCYWxhbmNlKSBpc3N1ZXMucHVzaChcIkVSUk9SOiBzZW5kZXIgdW5sb2NrZWQgYmFsYW5jZSAhPSBsYXN0IG5vdGlmaWVkIHVubG9ja2VkIGJhbGFuY2UgYWZ0ZXIgc2VuZGluZyAoXCIgKyBhd2FpdCBzZW5kZXIuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgKyBcIiAhPSBcIiArIHNlbmRlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRCYWxhbmNlTm90aWZpY2F0aW9ucygpW3NlbmRlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRCYWxhbmNlTm90aWZpY2F0aW9ucygpLmxlbmd0aCAtIDFdWzFdKSArIFwiKVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZW5kZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0T3V0cHV0c1NwZW50KG91dHB1dFF1ZXJ5KS5sZW5ndGggPT09IDApIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHNlbmRlciBkaWQgbm90IGFubm91bmNlIHVuY29uZmlybWVkIHNwZW50IG91dHB1dFwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgcmVjZWl2ZXIgYWZ0ZXIgMiBzeW5jIHBlcmlvZHNcbiAgICAgICAgYXdhaXQgR2VuVXRpbHMud2FpdEZvcihUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMgKiAyIC0gKERhdGUubm93KCkgLSBzdGFydFRpbWUpKTtcbiAgICAgICAgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTsgLy8gcmVzZXQgdGltZXJcbiAgICAgICAgbGV0IHJlY2VpdmVyVHggPSBhd2FpdCByZWNlaXZlci5nZXRUeChzZW5kZXJUeC5nZXRIYXNoKCkpO1xuICAgICAgICBpZiAoc2VuZGVyVHguZ2V0T3V0Z29pbmdBbW91bnQoKSAhPT0gcmVjZWl2ZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpKSB7XG4gICAgICAgICAgaWYgKHNhbWVBY2NvdW50KSBpc3N1ZXMucHVzaChcIldBUk5JTkc6IHNlbmRlciB0eCBvdXRnb2luZyBhbW91bnQgIT0gcmVjZWl2ZXIgdHggaW5jb21pbmcgYW1vdW50IHdoZW4gc2VudCB0byBzYW1lIGFjY291bnQgKFwiICsgc2VuZGVyVHguZ2V0T3V0Z29pbmdBbW91bnQoKSArIFwiICE9IFwiICsgcmVjZWl2ZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpICsgXCIpXCIpO1xuICAgICAgICAgIGVsc2UgaXNzdWVzLnB1c2goXCJFUlJPUjogc2VuZGVyIHR4IG91dGdvaW5nIGFtb3VudCAhPSByZWNlaXZlciB0eCBpbmNvbWluZyBhbW91bnQgKFwiICsgc2VuZGVyVHguZ2V0T3V0Z29pbmdBbW91bnQoKSArIFwiICE9IFwiICsgcmVjZWl2ZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpKSArIFwiKVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhd2FpdCByZWNlaXZlci5nZXRCYWxhbmNlKCkgIT09IHJlY2VpdmVyQmFsYW5jZUJlZm9yZSArIChyZWNlaXZlclR4LmdldEluY29taW5nQW1vdW50KCkgPT09IHVuZGVmaW5lZCA/IDBuIDogcmVjZWl2ZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpKSAtIChyZWNlaXZlclR4LmdldE91dGdvaW5nQW1vdW50KCkgPT09IHVuZGVmaW5lZCA/IDBuIDogcmVjZWl2ZXJUeC5nZXRPdXRnb2luZ0Ftb3VudCgpKSAtIChzYW1lV2FsbGV0ID8gcmVjZWl2ZXJUeC5nZXRGZWUoKSA6IDBuKSkge1xuICAgICAgICAgIGlmIChzYW1lQWNjb3VudCkgaXNzdWVzLnB1c2goXCJXQVJOSU5HOiBhZnRlciBzZW5kaW5nLCByZWNlaXZlciBiYWxhbmNlICE9IGJhbGFuY2UgYmVmb3JlICsgaW5jb21pbmcgYW1vdW50IC0gb3V0Z29pbmcgYW1vdW50IC0gdHggZmVlIHdoZW4gc2VudCB0byBzYW1lIGFjY291bnQgKFwiICsgYXdhaXQgcmVjZWl2ZXIuZ2V0QmFsYW5jZSgpICsgXCIgIT0gXCIgKyByZWNlaXZlckJhbGFuY2VCZWZvcmUgKyBcIiArIFwiICsgcmVjZWl2ZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpICsgXCIgLSBcIiArIHJlY2VpdmVyVHguZ2V0T3V0Z29pbmdBbW91bnQoKSArIFwiIC0gXCIgKyAoc2FtZVdhbGxldCA/IHJlY2VpdmVyVHguZ2V0RmVlKCkgOiAwbikudG9TdHJpbmcoKSArIFwiKVwiKTtcbiAgICAgICAgICBlbHNlIGlzc3Vlcy5wdXNoKFwiRVJST1I6IGFmdGVyIHNlbmRpbmcsIHJlY2VpdmVyIGJhbGFuY2UgIT0gYmFsYW5jZSBiZWZvcmUgKyBpbmNvbWluZyBhbW91bnQgLSBvdXRnb2luZyBhbW91bnQgLSB0eCBmZWUgKFwiICsgYXdhaXQgcmVjZWl2ZXIuZ2V0QmFsYW5jZSgpICsgXCIgIT0gXCIgKyByZWNlaXZlckJhbGFuY2VCZWZvcmUgKyBcIiArIFwiICsgcmVjZWl2ZXJUeC5nZXRJbmNvbWluZ0Ftb3VudCgpICsgXCIgLSBcIiArIHJlY2VpdmVyVHguZ2V0T3V0Z29pbmdBbW91bnQoKSArIFwiIC0gXCIgKyAoc2FtZVdhbGxldCA/IHJlY2VpdmVyVHguZ2V0RmVlKCkgOiAwbikudG9TdHJpbmcoKSArIFwiKVwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNhbWVXYWxsZXQgJiYgYXdhaXQgcmVjZWl2ZXIuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgIT09IHJlY2VpdmVyVW5sb2NrZWRCYWxhbmNlQmVmb3JlKSBpc3N1ZXMucHVzaChcIkVSUk9SOiByZWNlaXZlciB1bmxvY2tlZCBiYWxhbmNlIHNob3VsZCBub3QgaGF2ZSBjaGFuZ2VkIGFmdGVyIHNlbmRpbmdcIik7XG4gICAgICAgIGlmIChyZWNlaXZlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRCYWxhbmNlTm90aWZpY2F0aW9ucygpLmxlbmd0aCA9PT0gMCkgaXNzdWVzLnB1c2goXCJFUlJPUjogcmVjZWl2ZXIgZGlkIG5vdCBub3RpZnkgYmFsYW5jZSBjaGFuZ2Ugd2hlbiBmdW5kcyByZWNlaXZlZFwiKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaWYgKGF3YWl0IHJlY2VpdmVyLmdldEJhbGFuY2UoKSAhPT0gcmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKVtyZWNlaXZlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRCYWxhbmNlTm90aWZpY2F0aW9ucygpLmxlbmd0aCAtIDFdLmJhbGFuY2UpIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHJlY2VpdmVyIGJhbGFuY2UgIT0gbGFzdCBub3RpZmllZCBiYWxhbmNlIGFmdGVyIGZ1bmRzIHJlY2VpdmVkXCIpO1xuICAgICAgICAgIGlmIChhd2FpdCByZWNlaXZlci5nZXRVbmxvY2tlZEJhbGFuY2UoKSAhPT0gcmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKVtyZWNlaXZlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRCYWxhbmNlTm90aWZpY2F0aW9ucygpLmxlbmd0aCAtIDFdLnVubG9ja2VkQmFsYW5jZSkgaXNzdWVzLnB1c2goXCJFUlJPUjogcmVjZWl2ZXIgdW5sb2NrZWQgYmFsYW5jZSAhPSBsYXN0IG5vdGlmaWVkIHVubG9ja2VkIGJhbGFuY2UgYWZ0ZXIgZnVuZHMgcmVjZWl2ZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldE91dHB1dHNSZWNlaXZlZChvdXRwdXRRdWVyeSkubGVuZ3RoID09PSAwKSBpc3N1ZXMucHVzaChcIkVSUk9SOiByZWNlaXZlciBkaWQgbm90IGFubm91bmNlIHVuY29uZmlybWVkIHJlY2VpdmVkIG91dHB1dFwiKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIGdldE1pc3NpbmdPdXRwdXRzKGV4cGVjdGVkT3V0cHV0cywgcmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0T3V0cHV0c1JlY2VpdmVkKG91dHB1dFF1ZXJ5KSwgdHJ1ZSkpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHJlY2VpdmVyIGRpZCBub3QgYW5ub3VuY2UgcmVjZWl2ZWQgb3V0cHV0IGZvciBhbW91bnQgXCIgKyBvdXRwdXQuZ2V0QW1vdW50KCkgKyBcIiB0byBzdWJhZGRyZXNzIFtcIiArIG91dHB1dC5nZXRBY2NvdW50SW5kZXgoKSArIFwiLCBcIiArIG91dHB1dC5nZXRTdWJhZGRyZXNzSW5kZXgoKSArIFwiXVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIG1pbmUgdW50aWwgdGVzdCBjb21wbGV0ZXNcbiAgICAgICAgYXdhaXQgU3RhcnRNaW5pbmcuc3RhcnRNaW5pbmcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGxvb3AgZXZlcnkgc3luYyBwZXJpb2QgdW50aWwgdW5sb2NrIHRlc3RlZFxuICAgICAgICBsZXQgdGhyZWFkczogYW55ID0gW107XG4gICAgICAgIGxldCBleHBlY3RlZFVubG9ja1RpbWUgPSBsYXN0SGVpZ2h0ICsgdW5sb2NrRGVsYXk7XG4gICAgICAgIGxldCBjb25maXJtSGVpZ2h0OiBudW1iZXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCBoZWlnaHQgbm90aWZpY2F0aW9uc1xuICAgICAgICAgIGxldCBoZWlnaHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKTtcbiAgICAgICAgICBpZiAoaGVpZ2h0ID4gbGFzdEhlaWdodCkge1xuICAgICAgICAgICAgbGV0IHRlc3RTdGFydEhlaWdodCA9IGxhc3RIZWlnaHQ7XG4gICAgICAgICAgICBsYXN0SGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgbGV0IHRocmVhZEZuID0gYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGF3YWl0IEdlblV0aWxzLndhaXRGb3IoVGVzdFV0aWxzLlNZTkNfUEVSSU9EX0lOX01TICogMiArIE1BWF9QT0xMX1RJTUUpOyAvLyB3YWl0IDIgc3luYyBwZXJpb2RzICsgcG9sbCB0aW1lIGZvciBub3RpZmljYXRpb25zXG4gICAgICAgICAgICAgIGxldCBzZW5kZXJCbG9ja05vdGlmaWNhdGlvbnMgPSBzZW5kZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmxvY2tOb3RpZmljYXRpb25zKCk7XG4gICAgICAgICAgICAgIGxldCByZWNlaXZlckJsb2NrTm90aWZpY2F0aW9ucyA9IHJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJsb2NrTm90aWZpY2F0aW9ucygpO1xuICAgICAgICAgICAgICBmb3IgKGxldCBpID0gdGVzdFN0YXJ0SGVpZ2h0OyBpIDwgaGVpZ2h0OyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIUdlblV0aWxzLmFycmF5Q29udGFpbnMoc2VuZGVyQmxvY2tOb3RpZmljYXRpb25zLCBpKSkgaXNzdWVzLnB1c2goXCJFUlJPUjogc2VuZGVyIGRpZCBub3QgYW5ub3VuY2UgYmxvY2sgXCIgKyBpKTtcbiAgICAgICAgICAgICAgICBpZiAoIUdlblV0aWxzLmFycmF5Q29udGFpbnMocmVjZWl2ZXJCbG9ja05vdGlmaWNhdGlvbnMsIGkpKSBpc3N1ZXMucHVzaChcIkVSUk9SOiByZWNlaXZlciBkaWQgbm90IGFubm91bmNlIGJsb2NrIFwiICsgaSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocmVhZHMucHVzaCh0aHJlYWRGbigpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY2hlY2sgaWYgdHggY29uZmlybWVkXG4gICAgICAgICAgaWYgKGNvbmZpcm1IZWlnaHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBnZXQgdXBkYXRlZCB0eFxuICAgICAgICAgICAgbGV0IHR4ID0gYXdhaXQgcmVjZWl2ZXIuZ2V0VHgoc2VuZGVyVHguZ2V0SGFzaCgpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gYnJlYWsgaWYgdHggZmFpbHNcbiAgICAgICAgICAgIGlmICh0eC5nZXRJc0ZhaWxlZCgpKSB7XG4gICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHR4IGZhaWxlZCBpbiB0eCBwb29sXCIpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdGVzdCBjb25maXJtIG5vdGlmaWNhdGlvbnNcbiAgICAgICAgICAgIGlmICh0eC5nZXRJc0NvbmZpcm1lZCgpICYmIGNvbmZpcm1IZWlnaHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBjb25maXJtSGVpZ2h0ID0gdHguZ2V0SGVpZ2h0KCk7XG4gICAgICAgICAgICAgIGV4cGVjdGVkVW5sb2NrVGltZSA9IE1hdGgubWF4KGNvbmZpcm1IZWlnaHQgKyBOVU1fQkxPQ0tTX0xPQ0tFRCwgZXhwZWN0ZWRVbmxvY2tUaW1lKTsgLy8gZXhhY3QgdW5sb2NrIHRpbWUga25vd25cbiAgICAgICAgICAgICAgbGV0IHRocmVhZEZuID0gYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgR2VuVXRpbHMud2FpdEZvcihUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMgKiAyICsgTUFYX1BPTExfVElNRSk7IC8vIHdhaXQgMiBzeW5jIHBlcmlvZHMgKyBwb2xsIHRpbWUgZm9yIG5vdGlmaWNhdGlvbnNcbiAgICAgICAgICAgICAgICBsZXQgY29uZmlybWVkUXVlcnkgPSBvdXRwdXRRdWVyeS5nZXRUeFF1ZXJ5KCkuY29weSgpLnNldElzQ29uZmlybWVkKHRydWUpLnNldElzTG9ja2VkKHRydWUpLmdldE91dHB1dFF1ZXJ5KCk7XG4gICAgICAgICAgICAgICAgaWYgKHNlbmRlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRPdXRwdXRzU3BlbnQoY29uZmlybWVkUXVlcnkpLmxlbmd0aCA9PT0gMCkgaXNzdWVzLnB1c2goXCJFUlJPUjogc2VuZGVyIGRpZCBub3QgYW5ub3VuY2UgY29uZmlybWVkIHNwZW50IG91dHB1dFwiKTsgLy8gVE9ETzogdGVzdCBhbW91bnRcbiAgICAgICAgICAgICAgICBpZiAocmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0T3V0cHV0c1JlY2VpdmVkKGNvbmZpcm1lZFF1ZXJ5KS5sZW5ndGggPT09IDApIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHJlY2VpdmVyIGRpZCBub3QgYW5ub3VuY2UgY29uZmlybWVkIHJlY2VpdmVkIG91dHB1dFwiKTtcbiAgICAgICAgICAgICAgICBlbHNlIGZvciAobGV0IG91dHB1dCBvZiBnZXRNaXNzaW5nT3V0cHV0cyhleHBlY3RlZE91dHB1dHMsIHJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldE91dHB1dHNSZWNlaXZlZChjb25maXJtZWRRdWVyeSksIHRydWUpKSBpc3N1ZXMucHVzaChcIkVSUk9SOiByZWNlaXZlciBkaWQgbm90IGFubm91bmNlIGNvbmZpcm1lZCByZWNlaXZlZCBvdXRwdXQgZm9yIGFtb3VudCBcIiArIG91dHB1dC5nZXRBbW91bnQoKSArIFwiIHRvIHN1YmFkZHJlc3MgW1wiICsgb3V0cHV0LmdldEFjY291bnRJbmRleCgpICsgXCIsIFwiICsgb3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpICsgXCJdXCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIGlmIHNhbWUgd2FsbGV0LCBuZXQgYW1vdW50IHNwZW50ID0gdHggZmVlID0gb3V0cHV0cyBzcGVudCAtIG91dHB1dHMgcmVjZWl2ZWRcbiAgICAgICAgICAgICAgICBpZiAoc2FtZVdhbGxldCkge1xuICAgICAgICAgICAgICAgICAgbGV0IG5ldEFtb3VudCA9IDBuO1xuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgb3V0cHV0U3BlbnQgb2Ygc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldE91dHB1dHNTcGVudChjb25maXJtZWRRdWVyeSkpIG5ldEFtb3VudCA9IG5ldEFtb3VudCArIChvdXRwdXRTcGVudC5nZXRBbW91bnQoKSk7XG4gICAgICAgICAgICAgICAgICBmb3IgKGxldCBvdXRwdXRSZWNlaXZlZCBvZiBzZW5kZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0T3V0cHV0c1JlY2VpdmVkKGNvbmZpcm1lZFF1ZXJ5KSkgbmV0QW1vdW50ID0gbmV0QW1vdW50IC0gKG91dHB1dFJlY2VpdmVkLmdldEFtb3VudCgpKTtcbiAgICAgICAgICAgICAgICAgIGlmICh0eC5nZXRGZWUoKSAhPT0gbmV0QW1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzYW1lQWNjb3VudCkgaXNzdWVzLnB1c2goXCJXQVJOSU5HOiBuZXQgb3V0cHV0IGFtb3VudCAhPSB0eCBmZWUgd2hlbiBmdW5kcyBzZW50IHRvIHNhbWUgYWNjb3VudDogXCIgKyBuZXRBbW91bnQgKyBcIiB2cyBcIiArIHR4LmdldEZlZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoc2VuZGVyIGluc3RhbmNlb2YgTW9uZXJvV2FsbGV0UnBjKSBpc3N1ZXMucHVzaChcIldBUk5JTkc6IG5ldCBvdXRwdXQgYW1vdW50ICE9IHR4IGZlZSB3aGVuIGZ1bmRzIHNlbnQgdG8gc2FtZSB3YWxsZXQgYmVjYXVzZSBtb25lcm8td2FsbGV0LXJwYyBkb2VzIG5vdCBwcm92aWRlIHR4IGlucHV0czogXCIgKyBuZXRBbW91bnQgKyBcIiB2cyBcIiArIHR4LmdldEZlZSgpKTsgLy8gVE9ETyAobW9uZXJvLXByb2plY3QpOiBvcGVuIGlzc3VlIHRvIHByb3ZpZGUgdHggaW5wdXRzXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaXNzdWVzLnB1c2goXCJFUlJPUjogbmV0IG91dHB1dCBhbW91bnQgbXVzdCBlcXVhbCB0eCBmZWUgd2hlbiBmdW5kcyBzZW50IHRvIHNhbWUgd2FsbGV0OiBcIiArIG5ldEFtb3VudCArIFwiIHZzIFwiICsgdHguZ2V0RmVlKCkpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0aHJlYWRzLnB1c2godGhyZWFkRm4oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIG90aGVyd2lzZSB0ZXN0IHVubG9jayBub3RpZmljYXRpb25zXG4gICAgICAgICAgZWxzZSBpZiAoaGVpZ2h0ID49IGV4cGVjdGVkVW5sb2NrVGltZSkge1xuICAgICAgICAgICAgbGV0IHRocmVhZEZuID0gYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGF3YWl0IEdlblV0aWxzLndhaXRGb3IoVGVzdFV0aWxzLlNZTkNfUEVSSU9EX0lOX01TICogMiArIE1BWF9QT0xMX1RJTUUpOyAvLyB3YWl0IDIgc3luYyBwZXJpb2RzICsgcG9sbCB0aW1lIGZvciBub3RpZmljYXRpb25zXG4gICAgICAgICAgICAgIGxldCB1bmxvY2tlZFF1ZXJ5ID0gb3V0cHV0UXVlcnkuZ2V0VHhRdWVyeSgpLmNvcHkoKS5zZXRJc0xvY2tlZChmYWxzZSkuZ2V0T3V0cHV0UXVlcnkoKTtcbiAgICAgICAgICAgICAgaWYgKHNlbmRlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRPdXRwdXRzU3BlbnQodW5sb2NrZWRRdWVyeSkubGVuZ3RoID09PSAwKSBpc3N1ZXMucHVzaChcIkVSUk9SOiBzZW5kZXIgZGlkIG5vdCBhbm5vdW5jZSB1bmxvY2tlZCBzcGVudCBvdXRwdXRcIik7IC8vIFRPRE86IHRlc3QgYW1vdW50P1xuICAgICAgICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2YgZ2V0TWlzc2luZ091dHB1dHMoZXhwZWN0ZWRPdXRwdXRzLCByZWNlaXZlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRPdXRwdXRzUmVjZWl2ZWQodW5sb2NrZWRRdWVyeSksIHRydWUpKSBpc3N1ZXMucHVzaChcIkVSUk9SOiByZWNlaXZlciBkaWQgbm90IGFubm91bmNlIHVubG9ja2VkIHJlY2VpdmVkIG91dHB1dCBmb3IgYW1vdW50IFwiICsgb3V0cHV0LmdldEFtb3VudCgpICsgXCIgdG8gc3ViYWRkcmVzcyBbXCIgKyBvdXRwdXQuZ2V0QWNjb3VudEluZGV4KCkgKyBcIiwgXCIgKyBvdXRwdXQuZ2V0U3ViYWRkcmVzc0luZGV4KCkgKyBcIl1cIik7XG4gICAgICAgICAgICAgIGlmICghc2FtZVdhbGxldCAmJiBhd2FpdCByZWNlaXZlci5nZXRCYWxhbmNlKCkgIT09IGF3YWl0IHJlY2VpdmVyLmdldFVubG9ja2VkQmFsYW5jZSgpKSBpc3N1ZXMucHVzaChcIkVSUk9SOiByZWNlaXZlciBiYWxhbmNlICE9IHVubG9ja2VkIGJhbGFuY2UgYWZ0ZXIgZnVuZHMgdW5sb2NrZWRcIik7XG4gICAgICAgICAgICAgIGlmIChzZW5kZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKS5sZW5ndGggPT09IDApIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHNlbmRlciBkaWQgbm90IGFubm91bmNlIGFueSBiYWxhbmNlIG5vdGlmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChhd2FpdCBzZW5kZXIuZ2V0QmFsYW5jZSgpICE9PSBzZW5kZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKVtzZW5kZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKS5sZW5ndGggLSAxXS5iYWxhbmNlKSBpc3N1ZXMucHVzaChcIkVSUk9SOiBzZW5kZXIgYmFsYW5jZSAhPSBsYXN0IG5vdGlmaWVkIGJhbGFuY2UgYWZ0ZXIgZnVuZHMgdW5sb2NrZWRcIik7XG4gICAgICAgICAgICAgICAgaWYgKGF3YWl0IHNlbmRlci5nZXRVbmxvY2tlZEJhbGFuY2UoKSAhPT0gc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKClbc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKCkubGVuZ3RoIC0gMV0udW5sb2NrZWRCYWxhbmNlKSBpc3N1ZXMucHVzaChcIkVSUk9SOiBzZW5kZXIgdW5sb2NrZWQgYmFsYW5jZSAhPSBsYXN0IG5vdGlmaWVkIHVubG9ja2VkIGJhbGFuY2UgYWZ0ZXIgZnVuZHMgdW5sb2NrZWRcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKCkubGVuZ3RoID09PSAwKSBpc3N1ZXMucHVzaChcIkVSUk9SOiByZWNlaXZlciBkaWQgbm90IGFubm91bmNlIGFueSBiYWxhbmNlIG5vdGlmaWNhdGlvbnNcIik7XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChhd2FpdCByZWNlaXZlci5nZXRCYWxhbmNlKCkgIT09IHJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKClbcmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKS5sZW5ndGggLSAxXS5iYWxhbmNlKSBpc3N1ZXMucHVzaChcIkVSUk9SOiByZWNlaXZlciBiYWxhbmNlICE9IGxhc3Qgbm90aWZpZWQgYmFsYW5jZSBhZnRlciBmdW5kcyB1bmxvY2tlZFwiKTtcbiAgICAgICAgICAgICAgICBpZiAoYXdhaXQgcmVjZWl2ZXIuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgIT09IHJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldEJhbGFuY2VOb3RpZmljYXRpb25zKClbcmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKS5sZW5ndGggLSAxXS51bmxvY2tlZEJhbGFuY2UpIGlzc3Vlcy5wdXNoKFwiRVJST1I6IHJlY2VpdmVyIHVubG9ja2VkIGJhbGFuY2UgIT0gbGFzdCBub3RpZmllZCB1bmxvY2tlZCBiYWxhbmNlIGFmdGVyIGZ1bmRzIHVubG9ja2VkXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJlYWRzLnB1c2godGhyZWFkRm4oKSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gd2FpdCBmb3IgZW5kIG9mIHN5bmMgcGVyaW9kXG4gICAgICAgICAgYXdhaXQgR2VuVXRpbHMud2FpdEZvcihUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMgLSAoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkpO1xuICAgICAgICAgIHN0YXJ0VGltZSA9IERhdGUubm93KCk7IC8vIHJlc2V0IHRpbWVyXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHdhaXQgZm9yIHRlc3QgdGhyZWFkc1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh0aHJlYWRzKTtcblxuICAgICAgICAvLyB0ZXN0IG5vdGlmaWVkIG91dHB1dHNcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIHNlbmRlck5vdGlmaWNhdGlvbkNvbGxlY3Rvci5nZXRPdXRwdXRzU3BlbnQob3V0cHV0UXVlcnkpKSB0ZXN0Tm90aWZpZWRPdXRwdXQob3V0cHV0LCB0cnVlLCBpc3N1ZXMpO1xuICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2Ygc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldE91dHB1dHNSZWNlaXZlZChvdXRwdXRRdWVyeSkpIHRlc3ROb3RpZmllZE91dHB1dChvdXRwdXQsIGZhbHNlLCBpc3N1ZXMpO1xuICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2YgcmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3IuZ2V0T3V0cHV0c1NwZW50KG91dHB1dFF1ZXJ5KSkgdGVzdE5vdGlmaWVkT3V0cHV0KG91dHB1dCwgdHJ1ZSwgaXNzdWVzKTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIHJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLmdldE91dHB1dHNSZWNlaXZlZChvdXRwdXRRdWVyeSkpIHRlc3ROb3RpZmllZE91dHB1dChvdXRwdXQsIGZhbHNlLCBpc3N1ZXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gY2xlYW4gdXBcbiAgICAgICAgaWYgKChhd2FpdCB0aGF0LmRhZW1vbi5nZXRNaW5pbmdTdGF0dXMoKSkuZ2V0SXNBY3RpdmUoKSkgYXdhaXQgdGhhdC5kYWVtb24uc3RvcE1pbmluZygpO1xuICAgICAgICBhd2FpdCBzZW5kZXIucmVtb3ZlTGlzdGVuZXIoc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yKTtcbiAgICAgICAgc2VuZGVyTm90aWZpY2F0aW9uQ29sbGVjdG9yLnNldExpc3RlbmluZyhmYWxzZSk7XG4gICAgICAgIGF3YWl0IHJlY2VpdmVyLnJlbW92ZUxpc3RlbmVyKHJlY2VpdmVyTm90aWZpY2F0aW9uQ29sbGVjdG9yKTtcbiAgICAgICAgcmVjZWl2ZXJOb3RpZmljYXRpb25Db2xsZWN0b3Iuc2V0TGlzdGVuaW5nKGZhbHNlKTtcbiAgICAgICAgaWYgKHNlbmRlciAhPT0gcmVjZWl2ZXIpIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQocmVjZWl2ZXIpO1xuICAgICAgICByZXR1cm4gaXNzdWVzO1xuICAgICAgfVxuICAgICAgXG4gICAgICBmdW5jdGlvbiBnZXRNaXNzaW5nT3V0cHV0cyhleHBlY3RlZE91dHB1dHMsIGFjdHVhbE91dHB1dHMsIG1hdGNoU3ViYWRkcmVzcyk6IGFueVtdIHtcbiAgICAgICAgbGV0IG1pc3Npbmc6IGFueVtdID0gW107XG4gICAgICAgIGxldCB1c2VkOiBhbnlbXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBleHBlY3RlZE91dHB1dCBvZiBleHBlY3RlZE91dHB1dHMpIHtcbiAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICBmb3IgKGxldCBhY3R1YWxPdXRwdXQgb2YgYWN0dWFsT3V0cHV0cykge1xuICAgICAgICAgICAgaWYgKEdlblV0aWxzLmFycmF5Q29udGFpbnModXNlZCwgYWN0dWFsT3V0cHV0LCB0cnVlKSkgY29udGludWU7XG4gICAgICAgICAgICBpZiAoYWN0dWFsT3V0cHV0LmdldEFtb3VudCgpID09PSBleHBlY3RlZE91dHB1dC5nZXRBbW91bnQoKSAmJiAoIW1hdGNoU3ViYWRkcmVzcyB8fCAoYWN0dWFsT3V0cHV0LmdldEFjY291bnRJbmRleCgpID09PSBleHBlY3RlZE91dHB1dC5nZXRBY2NvdW50SW5kZXgoKSAmJiBhY3R1YWxPdXRwdXQuZ2V0U3ViYWRkcmVzc0luZGV4KCkgPT09IGV4cGVjdGVkT3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpKSkpIHtcbiAgICAgICAgICAgICAgdXNlZC5wdXNoKGFjdHVhbE91dHB1dCk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghZm91bmQpIG1pc3NpbmcucHVzaChleHBlY3RlZE91dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1pc3Npbmc7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGlzc3Vlc1RvU3RyKGlzc3Vlcykge1xuICAgICAgICBpZiAoaXNzdWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHN0ciA9IFwiXCI7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXNzdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgc3RyICs9IChpICsgMSkgKyBcIjogXCIgKyBpc3N1ZXNbaV07XG4gICAgICAgICAgaWYgKGkgPCBpc3N1ZXMubGVuZ3RoIC0gMSkgc3RyICs9IFwiXFxuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gdGVzdE5vdGlmaWVkT3V0cHV0KG91dHB1dCwgaXNUeElucHV0LCBpc3N1ZXMpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdHggbGlua1xuICAgICAgICBhc3NlcnQubm90RXF1YWwodW5kZWZpbmVkLCBvdXRwdXQuZ2V0VHgoKSk7XG4gICAgICAgIGlmIChpc1R4SW5wdXQpIGFzc2VydChvdXRwdXQuZ2V0VHgoKS5nZXRJbnB1dHMoKS5pbmNsdWRlcyhvdXRwdXQpKTtcbiAgICAgICAgZWxzZSBhc3NlcnQob3V0cHV0LmdldFR4KCkuZ2V0T3V0cHV0cygpLmluY2x1ZGVzKG91dHB1dCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBvdXRwdXQgdmFsdWVzXG4gICAgICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQob3V0cHV0LmdldEFtb3VudCgpKTtcbiAgICAgICAgaWYgKG91dHB1dC5nZXRBY2NvdW50SW5kZXgoKSAhPT0gdW5kZWZpbmVkKSBhc3NlcnQob3V0cHV0LmdldEFjY291bnRJbmRleCgpID49IDApO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBpZiAoaXNUeElucHV0KSBpc3N1ZXMucHVzaChcIldBUk5JTkc6IG5vdGlmaWNhdGlvbiBvZiBcIiArIGdldE91dHB1dFN0YXRlKG91dHB1dCkgKyBcIiBzcGVudCBvdXRwdXQgbWlzc2luZyBhY2NvdW50IGluZGV4XCIpOyAvLyBUT0RPIChtb25lcm8tcHJvamVjdCk6IGFjY291bnQgaW5kZXggbm90IHByb3ZpZGVkIHdoZW4gb3V0cHV0IHN3ZXB0IGJ5IGtleSBpbWFnZS4gIGNvdWxkIHJldHJpZXZlIGl0IGJ1dCBzbG93cyB0eCBjcmVhdGlvbiBzaWduaWZpY2FudGx5XG4gICAgICAgICAgZWxzZSBpc3N1ZXMucHVzaChcIkVSUk9SOiBub3RpZmljYXRpb24gb2YgXCIgKyBnZXRPdXRwdXRTdGF0ZShvdXRwdXQpICsgXCIgcmVjZWl2ZWQgb3V0cHV0IG1pc3NpbmcgYWNjb3VudCBpbmRleFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpICE9PSB1bmRlZmluZWQpIGFzc2VydChvdXRwdXQuZ2V0U3ViYWRkcmVzc0luZGV4KCkgPj0gMCk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGlmIChpc1R4SW5wdXQpIGlzc3Vlcy5wdXNoKFwiV0FSTklORzogbm90aWZpY2F0aW9uIG9mIFwiICsgZ2V0T3V0cHV0U3RhdGUob3V0cHV0KSArIFwiIHNwZW50IG91dHB1dCBtaXNzaW5nIHN1YmFkZHJlc3MgaW5kZXhcIik7IC8vIFRPRE8gKG1vbmVyby1wcm9qZWN0KTogYmVjYXVzZSBpbnB1dHMgYXJlIG5vdCBwcm92aWRlZCwgY3JlYXRpbmcgZmFrZSBpbnB1dCBmcm9tIG91dGdvaW5nIHRyYW5zZmVyLCB3aGljaCBjYW4gYmUgc291cmNlZCBmcm9tIG11bHRpcGxlIHN1YmFkZHJlc3MgaW5kaWNlcywgd2hlcmVhcyBhbiBvdXRwdXQgY2FuIG9ubHkgY29tZSBmcm9tIG9uZSBzdWJhZGRyZXNzIGluZGV4OyBuZWVkIHRvIHByb3ZpZGUgdHggaW5wdXRzIHRvIHJlc29sdmUgdGhpc1xuICAgICAgICAgIGVsc2UgaXNzdWVzLnB1c2goXCJFUlJPUjogbm90aWZpY2F0aW9uIG9mIFwiICsgZ2V0T3V0cHV0U3RhdGUob3V0cHV0KSArIFwiIHJlY2VpdmVkIG91dHB1dCBtaXNzaW5nIHN1YmFkZHJlc3MgaW5kZXhcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgZnVuY3Rpb24gZ2V0T3V0cHV0U3RhdGUob3V0cHV0KSB7XG4gICAgICAgIGlmIChmYWxzZSA9PT0gb3V0cHV0LmdldFR4KCkuZ2V0SXNMb2NrZWQoKSkgcmV0dXJuIFwidW5sb2NrZWRcIjtcbiAgICAgICAgaWYgKHRydWUgPT09IG91dHB1dC5nZXRUeCgpLmdldElzQ29uZmlybWVkKCkpIHJldHVybiBcImNvbmZpcm1lZFwiO1xuICAgICAgICBpZiAoZmFsc2UgPT09IG91dHB1dC5nZXRUeCgpLmdldElzQ29uZmlybWVkKCkpIHJldHVybiBcInVuY29uZmlybWVkXCI7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gb3V0cHV0IHN0YXRlOiBcIiArIG91dHB1dC50b1N0cmluZygpKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaXQoXCJDYW4gc3RvcCBsaXN0ZW5pbmdcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBjcmVhdGUgb2ZmbGluZSB3YWxsZXRcbiAgICAgICAgbGV0IHdhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KG5ldyBNb25lcm9XYWxsZXRDb25maWcoKS5zZXRTZXJ2ZXIoVGVzdFV0aWxzLk9GRkxJTkVfU0VSVkVSX1VSSSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gYWRkIGxpc3RlbmVyXG4gICAgICAgIGxldCBsaXN0ZW5lciA9IG5ldyBXYWxsZXROb3RpZmljYXRpb25Db2xsZWN0b3IoKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0LmFkZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgYXdhaXQgd2FsbGV0LnNldERhZW1vbkNvbm5lY3Rpb24oYXdhaXQgdGhhdC5kYWVtb24uZ2V0UnBjQ29ubmVjdGlvbigpKTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkgeyBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApOyB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlbW92ZSBsaXN0ZW5lciBhbmQgY2xvc2VcbiAgICAgICAgYXdhaXQgd2FsbGV0LnJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgYXdhaXQgdGhhdC5jbG9zZVdhbGxldCh3YWxsZXQpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb3RpZmljYXRpb25zKVxuICAgICAgaXQoXCJDYW4gYmUgY3JlYXRlZCBhbmQgcmVjZWl2ZSBmdW5kc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSBhIHJhbmRvbSB3YWxsZXRcbiAgICAgICAgbGV0IHJlY2VpdmVyID0gYXdhaXQgdGhhdC5jcmVhdGVXYWxsZXQoe3Bhc3N3b3JkOiBcIm15c3VwZXJzZWNyZXRwYXNzd29yZDEyM1wifSk7XG4gICAgICAgIGxldCBlcnI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gbGlzdGVuIGZvciByZWNlaXZlZCBvdXRwdXRzXG4gICAgICAgICAgbGV0IG15TGlzdGVuZXIgPSBuZXcgV2FsbGV0Tm90aWZpY2F0aW9uQ29sbGVjdG9yKCk7XG4gICAgICAgICAgYXdhaXQgcmVjZWl2ZXIuYWRkTGlzdGVuZXIobXlMaXN0ZW5lcik7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gd2FpdCBmb3IgdHhzIHRvIGNvbmZpcm0gYW5kIGZvciBzdWZmaWNpZW50IHVubG9ja2VkIGJhbGFuY2VcbiAgICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sKHRoYXQud2FsbGV0KTtcbiAgICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvclVubG9ja2VkQmFsYW5jZSh0aGF0LndhbGxldCwgMCwgdW5kZWZpbmVkLCBUZXN0VXRpbHMuTUFYX0ZFRSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc2VuZCBmdW5kcyB0byB0aGUgY3JlYXRlZCB3YWxsZXRcbiAgICAgICAgICBsZXQgc2VudFR4ID0gYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlVHgoe2FjY291bnRJbmRleDogMCwgYWRkcmVzczogYXdhaXQgcmVjZWl2ZXIuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgYW1vdW50OiBUZXN0VXRpbHMuTUFYX0ZFRSwgcmVsYXk6IHRydWV9KTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB3YWl0IGZvciBmdW5kcyB0byBjb25maXJtXG4gICAgICAgICAgdHJ5IHsgYXdhaXQgU3RhcnRNaW5pbmcuc3RhcnRNaW5pbmcoKTsgfSBjYXRjaCAoZTogYW55KSB7IH1cbiAgICAgICAgICB3aGlsZSAoIShhd2FpdCB0aGF0LndhbGxldC5nZXRUeChzZW50VHguZ2V0SGFzaCgpKSkuZ2V0SXNDb25maXJtZWQoKSkge1xuICAgICAgICAgICAgaWYgKChhd2FpdCB0aGF0LndhbGxldC5nZXRUeChzZW50VHguZ2V0SGFzaCgpKSkuZ2V0SXNGYWlsZWQoKSkgdGhyb3cgbmV3IEVycm9yKFwiVHggZmFpbGVkIGluIG1lbXBvb2w6IFwiICsgc2VudFR4LmdldEhhc2goKSk7XG4gICAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi53YWl0Rm9yTmV4dEJsb2NrSGVhZGVyKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHJlY2VpdmVyIHNob3VsZCBoYXZlIG5vdGlmaWVkIGxpc3RlbmVycyBvZiByZWNlaXZlZCBvdXRwdXRzXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkgeyBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApOyB9KTsgLy8gVE9ETzogdGhpcyBsZXRzIGJsb2NrIHNsaXAsIG9rYXk/XG4gICAgICAgICAgYXNzZXJ0KG15TGlzdGVuZXIuZ2V0T3V0cHV0c1JlY2VpdmVkKCkubGVuZ3RoID4gMCwgXCJMaXN0ZW5lciBkaWQgbm90IHJlY2VpdmUgb3V0cHV0c1wiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgZXJyID0gZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZmluYWwgY2xlYW51cFxuICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHJlY2VpdmVyKTtcbiAgICAgICAgdHJ5IHsgYXdhaXQgdGhhdC5kYWVtb24uc3RvcE1pbmluZygpOyB9IGNhdGNoIChlOiBhbnkpIHsgfVxuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gVE9ETzogdGVzdCBzZW5kaW5nIHRvIG11bHRpcGxlIGFjY291bnRzXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzICYmIHRlc3RDb25maWcudGVzdE5vdGlmaWNhdGlvbnMpXG4gICAgICBpdChcIkNhbiB1cGRhdGUgYSBsb2NrZWQgdHggc2VudCBmcm9tL3RvIHRoZSBzYW1lIGFjY291bnQgYXMgYmxvY2tzIGFyZSBhZGRlZCB0byB0aGUgY2hhaW5cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBjb25maWcgPSBuZXcgTW9uZXJvVHhDb25maWcoe2FjY291bnRJbmRleDogMCwgYWRkcmVzczogYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgYW1vdW50OiBUZXN0VXRpbHMuTUFYX0ZFRSwgdW5sb2NrVGltZTogQmlnSW50KGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpICsgMyksIGNhblNwbGl0OiBmYWxzZSwgcmVsYXk6IHRydWV9KTtcbiAgICAgICAgYXdhaXQgdGVzdFNlbmRBbmRVcGRhdGVUeHMoY29uZmlnKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzICYmIHRlc3RDb25maWcudGVzdE5vdGlmaWNhdGlvbnMgJiYgIXRlc3RDb25maWcubGl0ZU1vZGUpXG4gICAgICBpdChcIkNhbiB1cGRhdGUgc3BsaXQgbG9ja2VkIHR4cyBzZW50IGZyb20vdG8gdGhlIHNhbWUgYWNjb3VudCBhcyBibG9ja3MgYXJlIGFkZGVkIHRvIHRoZSBjaGFpblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGNvbmZpZyA9IG5ldyBNb25lcm9UeENvbmZpZyh7YWNjb3VudEluZGV4OiAwLCBhZGRyZXNzOiBhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBhbW91bnQ6IFRlc3RVdGlscy5NQVhfRkVFLCB1bmxvY2tUaW1lOiBCaWdJbnQoYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCkgKyAzKSwgY2FuU3BsaXQ6IHRydWUsIHJlbGF5OiB0cnVlfSk7XG4gICAgICAgIGF3YWl0IHRlc3RTZW5kQW5kVXBkYXRlVHhzKGNvbmZpZyk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlbGF5cyAmJiB0ZXN0Q29uZmlnLnRlc3ROb3RpZmljYXRpb25zICYmICF0ZXN0Q29uZmlnLmxpdGVNb2RlKVxuICAgICAgaXQoXCJDYW4gdXBkYXRlIGEgbG9ja2VkIHR4IHNlbnQgZnJvbS90byBkaWZmZXJlbnQgYWNjb3VudHMgYXMgYmxvY2tzIGFyZSBhZGRlZCB0byB0aGUgY2hhaW5cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBjb25maWcgPSBuZXcgTW9uZXJvVHhDb25maWcoe2FjY291bnRJbmRleDogMCwgYWRkcmVzczogKGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3MoMSwgMCkpLmdldEFkZHJlc3MoKSwgYW1vdW50OiBUZXN0VXRpbHMuTUFYX0ZFRSwgdW5sb2NrVGltZTogQmlnSW50KGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpICsgMyksIGNhblNwbGl0OiBmYWxzZSwgcmVsYXk6IHRydWV9KTtcbiAgICAgICAgYXdhaXQgdGVzdFNlbmRBbmRVcGRhdGVUeHMoY29uZmlnKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzICYmIHRlc3RDb25maWcudGVzdE5vdGlmaWNhdGlvbnMgJiYgIXRlc3RDb25maWcubGl0ZU1vZGUpXG4gICAgICBpdChcIkNhbiB1cGRhdGUgbG9ja2VkLCBzcGxpdCB0eHMgc2VudCBmcm9tL3RvIGRpZmZlcmVudCBhY2NvdW50cyBhcyBibG9ja3MgYXJlIGFkZGVkIHRvIHRoZSBjaGFpblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGNvbmZpZyA9IG5ldyBNb25lcm9UeENvbmZpZyh7YWNjb3VudEluZGV4OiAwLCBhZGRyZXNzOiAoYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzcygxLCAwKSkuZ2V0QWRkcmVzcygpLCBhbW91bnQ6IFRlc3RVdGlscy5NQVhfRkVFLCB1bmxvY2tUaW1lOiBCaWdJbnQoYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCkgKyAzKSwgcmVsYXk6IHRydWV9KTtcbiAgICAgICAgYXdhaXQgdGVzdFNlbmRBbmRVcGRhdGVUeHMoY29uZmlnKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvKipcbiAgICAgICAqIFRlc3RzIHNlbmRpbmcgYSB0eCB3aXRoIGFuIHVubG9jayB0aW1lIHRoZW4gdHJhY2tpbmcgYW5kIHVwZGF0aW5nIGl0IGFzXG4gICAgICAgKiBibG9ja3MgYXJlIGFkZGVkIHRvIHRoZSBjaGFpbi5cbiAgICAgICAqIFxuICAgICAgICogVE9ETzogdGVzdCB3YWxsZXQgYWNjb3VudGluZyB0aHJvdWdob3V0IHRoaXM7IGRlZGljYXRlZCBtZXRob2Q/IHByb2JhYmx5LlxuICAgICAgICogXG4gICAgICAgKiBBbGxvd3Mgc2VuZGluZyB0byBhbmQgZnJvbSB0aGUgc2FtZSBhY2NvdW50IHdoaWNoIGlzIGFuIGVkZ2UgY2FzZSB3aGVyZVxuICAgICAgICogaW5jb21pbmcgdHhzIGFyZSBvY2NsdWRlZCBieSB0aGVpciBvdXRnb2luZyBjb3VudGVycGFydCAoaXNzdWUgIzQ1MDApXG4gICAgICAgKiBhbmQgYWxzbyB3aGVyZSBpdCBpcyBpbXBvc3NpYmxlIHRvIGRpc2Nlcm4gd2hpY2ggaW5jb21pbmcgb3V0cHV0IGlzXG4gICAgICAgKiB0aGUgdHggYW1vdW50IGFuZCB3aGljaCBpcyB0aGUgY2hhbmdlIGFtb3VudCB3aXRob3V0IHdhbGxldCBtZXRhZGF0YS5cbiAgICAgICAqIFxuICAgICAgICogQHBhcmFtIGNvbmZpZyAtIHR4IGNvbmZpZ3VyYXRpb24gdG8gc2VuZCBhbmQgdGVzdFxuICAgICAgICovXG4gICAgICBhc3luYyBmdW5jdGlvbiB0ZXN0U2VuZEFuZFVwZGF0ZVR4cyhjb25maWcpIHtcbiAgICAgICAgaWYgKCFjb25maWcpIGNvbmZpZyA9IG5ldyBNb25lcm9UeENvbmZpZygpO1xuICAgICAgICBcbiAgICAgICAgLy8gd2FpdCBmb3IgdHhzIHRvIGNvbmZpcm0gYW5kIGZvciBzdWZmaWNpZW50IHVubG9ja2VkIGJhbGFuY2VcbiAgICAgICAgYXdhaXQgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbCh0aGF0LndhbGxldCk7XG4gICAgICAgIGFzc2VydCghY29uZmlnLmdldFN1YmFkZHJlc3NJbmRpY2VzKCkpO1xuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvclVubG9ja2VkQmFsYW5jZSh0aGF0LndhbGxldCwgY29uZmlnLmdldEFjY291bnRJbmRleCgpLCB1bmRlZmluZWQsIFRlc3RVdGlscy5NQVhfRkVFICogKDJuKSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0aGlzIHRlc3Qgc3RhcnRzIGFuZCBzdG9wcyBtaW5pbmcsIHNvIGl0J3Mgd3JhcHBlZCBpbiBvcmRlciB0byBzdG9wIG1pbmluZyBpZiBhbnl0aGluZyBmYWlsc1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHNlbmQgdHJhbnNhY3Rpb25zXG4gICAgICAgICAgbGV0IHNlbnRUeHMgPSBjb25maWcuZ2V0Q2FuU3BsaXQoKSAhPT0gZmFsc2UgPyBhd2FpdCB0aGF0LndhbGxldC5jcmVhdGVUeHMoY29uZmlnKSA6IFthd2FpdCB0aGF0LndhbGxldC5jcmVhdGVUeChjb25maWcpXTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IHNlbnQgdHJhbnNhY3Rpb25zXG4gICAgICAgICAgZm9yIChsZXQgdHggb2Ygc2VudFR4cykge1xuICAgICAgICAgICAgYXdhaXQgdGhhdC50ZXN0VHhXYWxsZXQodHgsIHt3YWxsZXQ6IHRoYXQud2FsbGV0LCBjb25maWc6IGNvbmZpZywgaXNTZW5kUmVzcG9uc2U6IHRydWV9KTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJc0NvbmZpcm1lZCgpLCBmYWxzZSk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SW5UeFBvb2woKSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRyYWNrIHJlc3VsdGluZyBvdXRnb2luZyBhbmQgaW5jb21pbmcgdHhzIGFzIGJsb2NrcyBhcmUgYWRkZWQgdG8gdGhlIGNoYWluXG4gICAgICAgICAgbGV0IHVwZGF0ZWRUeHM7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc3RhcnQgbWluaW5nXG4gICAgICAgICAgdHJ5IHsgYXdhaXQgU3RhcnRNaW5pbmcuc3RhcnRNaW5pbmcoKTsgfVxuICAgICAgICAgIGNhdGNoIChlOiBhbnkpIHsgY29uc29sZS5sb2coXCJXQVJOSU5HOiBjb3VsZCBub3Qgc3RhcnQgbWluaW5nOiBcIiArIGUubWVzc2FnZSk7IH0gLy8gbm90IGZhdGFsXG4gICAgICAgICAgXG4gICAgICAgICAgLy8gbG9vcCB0byB1cGRhdGUgdHhzIHRocm91Z2ggY29uZmlybWF0aW9uc1xuICAgICAgICAgIGxldCBudW1Db25maXJtYXRpb25zID0gMDtcbiAgICAgICAgICBjb25zdCBudW1Db25maXJtYXRpb25zVG90YWwgPSAyOyAvLyBudW1iZXIgb2YgY29uZmlybWF0aW9ucyB0byB0ZXN0XG4gICAgICAgICAgd2hpbGUgKG51bUNvbmZpcm1hdGlvbnMgPCBudW1Db25maXJtYXRpb25zVG90YWwpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gd2FpdCBmb3IgYSBibG9ja1xuICAgICAgICAgICAgbGV0IGhlYWRlciA9IGF3YWl0IHRoYXQuZGFlbW9uLndhaXRGb3JOZXh0QmxvY2tIZWFkZXIoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiKioqIEJsb2NrIFwiICsgaGVhZGVyLmdldEhlaWdodCgpICsgXCIgYWRkZWQgdG8gY2hhaW4gKioqXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBnaXZlIHdhbGxldCB0aW1lIHRvIGNhdGNoIHVwLCBvdGhlcndpc2UgaW5jb21pbmcgdHggbWF5IG5vdCBhcHBlYXJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHsgc2V0VGltZW91dChyZXNvbHZlLCBUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMpOyB9KTsgLy8gVE9ETzogdGhpcyBsZXRzIGJsb2NrIHNsaXAsIG9rYXk/XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGdldCBpbmNvbWluZy9vdXRnb2luZyB0eHMgd2l0aCBzZW50IGhhc2hlc1xuICAgICAgICAgICAgbGV0IHR4UXVlcnkgPSBuZXcgTW9uZXJvVHhRdWVyeSgpO1xuICAgICAgICAgICAgdHhRdWVyeS5zZXRIYXNoZXMoc2VudFR4cy5tYXAoc2VudFR4ID0+IHNlbnRUeC5nZXRIYXNoKCkpKTsgLy8gVE9ETzogY29udmVuaWVuY2UgbWV0aG9kcyB3YWxsZXQuZ2V0VHhCeUlkKCksIGdldFR4c0J5SWQoKT9cbiAgICAgICAgICAgIGxldCBmZXRjaGVkVHhzID0gYXdhaXQgdGhhdC5nZXRBbmRUZXN0VHhzKHRoYXQud2FsbGV0LCB0eFF1ZXJ5LCB0cnVlKTtcbiAgICAgICAgICAgIGFzc2VydChmZXRjaGVkVHhzLmxlbmd0aCA+IDApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB0ZXN0IGZldGNoZWQgdHhzXG4gICAgICAgICAgICBhd2FpdCB0ZXN0T3V0SW5QYWlycyh0aGF0LndhbGxldCwgZmV0Y2hlZFR4cywgY29uZmlnLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIC8vIG1lcmdlIGZldGNoZWQgdHhzIGludG8gdXBkYXRlZCB0eHMgYW5kIG9yaWdpbmFsIHNlbnQgdHhzXG4gICAgICAgICAgICBmb3IgKGxldCBmZXRjaGVkVHggb2YgZmV0Y2hlZFR4cykge1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gbWVyZ2Ugd2l0aCB1cGRhdGVkIHR4c1xuICAgICAgICAgICAgICBpZiAodXBkYXRlZFR4cyA9PT0gdW5kZWZpbmVkKSB1cGRhdGVkVHhzID0gZmV0Y2hlZFR4cztcbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgdXBkYXRlZFR4IG9mIHVwZGF0ZWRUeHMpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChmZXRjaGVkVHguZ2V0SGFzaCgpICE9PSB1cGRhdGVkVHguZ2V0SGFzaCgpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgIGlmICghIWZldGNoZWRUeC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgIT09ICEhdXBkYXRlZFR4LmdldE91dGdvaW5nVHJhbnNmZXIoKSkgY29udGludWU7ICAvLyBza2lwIGlmIGRpcmVjdGlvbnMgYXJlIGRpZmZlcmVudFxuICAgICAgICAgICAgICAgICAgdXBkYXRlZFR4Lm1lcmdlKGZldGNoZWRUeC5jb3B5KCkpO1xuICAgICAgICAgICAgICAgICAgaWYgKCF1cGRhdGVkVHguZ2V0QmxvY2soKSAmJiBmZXRjaGVkVHguZ2V0QmxvY2soKSkgdXBkYXRlZFR4LnNldEJsb2NrKGZldGNoZWRUeC5nZXRCbG9jaygpLmNvcHkoKS5zZXRUeHMoW3VwZGF0ZWRUeF0pKTsgIC8vIGNvcHkgYmxvY2sgZm9yIHRlc3RpbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIG1lcmdlIHdpdGggb3JpZ2luYWwgc2VudCB0eHNcbiAgICAgICAgICAgICAgZm9yIChsZXQgc2VudFR4IG9mIHNlbnRUeHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmV0Y2hlZFR4LmdldEhhc2goKSAhPT0gc2VudFR4LmdldEhhc2goKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgaWYgKCEhZmV0Y2hlZFR4LmdldE91dGdvaW5nVHJhbnNmZXIoKSAhPT0gISFzZW50VHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpKSBjb250aW51ZTsgLy8gc2tpcCBpZiBkaXJlY3Rpb25zIGFyZSBkaWZmZXJlbnRcbiAgICAgICAgICAgICAgICBzZW50VHgubWVyZ2UoZmV0Y2hlZFR4LmNvcHkoKSk7ICAvLyBUT0RPOiBpdCdzIG1lcmdlYWJsZSBidXQgdGVzdHMgZG9uJ3QgYWNjb3VudCBmb3IgZXh0cmEgaW5mbyBmcm9tIHNlbmQgKGUuZy4gaGV4KSBzbyBub3QgdGVzdGVkOyBjb3VsZCBzcGVjaWZ5IGluIHRlc3QgY29udGV4dFxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHRlc3QgdXBkYXRlZCB0eHNcbiAgICAgICAgICAgIHRlc3RHZXRUeHNTdHJ1Y3R1cmUodXBkYXRlZFR4cywgY29uZmlnKTtcbiAgICAgICAgICAgIGF3YWl0IHRlc3RPdXRJblBhaXJzKHRoYXQud2FsbGV0LCB1cGRhdGVkVHhzLCBjb25maWcsIGZhbHNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gdXBkYXRlIGNvbmZpcm1hdGlvbnMgaW4gb3JkZXIgdG8gZXhpdCBsb29wXG4gICAgICAgICAgICBudW1Db25maXJtYXRpb25zID0gZmV0Y2hlZFR4c1swXS5nZXROdW1Db25maXJtYXRpb25zKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBzdG9wIG1pbmluZ1xuICAgICAgICB0cnkgeyBhd2FpdCB0aGF0LndhbGxldC5zdG9wTWluaW5nKCk7IH1cbiAgICAgICAgY2F0Y2ggKGU6IGFueSkgeyB9XG4gICAgICAgIFxuICAgICAgICAvLyB0aHJvdyBlcnJvciBpZiB0aGVyZSB3YXMgb25lXG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgYXN5bmMgZnVuY3Rpb24gdGVzdE91dEluUGFpcnMod2FsbGV0LCB0eHMsIGNvbmZpZywgaXNTZW5kUmVzcG9uc2UpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGZvciBlYWNoIG91dCB0eFxuICAgICAgICBsZXQgdHhPdXQ7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIGF3YWl0IHRlc3RVbmxvY2tUeCh0aGF0LndhbGxldCwgdHgsIGNvbmZpZywgaXNTZW5kUmVzcG9uc2UpO1xuICAgICAgICAgIGlmICghdHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpKSBjb250aW51ZTtcbiAgICAgICAgICBsZXQgdHhPdXQgPSB0eDtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBmaW5kIGluY29taW5nIGNvdW50ZXJwYXJ0XG4gICAgICAgICAgbGV0IHR4SW47XG4gICAgICAgICAgZm9yIChsZXQgdHgyIG9mIHR4cykge1xuICAgICAgICAgICAgaWYgKHR4Mi5nZXRJbmNvbWluZ1RyYW5zZmVycygpICYmIHR4LmdldEhhc2goKSA9PT0gdHgyLmdldEhhc2goKSkge1xuICAgICAgICAgICAgICB0eEluID0gdHgyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCBvdXQgLyBpbiBwYWlyXG4gICAgICAgICAgLy8gVE9ETyBtb25lcm8td2FsbGV0LXJwYzogaW5jb21pbmcgdHhzIG9jY2x1ZGVkIGJ5IHRoZWlyIG91dGdvaW5nIGNvdW50ZXJwYXJ0ICM0NTAwXG4gICAgICAgICAgaWYgKCF0eEluKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIldBUk5JTkc6IG91dGdvaW5nIHR4IFwiICsgdHhPdXQuZ2V0SGFzaCgpICsgXCIgbWlzc2luZyBpbmNvbWluZyBjb3VudGVycGFydCAoaXNzdWUgIzQ1MDApXCIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0ZXN0T3V0SW5QYWlyKHR4T3V0LCB0eEluKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgYXN5bmMgZnVuY3Rpb24gdGVzdE91dEluUGFpcih0eE91dCwgdHhJbikge1xuICAgICAgICBhc3NlcnQuZXF1YWwodHhJbi5nZXRJc0NvbmZpcm1lZCgpLCB0eE91dC5nZXRJc0NvbmZpcm1lZCgpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHR4T3V0LmdldE91dGdvaW5nQW1vdW50KCksIHR4SW4uZ2V0SW5jb21pbmdBbW91bnQoKSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGFzeW5jIGZ1bmN0aW9uIHRlc3RVbmxvY2tUeCh3YWxsZXQsIHR4LCBjb25maWcsIGlzU2VuZFJlc3BvbnNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC50ZXN0VHhXYWxsZXQodHgsIHt3YWxsZXQ6IHRoYXQud2FsbGV0LCBjb25maWc6IGNvbmZpZywgaXNTZW5kUmVzcG9uc2U6IGlzU2VuZFJlc3BvbnNlfSk7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKHR4LnRvU3RyaW5nKCkpO1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFRFU1QgUkVMQVlTIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJWYWxpZGF0ZXMgaW5wdXRzIHdoZW4gc2VuZGluZyBmdW5kc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHRyeSBzZW5kaW5nIHdpdGggaW52YWxpZCBhZGRyZXNzXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlVHgoe2FkZHJlc3M6IFwibXkgaW52YWxpZCBhZGRyZXNzXCIsIGFjY291bnRJbmRleDogMCwgYW1vdW50OiBUZXN0VXRpbHMuTUFYX0ZFRX0pO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImZhaWxcIik7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGVyci5tZXNzYWdlLCBcIkludmFsaWQgZGVzdGluYXRpb24gYWRkcmVzc1wiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZWxheXMpXG4gICAgICBpdChcIkNhbiBzZW5kIHRvIHNlbGZcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBlcnI7XG4gICAgICAgIGxldCByZWNpcGllbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gd2FpdCBmb3IgdHhzIHRvIGNvbmZpcm0gYW5kIGZvciBzdWZmaWNpZW50IHVubG9ja2VkIGJhbGFuY2VcbiAgICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sKHRoYXQud2FsbGV0KTtcbiAgICAgICAgICBsZXQgYW1vdW50ID0gVGVzdFV0aWxzLk1BWF9GRUUgKiAoM24pO1xuICAgICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yVW5sb2NrZWRCYWxhbmNlKHRoYXQud2FsbGV0LCAwLCB1bmRlZmluZWQsIGFtb3VudCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY29sbGVjdCBzZW5kZXIgYmFsYW5jZXMgYmVmb3JlXG4gICAgICAgICAgbGV0IGJhbGFuY2UxID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QmFsYW5jZSgpO1xuICAgICAgICAgIGxldCB1bmxvY2tlZEJhbGFuY2UxID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VW5sb2NrZWRCYWxhbmNlKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc2VuZCBmdW5kcyB0byBzZWxmXG4gICAgICAgICAgbGV0IHR4ID0gYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlVHgoe1xuICAgICAgICAgICAgYWNjb3VudEluZGV4OiAwLFxuICAgICAgICAgICAgYWRkcmVzczogKGF3YWl0IHRoYXQud2FsbGV0LmdldEludGVncmF0ZWRBZGRyZXNzKCkpLmdldEludGVncmF0ZWRBZGRyZXNzKCksXG4gICAgICAgICAgICBhbW91bnQ6IGFtb3VudCxcbiAgICAgICAgICAgIHJlbGF5OiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCBiYWxhbmNlcyBhZnRlclxuICAgICAgICAgIGxldCBiYWxhbmNlMiA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEJhbGFuY2UoKTtcbiAgICAgICAgICBsZXQgdW5sb2NrZWRCYWxhbmNlMiA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFVubG9ja2VkQmFsYW5jZSgpO1xuICAgICAgICAgIGFzc2VydCh1bmxvY2tlZEJhbGFuY2UyIDwgdW5sb2NrZWRCYWxhbmNlMSk7IC8vIHVubG9ja2VkIGJhbGFuY2Ugc2hvdWxkIGRlY3JlYXNlXG4gICAgICAgICAgbGV0IGV4cGVjdGVkQmFsYW5jZSA9IGJhbGFuY2UxIC0gKHR4LmdldEZlZSgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoZXhwZWN0ZWRCYWxhbmNlLnRvU3RyaW5nKCksIGJhbGFuY2UyLnRvU3RyaW5nKCksIFwiQmFsYW5jZSBhZnRlciBzZW5kIHdhcyBub3QgYmFsYW5jZSBiZWZvcmUgLSBuZXQgdHggYW1vdW50IC0gZmVlICg1IC0gMSAhPSA0IHRlc3QpXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmaW5hbGx5IFxuICAgICAgICBpZiAocmVjaXBpZW50ICYmICFhd2FpdCByZWNpcGllbnQuaXNDbG9zZWQoKSkgYXdhaXQgdGhhdC5jbG9zZVdhbGxldChyZWNpcGllbnQpO1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHNlbmQgdG8gYW4gZXh0ZXJuYWwgYWRkcmVzc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGVycjtcbiAgICAgICAgbGV0IHJlY2lwaWVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB3YWl0IGZvciB0eHMgdG8gY29uZmlybSBhbmQgZm9yIHN1ZmZpY2llbnQgdW5sb2NrZWQgYmFsYW5jZVxuICAgICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICAgIGxldCBhbW91bnQgPSBUZXN0VXRpbHMuTUFYX0ZFRSAqICgzbik7XG4gICAgICAgICAgYXdhaXQgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLndhaXRGb3JVbmxvY2tlZEJhbGFuY2UodGhhdC53YWxsZXQsIDAsIHVuZGVmaW5lZCwgYW1vdW50KTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBjcmVhdGUgcmVjaXBpZW50IHdhbGxldFxuICAgICAgICAgIHJlY2lwaWVudCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KG5ldyBNb25lcm9XYWxsZXRDb25maWcoKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY29sbGVjdCBzZW5kZXIgYmFsYW5jZXMgYmVmb3JlXG4gICAgICAgICAgbGV0IGJhbGFuY2UxID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QmFsYW5jZSgpO1xuICAgICAgICAgIGxldCB1bmxvY2tlZEJhbGFuY2UxID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VW5sb2NrZWRCYWxhbmNlKCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc2VuZCBmdW5kcyB0byByZWNpcGllbnRcbiAgICAgICAgICBsZXQgdHggPSBhd2FpdCB0aGF0LndhbGxldC5jcmVhdGVUeCh7XG4gICAgICAgICAgICBhY2NvdW50SW5kZXg6IDAsXG4gICAgICAgICAgICBhZGRyZXNzOiBhd2FpdCByZWNpcGllbnQuZ2V0UHJpbWFyeUFkZHJlc3MoKSxcbiAgICAgICAgICAgIGFtb3VudDogYW1vdW50LFxuICAgICAgICAgICAgcmVsYXk6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IHNlbmRlciBiYWxhbmNlcyBhZnRlclxuICAgICAgICAgIGxldCBiYWxhbmNlMiA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEJhbGFuY2UoKTtcbiAgICAgICAgICBsZXQgdW5sb2NrZWRCYWxhbmNlMiA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFVubG9ja2VkQmFsYW5jZSgpO1xuICAgICAgICAgIGFzc2VydCh1bmxvY2tlZEJhbGFuY2UyIDwgdW5sb2NrZWRCYWxhbmNlMSk7IC8vIHVubG9ja2VkIGJhbGFuY2Ugc2hvdWxkIGRlY3JlYXNlXG4gICAgICAgICAgbGV0IGV4cGVjdGVkQmFsYW5jZSA9IGJhbGFuY2UxIC0gKHR4LmdldE91dGdvaW5nQW1vdW50KCkpIC0gKHR4LmdldEZlZSgpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoZXhwZWN0ZWRCYWxhbmNlLnRvU3RyaW5nKCksIGJhbGFuY2UyLnRvU3RyaW5nKCksIFwiQmFsYW5jZSBhZnRlciBzZW5kIHdhcyBub3QgYmFsYW5jZSBiZWZvcmUgLSBuZXQgdHggYW1vdW50IC0gZmVlICg1IC0gMSAhPSA0IHRlc3QpXCIpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgcmVjaXBpZW50IGJhbGFuY2UgYWZ0ZXJcbiAgICAgICAgICBhd2FpdCByZWNpcGllbnQuc3luYygpO1xuICAgICAgICAgIGFzc2VydCgoYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKHtpc0NvbmZpcm1lZDogZmFsc2V9KSkubGVuZ3RoID4gMCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGFtb3VudC50b1N0cmluZygpLCAoYXdhaXQgcmVjaXBpZW50LmdldEJhbGFuY2UoKSkudG9TdHJpbmcoKSk7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGVyciA9IGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGZpbmFsbHkgXG4gICAgICAgIGlmIChyZWNpcGllbnQgJiYgIWF3YWl0IHJlY2lwaWVudC5pc0Nsb3NlZCgpKSBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KHJlY2lwaWVudCk7XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc2VuZCBmcm9tIG11bHRpcGxlIHN1YmFkZHJlc3NlcyBpbiBhIHNpbmdsZSB0cmFuc2FjdGlvblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgdGVzdFNlbmRGcm9tTXVsdGlwbGUoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc2VuZCBmcm9tIG11bHRpcGxlIHN1YmFkZHJlc3NlcyBpbiBzcGxpdCB0cmFuc2FjdGlvbnNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RTZW5kRnJvbU11bHRpcGxlKG5ldyBNb25lcm9UeENvbmZpZygpLnNldENhblNwbGl0KHRydWUpKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBhc3luYyBmdW5jdGlvbiB0ZXN0U2VuZEZyb21NdWx0aXBsZShjb25maWc/KSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBpZiAoIWNvbmZpZykgY29uZmlnID0gbmV3IE1vbmVyb1R4Q29uZmlnKCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgTlVNX1NVQkFERFJFU1NFUyA9IDI7IC8vIG51bWJlciBvZiBzdWJhZGRyZXNzZXMgdG8gc2VuZCBmcm9tXG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgZmlyc3QgYWNjb3VudCB3aXRoIChOVU1fU1VCQUREUkVTU0VTICsgMSkgc3ViYWRkcmVzc2VzIHdpdGggdW5sb2NrZWQgYmFsYW5jZXNcbiAgICAgICAgbGV0IGFjY291bnRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSk7XG4gICAgICAgIGFzc2VydChhY2NvdW50cy5sZW5ndGggPj0gMiwgXCJUaGlzIHRlc3QgcmVxdWlyZXMgYXQgbGVhc3QgMiBhY2NvdW50czsgcnVuIHNlbmQtdG8tbXVsdGlwbGUgdGVzdHNcIik7XG4gICAgICAgIGxldCBzcmNBY2NvdW50O1xuICAgICAgICBsZXQgdW5sb2NrZWRTdWJhZGRyZXNzZXM6IGFueVtdID0gW107XG4gICAgICAgIGxldCBoYXNCYWxhbmNlID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgYWNjb3VudHMpIHtcbiAgICAgICAgICB1bmxvY2tlZFN1YmFkZHJlc3NlcyA9IFtdO1xuICAgICAgICAgIGxldCBudW1TdWJhZGRyZXNzQmFsYW5jZXMgPSAwO1xuICAgICAgICAgIGZvciAobGV0IHN1YmFkZHJlc3Mgb2YgYWNjb3VudC5nZXRTdWJhZGRyZXNzZXMoKSkge1xuICAgICAgICAgICAgaWYgKHN1YmFkZHJlc3MuZ2V0QmFsYW5jZSgpID4gVGVzdFV0aWxzLk1BWF9GRUUpIG51bVN1YmFkZHJlc3NCYWxhbmNlcysrO1xuICAgICAgICAgICAgaWYgKHN1YmFkZHJlc3MuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgPiBUZXN0VXRpbHMuTUFYX0ZFRSkgdW5sb2NrZWRTdWJhZGRyZXNzZXMucHVzaChzdWJhZGRyZXNzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG51bVN1YmFkZHJlc3NCYWxhbmNlcyA+PSBOVU1fU1VCQUREUkVTU0VTICsgMSkgaGFzQmFsYW5jZSA9IHRydWU7XG4gICAgICAgICAgaWYgKHVubG9ja2VkU3ViYWRkcmVzc2VzLmxlbmd0aCA+PSBOVU1fU1VCQUREUkVTU0VTICsgMSkge1xuICAgICAgICAgICAgc3JjQWNjb3VudCA9IGFjY291bnQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0KGhhc0JhbGFuY2UsIFwiV2FsbGV0IGRvZXMgbm90IGhhdmUgYWNjb3VudCB3aXRoIFwiICsgKE5VTV9TVUJBRERSRVNTRVMgKyAxKSArIFwiIHN1YmFkZHJlc3NlcyB3aXRoIGJhbGFuY2VzOyBydW4gc2VuZC10by1tdWx0aXBsZSB0ZXN0c1wiKTtcbiAgICAgICAgYXNzZXJ0KHVubG9ja2VkU3ViYWRkcmVzc2VzLmxlbmd0aCA+PSBOVU1fU1VCQUREUkVTU0VTICsgMSwgXCJXYWxsZXQgaXMgd2FpdGluZyBvbiB1bmxvY2tlZCBmdW5kc1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGRldGVybWluZSB0aGUgaW5kaWNlcyBvZiB0aGUgZmlyc3QgdHdvIHN1YmFkZHJlc3NlcyB3aXRoIHVubG9ja2VkIGJhbGFuY2VzXG4gICAgICAgIGxldCBmcm9tU3ViYWRkcmVzc0luZGljZXM6IGFueVtdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTlVNX1NVQkFERFJFU1NFUzsgaSsrKSB7XG4gICAgICAgICAgZnJvbVN1YmFkZHJlc3NJbmRpY2VzLnB1c2godW5sb2NrZWRTdWJhZGRyZXNzZXNbaV0uZ2V0SW5kZXgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGRldGVybWluZSB0aGUgYW1vdW50IHRvIHNlbmRcbiAgICAgICAgbGV0IHNlbmRBbW91bnQgPSBCaWdJbnQoMCk7XG4gICAgICAgIGZvciAobGV0IGZyb21TdWJhZGRyZXNzSWR4IG9mIGZyb21TdWJhZGRyZXNzSW5kaWNlcykge1xuICAgICAgICAgIHNlbmRBbW91bnQgPSBzZW5kQW1vdW50ICsgKHNyY0FjY291bnQuZ2V0U3ViYWRkcmVzc2VzKClbZnJvbVN1YmFkZHJlc3NJZHhdLmdldFVubG9ja2VkQmFsYW5jZSgpKTtcbiAgICAgICAgfVxuICAgICAgICBzZW5kQW1vdW50ID0gc2VuZEFtb3VudCAvIFNFTkRfRElWSVNPUjtcbiAgICAgICAgXG4gICAgICAgIC8vIHNlbmQgZnJvbSB0aGUgZmlyc3Qgc3ViYWRkcmVzc2VzIHdpdGggdW5sb2NrZWQgYmFsYW5jZXNcbiAgICAgICAgbGV0IGFkZHJlc3MgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpO1xuICAgICAgICBjb25maWcuc2V0RGVzdGluYXRpb25zKFtuZXcgTW9uZXJvRGVzdGluYXRpb24oYWRkcmVzcywgc2VuZEFtb3VudCldKTtcbiAgICAgICAgY29uZmlnLnNldEFjY291bnRJbmRleChzcmNBY2NvdW50LmdldEluZGV4KCkpO1xuICAgICAgICBjb25maWcuc2V0U3ViYWRkcmVzc0luZGljZXMoZnJvbVN1YmFkZHJlc3NJbmRpY2VzKTtcbiAgICAgICAgY29uZmlnLnNldFJlbGF5KHRydWUpO1xuICAgICAgICBsZXQgY29uZmlnQ29weSA9IGNvbmZpZy5jb3B5KCk7XG4gICAgICAgIGxldCB0eHM6IE1vbmVyb1R4V2FsbGV0W10gPSBbXTtcbiAgICAgICAgaWYgKGNvbmZpZy5nZXRDYW5TcGxpdCgpICE9PSBmYWxzZSkge1xuICAgICAgICAgIGZvciAobGV0IHR4IG9mIGF3YWl0IHRoYXQud2FsbGV0LmNyZWF0ZVR4cyhjb25maWcpKSB0eHMucHVzaCh0eCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHhzLnB1c2goYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlVHgoY29uZmlnKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbmZpZy5nZXRDYW5TcGxpdCgpID09PSBmYWxzZSkgYXNzZXJ0LmVxdWFsKHR4cy5sZW5ndGgsIDEpOyAgLy8gbXVzdCBoYXZlIGV4YWN0bHkgb25lIHR4IGlmIG5vIHNwbGl0XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHRoYXQgY29uZmlnIGlzIHVuY2hhbmdlZFxuICAgICAgICBhc3NlcnQoY29uZmlnQ29weSAhPT0gY29uZmlnKTtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChjb25maWcsIGNvbmZpZ0NvcHkpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB0aGF0IGJhbGFuY2VzIG9mIGludGVuZGVkIHN1YmFkZHJlc3NlcyBkZWNyZWFzZWRcbiAgICAgICAgbGV0IGFjY291bnRzQWZ0ZXIgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cyh0cnVlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGFjY291bnRzQWZ0ZXIubGVuZ3RoLCBhY2NvdW50cy5sZW5ndGgpO1xuICAgICAgICBsZXQgc3JjVW5sb2NrZWRCYWxhbmNlRGVjcmVhc2VkID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWNjb3VudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYWNjb3VudHNBZnRlcltpXS5nZXRTdWJhZGRyZXNzZXMoKS5sZW5ndGgsIGFjY291bnRzW2ldLmdldFN1YmFkZHJlc3NlcygpLmxlbmd0aCk7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBhY2NvdW50c1tpXS5nZXRTdWJhZGRyZXNzZXMoKS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgbGV0IHN1YmFkZHJlc3NCZWZvcmUgPSBhY2NvdW50c1tpXS5nZXRTdWJhZGRyZXNzZXMoKVtqXTtcbiAgICAgICAgICAgIGxldCBzdWJhZGRyZXNzQWZ0ZXIgPSBhY2NvdW50c0FmdGVyW2ldLmdldFN1YmFkZHJlc3NlcygpW2pdO1xuICAgICAgICAgICAgaWYgKGkgPT09IHNyY0FjY291bnQuZ2V0SW5kZXgoKSAmJiBmcm9tU3ViYWRkcmVzc0luZGljZXMuaW5jbHVkZXMoaikpIHtcbiAgICAgICAgICAgICAgaWYgKHN1YmFkZHJlc3NBZnRlci5nZXRVbmxvY2tlZEJhbGFuY2UoKSA8IHN1YmFkZHJlc3NCZWZvcmUuZ2V0VW5sb2NrZWRCYWxhbmNlKCkpIHNyY1VubG9ja2VkQmFsYW5jZURlY3JlYXNlZCA9IHRydWU7IFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHN1YmFkZHJlc3NBZnRlci5nZXRVbmxvY2tlZEJhbGFuY2UoKSwgc3ViYWRkcmVzc0JlZm9yZS5nZXRVbmxvY2tlZEJhbGFuY2UoKSwgXCJTdWJhZGRyZXNzIFtcIiArIGkgKyBcIixcIiArIGogKyBcIl0gdW5sb2NrZWQgYmFsYW5jZSBzaG91bGQgbm90IGhhdmUgY2hhbmdlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0KHNyY1VubG9ja2VkQmFsYW5jZURlY3JlYXNlZCwgXCJTdWJhZGRyZXNzIHVubG9ja2VkIGJhbGFuY2VzIHNob3VsZCBoYXZlIGRlY3JlYXNlZFwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgZWFjaCB0cmFuc2FjdGlvblxuICAgICAgICBhc3NlcnQodHhzLmxlbmd0aCA+IDApO1xuICAgICAgICBsZXQgb3V0Z29pbmdTdW0gPSBCaWdJbnQoMCk7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIGF3YWl0IHRoYXQudGVzdFR4V2FsbGV0KHR4LCB7d2FsbGV0OiB0aGF0LndhbGxldCwgY29uZmlnOiBjb25maWcsIGlzU2VuZFJlc3BvbnNlOiB0cnVlfSk7XG4gICAgICAgICAgb3V0Z29pbmdTdW0gPSBvdXRnb2luZ1N1bSArICh0eC5nZXRPdXRnb2luZ0Ftb3VudCgpKTtcbiAgICAgICAgICBpZiAodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpICE9PSB1bmRlZmluZWQgJiYgdHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpKSB7XG4gICAgICAgICAgICBsZXQgZGVzdGluYXRpb25TdW0gPSBCaWdJbnQoMCk7XG4gICAgICAgICAgICBmb3IgKGxldCBkZXN0aW5hdGlvbiBvZiB0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCkpIHtcbiAgICAgICAgICAgICAgYXdhaXQgdGVzdERlc3RpbmF0aW9uKGRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSwgYWRkcmVzcyk7XG4gICAgICAgICAgICAgIGRlc3RpbmF0aW9uU3VtID0gZGVzdGluYXRpb25TdW0gKyAoZGVzdGluYXRpb24uZ2V0QW1vdW50KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldE91dGdvaW5nQW1vdW50KCksIGRlc3RpbmF0aW9uU3VtKTsgLy8gYXNzZXJ0IHRoYXQgdHJhbnNmZXJzIHN1bSB1cCB0byB0eCBhbW91bnRcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGFzc2VydCB0aGF0IHR4IGFtb3VudHMgc3VtIHVwIHRoZSBhbW91bnQgc2VudCB3aXRoaW4gYSBzbWFsbCBtYXJnaW5cbiAgICAgICAgaWYgKEdlblV0aWxzLmFicyhzZW5kQW1vdW50IC0gb3V0Z29pbmdTdW0pID4gU0VORF9NQVhfRElGRikgeyAvLyBzZW5kIGFtb3VudHMgbWF5IGJlIHNsaWdodGx5IGRpZmZlcmVudFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlR4IGFtb3VudHMgYXJlIHRvbyBkaWZmZXJlbnQ6IFwiICsgc2VuZEFtb3VudCArIFwiIC0gXCIgKyBvdXRnb2luZ1N1bSArIFwiID0gXCIgKyAoc2VuZEFtb3VudCAtIG91dGdvaW5nU3VtKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHNlbmQgdG8gYW4gYWRkcmVzcyBpbiBhIHNpbmdsZSB0cmFuc2FjdGlvbi5cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RTZW5kVG9TaW5nbGUobmV3IE1vbmVyb1R4Q29uZmlnKCkuc2V0Q2FuU3BsaXQoZmFsc2UpKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBOT1RFOiB0aGlzIHRlc3Qgd2lsbCBiZSBpbnZhbGlkIHdoZW4gcGF5bWVudCBpZHMgYXJlIGZ1bGx5IHJlbW92ZWRcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZWxheXMpXG4gICAgICBpdChcIkNhbiBzZW5kIHRvIGFuIGFkZHJlc3MgaW4gYSBzaW5nbGUgdHJhbnNhY3Rpb24gd2l0aCBhIHBheW1lbnQgaWRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBpbnRlZ3JhdGVkQWRkcmVzcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEludGVncmF0ZWRBZGRyZXNzKCk7XG4gICAgICAgIGxldCBwYXltZW50SWQgPSBpbnRlZ3JhdGVkQWRkcmVzcy5nZXRQYXltZW50SWQoKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0ZXN0U2VuZFRvU2luZ2xlKG5ldyBNb25lcm9UeENvbmZpZygpLnNldENhblNwbGl0KGZhbHNlKS5zZXRQYXltZW50SWQocGF5bWVudElkICsgcGF5bWVudElkICsgcGF5bWVudElkICsgcGF5bWVudElkKSk7ICAvLyA2NCBjaGFyYWN0ZXIgcGF5bWVudCBpZFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImZhaWxcIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChlLm1lc3NhZ2UsIFwiU3RhbmRhbG9uZSBwYXltZW50IElEcyBhcmUgb2Jzb2xldGUuIFVzZSBzdWJhZGRyZXNzZXMgb3IgaW50ZWdyYXRlZCBhZGRyZXNzZXMgaW5zdGVhZFwiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZWxheXMpXG4gICAgICBpdChcIkNhbiBzZW5kIHRvIGFuIGFkZHJlc3Mgd2l0aCBzcGxpdCB0cmFuc2FjdGlvbnNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RTZW5kVG9TaW5nbGUobmV3IE1vbmVyb1R4Q29uZmlnKCkuc2V0Q2FuU3BsaXQodHJ1ZSkuc2V0UmVsYXkodHJ1ZSkpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZWxheXMpXG4gICAgICBpdChcIkNhbiBjcmVhdGUgdGhlbiByZWxheSBhIHRyYW5zYWN0aW9uIHRvIHNlbmQgdG8gYSBzaW5nbGUgYWRkcmVzc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgdGVzdFNlbmRUb1NpbmdsZShuZXcgTW9uZXJvVHhDb25maWcoKS5zZXRDYW5TcGxpdChmYWxzZSkpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZWxheXMpXG4gICAgICBpdChcIkNhbiBjcmVhdGUgdGhlbiByZWxheSBzcGxpdCB0cmFuc2FjdGlvbnMgdG8gc2VuZCB0byBhIHNpbmdsZSBhZGRyZXNzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhd2FpdCB0ZXN0U2VuZFRvU2luZ2xlKG5ldyBNb25lcm9UeENvbmZpZygpLnNldENhblNwbGl0KHRydWUpKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBhc3luYyBmdW5jdGlvbiB0ZXN0U2VuZFRvU2luZ2xlKGNvbmZpZykge1xuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sKHRoYXQud2FsbGV0KTtcbiAgICAgICAgaWYgKCFjb25maWcpIGNvbmZpZyA9IG5ldyBNb25lcm9UeENvbmZpZygpO1xuICAgICAgICBcbiAgICAgICAgLy8gZmluZCBhIG5vbi1wcmltYXJ5IHN1YmFkZHJlc3MgdG8gc2VuZCBmcm9tXG4gICAgICAgIGxldCBzdWZmaWNpZW50QmFsYW5jZSA9IGZhbHNlO1xuICAgICAgICBsZXQgZnJvbUFjY291bnQ6IE1vbmVyb0FjY291bnQgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGxldCBmcm9tU3ViYWRkcmVzczogTW9uZXJvU3ViYWRkcmVzcyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IGFjY291bnRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSk7XG4gICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgYWNjb3VudHMpIHtcbiAgICAgICAgICBsZXQgc3ViYWRkcmVzc2VzID0gYWNjb3VudC5nZXRTdWJhZGRyZXNzZXMoKTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHN1YmFkZHJlc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHN1YmFkZHJlc3Nlc1tpXS5nZXRCYWxhbmNlKCkgPiBUZXN0VXRpbHMuTUFYX0ZFRSkgc3VmZmljaWVudEJhbGFuY2UgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHN1YmFkZHJlc3Nlc1tpXS5nZXRVbmxvY2tlZEJhbGFuY2UoKSA+IFRlc3RVdGlscy5NQVhfRkVFKSB7XG4gICAgICAgICAgICAgIGZyb21BY2NvdW50ID0gYWNjb3VudDtcbiAgICAgICAgICAgICAgZnJvbVN1YmFkZHJlc3MgPSBzdWJhZGRyZXNzZXNbaV07XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZnJvbUFjY291bnQgIT0gdW5kZWZpbmVkKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQoc3VmZmljaWVudEJhbGFuY2UsIFwiTm8gbm9uLXByaW1hcnkgc3ViYWRkcmVzcyBmb3VuZCB3aXRoIHN1ZmZpY2llbnQgYmFsYW5jZVwiKTtcbiAgICAgICAgYXNzZXJ0KGZyb21TdWJhZGRyZXNzICE9PSB1bmRlZmluZWQsIFwiV2FsbGV0IGlzIHdhaXRpbmcgb24gdW5sb2NrZWQgZnVuZHNcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgYmFsYW5jZSBiZWZvcmUgc2VuZFxuICAgICAgICBsZXQgYmFsYW5jZUJlZm9yZSA9IGZyb21TdWJhZGRyZXNzLmdldEJhbGFuY2UoKTtcbiAgICAgICAgbGV0IHVubG9ja2VkQmFsYW5jZUJlZm9yZSAgPSBmcm9tU3ViYWRkcmVzcy5nZXRVbmxvY2tlZEJhbGFuY2UoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGluaXQgdHggY29uZmlnXG4gICAgICAgIGxldCBzZW5kQW1vdW50ID0gKHVubG9ja2VkQmFsYW5jZUJlZm9yZSAtIFRlc3RVdGlscy5NQVhfRkVFKSAvIFNFTkRfRElWSVNPUjtcbiAgICAgICAgbGV0IGFkZHJlc3MgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpO1xuICAgICAgICBjb25maWcuc2V0RGVzdGluYXRpb25zKFtuZXcgTW9uZXJvRGVzdGluYXRpb24oYWRkcmVzcywgc2VuZEFtb3VudCldKTtcbiAgICAgICAgY29uZmlnLnNldEFjY291bnRJbmRleChmcm9tQWNjb3VudCEuZ2V0SW5kZXgoKSk7XG4gICAgICAgIGNvbmZpZy5zZXRTdWJhZGRyZXNzSW5kaWNlcyhbZnJvbVN1YmFkZHJlc3MuZ2V0SW5kZXgoKV0pO1xuICAgICAgICBsZXQgcmVxQ29weSA9IGNvbmZpZy5jb3B5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBzZW5kIHRvIHNlbGZcbiAgICAgICAgbGV0IHR4czogYW55W10gPSBbXVxuICAgICAgICBpZiAoY29uZmlnLmdldENhblNwbGl0KCkgIT09IGZhbHNlKSB7XG4gICAgICAgICAgZm9yIChsZXQgdHggb2YgYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlVHhzKGNvbmZpZykpIHR4cy5wdXNoKHR4KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0eHMucHVzaChhd2FpdCB0aGF0LndhbGxldC5jcmVhdGVUeChjb25maWcpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZmlnLmdldENhblNwbGl0KCkgPT09IGZhbHNlKSBhc3NlcnQuZXF1YWwodHhzLmxlbmd0aCwgMSk7ICAvLyBtdXN0IGhhdmUgZXhhY3RseSBvbmUgdHggaWYgbm8gc3BsaXRcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdGhhdCBjb25maWcgaXMgdW5jaGFuZ2VkXG4gICAgICAgIGFzc2VydChyZXFDb3B5ICE9PSBjb25maWcpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGNvbmZpZywgcmVxQ29weSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGNvbW1vbiB0eCBzZXQgYW1vbmcgdHhzXG4gICAgICAgIHRlc3RDb21tb25UeFNldHModHhzLCBmYWxzZSwgZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGhhbmRsZSBub24tcmVsYXllZCB0cmFuc2FjdGlvblxuICAgICAgICBpZiAoY29uZmlnLmdldFJlbGF5KCkgIT09IHRydWUpIHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IHRyYW5zYWN0aW9uc1xuICAgICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgICAgYXdhaXQgdGhhdC50ZXN0VHhXYWxsZXQodHgsIHt3YWxsZXQ6IHRoYXQud2FsbGV0LCBjb25maWc6IGNvbmZpZywgaXNTZW5kUmVzcG9uc2U6IHRydWV9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdHhzIGFyZSBub3QgaW4gdGhlIHBvb2xcbiAgICAgICAgICBmb3IgKGxldCB0eENyZWF0ZWQgb2YgdHhzKSB7XG4gICAgICAgICAgICBmb3IgKGxldCB0eFBvb2wgb2YgYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHhQb29sKCkpIHtcbiAgICAgICAgICAgICAgYXNzZXJ0KHR4UG9vbC5nZXRIYXNoKCkgIT09IHR4Q3JlYXRlZC5nZXRIYXNoKCksIFwiQ3JlYXRlZCB0eCBzaG91bGQgbm90IGJlIGluIHRoZSBwb29sXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyByZWxheSB0eHNcbiAgICAgICAgICBsZXQgdHhIYXNoZXM7XG4gICAgICAgICAgaWYgKGNvbmZpZy5nZXRDYW5TcGxpdCgpICE9PSB0cnVlKSB0eEhhc2hlcyA9IFthd2FpdCB0aGF0LndhbGxldC5yZWxheVR4KHR4c1swXSldOyAvLyB0ZXN0IHJlbGF5VHgoKSB3aXRoIHNpbmdsZSB0cmFuc2FjdGlvblxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGV0IHR4TWV0YWRhdGFzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB0eE1ldGFkYXRhcy5wdXNoKHR4LmdldE1ldGFkYXRhKCkpO1xuICAgICAgICAgICAgdHhIYXNoZXMgPSBhd2FpdCB0aGF0LndhbGxldC5yZWxheVR4cyh0eE1ldGFkYXRhcyk7IC8vIHRlc3QgcmVsYXlUeHMoKSB3aXRoIHBvdGVudGlhbGx5IG11bHRpcGxlIHRyYW5zYWN0aW9uc1xuICAgICAgICAgIH0gIFxuICAgICAgICAgIGZvciAobGV0IHR4SGFzaCBvZiB0eEhhc2hlcykgYXNzZXJ0KHR5cGVvZiB0eEhhc2ggPT09IFwic3RyaW5nXCIgJiYgdHhIYXNoLmxlbmd0aCA9PT0gNjQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGZldGNoIHR4cyBmb3IgdGVzdGluZ1xuICAgICAgICAgIHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyh7aGFzaGVzOiB0eEhhc2hlc30pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHRoYXQgYmFsYW5jZSBhbmQgdW5sb2NrZWQgYmFsYW5jZSBkZWNyZWFzZWRcbiAgICAgICAgLy8gVE9ETzogdGVzdCB0aGF0IG90aGVyIGJhbGFuY2VzIGRpZCBub3QgZGVjcmVhc2VcbiAgICAgICAgbGV0IHN1YmFkZHJlc3MgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzKGZyb21BY2NvdW50IS5nZXRJbmRleCgpLCBmcm9tU3ViYWRkcmVzcy5nZXRJbmRleCgpKTtcbiAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3MuZ2V0QmFsYW5jZSgpIDwgYmFsYW5jZUJlZm9yZSk7XG4gICAgICAgIGFzc2VydChzdWJhZGRyZXNzLmdldFVubG9ja2VkQmFsYW5jZSgpIDwgdW5sb2NrZWRCYWxhbmNlQmVmb3JlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHF1ZXJ5IGxvY2tlZCB0eHNcbiAgICAgICAgbGV0IGxvY2tlZFR4cyA9IGF3YWl0IHRoYXQuZ2V0QW5kVGVzdFR4cyh0aGF0LndhbGxldCwgbmV3IE1vbmVyb1R4UXVlcnkoKS5zZXRJc0xvY2tlZCh0cnVlKSwgdHJ1ZSk7XG4gICAgICAgIGZvciAobGV0IGxvY2tlZFR4IG9mIGxvY2tlZFR4cykgYXNzZXJ0LmVxdWFsKGxvY2tlZFR4LmdldElzTG9ja2VkKCksIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB0cmFuc2FjdGlvbnNcbiAgICAgICAgYXNzZXJ0KHR4cy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC50ZXN0VHhXYWxsZXQodHgsIHt3YWxsZXQ6IHRoYXQud2FsbGV0LCBjb25maWc6IGNvbmZpZywgaXNTZW5kUmVzcG9uc2U6IGNvbmZpZy5nZXRSZWxheSgpID09PSB0cnVlfSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXRBY2NvdW50SW5kZXgoKSwgZnJvbUFjY291bnQhLmdldEluZGV4KCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0U3ViYWRkcmVzc0luZGljZXMoKS5sZW5ndGgsIDEpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0U3ViYWRkcmVzc0luZGljZXMoKVswXSwgZnJvbVN1YmFkZHJlc3MuZ2V0SW5kZXgoKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHNlbmRBbW91bnQsIHR4LmdldE91dGdvaW5nQW1vdW50KCkpO1xuICAgICAgICAgIGlmIChjb25maWcuZ2V0UGF5bWVudElkKCkpIGFzc2VydC5lcXVhbChjb25maWcuZ2V0UGF5bWVudElkKCksIHR4LmdldFBheW1lbnRJZCgpKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IG91dGdvaW5nIGRlc3RpbmF0aW9uc1xuICAgICAgICAgIGlmICh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgJiYgdHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpLmxlbmd0aCwgMSk7XG4gICAgICAgICAgICBmb3IgKGxldCBkZXN0aW5hdGlvbiBvZiB0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCkpIHtcbiAgICAgICAgICAgICAgYXdhaXQgdGVzdERlc3RpbmF0aW9uKGRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGRlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSwgYWRkcmVzcyk7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChzZW5kQW1vdW50LCBkZXN0aW5hdGlvbi5nZXRBbW91bnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHR4IGlzIGFtb25nIGxvY2tlZCB0eHNcbiAgICAgICAgICBsZXQgZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICBmb3IgKGxldCBsb2NrZWRUeCBvZiBsb2NrZWRUeHMpIHtcbiAgICAgICAgICAgIGlmIChsb2NrZWRUeC5nZXRIYXNoKCkgPT09IHR4LmdldEhhc2goKSkge1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBhc3NlcnQoZm91bmQsIFwiQ3JlYXRlZCB0eHMgc2hvdWxkIGJlIGFtb25nIGxvY2tlZCB0eHNcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGlmIHR4IHdhcyByZWxheWVkIGluIHNlcGFyYXRlIHN0ZXAsIGFsbCB3YWxsZXRzIHdpbGwgbmVlZCB0byB3YWl0IGZvciB0eCB0byBjb25maXJtIGluIG9yZGVyIHRvIHJlbGlhYmx5IHN5bmNcbiAgICAgICAgaWYgKGNvbmZpZy5nZXRSZWxheSgpICE9IHRydWUpIHtcbiAgICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIucmVzZXQoKTsgLy8gVE9ETzogcmVzZXRFeGNlcHQodGhhdC53YWxsZXQpLCBvciBkb2VzIHRoaXMgdGVzdCB3YWxsZXQgYWxzbyBuZWVkIHRvIGJlIHdhaXRlZCBvbj9cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc2VuZCB0byBtdWx0aXBsZSBhZGRyZXNzZXMgaW4gc3BsaXQgdHJhbnNhY3Rpb25zLlwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgdGVzdFNlbmRUb011bHRpcGxlKDMsIDE1LCB0cnVlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc2VuZCB0byBtdWx0aXBsZSBhZGRyZXNzZXMgaW4gc3BsaXQgdHJhbnNhY3Rpb25zIHVzaW5nIGEgSmF2YVNjcmlwdCBvYmplY3QgZm9yIGNvbmZpZ3VyYXRpb25cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RTZW5kVG9NdWx0aXBsZSgzLCAxNSwgdHJ1ZSwgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc2VuZCBkdXN0IHRvIG11bHRpcGxlIGFkZHJlc3NlcyBpbiBzcGxpdCB0cmFuc2FjdGlvbnNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBkdXN0QW10ID0gKGF3YWl0IHRoYXQuZGFlbW9uLmdldEZlZUVzdGltYXRlKCkpLmdldEZlZSgpIC8gQmlnSW50KDIpO1xuICAgICAgICBhd2FpdCB0ZXN0U2VuZFRvTXVsdGlwbGUoNSwgMywgdHJ1ZSwgZHVzdEFtdCk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHN1YnRyYWN0IGZlZXMgZnJvbSBkZXN0aW5hdGlvbnNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IHRlc3RTZW5kVG9NdWx0aXBsZSg1LCAzLCBmYWxzZSwgdW5kZWZpbmVkLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlbGF5cylcbiAgICAgIGl0KFwiQ2Fubm90IHN1YnRyYWN0IGZlZXMgZnJvbSBkZXN0aW5hdGlvbnMgaW4gc3BsaXQgdHJhbnNhY3Rpb25zXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhd2FpdCB0ZXN0U2VuZFRvTXVsdGlwbGUoMywgMTUsIHRydWUsIHVuZGVmaW5lZCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLyoqXG4gICAgICAgKiBTZW5kcyBmdW5kcyBmcm9tIHRoZSBmaXJzdCB1bmxvY2tlZCBhY2NvdW50IHRvIG11bHRpcGxlIGFjY291bnRzIGFuZCBzdWJhZGRyZXNzZXMuXG4gICAgICAgKiBcbiAgICAgICAqIEBwYXJhbSBudW1BY2NvdW50cyBpcyB0aGUgbnVtYmVyIG9mIGFjY291bnRzIHRvIHJlY2VpdmUgZnVuZHNcbiAgICAgICAqIEBwYXJhbSBudW1TdWJhZGRyZXNzZXNQZXJBY2NvdW50IGlzIHRoZSBudW1iZXIgb2Ygc3ViYWRkcmVzc2VzIHBlciBhY2NvdW50IHRvIHJlY2VpdmUgZnVuZHNcbiAgICAgICAqIEBwYXJhbSBjYW5TcGxpdCBzcGVjaWZpZXMgaWYgdGhlIG9wZXJhdGlvbiBjYW4gYmUgc3BsaXQgaW50byBtdWx0aXBsZSB0cmFuc2FjdGlvbnNcbiAgICAgICAqIEBwYXJhbSBzZW5kQW1vdW50UGVyU3ViYWRkcmVzcyBpcyB0aGUgYW1vdW50IHRvIHNlbmQgdG8gZWFjaCBzdWJhZGRyZXNzIChvcHRpb25hbCwgY29tcHV0ZWQgaWYgbm90IGdpdmVuKVxuICAgICAgICogQHBhcmFtIHVzZUpzQ29uZmlnIHNwZWNpZmllcyBpZiB0aGUgYXBpIHNob3VsZCBiZSBpbnZva2VkIHdpdGggYSBKUyBvYmplY3QgaW5zdGVhZCBvZiBhIE1vbmVyb1R4Q29uZmlnXG4gICAgICAgKiBAcGFyYW0gc3VidHJhY3RGZWVGcm9tRGVzdGluYXRpb25zIHNwZWNpZmllcyB0byBzdWJ0cmFjdCB0aGUgZmVlIGZyb20gZGVzdGluYXRpb24gYWRkcmVzc2VzXG4gICAgICAgKi9cbiAgICAgIGFzeW5jIGZ1bmN0aW9uIHRlc3RTZW5kVG9NdWx0aXBsZShudW1BY2NvdW50cywgbnVtU3ViYWRkcmVzc2VzUGVyQWNjb3VudCwgY2FuU3BsaXQsIHNlbmRBbW91bnRQZXJTdWJhZGRyZXNzPywgdXNlSnNDb25maWc/LCBzdWJ0cmFjdEZlZUZyb21EZXN0aW5hdGlvbnM/KSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gY29tcHV0ZSB0aGUgbWluaW11bSBhY2NvdW50IHVubG9ja2VkIGJhbGFuY2UgbmVlZGVkIGluIG9yZGVyIHRvIGZ1bGZpbGwgdGhlIHJlcXVlc3RcbiAgICAgICAgbGV0IG1pbkFjY291bnRBbW91bnQ7XG4gICAgICAgIGxldCB0b3RhbFN1YmFkZHJlc3NlcyA9IG51bUFjY291bnRzICogbnVtU3ViYWRkcmVzc2VzUGVyQWNjb3VudDtcbiAgICAgICAgaWYgKHNlbmRBbW91bnRQZXJTdWJhZGRyZXNzICE9PSB1bmRlZmluZWQpIG1pbkFjY291bnRBbW91bnQgPSBCaWdJbnQodG90YWxTdWJhZGRyZXNzZXMpICogc2VuZEFtb3VudFBlclN1YmFkZHJlc3MgKyBUZXN0VXRpbHMuTUFYX0ZFRTsgLy8gbWluIGFjY291bnQgYW1vdW50IG11c3QgY292ZXIgdGhlIHRvdGFsIGFtb3VudCBiZWluZyBzZW50IHBsdXMgdGhlIHR4IGZlZSA9IG51bUFkZHJlc3NlcyAqIChhbXRQZXJTdWJhZGRyZXNzICsgZmVlKVxuICAgICAgICBlbHNlIG1pbkFjY291bnRBbW91bnQgPSBUZXN0VXRpbHMuTUFYX0ZFRSAqIEJpZ0ludCh0b3RhbFN1YmFkZHJlc3NlcykgKiBTRU5EX0RJVklTT1IgKyBUZXN0VXRpbHMuTUFYX0ZFRTsgLy8gYWNjb3VudCBiYWxhbmNlIG11c3QgYmUgbW9yZSB0aGFuIGZlZSAqIG51bUFkZHJlc3NlcyAqIGRpdmlzb3IgKyBmZWUgc28gZWFjaCBkZXN0aW5hdGlvbiBhbW91bnQgaXMgYXQgbGVhc3QgYSBmZWUncyB3b3J0aCAoc28gZHVzdCBpcyBub3Qgc2VudClcbiAgICAgICAgXG4gICAgICAgIC8vIHNlbmQgZnVuZHMgZnJvbSBmaXJzdCBhY2NvdW50IHdpdGggc3VmZmljaWVudCB1bmxvY2tlZCBmdW5kc1xuICAgICAgICBsZXQgc3JjQWNjb3VudDtcbiAgICAgICAgbGV0IGhhc0JhbGFuY2UgPSBmYWxzZTtcbiAgICAgICAgZm9yIChsZXQgYWNjb3VudCBvZiBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cygpKSB7XG4gICAgICAgICAgaWYgKGFjY291bnQuZ2V0QmFsYW5jZSgpID4gbWluQWNjb3VudEFtb3VudCkgaGFzQmFsYW5jZSA9IHRydWU7XG4gICAgICAgICAgaWYgKGFjY291bnQuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgPiBtaW5BY2NvdW50QW1vdW50KSB7XG4gICAgICAgICAgICBzcmNBY2NvdW50ID0gYWNjb3VudDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQoaGFzQmFsYW5jZSwgXCJXYWxsZXQgZG9lcyBub3QgaGF2ZSBlbm91Z2ggYmFsYW5jZTsgbG9hZCAnXCIgKyBUZXN0VXRpbHMuV0FMTEVUX05BTUUgKyBcIicgd2l0aCBYTVIgaW4gb3JkZXIgdG8gdGVzdCBzZW5kaW5nXCIpO1xuICAgICAgICBhc3NlcnQoc3JjQWNjb3VudCwgXCJXYWxsZXQgaXMgd2FpdGluZyBvbiB1bmxvY2tlZCBmdW5kc1wiKTtcbiAgICAgICAgbGV0IGJhbGFuY2UgPSBzcmNBY2NvdW50LmdldEJhbGFuY2UoKTtcbiAgICAgICAgbGV0IHVubG9ja2VkQmFsYW5jZSA9IHNyY0FjY291bnQuZ2V0VW5sb2NrZWRCYWxhbmNlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgYW1vdW50IHRvIHNlbmQgdG90YWwgYW5kIHBlciBzdWJhZGRyZXNzXG4gICAgICAgIGxldCBzZW5kQW1vdW50O1xuICAgICAgICBpZiAoc2VuZEFtb3VudFBlclN1YmFkZHJlc3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHNlbmRBbW91bnQgPSBUZXN0VXRpbHMuTUFYX0ZFRSAqIDVuICogQmlnSW50KHRvdGFsU3ViYWRkcmVzc2VzKTtcbiAgICAgICAgICBzZW5kQW1vdW50UGVyU3ViYWRkcmVzcyA9IHNlbmRBbW91bnQgLyBCaWdJbnQodG90YWxTdWJhZGRyZXNzZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbmRBbW91bnQgPSBzZW5kQW1vdW50UGVyU3ViYWRkcmVzcyAqIChCaWdJbnQodG90YWxTdWJhZGRyZXNzZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIG1pbmltdW0gbnVtYmVyIG9mIGFjY291bnRzXG4gICAgICAgIGxldCBhY2NvdW50cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtQWNjb3VudHMgLSBhY2NvdW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmNyZWF0ZUFjY291bnQoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIG1pbmltdW0gbnVtYmVyIG9mIHN1YmFkZHJlc3NlcyBwZXIgYWNjb3VudCBhbmQgY29sbGVjdCBkZXN0aW5hdGlvbiBhZGRyZXNzZXNcbiAgICAgICAgbGV0IGRlc3RpbmF0aW9uQWRkcmVzc2VzOiBhbnkgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1BY2NvdW50czsgaSsrKSB7XG4gICAgICAgICAgbGV0IHN1YmFkZHJlc3NlcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFN1YmFkZHJlc3NlcyhpKTtcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG51bVN1YmFkZHJlc3Nlc1BlckFjY291bnQgLSBzdWJhZGRyZXNzZXMubGVuZ3RoOyBqKyspIGF3YWl0IHRoYXQud2FsbGV0LmNyZWF0ZVN1YmFkZHJlc3MoaSk7XG4gICAgICAgICAgc3ViYWRkcmVzc2VzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0U3ViYWRkcmVzc2VzKGkpO1xuICAgICAgICAgIGFzc2VydChzdWJhZGRyZXNzZXMubGVuZ3RoID49IG51bVN1YmFkZHJlc3Nlc1BlckFjY291bnQpO1xuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbnVtU3ViYWRkcmVzc2VzUGVyQWNjb3VudDsgaisrKSBkZXN0aW5hdGlvbkFkZHJlc3Nlcy5wdXNoKHN1YmFkZHJlc3Nlc1tqXS5nZXRBZGRyZXNzKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBidWlsZCB0eCBjb25maWcgdXNpbmcgTW9uZXJvVHhDb25maWdcbiAgICAgICAgbGV0IGNvbmZpZyA9IG5ldyBNb25lcm9UeENvbmZpZygpO1xuICAgICAgICBjb25maWcuc2V0QWNjb3VudEluZGV4KHNyY0FjY291bnQuZ2V0SW5kZXgoKSlcbiAgICAgICAgY29uZmlnLnNldFN1YmFkZHJlc3NJbmRpY2VzKFtdKTsgLy8gdGVzdCBhc3NpZ25pbmcgdW5kZWZpbmVkXG4gICAgICAgIGNvbmZpZy5zZXREZXN0aW5hdGlvbnMoW10pO1xuICAgICAgICBjb25maWcuc2V0UmVsYXkodHJ1ZSk7XG4gICAgICAgIGNvbmZpZy5zZXRDYW5TcGxpdChjYW5TcGxpdCk7XG4gICAgICAgIGNvbmZpZy5zZXRQcmlvcml0eShNb25lcm9UeFByaW9yaXR5Lk5PUk1BTCk7XG4gICAgICAgIGxldCBzdWJ0cmFjdEZlZUZyb206IG51bWJlcltdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGVzdGluYXRpb25BZGRyZXNzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25maWcuZ2V0RGVzdGluYXRpb25zKCkucHVzaChuZXcgTW9uZXJvRGVzdGluYXRpb24oZGVzdGluYXRpb25BZGRyZXNzZXNbaV0sIHNlbmRBbW91bnRQZXJTdWJhZGRyZXNzKSk7XG4gICAgICAgICAgc3VidHJhY3RGZWVGcm9tLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucykgY29uZmlnLnNldFN1YnRyYWN0RmVlRnJvbShzdWJ0cmFjdEZlZUZyb20pO1xuXG4gICAgICAgIC8vIGJ1aWxkIHR4IGNvbmZpZyB3aXRoIEpTIG9iamVjdFxuICAgICAgICBsZXQganNDb25maWc7XG4gICAgICAgIGlmICh1c2VKc0NvbmZpZykge1xuICAgICAgICAgIGpzQ29uZmlnID0ge307XG4gICAgICAgICAganNDb25maWcuYWNjb3VudEluZGV4ID0gc3JjQWNjb3VudC5nZXRJbmRleCgpO1xuICAgICAgICAgIGpzQ29uZmlnLnJlbGF5ID0gdHJ1ZTtcbiAgICAgICAgICBqc0NvbmZpZy5kZXN0aW5hdGlvbnMgPSBbXTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRlc3RpbmF0aW9uQWRkcmVzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBqc0NvbmZpZy5kZXN0aW5hdGlvbnMucHVzaCh7YWRkcmVzczogZGVzdGluYXRpb25BZGRyZXNzZXNbaV0sIGFtb3VudDogc2VuZEFtb3VudFBlclN1YmFkZHJlc3N9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucykganNDb25maWcuc3VidHJhY3RGZWVGcm9tID0gc3VidHJhY3RGZWVGcm9tO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBzZW5kIHR4KHMpIHdpdGggY29uZmlnIHhvciBqcyBvYmplY3RcbiAgICAgICAgbGV0IGNvbmZpZ0NvcHkgPSBjb25maWcuY29weSgpO1xuICAgICAgICBsZXQgdHhzOiBNb25lcm9UeFdhbGxldFtdID0gdW5kZWZpbmVkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChjYW5TcGxpdCkge1xuICAgICAgICAgICAgdHhzID0gYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlVHhzKHVzZUpzQ29uZmlnID8ganNDb25maWcgOiBjb25maWcpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0eHMgPSBbYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlVHgodXNlSnNDb25maWcgPyBqc0NvbmZpZyA6IGNvbmZpZyldO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcblxuICAgICAgICAgIC8vIHRlc3QgZXJyb3IgYXBwbHlpbmcgc3VidHJhY3RGcm9tRmVlIHdpdGggc3BsaXQgdHhzXG4gICAgICAgICAgaWYgKHN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucyAmJiAhdHhzKSB7XG4gICAgICAgICAgICBpZiAoZXJyLm1lc3NhZ2UgIT09IFwic3VidHJhY3RmZWVmcm9tIHRyYW5zZmVycyBjYW5ub3QgYmUgc3BsaXQgb3ZlciBtdWx0aXBsZSB0cmFuc2FjdGlvbnMgeWV0XCIpIHRocm93IGVycjtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdGhhdCBjb25maWcgaXMgdW5jaGFuZ2VkXG4gICAgICAgIGFzc2VydChjb25maWdDb3B5ICE9PSBjb25maWcpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGNvbmZpZywgY29uZmlnQ29weSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHRoYXQgd2FsbGV0IGJhbGFuY2UgZGVjcmVhc2VkXG4gICAgICAgIGxldCBhY2NvdW50ID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudChzcmNBY2NvdW50LmdldEluZGV4KCkpO1xuICAgICAgICBhc3NlcnQoYWNjb3VudC5nZXRCYWxhbmNlKCkgPCBiYWxhbmNlKTtcbiAgICAgICAgYXNzZXJ0KGFjY291bnQuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgPCB1bmxvY2tlZEJhbGFuY2UpO1xuXG4gICAgICAgIC8vIGJ1aWxkIHRlc3QgY29udGV4dFxuICAgICAgICBjb25maWcuc2V0Q2FuU3BsaXQoY2FuU3BsaXQpO1xuICAgICAgICBsZXQgY3R4OiBhbnkgPSB7fTtcbiAgICAgICAgY3R4LndhbGxldCA9IHRoYXQud2FsbGV0O1xuICAgICAgICBjdHguY29uZmlnID0gY29uZmlnO1xuICAgICAgICBjdHguaXNTZW5kUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBlYWNoIHRyYW5zYWN0aW9uXG4gICAgICAgIGFzc2VydCh0eHMubGVuZ3RoID4gMCk7XG4gICAgICAgIGxldCBmZWVTdW0gPSBCaWdJbnQoMCk7XG4gICAgICAgIGxldCBvdXRnb2luZ1N1bSA9IEJpZ0ludCgwKTtcbiAgICAgICAgYXdhaXQgdGhhdC50ZXN0VHhzV2FsbGV0KHR4cywgY3R4KTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgZmVlU3VtID0gZmVlU3VtICsgdHguZ2V0RmVlKCk7XG4gICAgICAgICAgb3V0Z29pbmdTdW0gPSBvdXRnb2luZ1N1bSArIHR4LmdldE91dGdvaW5nQW1vdW50KCk7XG4gICAgICAgICAgaWYgKHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKSAhPT0gdW5kZWZpbmVkICYmIHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKSkge1xuICAgICAgICAgICAgbGV0IGRlc3RpbmF0aW9uU3VtID0gQmlnSW50KDApO1xuICAgICAgICAgICAgZm9yIChsZXQgZGVzdGluYXRpb24gb2YgdHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpKSB7XG4gICAgICAgICAgICAgIGF3YWl0IHRlc3REZXN0aW5hdGlvbihkZXN0aW5hdGlvbik7XG4gICAgICAgICAgICAgIGFzc2VydChkZXN0aW5hdGlvbkFkZHJlc3Nlcy5pbmNsdWRlcyhkZXN0aW5hdGlvbi5nZXRBZGRyZXNzKCkpKTtcbiAgICAgICAgICAgICAgZGVzdGluYXRpb25TdW0gPSBkZXN0aW5hdGlvblN1bSArIChkZXN0aW5hdGlvbi5nZXRBbW91bnQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0T3V0Z29pbmdBbW91bnQoKSwgZGVzdGluYXRpb25TdW0pOyAvLyBhc3NlcnQgdGhhdCB0cmFuc2ZlcnMgc3VtIHVwIHRvIHR4IGFtb3VudFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gYXNzZXJ0IHRoYXQgb3V0Z29pbmcgYW1vdW50cyBzdW0gdXAgdG8gdGhlIGFtb3VudCBzZW50IHdpdGhpbiBhIHNtYWxsIG1hcmdpblxuICAgICAgICBpZiAoR2VuVXRpbHMuYWJzKChzZW5kQW1vdW50IC0gKHN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucyA/IGZlZVN1bSA6IEJpZ0ludCgwKSkgLSBvdXRnb2luZ1N1bSkpID4gU0VORF9NQVhfRElGRikgeyAvLyBzZW5kIGFtb3VudHMgbWF5IGJlIHNsaWdodGx5IGRpZmZlcmVudFxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFjdHVhbCBzZW5kIGFtb3VudCBpcyB0b28gZGlmZmVyZW50IGZyb20gcmVxdWVzdGVkIHNlbmQgYW1vdW50OiBcIiArIHNlbmRBbW91bnQgKyBcIiAtIFwiICsgKHN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucyA/IGZlZVN1bSA6IEJpZ0ludCgwKSkgKyBcIiAtIFwiICsgb3V0Z29pbmdTdW0gKyBcIiA9IFwiICsgc2VuZEFtb3VudC5zdWJ0cmFjdChzdWJ0cmFjdEZlZUZyb21EZXN0aW5hdGlvbnMgPyBmZWVTdW0gOiBCaWdJbnQoMCkpLnN1YnRyYWN0KG91dGdvaW5nU3VtKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKCF0ZXN0Q29uZmlnLmxpdGVNb2RlICYmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgfHwgdGVzdENvbmZpZy50ZXN0UmVsYXlzKSlcbiAgICAgIGl0KFwiU3VwcG9ydHMgdmlldy1vbmx5IGFuZCBvZmZsaW5lIHdhbGxldHMgdG8gY3JlYXRlLCBzaWduLCBhbmQgc3VibWl0IHRyYW5zYWN0aW9uc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSB2aWV3LW9ubHkgYW5kIG9mZmxpbmUgd2FsbGV0c1xuICAgICAgICBsZXQgdmlld09ubHlXYWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7cHJpbWFyeUFkZHJlc3M6IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIHByaXZhdGVWaWV3S2V5OiBhd2FpdCB0aGF0LndhbGxldC5nZXRQcml2YXRlVmlld0tleSgpLCByZXN0b3JlSGVpZ2h0OiBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFR9KTtcbiAgICAgICAgbGV0IG9mZmxpbmVXYWxsZXQgPSBhd2FpdCB0aGF0LmNyZWF0ZVdhbGxldCh7cHJpbWFyeUFkZHJlc3M6IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIHByaXZhdGVWaWV3S2V5OiBhd2FpdCB0aGF0LndhbGxldC5nZXRQcml2YXRlVmlld0tleSgpLCBwcml2YXRlU3BlbmRLZXk6IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaXZhdGVTcGVuZEtleSgpLCBzZXJ2ZXI6IFRlc3RVdGlscy5PRkZMSU5FX1NFUlZFUl9VUkksIHJlc3RvcmVIZWlnaHQ6IDB9KTtcbiAgICAgICAgYXdhaXQgdmlld09ubHlXYWxsZXQuc3luYygpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB0eCBzaWduaW5nIHdpdGggd2FsbGV0c1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQudGVzdFZpZXdPbmx5QW5kT2ZmbGluZVdhbGxldHModmlld09ubHlXYWxsZXQsIG9mZmxpbmVXYWxsZXQpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmaW5hbGx5XG4gICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQodmlld09ubHlXYWxsZXQpO1xuICAgICAgICBhd2FpdCB0aGF0LmNsb3NlV2FsbGV0KG9mZmxpbmVXYWxsZXQpO1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHN3ZWVwIGluZGl2aWR1YWwgb3V0cHV0cyBpZGVudGlmaWVkIGJ5IHRoZWlyIGtleSBpbWFnZXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBjb25maWdcbiAgICAgICAgbGV0IG51bU91dHB1dHMgPSAzO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IG91dHB1dHMgdG8gc3dlZXAgKG5vdCBzcGVudCwgdW5sb2NrZWQsIGFuZCBhbW91bnQgPj0gZmVlKVxuICAgICAgICBsZXQgc3BlbmRhYmxlVW5sb2NrZWRPdXRwdXRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0cHV0cyhuZXcgTW9uZXJvT3V0cHV0UXVlcnkoKS5zZXRJc1NwZW50KGZhbHNlKS5zZXRUeFF1ZXJ5KG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0SXNMb2NrZWQoZmFsc2UpKSk7XG4gICAgICAgIGxldCBvdXRwdXRzVG9Td2VlcDogYW55W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcGVuZGFibGVVbmxvY2tlZE91dHB1dHMubGVuZ3RoICYmIG91dHB1dHNUb1N3ZWVwLmxlbmd0aCA8IG51bU91dHB1dHM7IGkrKykge1xuICAgICAgICAgIGlmIChzcGVuZGFibGVVbmxvY2tlZE91dHB1dHNbaV0uZ2V0QW1vdW50KCkgPiBUZXN0VXRpbHMuTUFYX0ZFRSkgb3V0cHV0c1RvU3dlZXAucHVzaChzcGVuZGFibGVVbmxvY2tlZE91dHB1dHNbaV0pOyAvLyBvdXRwdXQgY2Fubm90IGJlIHN3ZXB0IGlmIGFtb3VudCBkb2VzIG5vdCBjb3ZlciBmZWVcbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQob3V0cHV0c1RvU3dlZXAubGVuZ3RoID49IG51bU91dHB1dHMsIFwiV2FsbGV0IGRvZXMgbm90IGhhdmUgZW5vdWdoIHN3ZWVwYWJsZSBvdXRwdXRzOyBydW4gc2VuZCB0ZXN0c1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN3ZWVwIGVhY2ggb3V0cHV0IGJ5IGtleSBpbWFnZVxuICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2Ygb3V0cHV0c1RvU3dlZXApIHtcbiAgICAgICAgICB0ZXN0T3V0cHV0V2FsbGV0KG91dHB1dCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRJc1NwZW50KCksIGZhbHNlKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldElzTG9ja2VkKCksIGZhbHNlKTtcbiAgICAgICAgICBpZiAob3V0cHV0LmdldEFtb3VudCgpIDw9IFRlc3RVdGlscy5NQVhfRkVFKSBjb250aW51ZTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzd2VlcCBvdXRwdXQgdG8gYWRkcmVzc1xuICAgICAgICAgIGxldCBhZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWRkcmVzcyhvdXRwdXQuZ2V0QWNjb3VudEluZGV4KCksIG91dHB1dC5nZXRTdWJhZGRyZXNzSW5kZXgoKSk7XG4gICAgICAgICAgbGV0IGNvbmZpZyA9IG5ldyBNb25lcm9UeENvbmZpZyh7YWRkcmVzczogYWRkcmVzcywga2V5SW1hZ2U6IG91dHB1dC5nZXRLZXlJbWFnZSgpLmdldEhleCgpLCByZWxheTogdHJ1ZX0pO1xuICAgICAgICAgIGxldCB0eCA9IGF3YWl0IHRoYXQud2FsbGV0LnN3ZWVwT3V0cHV0KGNvbmZpZyk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCByZXN1bHRpbmcgdHhcbiAgICAgICAgICBjb25maWcuc2V0Q2FuU3BsaXQoZmFsc2UpO1xuICAgICAgICAgIGF3YWl0IHRoYXQudGVzdFR4V2FsbGV0KHR4LCB7d2FsbGV0OiB0aGF0LndhbGxldCwgY29uZmlnOiBjb25maWcsIGlzU2VuZFJlc3BvbnNlOiB0cnVlLCBpc1N3ZWVwUmVzcG9uc2U6IHRydWUsIGlzU3dlZXBPdXRwdXRSZXNwb25zZTogdHJ1ZX0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgb3V0cHV0cyBhZnRlciBzd2VlcGluZ1xuICAgICAgICBsZXQgYWZ0ZXJPdXRwdXRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0cHV0cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3dlcHQgb3V0cHV0IGFyZSBub3cgc3BlbnRcbiAgICAgICAgZm9yIChsZXQgYWZ0ZXJPdXRwdXQgb2YgYWZ0ZXJPdXRwdXRzKSB7XG4gICAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHNUb1N3ZWVwKSB7XG4gICAgICAgICAgICBpZiAob3V0cHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkgPT09IGFmdGVyT3V0cHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkpIHtcbiAgICAgICAgICAgICAgYXNzZXJ0KGFmdGVyT3V0cHV0LmdldElzU3BlbnQoKSwgXCJPdXRwdXQgc2hvdWxkIGJlIHNwZW50XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZWxheXMpXG4gICAgICBpdChcIkNhbiBzd2VlcCBkdXN0IHdpdGhvdXQgcmVsYXlpbmdcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3dlZXAgZHVzdCB3aGljaCByZXR1cm5zIGVtcHR5IGxpc3QgaWYgbm8gZHVzdCB0byBzd2VlcCAoZHVzdCBkb2VzIG5vdCBleGlzdCBhZnRlciByY3QpXG4gICAgICAgIGxldCB0eHMgPSBhd2FpdCB0aGF0LndhbGxldC5zd2VlcER1c3QoZmFsc2UpO1xuICAgICAgICBpZiAodHhzLmxlbmd0aCA9PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHR4c1xuICAgICAgICBsZXQgY3R4ID0ge2NvbmZpZzogbmV3IE1vbmVyb1R4Q29uZmlnKCksIGlzU2VuZFJlc3BvbnNlOiB0cnVlLCBpc1N3ZWVwUmVzcG9uc2U6IHRydWV9O1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldCh0eCwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gcmVsYXkgdHhzXG4gICAgICAgIGxldCBtZXRhZGF0YXM6IGFueSA9IFtdO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIG1ldGFkYXRhcy5wdXNoKHR4LmdldE1ldGFkYXRhKCkpO1xuICAgICAgICBsZXQgdHhIYXNoZXMgPSBhd2FpdCB0aGF0LndhbGxldC5yZWxheVR4cyhtZXRhZGF0YXMpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHhzLmxlbmd0aCwgdHhIYXNoZXMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgdHhIYXNoIG9mIHR4SGFzaGVzKSBhc3NlcnQuZXF1YWwodHhIYXNoLmxlbmd0aCwgNjQpO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggYW5kIHRlc3QgdHhzXG4gICAgICAgIHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFR4cyhuZXcgTW9uZXJvVHhRdWVyeSgpLnNldEhhc2hlcyh0eEhhc2hlcykpO1xuICAgICAgICBjdHguY29uZmlnLnNldFJlbGF5KHRydWUpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldCh0eCwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZWxheXMpXG4gICAgICBpdChcIkNhbiBzd2VlcCBkdXN0XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sKHRoYXQud2FsbGV0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN3ZWVwIGR1c3Qgd2hpY2ggcmV0dXJucyBlbXB0eSBsaXN0IGlmIG5vIGR1c3QgdG8gc3dlZXAgKGR1c3QgZG9lcyBub3QgZXhpc3QgYWZ0ZXIgcmN0KVxuICAgICAgICBsZXQgdHhzID0gYXdhaXQgdGhhdC53YWxsZXQuc3dlZXBEdXN0KHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBhbnkgdHhzXG4gICAgICAgIGxldCBjdHggPSB7d2FsbGV0OiB0aGF0LndhbGxldCwgaXNTZW5kUmVzcG9uc2U6IHRydWUsIGlzU3dlZXBSZXNwb25zZTogdHJ1ZX07XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIGF3YWl0IHRoYXQudGVzdFR4V2FsbGV0KHR4LCBjdHgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaXQoXCJTdXBwb3J0cyBtdWx0aXNpZyB3YWxsZXRzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhd2FpdCB0aGF0LnRlc3RNdWx0aXNpZygyLCAyLCBmYWxzZSk7IC8vIG4vblxuICAgICAgICBhd2FpdCB0aGF0LnRlc3RNdWx0aXNpZygyLCAzLCBmYWxzZSk7IC8vIChuLTEpL25cbiAgICAgICAgYXdhaXQgdGhhdC50ZXN0TXVsdGlzaWcoMiwgNCwgdGVzdENvbmZpZy50ZXN0UmVsYXlzICYmICF0ZXN0Q29uZmlnLmxpdGVNb2RlKTsgLy8gbS9uXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBURVNUIFJFU0VUUyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVzZXRzKVxuICAgICAgaXQoXCJDYW4gc3dlZXAgc3ViYWRkcmVzc2VzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sKHRoYXQud2FsbGV0KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IE5VTV9TVUJBRERSRVNTRVNfVE9fU1dFRVAgPSAyO1xuICAgICAgICBcbiAgICAgICAgLy8gY29sbGVjdCBzdWJhZGRyZXNzZXMgd2l0aCBiYWxhbmNlIGFuZCB1bmxvY2tlZCBiYWxhbmNlXG4gICAgICAgIGxldCBzdWJhZGRyZXNzZXM6IGFueVtdID0gW107XG4gICAgICAgIGxldCBzdWJhZGRyZXNzZXNCYWxhbmNlOiBhbnlbXSA9IFtdO1xuICAgICAgICBsZXQgc3ViYWRkcmVzc2VzVW5sb2NrZWQ6IGFueVtdID0gW107XG4gICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSkpIHtcbiAgICAgICAgICBpZiAoYWNjb3VudC5nZXRJbmRleCgpID09PSAwKSBjb250aW51ZTsgIC8vIHNraXAgZGVmYXVsdCBhY2NvdW50XG4gICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzcyBvZiBhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSB7XG4gICAgICAgICAgICBzdWJhZGRyZXNzZXMucHVzaChzdWJhZGRyZXNzKTtcbiAgICAgICAgICAgIGlmIChzdWJhZGRyZXNzLmdldEJhbGFuY2UoKSA+IFRlc3RVdGlscy5NQVhfRkVFKSBzdWJhZGRyZXNzZXNCYWxhbmNlLnB1c2goc3ViYWRkcmVzcyk7XG4gICAgICAgICAgICBpZiAoc3ViYWRkcmVzcy5nZXRVbmxvY2tlZEJhbGFuY2UoKSA+IFRlc3RVdGlscy5NQVhfRkVFKSBzdWJhZGRyZXNzZXNVbmxvY2tlZC5wdXNoKHN1YmFkZHJlc3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCByZXF1aXJlcyBhdCBsZWFzdCBvbmUgbW9yZSBzdWJhZGRyZXNzZXMgdGhhbiB0aGUgbnVtYmVyIGJlaW5nIHN3ZXB0IHRvIHZlcmlmeSBpdCBkb2VzIG5vdCBjaGFuZ2VcbiAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3Nlc0JhbGFuY2UubGVuZ3RoID49IE5VTV9TVUJBRERSRVNTRVNfVE9fU1dFRVAgKyAxLCBcIlRlc3QgcmVxdWlyZXMgYmFsYW5jZSBpbiBhdCBsZWFzdCBcIiArIChOVU1fU1VCQUREUkVTU0VTX1RPX1NXRUVQICsgMSkgKyBcIiBzdWJhZGRyZXNzZXMgZnJvbSBub24tZGVmYXVsdCBhY2Njb3VudDsgcnVuIHNlbmQtdG8tbXVsdGlwbGUgdGVzdHNcIik7XG4gICAgICAgIGFzc2VydChzdWJhZGRyZXNzZXNVbmxvY2tlZC5sZW5ndGggPj0gTlVNX1NVQkFERFJFU1NFU19UT19TV0VFUCArIDEsIFwiV2FsbGV0IGlzIHdhaXRpbmcgb24gdW5sb2NrZWQgZnVuZHNcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBzd2VlcCBmcm9tIGZpcnN0IHVubG9ja2VkIHN1YmFkZHJlc3Nlc1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE5VTV9TVUJBRERSRVNTRVNfVE9fU1dFRVA7IGkrKykge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHN3ZWVwIHVubG9ja2VkIGFjY291bnRcbiAgICAgICAgICBsZXQgdW5sb2NrZWRTdWJhZGRyZXNzID0gc3ViYWRkcmVzc2VzVW5sb2NrZWRbaV07XG4gICAgICAgICAgbGV0IGNvbmZpZyA9IG5ldyBNb25lcm9UeENvbmZpZyh7XG4gICAgICAgICAgICBhZGRyZXNzOiBhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLFxuICAgICAgICAgICAgYWNjb3VudEluZGV4OiB1bmxvY2tlZFN1YmFkZHJlc3MuZ2V0QWNjb3VudEluZGV4KCksXG4gICAgICAgICAgICBzdWJhZGRyZXNzSW5kZXg6IHVubG9ja2VkU3ViYWRkcmVzcy5nZXRJbmRleCgpLFxuICAgICAgICAgICAgcmVsYXk6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsZXQgdHhzID0gYXdhaXQgdGhhdC53YWxsZXQuc3dlZXBVbmxvY2tlZChjb25maWcpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgdHJhbnNhY3Rpb25zXG4gICAgICAgICAgYXNzZXJ0KHR4cy5sZW5ndGggPiAwKTtcbiAgICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICAgIGFzc2VydChHZW5VdGlscy5hcnJheUNvbnRhaW5zKHR4LmdldFR4U2V0KCkuZ2V0VHhzKCksIHR4KSk7XG4gICAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldCh0eCwge3dhbGxldDogdGhhdC53YWxsZXQsIGNvbmZpZzogY29uZmlnLCBpc1NlbmRSZXNwb25zZTogdHJ1ZSwgaXNTd2VlcFJlc3BvbnNlOiB0cnVlfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIGFzc2VydCB1bmxvY2tlZCBiYWxhbmNlIGlzIGxlc3MgdGhhbiBtYXggZmVlXG4gICAgICAgICAgbGV0IHN1YmFkZHJlc3MgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzKHVubG9ja2VkU3ViYWRkcmVzcy5nZXRBY2NvdW50SW5kZXgoKSwgdW5sb2NrZWRTdWJhZGRyZXNzLmdldEluZGV4KCkpO1xuICAgICAgICAgIGFzc2VydChzdWJhZGRyZXNzLmdldFVubG9ja2VkQmFsYW5jZSgpIDwgVGVzdFV0aWxzLk1BWF9GRUUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHN1YmFkZHJlc3NlcyBhZnRlciBzd2VlcGluZ1xuICAgICAgICBsZXQgc3ViYWRkcmVzc2VzQWZ0ZXI6IGFueVtdID0gW107XG4gICAgICAgIGZvciAobGV0IGFjY291bnQgb2YgYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSkpIHtcbiAgICAgICAgICBpZiAoYWNjb3VudC5nZXRJbmRleCgpID09PSAwKSBjb250aW51ZTsgIC8vIHNraXAgZGVmYXVsdCBhY2NvdW50XG4gICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzcyBvZiBhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSB7XG4gICAgICAgICAgICBzdWJhZGRyZXNzZXNBZnRlci5wdXNoKHN1YmFkZHJlc3MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQuZXF1YWwoc3ViYWRkcmVzc2VzQWZ0ZXIubGVuZ3RoLCBzdWJhZGRyZXNzZXMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdWJhZGRyZXNzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBsZXQgc3ViYWRkcmVzc0JlZm9yZSA9IHN1YmFkZHJlc3Nlc1tpXTtcbiAgICAgICAgICBsZXQgc3ViYWRkcmVzc0FmdGVyID0gc3ViYWRkcmVzc2VzQWZ0ZXJbaV07XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gZGV0ZXJtaW5lIGlmIHN1YmFkZHJlc3Mgd2FzIHN3ZXB0XG4gICAgICAgICAgbGV0IHN3ZXB0ID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBOVU1fU1VCQUREUkVTU0VTX1RPX1NXRUVQOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChzdWJhZGRyZXNzZXNVbmxvY2tlZFtqXS5nZXRBY2NvdW50SW5kZXgoKSA9PT0gc3ViYWRkcmVzc0JlZm9yZS5nZXRBY2NvdW50SW5kZXgoKSAmJiBzdWJhZGRyZXNzZXNVbmxvY2tlZFtqXS5nZXRJbmRleCgpID09PSBzdWJhZGRyZXNzQmVmb3JlLmdldEluZGV4KCkpIHtcbiAgICAgICAgICAgICAgc3dlcHQgPSB0cnVlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gYXNzZXJ0IHVubG9ja2VkIGJhbGFuY2UgaXMgbGVzcyB0aGFuIG1heCBmZWUgaWYgc3dlcHQsIHVuY2hhbmdlZCBvdGhlcndpc2VcbiAgICAgICAgICBpZiAoc3dlcHQpIHtcbiAgICAgICAgICAgIGFzc2VydChzdWJhZGRyZXNzQWZ0ZXIuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgPCBUZXN0VXRpbHMuTUFYX0ZFRSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChzdWJhZGRyZXNzQmVmb3JlLmdldFVubG9ja2VkQmFsYW5jZSgpLCBzdWJhZGRyZXNzQWZ0ZXIuZ2V0VW5sb2NrZWRCYWxhbmNlKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3RSZXNldHMpXG4gICAgICBpdChcIkNhbiBzd2VlcCBhY2NvdW50c1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbCh0aGF0LndhbGxldCk7XG4gICAgICAgIGNvbnN0IE5VTV9BQ0NPVU5UU19UT19TV0VFUCA9IDE7XG4gICAgICAgIFxuICAgICAgICAvLyBjb2xsZWN0IGFjY291bnRzIHdpdGggc3VmZmljaWVudCBiYWxhbmNlIGFuZCB1bmxvY2tlZCBiYWxhbmNlIHRvIGNvdmVyIHRoZSBmZWVcbiAgICAgICAgbGV0IGFjY291bnRzOiBhbnlbXSA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKHRydWUpO1xuICAgICAgICBsZXQgYWNjb3VudHNCYWxhbmNlOiBhbnlbXSA9IFtdO1xuICAgICAgICBsZXQgYWNjb3VudHNVbmxvY2tlZDogYW55W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgYWNjb3VudCBvZiBhY2NvdW50cykge1xuICAgICAgICAgIGlmIChhY2NvdW50LmdldEluZGV4KCkgPT09IDApIGNvbnRpbnVlOyAvLyBza2lwIGRlZmF1bHQgYWNjb3VudFxuICAgICAgICAgIGlmIChhY2NvdW50LmdldEJhbGFuY2UoKSA+IFRlc3RVdGlscy5NQVhfRkVFKSBhY2NvdW50c0JhbGFuY2UucHVzaChhY2NvdW50KTtcbiAgICAgICAgICBpZiAoYWNjb3VudC5nZXRVbmxvY2tlZEJhbGFuY2UoKSA+IFRlc3RVdGlscy5NQVhfRkVFKSBhY2NvdW50c1VubG9ja2VkLnB1c2goYWNjb3VudCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgcmVxdWlyZXMgYXQgbGVhc3Qgb25lIG1vcmUgYWNjb3VudHMgdGhhbiB0aGUgbnVtYmVyIGJlaW5nIHN3ZXB0IHRvIHZlcmlmeSBpdCBkb2VzIG5vdCBjaGFuZ2VcbiAgICAgICAgYXNzZXJ0KGFjY291bnRzQmFsYW5jZS5sZW5ndGggPj0gTlVNX0FDQ09VTlRTX1RPX1NXRUVQICsgMSwgXCJUZXN0IHJlcXVpcmVzIGJhbGFuY2UgZ3JlYXRlciB0aGFuIHRoZSBmZWUgaW4gYXQgbGVhc3QgXCIgKyAoTlVNX0FDQ09VTlRTX1RPX1NXRUVQICsgMSkgKyBcIiBub24tZGVmYXVsdCBhY2NvdW50czsgcnVuIHNlbmQtdG8tbXVsdGlwbGUgdGVzdHNcIik7XG4gICAgICAgIGFzc2VydChhY2NvdW50c1VubG9ja2VkLmxlbmd0aCA+PSBOVU1fQUNDT1VOVFNfVE9fU1dFRVAgKyAxLCBcIldhbGxldCBpcyB3YWl0aW5nIG9uIHVubG9ja2VkIGZ1bmRzXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3dlZXAgZnJvbSBmaXJzdCB1bmxvY2tlZCBhY2NvdW50c1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IE5VTV9BQ0NPVU5UU19UT19TV0VFUDsgaSsrKSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc3dlZXAgdW5sb2NrZWQgYWNjb3VudFxuICAgICAgICAgIGxldCB1bmxvY2tlZEFjY291bnQgPSBhY2NvdW50c1VubG9ja2VkW2ldO1xuICAgICAgICAgIGxldCBjb25maWcgPSBuZXcgTW9uZXJvVHhDb25maWcoKS5zZXRBZGRyZXNzKGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCkpLnNldEFjY291bnRJbmRleCh1bmxvY2tlZEFjY291bnQuZ2V0SW5kZXgoKSkuc2V0UmVsYXkodHJ1ZSk7XG4gICAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LnN3ZWVwVW5sb2NrZWQoY29uZmlnKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IHRyYW5zYWN0aW9uc1xuICAgICAgICAgIGFzc2VydCh0eHMubGVuZ3RoID4gMCk7XG4gICAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldCh0eCwge3dhbGxldDogdGhhdC53YWxsZXQsIGNvbmZpZzogY29uZmlnLCBpc1NlbmRSZXNwb25zZTogdHJ1ZSwgaXNTd2VlcFJlc3BvbnNlOiB0cnVlfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIGFzc2VydCB1bmxvY2tlZCBhY2NvdW50IGJhbGFuY2UgbGVzcyB0aGFuIG1heCBmZWVcbiAgICAgICAgICBsZXQgYWNjb3VudCA9IGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnQodW5sb2NrZWRBY2NvdW50LmdldEluZGV4KCkpO1xuICAgICAgICAgIGFzc2VydChhY2NvdW50LmdldFVubG9ja2VkQmFsYW5jZSgpIDwgVGVzdFV0aWxzLk1BWF9GRUUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGFjY291bnRzIGFmdGVyIHN3ZWVwaW5nXG4gICAgICAgIGxldCBhY2NvdW50c0FmdGVyID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChhY2NvdW50c0FmdGVyLmxlbmd0aCwgYWNjb3VudHMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhY2NvdW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGxldCBhY2NvdW50QmVmb3JlID0gYWNjb3VudHNbaV07XG4gICAgICAgICAgbGV0IGFjY291bnRBZnRlciA9IGFjY291bnRzQWZ0ZXJbaV07XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gZGV0ZXJtaW5lIGlmIGFjY291bnQgd2FzIHN3ZXB0XG4gICAgICAgICAgbGV0IHN3ZXB0ID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBOVU1fQUNDT1VOVFNfVE9fU1dFRVA7IGorKykge1xuICAgICAgICAgICAgaWYgKGFjY291bnRzVW5sb2NrZWRbal0uZ2V0SW5kZXgoKSA9PT0gYWNjb3VudEJlZm9yZS5nZXRJbmRleCgpKSB7XG4gICAgICAgICAgICAgIHN3ZXB0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIGFzc2VydCB1bmxvY2tlZCBiYWxhbmNlIGlzIGxlc3MgdGhhbiBtYXggZmVlIGlmIHN3ZXB0LCB1bmNoYW5nZWQgb3RoZXJ3aXNlXG4gICAgICAgICAgaWYgKHN3ZXB0KSB7XG4gICAgICAgICAgICBhc3NlcnQoYWNjb3VudEFmdGVyLmdldFVubG9ja2VkQmFsYW5jZSgpIDwgVGVzdFV0aWxzLk1BWF9GRUUpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoYWNjb3VudEJlZm9yZS5nZXRVbmxvY2tlZEJhbGFuY2UoKSwgYWNjb3VudEFmdGVyLmdldFVubG9ja2VkQmFsYW5jZSgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVzZXRzKVxuICAgICAgaXQoXCJDYW4gc3dlZXAgdGhlIHdob2xlIHdhbGxldCBieSBhY2NvdW50c1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXNzZXJ0KGZhbHNlLCBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBzd2VlcCB0aGUgd2hvbGUgd2FsbGV0P1wiKTtcbiAgICAgICAgYXdhaXQgdGVzdFN3ZWVwV2FsbGV0KCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlc2V0cylcbiAgICAgIGl0KFwiQ2FuIHN3ZWVwIHRoZSB3aG9sZSB3YWxsZXQgYnkgc3ViYWRkcmVzc2VzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhc3NlcnQoZmFsc2UsIFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHN3ZWVwIHRoZSB3aG9sZSB3YWxsZXQ/XCIpO1xuICAgICAgICBhd2FpdCB0ZXN0U3dlZXBXYWxsZXQodHJ1ZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgYXN5bmMgZnVuY3Rpb24gdGVzdFN3ZWVwV2FsbGV0KHN3ZWVwRWFjaFN1YmFkZHJlc3MgPSBmYWxzZSkge1xuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sKHRoYXQud2FsbGV0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHZlcmlmeSAyIHN1YmFkZHJlc3NlcyB3aXRoIGVub3VnaCB1bmxvY2tlZCBiYWxhbmNlIHRvIGNvdmVyIHRoZSBmZWVcbiAgICAgICAgbGV0IHN1YmFkZHJlc3Nlc0JhbGFuY2U6IE1vbmVyb1N1YmFkZHJlc3NbXSA9IFtdO1xuICAgICAgICBsZXQgc3ViYWRkcmVzc2VzVW5sb2NrZWQ6IE1vbmVyb1N1YmFkZHJlc3NbXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBhY2NvdW50IG9mIGF3YWl0IHRoYXQud2FsbGV0LmdldEFjY291bnRzKHRydWUpKSB7XG4gICAgICAgICAgZm9yIChsZXQgc3ViYWRkcmVzcyBvZiBhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSB7XG4gICAgICAgICAgICBpZiAoc3ViYWRkcmVzcy5nZXRCYWxhbmNlKCkgPiBUZXN0VXRpbHMuTUFYX0ZFRSkgc3ViYWRkcmVzc2VzQmFsYW5jZS5wdXNoKHN1YmFkZHJlc3MpO1xuICAgICAgICAgICAgaWYgKHN1YmFkZHJlc3MuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgPiBUZXN0VXRpbHMuTUFYX0ZFRSkgc3ViYWRkcmVzc2VzVW5sb2NrZWQucHVzaChzdWJhZGRyZXNzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3Nlc0JhbGFuY2UubGVuZ3RoID49IDIsIFwiVGVzdCByZXF1aXJlcyBtdWx0aXBsZSBhY2NvdW50cyB3aXRoIGEgYmFsYW5jZSBncmVhdGVyIHRoYW4gdGhlIGZlZTsgcnVuIHNlbmQgdG8gbXVsdGlwbGUgZmlyc3RcIik7XG4gICAgICAgIGFzc2VydChzdWJhZGRyZXNzZXNVbmxvY2tlZC5sZW5ndGggPj0gMiwgXCJXYWxsZXQgaXMgd2FpdGluZyBvbiB1bmxvY2tlZCBmdW5kc1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN3ZWVwXG4gICAgICAgIGxldCBkZXN0aW5hdGlvbiA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCk7XG4gICAgICAgIGxldCBjb25maWcgPSBuZXcgTW9uZXJvVHhDb25maWcoKS5zZXRBZGRyZXNzKGRlc3RpbmF0aW9uKS5zZXRTd2VlcEVhY2hTdWJhZGRyZXNzKHN3ZWVwRWFjaFN1YmFkZHJlc3MpLnNldFJlbGF5KHRydWUpO1xuICAgICAgICBsZXQgY29weSA9IGNvbmZpZy5jb3B5KCk7XG4gICAgICAgIGxldCB0eHMgPSBhd2FpdCB0aGF0LndhbGxldC5zd2VlcFVubG9ja2VkKGNvbmZpZyk7XG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoY29uZmlnLCBjb3B5KTsgLy8gY29uZmlnIGlzIHVuY2hhbmdlZFxuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBhc3NlcnQoR2VuVXRpbHMuYXJyYXlDb250YWlucyh0eC5nZXRUeFNldCgpLmdldFR4cygpLCB0eCkpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRUeFNldCgpLmdldE11bHRpc2lnVHhIZXgoKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0VHhTZXQoKS5nZXRTaWduZWRUeEhleCgpLCB1bmRlZmluZWQpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRUeFNldCgpLmdldFVuc2lnbmVkVHhIZXgoKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQodHhzLmxlbmd0aCA+IDApO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBjb25maWcgPSBuZXcgTW9uZXJvVHhDb25maWcoe1xuICAgICAgICAgICAgYWRkcmVzczogZGVzdGluYXRpb24sXG4gICAgICAgICAgICBhY2NvdW50SW5kZXg6IHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXRBY2NvdW50SW5kZXgoKSxcbiAgICAgICAgICAgIHN3ZWVwRWFjaFN1YmFkZHJlc3M6IHN3ZWVwRWFjaFN1YmFkZHJlc3MsXG4gICAgICAgICAgICByZWxheTogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGF3YWl0IHRoYXQudGVzdFR4V2FsbGV0KHR4LCB7d2FsbGV0OiB0aGF0LndhbGxldCwgY29uZmlnOiBjb25maWcsIGlzU2VuZFJlc3BvbnNlOiB0cnVlLCBpc1N3ZWVwUmVzcG9uc2U6IHRydWV9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gYWxsIHVuc3BlbnQsIHVubG9ja2VkIG91dHB1dHMgbXVzdCBiZSBsZXNzIHRoYW4gZmVlXG4gICAgICAgIGxldCBzcGVuZGFibGVPdXRwdXRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0cHV0cyhuZXcgTW9uZXJvT3V0cHV0UXVlcnkoKS5zZXRJc1NwZW50KGZhbHNlKS5zZXRUeFF1ZXJ5KG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0SXNMb2NrZWQoZmFsc2UpKSk7XG4gICAgICAgIGZvciAobGV0IHNwZW5kYWJsZU91dHB1dCBvZiBzcGVuZGFibGVPdXRwdXRzKSB7XG4gICAgICAgICAgYXNzZXJ0KHNwZW5kYWJsZU91dHB1dC5nZXRBbW91bnQoKSA8IFRlc3RVdGlscy5NQVhfRkVFLCBcIlVuc3BlbnQgb3V0cHV0IHNob3VsZCBoYXZlIGJlZW4gc3dlcHRcXG5cIiArIHNwZW5kYWJsZU91dHB1dC50b1N0cmluZygpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gYWxsIHN1YmFkZHJlc3MgdW5sb2NrZWQgYmFsYW5jZXMgbXVzdCBiZSBsZXNzIHRoYW4gZmVlXG4gICAgICAgIHN1YmFkZHJlc3Nlc0JhbGFuY2UgPSBbXTtcbiAgICAgICAgc3ViYWRkcmVzc2VzVW5sb2NrZWQgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgYWNjb3VudCBvZiBhd2FpdCB0aGF0LndhbGxldC5nZXRBY2NvdW50cyh0cnVlKSkge1xuICAgICAgICAgIGZvciAobGV0IHN1YmFkZHJlc3Mgb2YgYWNjb3VudC5nZXRTdWJhZGRyZXNzZXMoKSkge1xuICAgICAgICAgICAgYXNzZXJ0KHN1YmFkZHJlc3MuZ2V0VW5sb2NrZWRCYWxhbmNlKCkgPCBUZXN0VXRpbHMuTUFYX0ZFRSwgXCJObyBzdWJhZGRyZXNzIHNob3VsZCBoYXZlIG1vcmUgdW5sb2NrZWQgdGhhbiB0aGUgZmVlXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICBpdChcIkNhbiBzY2FuIHRyYW5zYWN0aW9ucyBieSBpZFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBhIGZldyB0eCBoYXNoZXNcbiAgICAgICAgbGV0IHR4SGFzaGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBsZXQgdHhzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKCk7XG4gICAgICAgIGlmICh0eHMubGVuZ3RoIDwgMykgdGhyb3cgbmV3IEVycm9yKFwiTm90IGVub3VnaCB0eHMgdG8gc2NhblwiKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHR4SGFzaGVzLnB1c2godHhzW2ldLmdldEhhc2goKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBzdGFydCB3YWxsZXQgd2l0aG91dCBzY2FubmluZ1xuICAgICAgICBsZXQgc2NhbldhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KG5ldyBNb25lcm9XYWxsZXRDb25maWcoKS5zZXRTZWVkKGF3YWl0IHRoYXQud2FsbGV0LmdldFNlZWQoKSkuc2V0UmVzdG9yZUhlaWdodCgwKSk7XG4gICAgICAgIGF3YWl0IHNjYW5XYWxsZXQuc3RvcFN5bmNpbmcoKTsgLy8gVE9ETzogY3JlYXRlIHdhbGxldCB3aXRob3V0IGRhZW1vbiBjb25uZWN0aW9uIChvZmZsaW5lIGRvZXMgbm90IHJlY29ubmVjdCwgZGVmYXVsdCBjb25uZWN0cyB0byBsb2NhbGhvc3QsIG9mZmxpbmUgdGhlbiBvbmxpbmUgY2F1c2VzIGNvbmZpcm1lZCB0eHMgdG8gZGlzYXBwZWFyKVxuICAgICAgICBhc3NlcnQoYXdhaXQgc2NhbldhbGxldC5pc0Nvbm5lY3RlZFRvRGFlbW9uKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gc2NhbiB0eHNcbiAgICAgICAgYXdhaXQgc2NhbldhbGxldC5zY2FuVHhzKHR4SGFzaGVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRPRE86IHNjYW5uaW5nIHR4cyBjYXVzZXMgbWVyZ2UgcHJvYmxlbXMgcmVjb25jaWxpbmcgMCBmZWUsIGlzTWluZXJUeCB3aXRoIHRlc3QgdHhzXG4gICAgICAgIFxuICAgIC8vICAgIC8vIHR4cyBhcmUgc2Nhbm5lZFxuICAgIC8vICAgIGFzc2VydEVxdWFscyh0eEhhc2hlcy5zaXplKCksIHNjYW5XYWxsZXQuZ2V0VHhzKCkuc2l6ZSgpKTtcbiAgICAvLyAgICBmb3IgKGludCBpID0gMDsgaSA8IHR4SGFzaGVzLnNpemUoKTsgaSsrKSB7XG4gICAgLy8gICAgICBhc3NlcnRFcXVhbHMod2FsbGV0LmdldFR4KHR4SGFzaGVzLmdldChpKSksIHNjYW5XYWxsZXQuZ2V0VHgodHhIYXNoZXMuZ2V0KGkpKSk7XG4gICAgLy8gICAgfVxuICAgIC8vICAgIExpc3Q8TW9uZXJvVHhXYWxsZXQ+IHNjYW5uZWRUeHMgPSBzY2FuV2FsbGV0LmdldFR4cyh0eEhhc2hlcyk7XG4gICAgLy8gICAgYXNzZXJ0RXF1YWxzKHR4SGFzaGVzLnNpemUoKSwgc2Nhbm5lZFR4cy5zaXplKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gY2xvc2Ugd2FsbGV0XG4gICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQoc2NhbldhbGxldCwgZmFsc2UpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIGRpc2FibGVkIHNvIHRlc3RzIGRvbid0IGRlbGV0ZSBsb2NhbCBjYWNoZVxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlc2V0cylcbiAgICAgIGl0KFwiQ2FuIHJlc2NhbiB0aGUgYmxvY2tjaGFpblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgLy9hc3NlcnQoZmFsc2UsIFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRpc2NhcmQgbG9jYWwgd2FsbGV0IGRhdGEgYW5kIHJlc2NhbiB0aGUgYmxvY2tjaGFpbj9cIik7XG4gICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnJlc2NhbkJsb2NrY2hhaW4oKTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgYXdhaXQgdGhhdC53YWxsZXQuZ2V0VHhzKCkpIHtcbiAgICAgICAgICBhd2FpdCB0aGF0LnRlc3RUeFdhbGxldCh0eCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZnJlZXplIGFuZCB0aGF3IG91dHB1dHNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgYW4gYXZhaWxhYmxlIG91dHB1dFxuICAgICAgICBsZXQgb3V0cHV0cyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldE91dHB1dHMobmV3IE1vbmVyb091dHB1dFF1ZXJ5KCkuc2V0SXNTcGVudChmYWxzZSkuc2V0SXNGcm96ZW4oZmFsc2UpLnNldFR4UXVlcnkobmV3IE1vbmVyb1R4UXVlcnkoKS5zZXRJc0xvY2tlZChmYWxzZSkpKTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIGFzc2VydC5lcXVhbChmYWxzZSwgb3V0cHV0LmdldElzRnJvemVuKCkpO1xuICAgICAgICBhc3NlcnQob3V0cHV0cy5sZW5ndGggPiAwKTtcbiAgICAgICAgbGV0IG91dHB1dCA9IG91dHB1dHNbMF07XG4gICAgICAgIGFzc2VydC5lcXVhbChmYWxzZSwgb3V0cHV0LmdldFR4KCkuZ2V0SXNMb2NrZWQoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChmYWxzZSwgb3V0cHV0LmdldElzU3BlbnQoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChmYWxzZSwgb3V0cHV0LmdldElzRnJvemVuKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZmFsc2UsIGF3YWl0IHRoYXQud2FsbGV0LmlzT3V0cHV0RnJvemVuKG91dHB1dC5nZXRLZXlJbWFnZSgpLmdldEhleCgpKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBmcmVlemUgb3V0cHV0IGJ5IGtleSBpbWFnZVxuICAgICAgICBsZXQgbnVtRnJvemVuQmVmb3JlID0gKGF3YWl0IHRoYXQud2FsbGV0LmdldE91dHB1dHMobmV3IE1vbmVyb091dHB1dFF1ZXJ5KCkuc2V0SXNGcm96ZW4odHJ1ZSkpKS5sZW5ndGg7XG4gICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmZyZWV6ZU91dHB1dChvdXRwdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0cnVlLCBhd2FpdCB0aGF0LndhbGxldC5pc091dHB1dEZyb3plbihvdXRwdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSkpO1xuICAgIFxuICAgICAgICAvLyB0ZXN0IHF1ZXJ5aW5nXG4gICAgICAgIGFzc2VydC5lcXVhbChudW1Gcm96ZW5CZWZvcmUgKyAxLCAoYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0cHV0cyhuZXcgTW9uZXJvT3V0cHV0UXVlcnkoKS5zZXRJc0Zyb3plbih0cnVlKSkpLmxlbmd0aCk7XG4gICAgICAgIG91dHB1dHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRPdXRwdXRzKG5ldyBNb25lcm9PdXRwdXRRdWVyeSgpLnNldEtleUltYWdlKG5ldyBNb25lcm9LZXlJbWFnZSgpLnNldEhleChvdXRwdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSkpLnNldElzRnJvemVuKHRydWUpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKDEsIG91dHB1dHMubGVuZ3RoKTtcbiAgICAgICAgbGV0IG91dHB1dEZyb3plbiA9IG91dHB1dHNbMF07XG4gICAgICAgIGFzc2VydC5lcXVhbCh0cnVlLCBvdXRwdXRGcm96ZW4uZ2V0SXNGcm96ZW4oKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChvdXRwdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSwgb3V0cHV0RnJvemVuLmdldEtleUltYWdlKCkuZ2V0SGV4KCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gdHJ5IHRvIHN3ZWVwIGZyb3plbiBvdXRwdXRcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5zd2VlcE91dHB1dChuZXcgTW9uZXJvVHhDb25maWcoKS5zZXRBZGRyZXNzKGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCkpLnNldEtleUltYWdlKG91dHB1dC5nZXRLZXlJbWFnZSgpLmdldEhleCgpKSk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGVycm9yXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoXCJObyBvdXRwdXRzIGZvdW5kXCIsIGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIHRyeSB0byBmcmVlemUgZW1wdHkga2V5IGltYWdlXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuZnJlZXplT3V0cHV0KFwiXCIpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBlcnJvclwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKFwiTXVzdCBzcGVjaWZ5IGtleSBpbWFnZSB0byBmcmVlemVcIiwgZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gdHJ5IHRvIGZyZWV6ZSBiYWQga2V5IGltYWdlXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuZnJlZXplT3V0cHV0KFwiMTIzXCIpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBlcnJvclwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgLy9hc3NlcnQuZXF1YWwoXCJCYWQga2V5IGltYWdlXCIsIGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICBcbiAgICAgICAgLy8gdGhhdyBvdXRwdXQgYnkga2V5IGltYWdlXG4gICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnRoYXdPdXRwdXQob3V0cHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZmFsc2UsIGF3YWl0IHRoYXQud2FsbGV0LmlzT3V0cHV0RnJvemVuKG91dHB1dC5nZXRLZXlJbWFnZSgpLmdldEhleCgpKSk7XG4gICAgXG4gICAgICAgIC8vIHRlc3QgcXVlcnlpbmdcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG51bUZyb3plbkJlZm9yZSwgKGF3YWl0IHRoYXQud2FsbGV0LmdldE91dHB1dHMobmV3IE1vbmVyb091dHB1dFF1ZXJ5KCkuc2V0SXNGcm96ZW4odHJ1ZSkpKS5sZW5ndGgpO1xuICAgICAgICBvdXRwdXRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0cHV0cyhuZXcgTW9uZXJvT3V0cHV0UXVlcnkoKS5zZXRLZXlJbWFnZShuZXcgTW9uZXJvS2V5SW1hZ2UoKS5zZXRIZXgob3V0cHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkpKS5zZXRJc0Zyb3plbih0cnVlKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCgwLCBvdXRwdXRzLmxlbmd0aCk7XG4gICAgICAgIG91dHB1dHMgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRPdXRwdXRzKG5ldyBNb25lcm9PdXRwdXRRdWVyeSgpLnNldEtleUltYWdlKG5ldyBNb25lcm9LZXlJbWFnZSgpLnNldEhleChvdXRwdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSkpLnNldElzRnJvemVuKGZhbHNlKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCgxLCBvdXRwdXRzLmxlbmd0aCk7XG4gICAgICAgIGxldCBvdXRwdXRUaGF3ZWQgPSBvdXRwdXRzWzBdO1xuICAgICAgICBhc3NlcnQuZXF1YWwoZmFsc2UsIG91dHB1dFRoYXdlZC5nZXRJc0Zyb3plbigpKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRLZXlJbWFnZSgpLmdldEhleCgpLCBvdXRwdXRUaGF3ZWQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiUHJvdmlkZXMga2V5IGltYWdlcyBvZiBzcGVudCBvdXRwdXRzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgYWNjb3VudEluZGV4ID0gMDtcbiAgICAgICAgbGV0IHN1YmFkZHJlc3NJbmRleCA9IChhd2FpdCB0aGF0LndhbGxldC5nZXRTdWJhZGRyZXNzZXMoMCkpLmxlbmd0aCA+IDEgPyAxIDogMDsgLy8gVE9ETzogYXZvaWQgc3ViYWRkcmVzcyAwIHdoaWNoIGlzIG1vcmUgbGlrZWx5IHRvIGZhaWwgdHJhbnNhY3Rpb24gc2FuaXR5IGNoZWNrXG4gICAgICBcbiAgICAgICAgLy8gdGVzdCB1bnJlbGF5ZWQgc2luZ2xlIHRyYW5zYWN0aW9uXG4gICAgICAgIHRlc3RTcGVuZFR4KGF3YWl0IHRoYXQud2FsbGV0LmNyZWF0ZVR4KG5ldyBNb25lcm9UeENvbmZpZygpLmFkZERlc3RpbmF0aW9uKGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIFRlc3RVdGlscy5NQVhfRkVFKS5zZXRBY2NvdW50SW5kZXgoYWNjb3VudEluZGV4KSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB1bnJlbGF5ZWQgc3BsaXQgdHJhbnNhY3Rpb25zXG4gICAgICAgIGZvciAobGV0IHR4IG9mIGF3YWl0IHRoYXQud2FsbGV0LmNyZWF0ZVR4cyhuZXcgTW9uZXJvVHhDb25maWcoKS5hZGREZXN0aW5hdGlvbihhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBUZXN0VXRpbHMuTUFYX0ZFRSkuc2V0QWNjb3VudEluZGV4KGFjY291bnRJbmRleCkpKSB7XG4gICAgICAgICAgdGVzdFNwZW5kVHgodHgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHVucmVsYXllZCBzd2VlcCBkdXN0XG4gICAgICAgIGxldCBkdXN0S2V5SW1hZ2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiBhd2FpdCB0aGF0LndhbGxldC5zd2VlcER1c3QoZmFsc2UpKSB7XG4gICAgICAgICAgdGVzdFNwZW5kVHgodHgpO1xuICAgICAgICAgIGZvciAobGV0IGlucHV0IG9mIHR4LmdldElucHV0cygpKSBkdXN0S2V5SW1hZ2VzLnB1c2goaW5wdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBhdmFpbGFibGUgb3V0cHV0cyBhYm92ZSBtaW4gYW1vdW50XG4gICAgICAgIGxldCBvdXRwdXRzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0T3V0cHV0cyhuZXcgTW9uZXJvT3V0cHV0UXVlcnkoKS5zZXRBY2NvdW50SW5kZXgoYWNjb3VudEluZGV4KS5zZXRTdWJhZGRyZXNzSW5kZXgoc3ViYWRkcmVzc0luZGV4KS5zZXRJc1NwZW50KGZhbHNlKS5zZXRJc0Zyb3plbihmYWxzZSkuc2V0VHhRdWVyeShuZXcgTW9uZXJvVHhRdWVyeSgpLnNldElzTG9ja2VkKGZhbHNlKSkuc2V0TWluQW1vdW50KFRlc3RVdGlscy5NQVhfRkVFKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBmaWx0ZXIgZHVzdCBvdXRwdXRzXG4gICAgICAgIGxldCBkdXN0T3V0cHV0czogYW55W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHtcbiAgICAgICAgICBpZiAoZHVzdEtleUltYWdlcy5pbmNsdWRlcyhvdXRwdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSkpIGR1c3RPdXRwdXRzLnB1c2gob3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXRzID0gb3V0cHV0cy5maWx0ZXIob3V0cHV0ID0+ICFkdXN0T3V0cHV0cy5pbmNsdWRlcyhvdXRwdXQpKTsgLy8gcmVtb3ZlIGR1c3Qgb3V0cHV0c1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB1bnJlbGF5ZWQgc3dlZXAgb3V0cHV0XG4gICAgICAgIHRlc3RTcGVuZFR4KGF3YWl0IHRoYXQud2FsbGV0LnN3ZWVwT3V0cHV0KG5ldyBNb25lcm9UeENvbmZpZygpLnNldEFkZHJlc3MoYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKSkuc2V0S2V5SW1hZ2Uob3V0cHV0c1swXS5nZXRLZXlJbWFnZSgpLmdldEhleCgpKSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB1bnJlbGF5ZWQgc3dlZXAgd2FsbGV0IGVuc3VyaW5nIGFsbCBub24tZHVzdCBvdXRwdXRzIGFyZSBzcGVudFxuICAgICAgICBsZXQgYXZhaWxhYmxlS2V5SW1hZ2VzID0gbmV3IFNldCgpO1xuICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2Ygb3V0cHV0cykgYXZhaWxhYmxlS2V5SW1hZ2VzLmFkZChvdXRwdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSk7XG4gICAgICAgIGxldCBzd2VwdEtleUltYWdlcyA9IG5ldyBTZXQoKTtcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQud2FsbGV0LnN3ZWVwVW5sb2NrZWQobmV3IE1vbmVyb1R4Q29uZmlnKCkuc2V0QWNjb3VudEluZGV4KGFjY291bnRJbmRleCkuc2V0U3ViYWRkcmVzc0luZGV4KHN1YmFkZHJlc3NJbmRleCkuc2V0QWRkcmVzcyhhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpKSk7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIHRlc3RTcGVuZFR4KHR4KTtcbiAgICAgICAgICBmb3IgKGxldCBpbnB1dCBvZiB0eC5nZXRJbnB1dHMoKSkgc3dlcHRLZXlJbWFnZXMuYWRkKGlucHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkpO1xuICAgICAgICB9XG4gICAgICAgIGFzc2VydChzd2VwdEtleUltYWdlcy5zaXplID4gMCk7XG4gICAgICAgIFxuICAgICAgICAvLyBtYXggc2tpcHBlZCBvdXRwdXQgaXMgbGVzcyB0aGFuIG1heCBmZWUgYW1vdW50XG4gICAgICAgIGxldCBtYXhTa2lwcGVkT3V0cHV0OiBNb25lcm9PdXRwdXRXYWxsZXQgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgICAgIGZvciAobGV0IG91dHB1dCBvZiBvdXRwdXRzKSB7XG4gICAgICAgICAgaWYgKCFzd2VwdEtleUltYWdlcy5oYXMob3V0cHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkpKSB7XG4gICAgICAgICAgICBpZiAobWF4U2tpcHBlZE91dHB1dCA9PT0gdW5kZWZpbmVkIHx8IG1heFNraXBwZWRPdXRwdXQuZ2V0QW1vdW50KCkgPCBvdXRwdXQuZ2V0QW1vdW50KCkpIHtcbiAgICAgICAgICAgICAgbWF4U2tpcHBlZE91dHB1dCA9IG91dHB1dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0KG1heFNraXBwZWRPdXRwdXQgPT09IHVuZGVmaW5lZCB8fCBtYXhTa2lwcGVkT3V0cHV0LmdldEFtb3VudCgpIDwgVGVzdFV0aWxzLk1BWF9GRUUpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIHRlc3RTcGVuZFR4KHNwZW5kVHgpIHtcbiAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHVuZGVmaW5lZCwgc3BlbmRUeC5nZXRJbnB1dHMoKSk7XG4gICAgICAgIGFzc2VydChzcGVuZFR4LmdldElucHV0cygpLmxlbmd0aCA+IDApO1xuICAgICAgICBmb3IgKGxldCBpbnB1dCBvZiBzcGVuZFR4LmdldElucHV0cygpKSBhc3NlcnQoaW5wdXQuZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBwcm92ZSB1bnJlbGF5ZWQgdHhzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSB1bnJlbGF5ZWQgdHggdG8gdmVyaWZ5XG4gICAgICAgIGxldCBhZGRyZXNzMSA9IGF3YWl0IFRlc3RVdGlscy5nZXRFeHRlcm5hbFdhbGxldEFkZHJlc3MoKTtcbiAgICAgICAgbGV0IGFkZHJlc3MyID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWRkcmVzcygwLCAwKTtcbiAgICAgICAgbGV0IGFkZHJlc3MzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0QWRkcmVzcygxLCAwKTtcbiAgICAgICAgbGV0IHR4ID0gYXdhaXQgdGhhdC53YWxsZXQuY3JlYXRlVHgobmV3IE1vbmVyb1R4Q29uZmlnKClcbiAgICAgICAgICAgICAgICAuc2V0QWNjb3VudEluZGV4KDApXG4gICAgICAgICAgICAgICAgIC5hZGREZXN0aW5hdGlvbihhZGRyZXNzMSwgVGVzdFV0aWxzLk1BWF9GRUUpXG4gICAgICAgICAgICAgICAgIC5hZGREZXN0aW5hdGlvbihhZGRyZXNzMiwgVGVzdFV0aWxzLk1BWF9GRUUgKiAoMm4pKVxuICAgICAgICAgICAgICAgICAuYWRkRGVzdGluYXRpb24oYWRkcmVzczMsIFRlc3RVdGlscy5NQVhfRkVFICogKDNuKSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3VibWl0IHR4IHRvIGRhZW1vbiBidXQgZG8gbm90IHJlbGF5XG4gICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5zdWJtaXRUeEhleCh0eC5nZXRGdWxsSGV4KCksIHRydWUpO1xuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldElzR29vZCgpLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSByYW5kb20gd2FsbGV0IHRvIHZlcmlmeSB0cmFuc2ZlcnNcbiAgICAgICAgbGV0IHZlcmlmeWluZ1dhbGxldCA9IGF3YWl0IHRoYXQuY3JlYXRlV2FsbGV0KG5ldyBNb25lcm9XYWxsZXRDb25maWcoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyB2ZXJpZnkgdHJhbnNmZXIgMVxuICAgICAgICBsZXQgY2hlY2sgPSBhd2FpdCB2ZXJpZnlpbmdXYWxsZXQuY2hlY2tUeEtleSh0eC5nZXRIYXNoKCksIHR4LmdldEtleSgpLCBhZGRyZXNzMSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRJc0dvb2QoKSwgdHJ1ZSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRJblR4UG9vbCgpLCB0cnVlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNoZWNrLmdldE51bUNvbmZpcm1hdGlvbnMoKSwgMCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRSZWNlaXZlZEFtb3VudCgpLnRvU3RyaW5nKCksIFRlc3RVdGlscy5NQVhfRkVFLnRvU3RyaW5nKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gdmVyaWZ5IHRyYW5zZmVyIDJcbiAgICAgICAgY2hlY2sgPSBhd2FpdCB2ZXJpZnlpbmdXYWxsZXQuY2hlY2tUeEtleSh0eC5nZXRIYXNoKCksIHR4LmdldEtleSgpLCBhZGRyZXNzMik7XG4gICAgICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRJc0dvb2QoKSwgdHJ1ZSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRJblR4UG9vbCgpLCB0cnVlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNoZWNrLmdldE51bUNvbmZpcm1hdGlvbnMoKSwgMCk7XG4gICAgICAgIGFzc2VydChjaGVjay5nZXRSZWNlaXZlZEFtb3VudCgpID49IFRlc3RVdGlscy5NQVhfRkVFICogMm4pOyAvLyArIGNoYW5nZSBhbW91bnRcbiAgICAgICAgXG4gICAgICAgIC8vIHZlcmlmeSB0cmFuc2ZlciAzXG4gICAgICAgIGNoZWNrID0gYXdhaXQgdmVyaWZ5aW5nV2FsbGV0LmNoZWNrVHhLZXkodHguZ2V0SGFzaCgpLCB0eC5nZXRLZXkoKSwgYWRkcmVzczMpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoY2hlY2suZ2V0SXNHb29kKCksIHRydWUpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoY2hlY2suZ2V0SW5UeFBvb2woKSwgdHJ1ZSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXROdW1Db25maXJtYXRpb25zKCksIDApO1xuICAgICAgICBhc3NlcnQuZXF1YWwoY2hlY2suZ2V0UmVjZWl2ZWRBbW91bnQoKS50b1N0cmluZygpLCAoVGVzdFV0aWxzLk1BWF9GRUUgKiAzbikudG9TdHJpbmcoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBjbGVhbnVwXG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLmZsdXNoVHhQb29sKHR4LmdldEhhc2goKSk7XG4gICAgICAgIGF3YWl0IHRoYXQuY2xvc2VXYWxsZXQodmVyaWZ5aW5nV2FsbGV0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIFxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBQUklWQVRFIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIGdldFN1YmFkZHJlc3Nlc1dpdGhCYWxhbmNlKCkge1xuICAgIGxldCBzdWJhZGRyZXNzZXM6IGFueVtdID0gW107XG4gICAgZm9yIChsZXQgYWNjb3VudCBvZiBhd2FpdCB0aGlzLndhbGxldC5nZXRBY2NvdW50cyh0cnVlKSkge1xuICAgICAgZm9yIChsZXQgc3ViYWRkcmVzcyBvZiBhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSB7XG4gICAgICAgIGlmIChzdWJhZGRyZXNzLmdldEJhbGFuY2UoKSA+IDApIHN1YmFkZHJlc3Nlcy5wdXNoKHN1YmFkZHJlc3MpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3ViYWRkcmVzc2VzO1xuICB9XG5cbiAgYXN5bmMgZ2V0U3ViYWRkcmVzc2VzV2l0aFVubG9ja2VkQmFsYW5jZSgpIHtcbiAgICBsZXQgc3ViYWRkcmVzc2VzOiBhbnlbXSA9IFtdO1xuICAgIGZvciAobGV0IGFjY291bnQgb2YgYXdhaXQgdGhpcy53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSkpIHtcbiAgICAgIGZvciAobGV0IHN1YmFkZHJlc3Mgb2YgYWNjb3VudC5nZXRTdWJhZGRyZXNzZXMoKSkge1xuICAgICAgICBpZiAoc3ViYWRkcmVzcy5nZXRVbmxvY2tlZEJhbGFuY2UoKSA+IDBuKSBzdWJhZGRyZXNzZXMucHVzaChzdWJhZGRyZXNzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1YmFkZHJlc3NlcztcbiAgfVxuICBcbiAgcHJvdGVjdGVkIGFzeW5jIHRlc3RHZXRTdWJhZGRyZXNzQWRkcmVzc091dE9mUmFuZ2UoKSB7XG4gICAgbGV0IGFjY291bnRzID0gYXdhaXQgdGhpcy53YWxsZXQuZ2V0QWNjb3VudHModHJ1ZSk7XG4gICAgbGV0IGFjY291bnRJZHggPSBhY2NvdW50cy5sZW5ndGggLSAxO1xuICAgIGxldCBzdWJhZGRyZXNzSWR4ID0gYWNjb3VudHNbYWNjb3VudElkeF0uZ2V0U3ViYWRkcmVzc2VzKCkubGVuZ3RoO1xuICAgIGxldCBhZGRyZXNzID0gYXdhaXQgdGhpcy53YWxsZXQuZ2V0QWRkcmVzcyhhY2NvdW50SWR4LCBzdWJhZGRyZXNzSWR4KTtcbiAgICBhc3NlcnQubm90RXF1YWwoYWRkcmVzcywgdW5kZWZpbmVkKTsgIC8vIHN1YmNsYXNzIG15IG92ZXJyaWRlIHdpdGggY3VzdG9tIGJlaGF2aW9yIChlLmcuIGpuaSByZXR1cm5zIHN1YmFkZHJlc3MgYnV0IHdhbGxldCBycGMgZG9lcyBub3QpXG4gICAgYXNzZXJ0KGFkZHJlc3MubGVuZ3RoID4gMCk7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBGZXRjaGVzIGFuZCB0ZXN0cyB0cmFuc2FjdGlvbnMgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBxdWVyeS5cbiAgICogXG4gICAqIFRPRE86IGNvbnZlcnQgcXVlcnkgdG8gcXVlcnkgb2JqZWN0IGFuZCBlbnN1cmUgZWFjaCB0eCBwYXNzZXMgZmlsdGVyLCBzYW1lIHdpdGggZ2V0QW5kVGVzdFRyYW5zZmVyLCBnZXRBbmRUZXN0T3V0cHV0c1xuICAgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGdldEFuZFRlc3RUeHMod2FsbGV0LCBxdWVyeTogUGFydGlhbDxNb25lcm9UeFF1ZXJ5PiB8IHVuZGVmaW5lZCwgaXNFeHBlY3RlZD8pOiBQcm9taXNlPE1vbmVyb1R4V2FsbGV0W10+IHtcbiAgICBsZXQgY29weTtcbiAgICBpZiAocXVlcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHF1ZXJ5IGluc3RhbmNlb2YgTW9uZXJvVHhRdWVyeSkgY29weSA9IHF1ZXJ5LmNvcHkoKTtcbiAgICAgIGVsc2UgY29weSA9IE9iamVjdC5hc3NpZ24oe30sIHF1ZXJ5KTtcbiAgICB9XG4gICAgbGV0IHR4cyA9IGF3YWl0IHdhbGxldC5nZXRUeHMocXVlcnkpO1xuICAgIGFzc2VydChBcnJheS5pc0FycmF5KHR4cykpO1xuICAgIGlmIChpc0V4cGVjdGVkID09PSBmYWxzZSkgYXNzZXJ0LmVxdWFsKHR4cy5sZW5ndGgsIDApO1xuICAgIGlmIChpc0V4cGVjdGVkID09PSB0cnVlKSBhc3NlcnQodHhzLmxlbmd0aCA+IDAsIFwiVHJhbnNhY3Rpb25zIHdlcmUgZXhwZWN0ZWQgYnV0IG5vdCBmb3VuZDsgcnVuIHNlbmQgdGVzdHM/XCIpO1xuICAgIGZvciAobGV0IHR4IG9mIHR4cykgYXdhaXQgdGhpcy50ZXN0VHhXYWxsZXQodHgsIE9iamVjdC5hc3NpZ24oe3dhbGxldDogd2FsbGV0fSwgcXVlcnkpKTtcbiAgICB0ZXN0R2V0VHhzU3RydWN0dXJlKHR4cywgcXVlcnkpO1xuICAgIGlmIChxdWVyeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAocXVlcnkgaW5zdGFuY2VvZiBNb25lcm9UeFF1ZXJ5KSBhc3NlcnQuZGVlcEVxdWFsKHF1ZXJ5LnRvSnNvbigpLCBjb3B5LnRvSnNvbigpKTtcbiAgICAgIGVsc2UgYXNzZXJ0LmRlZXBFcXVhbChxdWVyeSwgY29weSk7XG4gICAgfVxuICAgIHJldHVybiB0eHM7XG4gIH1cblxuICAvKipcbiAgICogRmV0Y2hlcyBhbmQgdGVzdHMgdHJhbnNmZXJzIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gcXVlcnkuXG4gICAqL1xuICBwcm90ZWN0ZWQgYXN5bmMgZ2V0QW5kVGVzdFRyYW5zZmVycyh3YWxsZXQ6IE1vbmVyb1dhbGxldCwgcXVlcnk6IFBhcnRpYWw8TW9uZXJvVHJhbnNmZXJRdWVyeT4sIGlzRXhwZWN0ZWQ/KTogUHJvbWlzZTxNb25lcm9UcmFuc2ZlcltdPiB7XG4gICAgbGV0IGNvcHk7XG4gICAgaWYgKHF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChxdWVyeSBpbnN0YW5jZW9mIE1vbmVyb1RyYW5zZmVyUXVlcnkpIGNvcHkgPSBxdWVyeS5jb3B5KCk7XG4gICAgICBlbHNlIGNvcHkgPSBPYmplY3QuYXNzaWduKHt9LCBxdWVyeSk7XG4gICAgfVxuICAgIGxldCB0cmFuc2ZlcnMgPSBhd2FpdCB3YWxsZXQuZ2V0VHJhbnNmZXJzKHF1ZXJ5KTtcbiAgICBhc3NlcnQoQXJyYXkuaXNBcnJheSh0cmFuc2ZlcnMpKTtcbiAgICBpZiAoaXNFeHBlY3RlZCA9PT0gZmFsc2UpIGFzc2VydC5lcXVhbCh0cmFuc2ZlcnMubGVuZ3RoLCAwKTtcbiAgICBpZiAoaXNFeHBlY3RlZCA9PT0gdHJ1ZSkgYXNzZXJ0KHRyYW5zZmVycy5sZW5ndGggPiAwLCBcIlRyYW5zZmVycyB3ZXJlIGV4cGVjdGVkIGJ1dCBub3QgZm91bmQ7IHJ1biBzZW5kIHRlc3RzP1wiKTtcbiAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiB0cmFuc2ZlcnMpIGF3YWl0IHRoaXMudGVzdFR4V2FsbGV0KHRyYW5zZmVyLmdldFR4KCksIE9iamVjdC5hc3NpZ24oe3dhbGxldDogd2FsbGV0fSwgcXVlcnkpKTtcbiAgICBpZiAocXVlcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHF1ZXJ5IGluc3RhbmNlb2YgTW9uZXJvVHJhbnNmZXJRdWVyeSkgYXNzZXJ0LmRlZXBFcXVhbChxdWVyeS50b0pzb24oKSwgY29weS50b0pzb24oKSk7XG4gICAgICBlbHNlIGFzc2VydC5kZWVwRXF1YWwocXVlcnksIGNvcHkpO1xuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmZXJzO1xuICB9XG4gIFxuICAvKipcbiAgICogRmV0Y2hlcyBhbmQgdGVzdHMgb3V0cHV0cyBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIHF1ZXJ5LlxuICAgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGdldEFuZFRlc3RPdXRwdXRzKHdhbGxldDogTW9uZXJvV2FsbGV0LCBxdWVyeTogUGFydGlhbDxNb25lcm9PdXRwdXRRdWVyeT4sIGlzRXhwZWN0ZWQ/KSB7XG4gICAgbGV0IGNvcHk7XG4gICAgaWYgKHF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChxdWVyeSBpbnN0YW5jZW9mIE1vbmVyb091dHB1dFF1ZXJ5KSBjb3B5ID0gcXVlcnkuY29weSgpO1xuICAgICAgZWxzZSBjb3B5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnkpO1xuICAgIH1cbiAgICBsZXQgb3V0cHV0cyA9IGF3YWl0IHdhbGxldC5nZXRPdXRwdXRzKHF1ZXJ5KTtcbiAgICBhc3NlcnQoQXJyYXkuaXNBcnJheShvdXRwdXRzKSk7XG4gICAgaWYgKGlzRXhwZWN0ZWQgPT09IGZhbHNlKSBhc3NlcnQuZXF1YWwob3V0cHV0cy5sZW5ndGgsIDApO1xuICAgIGlmIChpc0V4cGVjdGVkID09PSB0cnVlKSBhc3NlcnQob3V0cHV0cy5sZW5ndGggPiAwLCBcIk91dHB1dHMgd2VyZSBleHBlY3RlZCBidXQgbm90IGZvdW5kOyBydW4gc2VuZCB0ZXN0cz9cIik7XG4gICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHRlc3RPdXRwdXRXYWxsZXQob3V0cHV0KTtcbiAgICBpZiAocXVlcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHF1ZXJ5IGluc3RhbmNlb2YgTW9uZXJvT3V0cHV0UXVlcnkpIGFzc2VydC5kZWVwRXF1YWwocXVlcnkudG9Kc29uKCksIGNvcHkudG9Kc29uKCkpO1xuICAgICAgZWxzZSBhc3NlcnQuZGVlcEVxdWFsKHF1ZXJ5LCBjb3B5KTtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dHM7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgdGVzdFR4c1dhbGxldCh0eHM6IE1vbmVyb1R4V2FsbGV0W10sIGN0eCkge1xuXG4gICAgLy8gdGVzdCBlYWNoIHRyYW5zYWN0aW9uXG4gICAgYXNzZXJ0KHR4cy5sZW5ndGggPiAwKTtcbiAgICBmb3IgKGxldCB0eCBvZiB0eHMpIGF3YWl0IHRoaXMudGVzdFR4V2FsbGV0KHR4LCBjdHgpO1xuXG4gICAgLy8gdGVzdCBkZXN0aW5hdGlvbnMgYWNyb3NzIHRyYW5zYWN0aW9uc1xuICAgIGlmIChjdHguY29uZmlnICYmIGN0eC5jb25maWcuZ2V0RGVzdGluYXRpb25zKCkpIHtcbiAgICAgIGxldCBkZXN0aW5hdGlvbklkeCA9IDA7XG4gICAgICBsZXQgc3VidHJhY3RGZWVGcm9tRGVzdGluYXRpb25zID0gY3R4LmNvbmZpZy5nZXRTdWJ0cmFjdEZlZUZyb20oKSAmJiBjdHguY29uZmlnLmdldFN1YnRyYWN0RmVlRnJvbSgpLmxlbmd0aCA+IDA7XG4gICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcblxuICAgICAgICAvLyBUT0RPOiByZW1vdmUgdGhpcyBhZnRlciA+MTguMy4xIHdoZW4gYW1vdW50c19ieV9kZXN0X2xpc3QgaXMgb2ZmaWNpYWxcbiAgICAgICAgaWYgKHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiVHggbWlzc2luZyBkZXN0aW5hdGlvbnNcIik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFtb3VudERpZmYgPSBCaWdJbnQoMCk7XG4gICAgICAgIGZvciAobGV0IGRlc3RpbmF0aW9uIG9mIHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKSkge1xuICAgICAgICAgIGxldCBjdHhEZXN0aW5hdGlvbiA9IGN0eC5jb25maWcuZ2V0RGVzdGluYXRpb25zKClbZGVzdGluYXRpb25JZHhdO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChkZXN0aW5hdGlvbi5nZXRBZGRyZXNzKCksIGN0eERlc3RpbmF0aW9uLmdldEFkZHJlc3MoKSk7XG4gICAgICAgICAgaWYgKHN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucykgYW1vdW50RGlmZiA9IGFtb3VudERpZmYgKyBjdHhEZXN0aW5hdGlvbi5nZXRBbW91bnQoKSAtIGRlc3RpbmF0aW9uLmdldEFtb3VudCgpO1xuICAgICAgICAgIGVsc2UgYXNzZXJ0LmVxdWFsKGRlc3RpbmF0aW9uLmdldEFtb3VudCgpLnRvU3RyaW5nKCksIGN0eERlc3RpbmF0aW9uLmdldEFtb3VudCgpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgIGRlc3RpbmF0aW9uSWR4Kys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucykgYXNzZXJ0LmVxdWFsKHR4LmdldEZlZSgpLnRvU3RyaW5nKCksIGFtb3VudERpZmYudG9TdHJpbmcoKSk7XG4gICAgICB9XG4gICAgICBhc3NlcnQuZXF1YWwoY3R4LmNvbmZpZy5nZXREZXN0aW5hdGlvbnMoKS5sZW5ndGgsIGRlc3RpbmF0aW9uSWR4KTtcbiAgICB9XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBUZXN0cyBhIHdhbGxldCB0cmFuc2FjdGlvbiB3aXRoIGEgdGVzdCBjb25maWd1cmF0aW9uLlxuICAgKiBcbiAgICogQHBhcmFtIHR4IGlzIHRoZSB3YWxsZXQgdHJhbnNhY3Rpb24gdG8gdGVzdFxuICAgKiBAcGFyYW0gY3R4IHNwZWNpZmllcyB0ZXN0IGNvbmZpZ3VyYXRpb25cbiAgICogICAgICAgIGN0eC53YWxsZXQgaXMgdXNlZCB0byBjcm9zcyByZWZlcmVuY2UgdHggaW5mbyBpZiBhdmFpbGFibGVcbiAgICogICAgICAgIGN0eC5jb25maWcgc3BlY2lmaWVzIHRoZSB0eCdzIG9yaWdpbmF0aW5nIHNlbmQgY29uZmlndXJhdGlvblxuICAgKiAgICAgICAgY3R4LmlzU2VuZFJlc3BvbnNlIGluZGljYXRlcyBpZiB0aGUgdHggaXMgYnVpbHQgZnJvbSBhIHNlbmQgcmVzcG9uc2UsIHdoaWNoIGNvbnRhaW5zIGFkZGl0aW9uYWwgZmllbGRzIChlLmcuIGtleSlcbiAgICogICAgICAgIGN0eC5oYXNEZXN0aW5hdGlvbnMgc3BlY2lmaWVzIGlmIHRoZSB0eCBoYXMgYW4gb3V0Z29pbmcgdHJhbnNmZXIgd2l0aCBkZXN0aW5hdGlvbnMsIHVuZGVmaW5lZCBpZiBkb2Vzbid0IG1hdHRlclxuICAgKiAgICAgICAgY3R4LmluY2x1ZGVPdXRwdXRzIHNwZWNpZmllcyBpZiBvdXRwdXRzIHdlcmUgZmV0Y2hlZCBhbmQgc2hvdWxkIHRoZXJlZm9yZSBiZSBleHBlY3RlZCB3aXRoIGluY29taW5nIHRyYW5zZmVyc1xuICAgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIHRlc3RUeFdhbGxldCh0eDogTW9uZXJvVHhXYWxsZXQsIGN0eD86IGFueSkge1xuICAgIFxuICAgIC8vIHZhbGlkYXRlIC8gc2FuaXRpemUgaW5wdXRzXG4gICAgY3R4ID0gT2JqZWN0LmFzc2lnbih7fSwgY3R4KTtcbiAgICBkZWxldGUgY3R4LndhbGxldDsgLy8gVE9ETzogcmUtZW5hYmxlXG4gICAgaWYgKCEodHggaW5zdGFuY2VvZiBNb25lcm9UeFdhbGxldCkpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiVHggaXMgbm90IGEgTW9uZXJvVHhXYWxsZXQhXCIpO1xuICAgICAgY29uc29sZS5sb2codHgpO1xuICAgIH1cbiAgICBhc3NlcnQodHggaW5zdGFuY2VvZiBNb25lcm9UeFdhbGxldCk7XG4gICAgaWYgKGN0eC53YWxsZXQpIGFzc2VydChjdHgud2FsbGV0IGluc3RhbmNlb2YgTW9uZXJvV2FsbGV0KTtcbiAgICBhc3NlcnQoY3R4Lmhhc0Rlc3RpbmF0aW9ucyA9PSB1bmRlZmluZWQgfHwgdHlwZW9mIGN0eC5oYXNEZXN0aW5hdGlvbnMgPT09IFwiYm9vbGVhblwiKTtcbiAgICBpZiAoY3R4LmlzU2VuZFJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgY3R4LmNvbmZpZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBhc3NlcnQuZXF1YWwoY3R4LmlzU2VuZFJlc3BvbnNlLCB1bmRlZmluZWQsIFwiaWYgZWl0aGVyIGNvbmZpZyBvciBpc1NlbmRSZXNwb25zZSBpcyBkZWZpbmVkLCB0aGV5IG11c3QgYm90aCBiZSBkZWZpbmVkXCIpO1xuICAgICAgYXNzZXJ0LmVxdWFsKGN0eC5jb25maWcsIHVuZGVmaW5lZCwgXCJpZiBlaXRoZXIgY29uZmlnIG9yIGlzU2VuZFJlc3BvbnNlIGlzIGRlZmluZWQsIHRoZXkgbXVzdCBib3RoIGJlIGRlZmluZWRcIik7XG4gICAgfVxuICAgIFxuICAgIC8vIHRlc3QgY29tbW9uIGZpZWxkIHR5cGVzXG4gICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiB0eC5nZXRIYXNoKCksIFwic3RyaW5nXCIpO1xuICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgdHguZ2V0SXNDb25maXJtZWQoKSwgXCJib29sZWFuXCIpO1xuICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgdHguZ2V0SXNNaW5lclR4KCksIFwiYm9vbGVhblwiKTtcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHR4LmdldElzRmFpbGVkKCksIFwiYm9vbGVhblwiKTtcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHR4LmdldElzUmVsYXllZCgpLCBcImJvb2xlYW5cIik7XG4gICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiB0eC5nZXRJblR4UG9vbCgpLCBcImJvb2xlYW5cIik7XG4gICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiB0eC5nZXRJc0xvY2tlZCgpLCBcImJvb2xlYW5cIik7XG4gICAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludCh0eC5nZXRGZWUoKSk7XG4gICAgaWYgKHR4LmdldFBheW1lbnRJZCgpKSBhc3NlcnQubm90RXF1YWwodHguZ2V0UGF5bWVudElkKCksIE1vbmVyb1R4LkRFRkFVTFRfUEFZTUVOVF9JRCk7IC8vIGRlZmF1bHQgcGF5bWVudCBpZCBjb252ZXJ0ZWQgdG8gdW5kZWZpbmVkXG4gICAgaWYgKHR4LmdldE5vdGUoKSkgYXNzZXJ0KHR4LmdldE5vdGUoKS5sZW5ndGggPiAwKTsgIC8vIGVtcHR5IG5vdGVzIGNvbnZlcnRlZCB0byB1bmRlZmluZWRcbiAgICBhc3NlcnQodHguZ2V0VW5sb2NrVGltZSgpID49IEJpZ0ludCgwKSk7XG4gICAgYXNzZXJ0LmVxdWFsKHR4LmdldFNpemUoKSwgdW5kZWZpbmVkKTsgICAvLyBUT0RPIG1vbmVyby13YWxsZXQtcnBjOiBhZGQgdHhfc2l6ZSB0byBnZXRfdHJhbnNmZXJzIGFuZCBnZXRfdHJhbnNmZXJfYnlfdHhpZFxuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRSZWNlaXZlZFRpbWVzdGFtcCgpLCB1bmRlZmluZWQpOyAgLy8gVE9ETyBtb25lcm8td2FsbGV0LXJwYzogcmV0dXJuIHJlY2VpdmVkIHRpbWVzdGFtcCAoYXNrZWQgdG8gZmlsZSBpc3N1ZSBpZiB3YW50ZWQpXG4gICAgXG4gICAgLy8gdGVzdCBzZW5kIHR4XG4gICAgaWYgKGN0eC5pc1NlbmRSZXNwb25zZSkge1xuICAgICAgYXNzZXJ0KHR4LmdldFdlaWdodCgpID4gMCk7XG4gICAgICBhc3NlcnQubm90RXF1YWwodHguZ2V0SW5wdXRzKCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQodHguZ2V0SW5wdXRzKCkubGVuZ3RoID4gMCk7XG4gICAgICBmb3IgKGxldCBpbnB1dCBvZiB0eC5nZXRJbnB1dHMoKSkgYXNzZXJ0KGlucHV0LmdldFR4KCkgPT09IHR4KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldFdlaWdodCgpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldElucHV0cygpLCB1bmRlZmluZWQpO1xuICAgIH1cbiAgICBcbiAgICAvLyB0ZXN0IGNvbmZpcm1lZFxuICAgIGlmICh0eC5nZXRJc0NvbmZpcm1lZCgpKSB7XG4gICAgICBhc3NlcnQodHguZ2V0QmxvY2soKSk7XG4gICAgICBhc3NlcnQodHguZ2V0QmxvY2soKS5nZXRUeHMoKS5pbmNsdWRlcyh0eCkpO1xuICAgICAgYXNzZXJ0KHR4LmdldEJsb2NrKCkuZ2V0SGVpZ2h0KCkgPiAwKTtcbiAgICAgIGFzc2VydCh0eC5nZXRCbG9jaygpLmdldFRpbWVzdGFtcCgpID4gMCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNSZWxheWVkKCksIHRydWUpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldElzRmFpbGVkKCksIGZhbHNlKTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJblR4UG9vbCgpLCBmYWxzZSk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0UmVsYXkoKSwgdHJ1ZSk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNEb3VibGVTcGVuZFNlZW4oKSwgZmFsc2UpO1xuICAgICAgYXNzZXJ0KHR4LmdldE51bUNvbmZpcm1hdGlvbnMoKSA+IDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBhc3NlcnQuZXF1YWwodW5kZWZpbmVkLCB0eC5nZXRCbG9jaygpKTtcbiAgICAgIGFzc2VydC5lcXVhbCgwLCB0eC5nZXROdW1Db25maXJtYXRpb25zKCkpO1xuICAgIH1cbiAgICBcbiAgICAvLyB0ZXN0IGluIHR4IHBvb2xcbiAgICBpZiAodHguZ2V0SW5UeFBvb2woKSkge1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldElzQ29uZmlybWVkKCksIGZhbHNlKTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRSZWxheSgpLCB0cnVlKTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJc1JlbGF5ZWQoKSwgdHJ1ZSk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNEb3VibGVTcGVuZFNlZW4oKSwgZmFsc2UpOyAvLyBUT0RPOiB0ZXN0IGRvdWJsZSBzcGVuZCBhdHRlbXB0XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNMb2NrZWQoKSwgdHJ1ZSk7XG4gICAgICBcbiAgICAgIC8vIHRoZXNlIHNob3VsZCBiZSBpbml0aWFsaXplZCB1bmxlc3MgYSByZXNwb25zZSBmcm9tIHNlbmRpbmdcbiAgICAgIGlmICghY3R4LmlzU2VuZFJlc3BvbnNlKSB7XG4gICAgICAgIC8vYXNzZXJ0KHR4LmdldFJlY2VpdmVkVGltZXN0YW1wKCkgPiAwKTsgICAgLy8gVE9ETzogcmUtZW5hYmxlIHdoZW4gcmVjZWl2ZWQgdGltZXN0YW1wIHJldHVybmVkIGluIHdhbGxldCBycGNcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RSZWxheWVkVGltZXN0YW1wKCksIHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIFxuICAgIC8vIHRlc3QgbWluZXIgdHhcbiAgICBpZiAodHguZ2V0SXNNaW5lclR4KCkpIHtcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRGZWUoKSwgMG4pO1xuICAgICAgYXNzZXJ0KHR4LmdldEluY29taW5nVHJhbnNmZXJzKCkubGVuZ3RoID4gMCk7XG4gICAgfVxuICAgIFxuICAgIC8vIHRlc3QgZmFpbGVkICAvLyBUT0RPOiB3aGF0IGVsc2UgdG8gdGVzdCBhc3NvY2lhdGVkIHdpdGggZmFpbGVkXG4gICAgaWYgKHR4LmdldElzRmFpbGVkKCkpIHtcbiAgICAgIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgaW5zdGFuY2VvZiBNb25lcm9UcmFuc2Zlcik7XG4gICAgICAvL2Fzc2VydCh0eC5nZXRSZWNlaXZlZFRpbWVzdGFtcCgpID4gMCk7ICAgIC8vIFRPRE86IHJlLWVuYWJsZSB3aGVuIHJlY2VpdmVkIHRpbWVzdGFtcCByZXR1cm5lZCBpbiB3YWxsZXQgcnBjXG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eC5nZXRJc1JlbGF5ZWQoKSkgYXNzZXJ0LmVxdWFsKHR4LmdldElzRG91YmxlU3BlbmRTZWVuKCksIGZhbHNlKTtcbiAgICAgIGVsc2Uge1xuICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNSZWxheWVkKCksIGZhbHNlKTtcbiAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHR4LmdldFJlbGF5KCksIHRydWUpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNEb3VibGVTcGVuZFNlZW4oKSwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RGYWlsZWRIZWlnaHQoKSwgdW5kZWZpbmVkKTtcbiAgICBhc3NlcnQuZXF1YWwodHguZ2V0TGFzdEZhaWxlZEhhc2goKSwgdW5kZWZpbmVkKTtcbiAgICBcbiAgICAvLyByZWNlaXZlZCB0aW1lIG9ubHkgZm9yIHR4IHBvb2wgb3IgZmFpbGVkIHR4c1xuICAgIGlmICh0eC5nZXRSZWNlaXZlZFRpbWVzdGFtcCgpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGFzc2VydCh0eC5nZXRJblR4UG9vbCgpIHx8IHR4LmdldElzRmFpbGVkKCkpO1xuICAgIH1cbiAgICBcbiAgICAvLyB0ZXN0IHJlbGF5ZWQgdHhcbiAgICBpZiAodHguZ2V0SXNSZWxheWVkKCkpIGFzc2VydC5lcXVhbCh0eC5nZXRSZWxheSgpLCB0cnVlKTtcbiAgICBpZiAodHguZ2V0UmVsYXkoKSAhPT0gdHJ1ZSkgYXNzZXJ0LmVxdWFsKHR4LmdldElzUmVsYXllZCgpLCBmYWxzZSk7XG4gICAgXG4gICAgLy8gdGVzdCBvdXRnb2luZyB0cmFuc2ZlciBwZXIgY29uZmlndXJhdGlvblxuICAgIGlmIChjdHguaXNPdXRnb2luZyA9PT0gZmFsc2UpIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgPT09IHVuZGVmaW5lZCk7XG4gICAgaWYgKGN0eC5oYXNEZXN0aW5hdGlvbnMpIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgJiYgdHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpLmxlbmd0aCA+IDApOyAgLy8gVE9ETzogdGhpcyB3YXMgdHlwbyB3aXRoIGdldERlc3Rpb25hdGlvbnMgc28gaXMgdGhpcyBhY3R1YWxseSBiZWluZyB0ZXN0ZWQ/XG4gICAgXG4gICAgLy8gdGVzdCBvdXRnb2luZyB0cmFuc2ZlclxuICAgIGlmICh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkpIHtcbiAgICAgIGFzc2VydCh0eC5nZXRJc091dGdvaW5nKCkpO1xuICAgICAgYXdhaXQgdGVzdFRyYW5zZmVyKHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKSwgY3R4KTtcbiAgICAgIGlmIChjdHguaXNTd2VlcFJlc3BvbnNlKSBhc3NlcnQuZXF1YWwodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpLmxlbmd0aCwgMSk7XG4gICAgICBcbiAgICAgIC8vIFRPRE86IGhhbmRsZSBzcGVjaWFsIGNhc2VzXG4gICAgfSBlbHNlIHtcbiAgICAgIGFzc2VydCh0eC5nZXRJbmNvbWluZ1RyYW5zZmVycygpLmxlbmd0aCA+IDApO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldE91dGdvaW5nQW1vdW50KCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldFJpbmdTaXplKCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0RnVsbEhleCgpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldE1ldGFkYXRhKCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0S2V5KCksIHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIFxuICAgIC8vIHRlc3QgaW5jb21pbmcgdHJhbnNmZXJzXG4gICAgaWYgKHR4LmdldEluY29taW5nVHJhbnNmZXJzKCkpIHtcbiAgICAgIGFzc2VydCh0eC5nZXRJc0luY29taW5nKCkpO1xuICAgICAgYXNzZXJ0KHR4LmdldEluY29taW5nVHJhbnNmZXJzKCkubGVuZ3RoID4gMCk7XG4gICAgICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KHR4LmdldEluY29taW5nQW1vdW50KCkpOyAgICAgIFxuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldElzRmFpbGVkKCksIGZhbHNlKTtcbiAgICAgIFxuICAgICAgLy8gdGVzdCBlYWNoIHRyYW5zZmVyIGFuZCBjb2xsZWN0IHRyYW5zZmVyIHN1bVxuICAgICAgbGV0IHRyYW5zZmVyU3VtID0gQmlnSW50KDApO1xuICAgICAgZm9yIChsZXQgdHJhbnNmZXIgb2YgdHguZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKSkge1xuICAgICAgICBhd2FpdCB0ZXN0VHJhbnNmZXIodHJhbnNmZXIsIGN0eCk7XG4gICAgICAgIHRyYW5zZmVyU3VtICs9IHRyYW5zZmVyLmdldEFtb3VudCgpO1xuICAgICAgICBpZiAoY3R4LndhbGxldCkgYXNzZXJ0LmVxdWFsKHRyYW5zZmVyLmdldEFkZHJlc3MoKSwgYXdhaXQgY3R4LndhbGxldC5nZXRBZGRyZXNzKHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpLCB0cmFuc2Zlci5nZXRTdWJhZGRyZXNzSW5kZXgoKSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gVE9ETyBzcGVjaWFsIGNhc2U6IHRyYW5zZmVyIGFtb3VudCBvZiAwXG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIGluY29taW5nIHRyYW5zZmVycyBhZGQgdXAgdG8gaW5jb21pbmcgdHggYW1vdW50XG4gICAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXJTdW0sIHR4LmdldEluY29taW5nQW1vdW50KCkpXG4gICAgfSBlbHNlIHtcbiAgICAgIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldEluY29taW5nQW1vdW50KCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKSwgdW5kZWZpbmVkKTtcbiAgICB9XG4gICAgXG4gICAgLy8gdGVzdCB0eCByZXN1bHRzIGZyb20gc2VuZCBvciByZWxheVxuICAgIGlmIChjdHguaXNTZW5kUmVzcG9uc2UpIHtcbiAgICAgIFxuICAgICAgLy8gdGVzdCB0eCBzZXRcbiAgICAgIGFzc2VydC5ub3RFcXVhbCh0eC5nZXRUeFNldCgpLCB1bmRlZmluZWQpO1xuICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICBmb3IgKGxldCBhVHggb2YgdHguZ2V0VHhTZXQoKS5nZXRUeHMoKSkge1xuICAgICAgICBpZiAoYVR4ID09PSB0eCkge1xuICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGN0eC5pc0NvcHkpIGFzc2VydCghZm91bmQpOyAvLyBjb3B5IHdpbGwgbm90IGhhdmUgYmFjayByZWZlcmVuY2UgZnJvbSB0eCBzZXRcbiAgICAgIGVsc2UgYXNzZXJ0KGZvdW5kKTtcbiAgICAgIFxuICAgICAgLy8gdGVzdCBjb21tb24gYXR0cmlidXRlc1xuICAgICAgbGV0IGNvbmZpZyA9IGN0eC5jb25maWc7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNDb25maXJtZWQoKSwgZmFsc2UpO1xuICAgICAgYXdhaXQgdGVzdFRyYW5zZmVyKHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKSwgY3R4KTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRSaW5nU2l6ZSgpLCBNb25lcm9VdGlscy5SSU5HX1NJWkUpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldFVubG9ja1RpbWUoKS50b1N0cmluZygpLCAoY29uZmlnLmdldFVubG9ja1RpbWUoKSA/IGNvbmZpZy5nZXRVbmxvY2tUaW1lKCkgOiBCaWdJbnQoMCkpLnRvU3RyaW5nKCkpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldEJsb2NrKCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQodHguZ2V0S2V5KCkubGVuZ3RoID4gMCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHR4LmdldEZ1bGxIZXgoKSwgXCJzdHJpbmdcIik7XG4gICAgICBhc3NlcnQodHguZ2V0RnVsbEhleCgpLmxlbmd0aCA+IDApO1xuICAgICAgYXNzZXJ0KHR4LmdldE1ldGFkYXRhKCkpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldFJlY2VpdmVkVGltZXN0YW1wKCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNMb2NrZWQoKSwgdHJ1ZSk7XG4gICAgICBcbiAgICAgIC8vIHRlc3QgbG9ja2VkIHN0YXRlXG4gICAgICBpZiAoQmlnSW50KDApID09PSB0eC5nZXRVbmxvY2tUaW1lKCkpIGFzc2VydC5lcXVhbCghdHguZ2V0SXNMb2NrZWQoKSwgdHguZ2V0SXNDb25maXJtZWQoKSk7XG4gICAgICBlbHNlIGFzc2VydC5lcXVhbCh0eC5nZXRJc0xvY2tlZCgpLCB0cnVlKTtcbiAgICAgIGlmICh0eC5nZXRPdXRwdXRzKCkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2YgdHguZ2V0T3V0cHV0c1dhbGxldCgpKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRJc0xvY2tlZCgpLCB0eC5nZXRJc0xvY2tlZCgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyB0ZXN0IGRlc3RpbmF0aW9ucyBvZiBzZW50IHR4XG4gICAgICBpZiAodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYXNzZXJ0KGNvbmZpZy5nZXRDYW5TcGxpdCgpKTtcbiAgICAgICAgY29uc29sZS53YXJuKFwiRGVzdGluYXRpb25zIG5vdCByZXR1cm5lZCBmcm9tIHNwbGl0IHRyYW5zYWN0aW9uc1wiKTsgLy8gVE9ETzogcmVtb3ZlIHRoaXMgYWZ0ZXIgPjE4LjMuMSB3aGVuIGFtb3VudHNfYnlfZGVzdF9saXN0IG9mZmljaWFsXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnQodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpKTtcbiAgICAgICAgYXNzZXJ0KHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKS5sZW5ndGggPiAwKTtcbiAgICAgICAgbGV0IHN1YnRyYWN0RmVlRnJvbURlc3RpbmF0aW9ucyA9IGN0eC5jb25maWcuZ2V0U3VidHJhY3RGZWVGcm9tKCkgJiYgY3R4LmNvbmZpZy5nZXRTdWJ0cmFjdEZlZUZyb20oKS5sZW5ndGggPiAwO1xuICAgICAgICBpZiAoY3R4LmlzU3dlZXBSZXNwb25zZSkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChjb25maWcuZ2V0RGVzdGluYXRpb25zKCkubGVuZ3RoLCAxKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodW5kZWZpbmVkLCBjb25maWcuZ2V0RGVzdGluYXRpb25zKClbMF0uZ2V0QW1vdW50KCkpO1xuICAgICAgICAgIGlmICghc3VidHJhY3RGZWVGcm9tRGVzdGluYXRpb25zKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpWzBdLmdldEFtb3VudCgpLnRvU3RyaW5nKCksIHR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXRBbW91bnQoKS50b1N0cmluZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gdGVzdCByZWxheWVkIHR4c1xuICAgICAgaWYgKGNvbmZpZy5nZXRSZWxheSgpKSB7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJblR4UG9vbCgpLCB0cnVlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldFJlbGF5KCksIHRydWUpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNSZWxheWVkKCksIHRydWUpO1xuICAgICAgICBhc3NlcnQodHguZ2V0TGFzdFJlbGF5ZWRUaW1lc3RhbXAoKSA+IDApO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNEb3VibGVTcGVuZFNlZW4oKSwgZmFsc2UpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyB0ZXN0IG5vbi1yZWxheWVkIHR4c1xuICAgICAgZWxzZSB7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJblR4UG9vbCgpLCBmYWxzZSk7XG4gICAgICAgIGFzc2VydC5ub3RFcXVhbCh0eC5nZXRSZWxheSgpLCB0cnVlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldElzUmVsYXllZCgpLCBmYWxzZSk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRMYXN0UmVsYXllZFRpbWVzdGFtcCgpLCB1bmRlZmluZWQpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNEb3VibGVTcGVuZFNlZW4oKSwgdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gdGVzdCB0eCByZXN1bHQgcXVlcnlcbiAgICBlbHNlIHtcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRUeFNldCgpLCB1bmRlZmluZWQpOyAgLy8gdHggc2V0IG9ubHkgaW5pdGlhbGl6ZWQgb24gc2VuZCByZXNwb25zZXNcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRSaW5nU2l6ZSgpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldEtleSgpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldEZ1bGxIZXgoKSwgdW5kZWZpbmVkKTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRNZXRhZGF0YSgpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RSZWxheWVkVGltZXN0YW1wKCksIHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIFxuICAgIC8vIHRlc3QgaW5wdXRzXG4gICAgaWYgKHR4LmdldElzT3V0Z29pbmcoKSAmJiBjdHguaXNTZW5kUmVzcG9uc2UpIHtcbiAgICAgIGFzc2VydCh0eC5nZXRJbnB1dHMoKSAhPT0gdW5kZWZpbmVkKTtcbiAgICAgIGFzc2VydCh0eC5nZXRJbnB1dHMoKS5sZW5ndGggPiAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR4LmdldElucHV0cygpKSBmb3IgKGxldCBpbnB1dCBvZiB0eC5nZXRJbnB1dHMoKSkgdGVzdElucHV0V2FsbGV0KGlucHV0KTtcbiAgICB9XG4gICAgXG4gICAgLy8gdGVzdCBvdXRwdXRzXG4gICAgaWYgKHR4LmdldElzSW5jb21pbmcoKSAmJiBjdHguaW5jbHVkZU91dHB1dHMpIHtcbiAgICAgIGlmICh0eC5nZXRJc0NvbmZpcm1lZCgpKSB7XG4gICAgICAgIGFzc2VydCh0eC5nZXRPdXRwdXRzKCkgIT09IHVuZGVmaW5lZCk7XG4gICAgICAgIGFzc2VydCh0eC5nZXRPdXRwdXRzKCkubGVuZ3RoID4gMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhc3NlcnQodHguZ2V0T3V0cHV0cygpID09PSB1bmRlZmluZWQpO1xuICAgICAgfVxuXG4gICAgfVxuICAgIGlmICh0eC5nZXRPdXRwdXRzKCkpIGZvciAobGV0IG91dHB1dCBvZiB0eC5nZXRPdXRwdXRzKCkpIHRlc3RPdXRwdXRXYWxsZXQob3V0cHV0KTtcbiAgICBcbiAgICAvLyB0ZXN0IGRlZXAgY29weVxuICAgIGlmICghY3R4LmlzQ29weSkgYXdhaXQgdGhpcy50ZXN0VHhXYWxsZXRDb3B5KHR4LCBjdHgpO1xuICB9XG4gIFxuICAvLyBUT0RPOiBtb3ZlIGJlbG93IHRlc3RUeFdhbGxldENvcHlcbiAgcHJvdGVjdGVkIGFzeW5jIHRlc3RUeFdhbGxldENvcHkodHgsIGN0eCkge1xuICAgIFxuICAgIC8vIGNvcHkgdHggYW5kIGFzc2VydCBkZWVwIGVxdWFsaXR5XG4gICAgbGV0IGNvcHkgPSB0eC5jb3B5KCk7XG4gICAgYXNzZXJ0KGNvcHkgaW5zdGFuY2VvZiBNb25lcm9UeFdhbGxldCk7XG4gICAgYXNzZXJ0LmRlZXBFcXVhbChjb3B5LnRvSnNvbigpLCB0eC50b0pzb24oKSk7XG4gICAgXG4gICAgLy8gdGVzdCBkaWZmZXJlbnQgcmVmZXJlbmNlc1xuICAgIGlmICh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkpIHtcbiAgICAgIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgIT09IGNvcHkuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpKTtcbiAgICAgIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0VHgoKSAhPT0gY29weS5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0VHgoKSk7XG4gICAgICBpZiAodHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpKSB7XG4gICAgICAgIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCkgIT09IGNvcHkuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGNvcHkuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpW2ldLCB0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKClbaV0pO1xuICAgICAgICAgIGFzc2VydCh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKClbaV0gIT09IGNvcHkuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHguZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0eC5nZXRJbmNvbWluZ1RyYW5zZmVycygpLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoY29weS5nZXRJbmNvbWluZ1RyYW5zZmVycygpW2ldLnRvSnNvbigpLCB0eC5nZXRJbmNvbWluZ1RyYW5zZmVycygpW2ldLnRvSnNvbigpKTtcbiAgICAgICAgYXNzZXJ0KHR4LmdldEluY29taW5nVHJhbnNmZXJzKClbaV0gIT09IGNvcHkuZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKVtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0eC5nZXRJbnB1dHMoKSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0eC5nZXRJbnB1dHMoKS5sZW5ndGg7IGkrKykge1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGNvcHkuZ2V0SW5wdXRzKClbaV0udG9Kc29uKCksIHR4LmdldElucHV0cygpW2ldLnRvSnNvbigpKTtcbiAgICAgICAgYXNzZXJ0KHR4LmdldElucHV0cygpW2ldICE9PSBjb3B5LmdldElucHV0cygpW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR4LmdldE91dHB1dHMoKSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0eC5nZXRPdXRwdXRzKCkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChjb3B5LmdldE91dHB1dHMoKVtpXS50b0pzb24oKSwgdHguZ2V0T3V0cHV0cygpW2ldLnRvSnNvbigpKTtcbiAgICAgICAgYXNzZXJ0KHR4LmdldE91dHB1dHMoKVtpXSAhPT0gY29weS5nZXRPdXRwdXRzKClbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyB0ZXN0IGNvcGllZCB0eFxuICAgIGN0eCA9IE9iamVjdC5hc3NpZ24oe30sIGN0eCk7XG4gICAgY3R4LmlzQ29weSA9IHRydWU7XG4gICAgaWYgKHR4LmdldEJsb2NrKCkpIGNvcHkuc2V0QmxvY2sodHguZ2V0QmxvY2soKS5jb3B5KCkuc2V0VHhzKFtjb3B5XSkpOyAvLyBjb3B5IGJsb2NrIGZvciB0ZXN0aW5nXG4gICAgYXdhaXQgdGhpcy50ZXN0VHhXYWxsZXQoY29weSwgY3R4KTtcbiAgICBcbiAgICAvLyB0ZXN0IG1lcmdpbmcgd2l0aCBjb3B5XG4gICAgbGV0IG1lcmdlZCA9IGNvcHkubWVyZ2UoY29weS5jb3B5KCkpO1xuICAgIGFzc2VydC5lcXVhbChtZXJnZWQudG9TdHJpbmcoKSwgdHgudG9TdHJpbmcoKSk7XG4gIH1cbiAgXG4gIHByb3RlY3RlZCBhc3luYyB0ZXN0TXVsdGlzaWcoTSwgTiwgdGVzdFR4KSB7XG4gICAgXG4gICAgLy8gY3JlYXRlIE4gcGFydGljaXBhbnRzXG4gICAgbGV0IHBhcnRpY2lwYW50czogTW9uZXJvV2FsbGV0W10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE47IGkrKykgcGFydGljaXBhbnRzLnB1c2goYXdhaXQgdGhpcy5jcmVhdGVXYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpKSk7XG5cbiAgICAvLyB0ZXN0IG11bHRpc2lnXG4gICAgbGV0IGVycjtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy50ZXN0TXVsdGlzaWdQYXJ0aWNpcGFudHMocGFydGljaXBhbnRzLCBNLCBOLCB0ZXN0VHgpO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgZXJyID0gZTtcbiAgICB9XG4gICAgXG4gICAgLy8gc3RvcCBtaW5pbmcgYXQgZW5kIG9mIHRlc3RcbiAgICB0cnkgeyBhd2FpdCB0aGlzLmRhZW1vbi5zdG9wTWluaW5nKCk7IH1cbiAgICBjYXRjaCAoZXJyMikgeyB9XG4gICAgXG4gICAgLy8gc2F2ZSBhbmQgY2xvc2UgcGFydGljaXBhbnRzXG4gICAgZm9yIChsZXQgcGFydGljaXBhbnQgb2YgcGFydGljaXBhbnRzKSBhd2FpdCB0aGlzLmNsb3NlV2FsbGV0KHBhcnRpY2lwYW50LCB0cnVlKTtcbiAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gIH1cbiAgXG4gIHByb3RlY3RlZCBhc3luYyB0ZXN0TXVsdGlzaWdQYXJ0aWNpcGFudHMocGFydGljaXBhbnRzLCBNLCBOLCB0ZXN0VHgpIHtcbiAgICBjb25zb2xlLmxvZyhcInRlc3RNdWx0aXNpZyhcIiArIE0gKyBcIiwgXCIgKyBOICsgXCIpXCIpO1xuICAgIGFzc2VydC5lcXVhbChOLCBwYXJ0aWNpcGFudHMubGVuZ3RoKTtcbiAgICBcbiAgICAvLyBwcmVwYXJlIG11bHRpc2lnIGhleGVzXG4gICAgbGV0IHByZXBhcmVkTXVsdGlzaWdIZXhlczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE47IGkrKykge1xuICAgICAgbGV0IHBhcnRpY2lwYW50ID0gcGFydGljaXBhbnRzW2ldO1xuICAgICAgcHJlcGFyZWRNdWx0aXNpZ0hleGVzLnB1c2goYXdhaXQgcGFydGljaXBhbnQucHJlcGFyZU11bHRpc2lnKCkpO1xuICAgIH1cblxuICAgIC8vIG1ha2Ugd2FsbGV0cyBtdWx0aXNpZ1xuICAgIGxldCBtYWRlTXVsdGlzaWdIZXhlczogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnRpY2lwYW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IHBhcnRpY2lwYW50ID0gcGFydGljaXBhbnRzW2ldO1xuICAgICAgXG4gICAgICAvLyBjb2xsZWN0IHByZXBhcmVkIG11bHRpc2lnIGhleGVzIGZyb20gd2FsbGV0J3MgcGVlcnNcbiAgICAgIGxldCBwZWVyTXVsdGlzaWdIZXhlczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcGFydGljaXBhbnRzLmxlbmd0aDsgaisrKSBpZiAoaiAhPT0gaSkgcGVlck11bHRpc2lnSGV4ZXMucHVzaChwcmVwYXJlZE11bHRpc2lnSGV4ZXNbal0pO1xuXG4gICAgICAvLyB0ZXN0IGJhZCBpbnB1dFxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgcGFydGljaXBhbnQubWFrZU11bHRpc2lnKFtcImFzZFwiLCBcImRzYVwiXSwgTSwgVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBlcnJvciBtYWtpbmcgd2FsbGV0IG11bHRpc2lnIHdpdGggYmFkIGlucHV0XCIpO1xuICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgaWYgKCEoZXJyIGluc3RhbmNlb2YgTW9uZXJvRXJyb3IpKSB0aHJvdyBlcnI7XG4gICAgICAgIGlmIChlcnIubWVzc2FnZSAhPT0gXCJLZXggbWVzc2FnZSB1bmV4cGVjdGVkbHkgc21hbGwuXCIpIGNvbnNvbGUud2FybihcIlVuZXhwZWN0ZWQgZXJyb3IgbWVzc2FnZTogXCIgKyBlcnIubWVzc2FnZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIG1ha2UgdGhlIHdhbGxldCBtdWx0aXNpZ1xuICAgICAgbGV0IG11bHRpc2lnSGV4ID0gYXdhaXQgcGFydGljaXBhbnQubWFrZU11bHRpc2lnKHBlZXJNdWx0aXNpZ0hleGVzLCBNLCBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKTtcbiAgICAgIG1hZGVNdWx0aXNpZ0hleGVzLnB1c2gobXVsdGlzaWdIZXgpO1xuICAgIH1cbiAgICBcbiAgICAvLyB0cnkgdG8gZ2V0IHNlZWQgYmVmb3JlIHdhbGxldCBpbml0aWFsaXplZFxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBwYXJ0aWNpcGFudHNbMF0uZ2V0U2VlZCgpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGV4Y2VwdGlvbiBnZXR0aW5nIG11bHRpc2lnIHNlZWQgYmVmb3JlIGluaXRpYWxpemVkXCIpO1xuICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICBhc3NlcnQuZXF1YWwoXCJUaGlzIHdhbGxldCBpcyBtdWx0aXNpZywgYnV0IG5vdCB5ZXQgZmluYWxpemVkXCIsIGVyci5tZXNzYWdlKTtcbiAgICB9XG4gICAgXG4gICAgLy8gZXhjaGFuZ2Uga2V5cyBOIC0gTSArIDEgdGltZXNcbiAgICBsZXQgYWRkcmVzcyA9IHVuZGVmaW5lZDtcbiAgICBhc3NlcnQuZXF1YWwobWFkZU11bHRpc2lnSGV4ZXMubGVuZ3RoLCBOKTtcbiAgICBsZXQgcHJldk11bHRpc2lnSGV4ZXM6IHN0cmluZ1tdID0gbWFkZU11bHRpc2lnSGV4ZXM7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOIC0gTSArIDE7IGkrKykge1xuICAgICAgLy9jb25zb2xlLmxvZyhcIkV4Y2hhbmdpbmcgbXVsdGlzaWcga2V5cyByb3VuZCBcIiArIChpICsgMSkgKyBcIiAvIFwiICsgKE4gLSBNKSk7XG4gICAgICBcbiAgICAgIC8vIGV4Y2hhbmdlIG11bHRpc2lnIGtleXMgd2l0aCBlYWNoIHdhbGxldCBhbmQgY29sbGVjdCByZXN1bHRzXG4gICAgICBsZXQgZXhjaGFuZ2VNdWx0aXNpZ0hleGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBwYXJ0aWNpcGFudHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgbGV0IHBhcnRpY2lwYW50ID0gcGFydGljaXBhbnRzW2pdO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBiYWQgaW5wdXRcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBwYXJ0aWNpcGFudC5leGNoYW5nZU11bHRpc2lnS2V5cyhbXSwgVGVzdFV0aWxzLldBTExFVF9QQVNTV09SRCk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGVycm9yIGV4Y2hhbmdpbmcgbXVsdGlzaWcga2V5cyB3aXRoIGJhZCBpbnB1dFwiKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBNb25lcm9FcnJvcikpIHRocm93IGVycjtcbiAgICAgICAgICBhc3NlcnQoZXJyLm1lc3NhZ2UubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGNvbGxlY3QgdGhlIG11bHRpc2lnIGhleGVzIG9mIHRoZSB3YWxsZXQncyBwZWVycyBmcm9tIGxhc3Qgcm91bmRcbiAgICAgICAgbGV0IHBlZXJNdWx0aXNpZ0hleGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBrID0gMDsgayA8IHBhcnRpY2lwYW50cy5sZW5ndGg7IGsrKykgaWYgKGsgIT09IGopIHBlZXJNdWx0aXNpZ0hleGVzLnB1c2gocHJldk11bHRpc2lnSGV4ZXNba10pO1xuICAgICAgICBcbiAgICAgICAgLy8gaW1wb3J0IHRoZSBtdWx0aXNpZyBoZXhlcyBvZiB0aGUgd2FsbGV0J3MgcGVlcnNcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHBhcnRpY2lwYW50LmV4Y2hhbmdlTXVsdGlzaWdLZXlzKHBlZXJNdWx0aXNpZ0hleGVzLCBUZXN0VXRpbHMuV0FMTEVUX1BBU1NXT1JEKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgcmVzdWx0XG4gICAgICAgIGFzc2VydC5ub3RFcXVhbChyZXN1bHQuZ2V0TXVsdGlzaWdIZXgoKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgYXNzZXJ0KHJlc3VsdC5nZXRNdWx0aXNpZ0hleCgpLmxlbmd0aCA+IDApO1xuICAgICAgICBpZiAoaSA9PT0gTiAtIE0pIHsgIC8vIHJlc3VsdCBvbiBsYXN0IHJvdW5kIGhhcyBhZGRyZXNzXG4gICAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHJlc3VsdC5nZXRBZGRyZXNzKCksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgYXNzZXJ0KHJlc3VsdC5nZXRBZGRyZXNzKCkubGVuZ3RoID4gMCk7XG4gICAgICAgICAgaWYgKGFkZHJlc3MgPT09IHVuZGVmaW5lZCkgYWRkcmVzcyA9IHJlc3VsdC5nZXRBZGRyZXNzKCk7XG4gICAgICAgICAgZWxzZSBhc3NlcnQuZXF1YWwocmVzdWx0LmdldEFkZHJlc3MoKSwgYWRkcmVzcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRBZGRyZXNzKCksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgZXhjaGFuZ2VNdWx0aXNpZ0hleGVzLnB1c2gocmVzdWx0LmdldE11bHRpc2lnSGV4KCkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHVzZSByZXN1bHRzIGZvciBuZXh0IHJvdW5kIG9mIGV4Y2hhbmdlXG4gICAgICBwcmV2TXVsdGlzaWdIZXhlcyA9IGV4Y2hhbmdlTXVsdGlzaWdIZXhlcztcbiAgICB9XG4gICAgXG4gICAgLy8gdmFsaWRhdGUgZmluYWwgbXVsdGlzaWdcbiAgICBsZXQgcGFydGljaXBhbnQgPSBwYXJ0aWNpcGFudHNbMF07XG4gICAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVBZGRyZXNzKGF3YWl0IHBhcnRpY2lwYW50LmdldFByaW1hcnlBZGRyZXNzKCksIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpO1xuICAgIHRoaXMudGVzdE11bHRpc2lnSW5mbyhhd2FpdCBwYXJ0aWNpcGFudC5nZXRNdWx0aXNpZ0luZm8oKSwgTSwgTik7XG4gICAgbGV0IHNlZWQgPSBhd2FpdCBwYXJ0aWNpcGFudC5nZXRTZWVkKCk7XG4gICAgYXNzZXJ0KHNlZWQubGVuZ3RoID4gMCk7XG5cbiAgICAvLyByZXN0b3JlIHBhcnRpY2lwYW50IGZyb20gbXVsdGlzaWcgc2VlZFxuICAgIGF3YWl0IHRoaXMuY2xvc2VXYWxsZXQocGFydGljaXBhbnQpO1xuICAgIHBhcnRpY2lwYW50ID0gYXdhaXQgdGhpcy5jcmVhdGVXYWxsZXQobmV3IE1vbmVyb1dhbGxldENvbmZpZygpLnNldFNlZWQoc2VlZCkuc2V0SXNNdWx0aXNpZyh0cnVlKSk7XG4gICAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVBZGRyZXNzKGF3YWl0IHBhcnRpY2lwYW50LmdldFByaW1hcnlBZGRyZXNzKCksIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpO1xuICAgIGFzc2VydC5lcXVhbChhd2FpdCBwYXJ0aWNpcGFudC5nZXRQcmltYXJ5QWRkcmVzcygpLCBhZGRyZXNzKTtcbiAgICB0aGlzLnRlc3RNdWx0aXNpZ0luZm8oYXdhaXQgcGFydGljaXBhbnQuZ2V0TXVsdGlzaWdJbmZvKCksIE0sIE4pO1xuICAgIGFzc2VydC5lcXVhbChhd2FpdCBwYXJ0aWNpcGFudC5nZXRTZWVkKCksIHNlZWQpO1xuICAgIHBhcnRpY2lwYW50c1swXSA9IHBhcnRpY2lwYW50O1xuICAgIFxuICAgIC8vIHRlc3Qgc2VuZGluZyBhIG11bHRpc2lnIHRyYW5zYWN0aW9uIGlmIGNvbmZpZ3VyZWRcbiAgICBpZiAodGVzdFR4KSB7XG4gICAgICBcbiAgICAgIC8vIGNyZWF0ZSBhY2NvdW50cyBpbiB0aGUgZmlyc3QgbXVsdGlzaWcgd2FsbGV0IHRvIHJlY2VpdmUgZnVuZHNcbiAgICAgIGxldCBhY2NvdW50SWR4ID0gMDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWNjb3VudElkeDsgaSsrKSBhd2FpdCBwYXJ0aWNpcGFudC5jcmVhdGVBY2NvdW50KCk7XG4gICAgICBcbiAgICAgIC8vIGdldCBkZXN0aW5hdGlvbnMgdG8gc3ViYWRkcmVzc2VzIHdpdGhpbiB0aGUgYWNjb3VudCBvZiB0aGUgbXVsdGlzaWcgd2FsbGV0XG4gICAgICBsZXQgbnVtU3ViYWRkcmVzc2VzID0gMztcbiAgICAgIGxldCBkZXN0aW5hdGlvbnM6IE1vbmVyb0Rlc3RpbmF0aW9uW10gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtU3ViYWRkcmVzc2VzOyBpKyspIHtcbiAgICAgICAgZGVzdGluYXRpb25zLnB1c2gobmV3IE1vbmVyb0Rlc3RpbmF0aW9uKGF3YWl0IHBhcnRpY2lwYW50LmdldEFkZHJlc3MoYWNjb3VudElkeCwgaSksIFRlc3RVdGlscy5NQVhfRkVFICogQmlnSW50KDIpKSk7XG4gICAgICAgIGlmIChpICsgMSA8IG51bVN1YmFkZHJlc3NlcykgcGFydGljaXBhbnQuY3JlYXRlU3ViYWRkcmVzcyhhY2NvdW50SWR4KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gd2FpdCBmb3IgdHhzIHRvIGNvbmZpcm0gYW5kIGZvciBzdWZmaWNpZW50IHVubG9ja2VkIGJhbGFuY2VcbiAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhpcy53YWxsZXQpO1xuICAgICAgYXdhaXQgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLndhaXRGb3JVbmxvY2tlZEJhbGFuY2UodGhpcy53YWxsZXQsIDAsIHVuZGVmaW5lZCwgVGVzdFV0aWxzLk1BWF9GRUUgKiAoMjBuKSk7IFxuICAgICAgXG4gICAgICAvLyBzZW5kIGZ1bmRzIGZyb20gdGhlIG1haW4gdGVzdCB3YWxsZXQgdG8gZGVzdGluYXRpb25zIGluIHRoZSBmaXJzdCBtdWx0aXNpZyB3YWxsZXRcbiAgICAgIGFzc2VydChhd2FpdCB0aGlzLndhbGxldC5nZXRCYWxhbmNlKCkgPiAwbik7XG4gICAgICBjb25zb2xlLmxvZyhcIlNlbmRpbmcgZnVuZHMgZnJvbSBtYWluIHdhbGxldFwiKTtcbiAgICAgIGF3YWl0IHRoaXMud2FsbGV0LmNyZWF0ZVR4KHthY2NvdW50SW5kZXg6IDAsIGRlc3RpbmF0aW9uczogZGVzdGluYXRpb25zLCByZWxheTogdHJ1ZX0pO1xuICAgICAgbGV0IHJldHVybkFkZHJlc3MgPSBhd2FpdCB0aGlzLndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpOyAvLyBmdW5kcyB3aWxsIGJlIHJldHVybmVkIHRvIHRoaXMgYWRkcmVzcyBmcm9tIHRoZSBtdWx0aXNpZyB3YWxsZXRcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coXCJTdGFydGluZyBtaW5pbmdcIik7XG4gICAgICBcbiAgICAgIC8vIHN0YXJ0IG1pbmluZyB0byBwdXNoIHRoZSBuZXR3b3JrIGFsb25nXG4gICAgICBhd2FpdCBTdGFydE1pbmluZy5zdGFydE1pbmluZygpO1xuICAgICAgXG4gICAgICAvLyB3YWl0IGZvciB0aGUgbXVsdGlzaWcgd2FsbGV0J3MgZnVuZHMgdG8gdW5sb2NrIC8vIFRPRE86IHJlcGxhY2Ugd2l0aCBNb25lcm9XYWxsZXRMaXN0ZW5lci5vbk91dHB1dFJlY2VpdmVkKCkgd2hpY2ggaXMgY2FsbGVkIHdoZW4gb3V0cHV0IHVubG9ja2VkXG4gICAgICBsZXQgbGFzdE51bUNvbmZpcm1hdGlvbnM6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIFxuICAgICAgICAvLyB3YWl0IGZvciBhIG1vbWVudFxuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7IHNldFRpbWVvdXQocmVzb2x2ZSwgVGVzdFV0aWxzLlNZTkNfUEVSSU9EX0lOX01TKTsgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCBhbmQgdGVzdCBvdXRwdXRzXG4gICAgICAgIGxldCBvdXRwdXRzID0gYXdhaXQgcGFydGljaXBhbnQuZ2V0T3V0cHV0cygpO1xuICAgICAgICBpZiAob3V0cHV0cy5sZW5ndGggPT09IDApIGNvbnNvbGUubG9nKFwiTm8gb3V0cHV0cyByZXBvcnRlZCB5ZXRcIik7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHByaW50IG51bSBjb25maXJtYXRpb25zXG4gICAgICAgICAgbGV0IGhlaWdodCA9IGF3YWl0IHRoaXMuZGFlbW9uLmdldEhlaWdodCgpO1xuICAgICAgICAgIGxldCBudW1Db25maXJtYXRpb25zID0gaGVpZ2h0IC0gb3V0cHV0c1swXS5nZXRUeCgpLmdldEhlaWdodCgpO1xuICAgICAgICAgIGlmIChsYXN0TnVtQ29uZmlybWF0aW9ucyA9PT0gdW5kZWZpbmVkIHx8IGxhc3ROdW1Db25maXJtYXRpb25zICE9PSBudW1Db25maXJtYXRpb25zKSBjb25zb2xlLmxvZyhcIk91dHB1dCBoYXMgXCIgKyAoaGVpZ2h0IC0gb3V0cHV0c1swXS5nZXRUeCgpLmdldEhlaWdodCgpKSArIFwiIGNvbmZpcm1hdGlvbnNcIik7XG4gICAgICAgICAgbGFzdE51bUNvbmZpcm1hdGlvbnMgPSBudW1Db25maXJtYXRpb25zO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIG91dHB1dHMgYXJlIG5vdCBzcGVudFxuICAgICAgICAgIGZvciAobGV0IG91dHB1dCBvZiBvdXRwdXRzKSBhc3NlcnQob3V0cHV0LmdldElzU3BlbnQoKSA9PT0gZmFsc2UpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGJyZWFrIGlmIG91dHB1dCBpcyB1bmxvY2tlZFxuICAgICAgICAgIGlmICghb3V0cHV0c1swXS5nZXRJc0xvY2tlZCgpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBzdG9wIG1pbmluZ1xuICAgICAgYXdhaXQgdGhpcy5kYWVtb24uc3RvcE1pbmluZygpO1xuICAgICAgXG4gICAgICAvLyBtdWx0aXNpZyB3YWxsZXQgc2hvdWxkIGhhdmUgdW5sb2NrZWQgYmFsYW5jZSBpbiBzdWJhZGRyZXNzZXMgMC0zXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVN1YmFkZHJlc3NlczsgaSsrKSB7XG4gICAgICAgIGFzc2VydCgoYXdhaXQgcGFydGljaXBhbnQuZ2V0VW5sb2NrZWRCYWxhbmNlKGFjY291bnRJZHgsIGkpKSA+IEJpZ0ludCgwKSk7XG4gICAgICB9XG4gICAgICBsZXQgb3V0cHV0cyA9IGF3YWl0IHBhcnRpY2lwYW50LmdldE91dHB1dHMoe2FjY291bnRJbmRleDogYWNjb3VudElkeH0pO1xuICAgICAgYXNzZXJ0KG91dHB1dHMubGVuZ3RoID4gMCk7XG4gICAgICBpZiAob3V0cHV0cy5sZW5ndGggPCAzKSBjb25zb2xlLmxvZyhcIldBUk5JTkc6IG5vdCBvbmUgb3V0cHV0IHBlciBzdWJhZGRyZXNzP1wiKTtcbiAgICAgIC8vYXNzZXJ0KG91dHB1dHMubGVuZ3RoID49IDMpOyAgLy8gVE9ET1xuICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIGFzc2VydC5lcXVhbChvdXRwdXQuZ2V0SXNMb2NrZWQoKSwgZmFsc2UpO1xuICAgICAgXG4gICAgICAvLyB3YWxsZXQgcmVxdWlyZXMgaW1wb3J0aW5nIG11bHRpc2lnIHRvIGJlIHJlbGlhYmxlXG4gICAgICBhc3NlcnQoYXdhaXQgcGFydGljaXBhbnQuaXNNdWx0aXNpZ0ltcG9ydE5lZWRlZCgpKTtcbiAgICAgIFxuICAgICAgLy8gYXR0ZW1wdCBjcmVhdGluZyBhbmQgcmVsYXlpbmcgdHJhbnNhY3Rpb24gd2l0aG91dCBzeW5jaHJvbml6aW5nIHdpdGggcGFydGljaXBhbnRzXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBwYXJ0aWNpcGFudC5jcmVhdGVUeCh7YWNjb3VudEluZGV4OiBhY2NvdW50SWR4LCBhZGRyZXNzOiByZXR1cm5BZGRyZXNzLCBhbW91bnQ6IFRlc3RVdGlscy5NQVhfRkVFICogQmlnSW50KDMpfSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIGZhaWxlZCBzZW5kaW5nIGZ1bmRzIHdpdGhvdXQgc3luY2hyb25pemluZyB3aXRoIHBlZXJzXCIpO1xuICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgIGlmIChlLm1lc3NhZ2UgIT09IFwiTm8gdHJhbnNhY3Rpb24gY3JlYXRlZFwiKSB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHN5bmNocm9uaXplIHRoZSBtdWx0aXNpZyBwYXJ0aWNpcGFudHMgc2luY2UgcmVjZWl2aW5nIG91dHB1dHNcbiAgICAgIGNvbnNvbGUubG9nKFwiU3luY2hyb25pemluZyBwYXJ0aWNpcGFudHNcIik7XG4gICAgICBhd2FpdCB0aGlzLnN5bmNocm9uaXplTXVsdGlzaWdQYXJ0aWNpcGFudHMocGFydGljaXBhbnRzKTtcblxuICAgICAgLy8gZXhwZWN0IGVycm9yIGV4cG9ydGluZyBrZXkgaW1hZ2VzXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBwYXJ0aWNpcGFudC5leHBvcnRLZXlJbWFnZXModHJ1ZSk7XG4gICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgaWYgKGUubWVzc2FnZS5pbmRleE9mKFwia2V5X2ltYWdlIGdlbmVyYXRlZCBub3QgbWF0Y2hlZCB3aXRoIGNhY2hlZCBrZXkgaW1hZ2VcIikgPCAwKSB0aHJvdyBuZXcgRXJyb3IoZSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIGF0dGVtcHQgcmVsYXlpbmcgY3JlYXRlZCB0cmFuc2FjdGlvbnMgd2l0aG91dCBjby1zaWduaW5nXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBwYXJ0aWNpcGFudC5jcmVhdGVUeHMoe2FkZHJlc3M6IHJldHVybkFkZHJlc3MsIGFtb3VudDogVGVzdFV0aWxzLk1BWF9GRUUsIGFjY291bnRJbmRleDogYWNjb3VudElkeCwgc3ViYWRkcmVzc0luZGV4OiAwLCByZWxheTogdHJ1ZX0pO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSBmYWlsZWRcIik7XG4gICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgaWYgKGUubWVzc2FnZSAhPT0gXCJDYW5ub3QgcmVsYXkgbXVsdGlzaWcgdHJhbnNhY3Rpb24gdW50aWwgY28tc2lnbmVkXCIpIHRocm93IG5ldyBFcnJvcihlKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gY3JlYXRlIHR4cyB0byBzZW5kIGZ1bmRzIGZyb20gYSBzdWJhZGRyZXNzIGluIHRoZSBtdWx0aXNpZyB3YWxsZXRcbiAgICAgIGNvbnNvbGUubG9nKFwiU2VuZGluZ1wiKTtcbiAgICAgIGxldCB0eHMgPSBhd2FpdCBwYXJ0aWNpcGFudC5jcmVhdGVUeHMoe2FkZHJlc3M6IHJldHVybkFkZHJlc3MsIGFtb3VudDogVGVzdFV0aWxzLk1BWF9GRUUsIGFjY291bnRJbmRleDogYWNjb3VudElkeCwgc3ViYWRkcmVzc0luZGV4OiAwfSk7XG4gICAgICBhc3NlcnQodHhzLmxlbmd0aCA+IDApO1xuICAgICAgbGV0IHR4U2V0ID0gdHhzWzBdLmdldFR4U2V0KCk7XG4gICAgICBhc3NlcnQubm90RXF1YWwodHhTZXQuZ2V0TXVsdGlzaWdUeEhleCgpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4U2V0LmdldFNpZ25lZFR4SGV4KCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHhTZXQuZ2V0VW5zaWduZWRUeEhleCgpLCB1bmRlZmluZWQpO1xuICAgICAgXG4gICAgICAvLyBwYXJzZSBtdWx0aXNpZyB0eCBoZXggYW5kIHRlc3RcbiAgICAgIGF3YWl0IHRlc3REZXNjcmliZWRUeFNldChhd2FpdCBwYXJ0aWNpcGFudC5kZXNjcmliZU11bHRpc2lnVHhTZXQodHhTZXQuZ2V0TXVsdGlzaWdUeEhleCgpKSk7XG4gICAgICBcbiAgICAgIC8vIHNpZ24gdGhlIHR4IHdpdGggcGFydGljaXBhbnRzIDEgdGhyb3VnaCBNIC0gMSB0byBtZWV0IHRocmVzaG9sZFxuICAgICAgbGV0IG11bHRpc2lnVHhIZXggPSB0eFNldC5nZXRNdWx0aXNpZ1R4SGV4KCk7XG4gICAgICBjb25zb2xlLmxvZyhcIlNpZ25pbmdcIik7XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IE07IGkrKykge1xuICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcGFydGljaXBhbnRzW2ldLnNpZ25NdWx0aXNpZ1R4SGV4KG11bHRpc2lnVHhIZXgpO1xuICAgICAgICBtdWx0aXNpZ1R4SGV4ID0gcmVzdWx0LmdldFNpZ25lZE11bHRpc2lnVHhIZXgoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy9jb25zb2xlLmxvZyhcIlN1Ym1pdHRpbmcgc2lnbmVkIG11bHRpc2lnIHR4IGhleDogXCIgKyBtdWx0aXNpZ1R4SGV4KTtcbiAgICAgIFxuICAgICAgLy8gc3VibWl0IHRoZSBzaWduZWQgbXVsdGlzaWcgdHggaGV4IHRvIHRoZSBuZXR3b3JrXG4gICAgICBjb25zb2xlLmxvZyhcIlN1Ym1pdHRpbmdcIik7XG4gICAgICBsZXQgdHhIYXNoZXMgPSBhd2FpdCBwYXJ0aWNpcGFudC5zdWJtaXRNdWx0aXNpZ1R4SGV4KG11bHRpc2lnVHhIZXgpO1xuICAgICAgYXNzZXJ0KHR4SGFzaGVzLmxlbmd0aCA+IDApO1xuICAgICAgXG4gICAgICAvLyBzeW5jaHJvbml6ZSB0aGUgbXVsdGlzaWcgcGFydGljaXBhbnRzIHNpbmNlIHNwZW5kaW5nIG91dHB1dHNcbiAgICAgIGNvbnNvbGUubG9nKFwiU3luY2hyb25pemluZyBwYXJ0aWNpcGFudHNcIik7XG4gICAgICBhd2FpdCB0aGlzLnN5bmNocm9uaXplTXVsdGlzaWdQYXJ0aWNpcGFudHMocGFydGljaXBhbnRzKTtcbiAgICAgIFxuICAgICAgLy8gZmV0Y2ggdGhlIHdhbGxldCdzIG11bHRpc2lnIHR4c1xuICAgICAgbGV0IG11bHRpc2lnVHhzID0gYXdhaXQgcGFydGljaXBhbnQuZ2V0VHhzKHtoYXNoZXM6IHR4SGFzaGVzfSk7XG4gICAgICBhc3NlcnQuZXF1YWwodHhIYXNoZXMubGVuZ3RoLCBtdWx0aXNpZ1R4cy5sZW5ndGgpO1xuICAgICAgXG4gICAgICAvLyBzd2VlcCBhbiBvdXRwdXQgZnJvbSBzdWJhZGRyZXNzIFthY2NvdW50SWR4LDFdXG4gICAgICBvdXRwdXRzID0gYXdhaXQgcGFydGljaXBhbnQuZ2V0T3V0cHV0cyh7YWNjb3VudEluZGV4OiBhY2NvdW50SWR4LCBzdWJhZGRyZXNzSW5kZXg6IDF9KTtcbiAgICAgIGFzc2VydChvdXRwdXRzLmxlbmd0aCA+IDApO1xuICAgICAgYXNzZXJ0KG91dHB1dHNbMF0uZ2V0SXNTcGVudCgpID09PSBmYWxzZSk7XG4gICAgICB0eFNldCA9IChhd2FpdCBwYXJ0aWNpcGFudC5zd2VlcE91dHB1dCh7YWRkcmVzczogcmV0dXJuQWRkcmVzcywga2V5SW1hZ2U6IG91dHB1dHNbMF0uZ2V0S2V5SW1hZ2UoKS5nZXRIZXgoKSwgcmVsYXk6IHRydWV9KSkuZ2V0VHhTZXQoKTtcbiAgICAgIGFzc2VydC5ub3RFcXVhbCh0eFNldC5nZXRNdWx0aXNpZ1R4SGV4KCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHhTZXQuZ2V0U2lnbmVkVHhIZXgoKSwgdW5kZWZpbmVkKTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eFNldC5nZXRVbnNpZ25lZFR4SGV4KCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQodHhTZXQuZ2V0VHhzKCkubGVuZ3RoID4gMCk7XG4gICAgICBcbiAgICAgIC8vIHBhcnNlIG11bHRpc2lnIHR4IGhleCBhbmQgdGVzdFxuICAgICAgYXdhaXQgdGVzdERlc2NyaWJlZFR4U2V0KGF3YWl0IHBhcnRpY2lwYW50LmRlc2NyaWJlTXVsdGlzaWdUeFNldCh0eFNldC5nZXRNdWx0aXNpZ1R4SGV4KCkpKTtcbiAgICAgIFxuICAgICAgLy8gc2lnbiB0aGUgdHggd2l0aCBwYXJ0aWNpcGFudHMgMSB0aHJvdWdoIE0gLSAxIHRvIG1lZXQgdGhyZXNob2xkXG4gICAgICBtdWx0aXNpZ1R4SGV4ID0gdHhTZXQuZ2V0TXVsdGlzaWdUeEhleCgpO1xuICAgICAgY29uc29sZS5sb2coXCJTaWduaW5nIHN3ZWVwIG91dHB1dFwiKTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgTTsgaSsrKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCBwYXJ0aWNpcGFudHNbaV0uc2lnbk11bHRpc2lnVHhIZXgobXVsdGlzaWdUeEhleCk7XG4gICAgICAgIG11bHRpc2lnVHhIZXggPSByZXN1bHQuZ2V0U2lnbmVkTXVsdGlzaWdUeEhleCgpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBzdWJtaXQgdGhlIHNpZ25lZCBtdWx0aXNpZyB0eCBoZXggdG8gdGhlIG5ldHdvcmtcbiAgICAgIGNvbnNvbGUubG9nKFwiU3VibWl0dGluZyBzd2VlcCBvdXRwdXRcIik7XG4gICAgICB0eEhhc2hlcyA9IGF3YWl0IHBhcnRpY2lwYW50LnN1Ym1pdE11bHRpc2lnVHhIZXgobXVsdGlzaWdUeEhleCk7XG4gICAgICBcbiAgICAgIC8vIHN5bmNocm9uaXplIHRoZSBtdWx0aXNpZyBwYXJ0aWNpcGFudHMgc2luY2Ugc3BlbmRpbmcgb3V0cHV0c1xuICAgICAgY29uc29sZS5sb2coXCJTeW5jaHJvbml6aW5nIHBhcnRpY2lwYW50c1wiKTtcbiAgICAgIGF3YWl0IHRoaXMuc3luY2hyb25pemVNdWx0aXNpZ1BhcnRpY2lwYW50cyhwYXJ0aWNpcGFudHMpO1xuICAgICAgXG4gICAgICAvLyBmZXRjaCB0aGUgd2FsbGV0J3MgbXVsdGlzaWcgdHhzXG4gICAgICBtdWx0aXNpZ1R4cyA9IGF3YWl0IHBhcnRpY2lwYW50LmdldFR4cyh7aGFzaGVzOiB0eEhhc2hlc30pO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4SGFzaGVzLmxlbmd0aCwgbXVsdGlzaWdUeHMubGVuZ3RoKTtcbiAgICAgIFxuICAgICAgLy8gc3dlZXAgcmVtYWluaW5nIGJhbGFuY2VcbiAgICAgIGNvbnNvbGUubG9nKFwiU3dlZXBpbmdcIik7XG4gICAgICB0eHMgPSBhd2FpdCBwYXJ0aWNpcGFudC5zd2VlcFVubG9ja2VkKHthZGRyZXNzOiByZXR1cm5BZGRyZXNzLCBhY2NvdW50SW5kZXg6IGFjY291bnRJZHgsIHJlbGF5OiB0cnVlfSk7IC8vIFRPRE86IHRlc3QgbXVsdGlzaWcgd2l0aCBzd2VlcEVhY2hTdWJhZGRyZXNzIHdoaWNoIHdpbGwgZ2VuZXJhdGUgbXVsdGlwbGUgdHggc2V0cyB3aXRob3V0IHN5bmNocm9uaXppbmcgcGFydGljaXBhbnRzXG4gICAgICBhc3NlcnQodHhzLmxlbmd0aCA+IDAsIFwiTm8gdHhzIGNyZWF0ZWQgb24gc3dlZXBVbmxvY2tlZFwiKTtcbiAgICAgIHR4U2V0ID0gdHhzWzBdLmdldFR4U2V0KCk7XG4gICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgYXNzZXJ0KHR4LmdldFR4U2V0KCkgPT09IHR4U2V0KTsgIC8vIG9ubHkgb25lIHR4IHNldCBjcmVhdGVkIHBlciBhY2NvdW50XG4gICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgIGZvciAobGV0IGFUeCBvZiB0eC5nZXRUeFNldCgpLmdldFR4cygpKSB7XG4gICAgICAgICAgaWYgKGFUeCA9PT0gdHgpIHtcbiAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQoZm91bmQpOyAgLy8gdHggaXMgY29udGFpbmVkIGluIHR4IHNldFxuICAgICAgfVxuICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHR4U2V0LmdldE11bHRpc2lnVHhIZXgoKSwgdW5kZWZpbmVkKTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eFNldC5nZXRTaWduZWRUeEhleCgpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4U2V0LmdldFVuc2lnbmVkVHhIZXgoKSwgdW5kZWZpbmVkKTtcbiAgICAgIFxuICAgICAgLy8gcGFyc2UgbXVsdGlzaWcgdHggaGV4IGFuZCB0ZXN0XG4gICAgICBhd2FpdCB0ZXN0RGVzY3JpYmVkVHhTZXQoYXdhaXQgcGFydGljaXBhbnQuZGVzY3JpYmVUeFNldCh0eFNldCkpO1xuICAgICAgXG4gICAgICAvLyBzaWduIHRoZSB0eCB3aXRoIHBhcnRpY2lwYW50cyAxIHRocm91Z2ggTSAtIDEgdG8gbWVldCB0aHJlc2hvbGRcbiAgICAgIG11bHRpc2lnVHhIZXggPSB0eFNldC5nZXRNdWx0aXNpZ1R4SGV4KCk7XG4gICAgICBjb25zb2xlLmxvZyhcIlNpZ25pbmcgc3dlZXBcIik7XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IE07IGkrKykge1xuICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgcGFydGljaXBhbnRzW2ldLnNpZ25NdWx0aXNpZ1R4SGV4KG11bHRpc2lnVHhIZXgpO1xuICAgICAgICBtdWx0aXNpZ1R4SGV4ID0gcmVzdWx0LmdldFNpZ25lZE11bHRpc2lnVHhIZXgoKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gc3VibWl0IHRoZSBzaWduZWQgbXVsdGlzaWcgdHggaGV4IHRvIHRoZSBuZXR3b3JrXG4gICAgICBjb25zb2xlLmxvZyhcIlN1Ym1pdHRpbmcgc3dlZXBcIik7XG4gICAgICB0eEhhc2hlcyA9IGF3YWl0IHBhcnRpY2lwYW50LnN1Ym1pdE11bHRpc2lnVHhIZXgobXVsdGlzaWdUeEhleCk7XG4gICAgICBcbiAgICAgIC8vIHN5bmNocm9uaXplIHRoZSBtdWx0aXNpZyBwYXJ0aWNpcGFudHMgc2luY2Ugc3BlbmRpbmcgb3V0cHV0c1xuICAgICAgY29uc29sZS5sb2coXCJTeW5jaHJvbml6aW5nIHBhcnRpY2lwYW50c1wiKTtcbiAgICAgIGF3YWl0IHRoaXMuc3luY2hyb25pemVNdWx0aXNpZ1BhcnRpY2lwYW50cyhwYXJ0aWNpcGFudHMpO1xuICAgICAgXG4gICAgICAvLyBmZXRjaCB0aGUgd2FsbGV0J3MgbXVsdGlzaWcgdHhzXG4gICAgICBtdWx0aXNpZ1R4cyA9IGF3YWl0IHBhcnRpY2lwYW50LmdldFR4cyh7aGFzaGVzOiB0eEhhc2hlc30pO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4SGFzaGVzLmxlbmd0aCwgbXVsdGlzaWdUeHMubGVuZ3RoKTtcbiAgICB9XG4gIH1cbiAgXG4gIHByb3RlY3RlZCBhc3luYyBzeW5jaHJvbml6ZU11bHRpc2lnUGFydGljaXBhbnRzKHdhbGxldHMpIHtcbiAgICBcbiAgICAvLyBjb2xsZWN0IG11bHRpc2lnIGhleCBvZiBhbGwgcGFydGljaXBhbnRzIHRvIHN5bmNocm9uaXplXG4gICAgbGV0IG11bHRpc2lnSGV4ZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChsZXQgd2FsbGV0IG9mIHdhbGxldHMpIHtcbiAgICAgIGF3YWl0IHdhbGxldC5zeW5jKCk7XG4gICAgICBtdWx0aXNpZ0hleGVzLnB1c2goYXdhaXQgd2FsbGV0LmV4cG9ydE11bHRpc2lnSGV4KCkpO1xuICAgIH1cbiAgICBcbiAgICAvLyBpbXBvcnQgZWFjaCB3YWxsZXQncyBwZWVyIG11bHRpc2lnIGhleCBcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHdhbGxldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBwZWVyTXVsdGlzaWdIZXhlczogc3RyaW5nW10gPSBbXTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgd2FsbGV0cy5sZW5ndGg7IGorKykgaWYgKGogIT09IGkpIHBlZXJNdWx0aXNpZ0hleGVzLnB1c2gobXVsdGlzaWdIZXhlc1tqXSk7XG4gICAgICBsZXQgd2FsbGV0ID0gd2FsbGV0c1tpXTtcbiAgICAgIGF3YWl0IHdhbGxldC5zeW5jKCk7XG4gICAgICBhd2FpdCB3YWxsZXQuaW1wb3J0TXVsdGlzaWdIZXgocGVlck11bHRpc2lnSGV4ZXMpO1xuICAgIH1cbiAgfVxuICBcbiAgcHJvdGVjdGVkIGFzeW5jIHRlc3RNdWx0aXNpZ0luZm8oaW5mbzogTW9uZXJvTXVsdGlzaWdJbmZvLCBNLCBOKSB7XG4gICAgYXNzZXJ0KGluZm8uZ2V0SXNNdWx0aXNpZygpKTtcbiAgICBhc3NlcnQoaW5mby5nZXRJc1JlYWR5KCkpO1xuICAgIGFzc2VydC5lcXVhbChpbmZvLmdldFRocmVzaG9sZCgpLCBNKTtcbiAgICBhc3NlcnQuZXF1YWwoaW5mby5nZXROdW1QYXJ0aWNpcGFudHMoKSwgTik7XG4gIH1cbiAgXG4gIHByb3RlY3RlZCBhc3luYyB0ZXN0Vmlld09ubHlBbmRPZmZsaW5lV2FsbGV0cyh2aWV3T25seVdhbGxldDogTW9uZXJvV2FsbGV0LCBvZmZsaW5lV2FsbGV0OiBNb25lcm9XYWxsZXQpIHtcbiAgICBcbiAgICAvLyB3YWl0IGZvciB0eHMgdG8gY29uZmlybSBhbmQgZm9yIHN1ZmZpY2llbnQgdW5sb2NrZWQgYmFsYW5jZVxuICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhpcy53YWxsZXQpO1xuICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yVW5sb2NrZWRCYWxhbmNlKHRoaXMud2FsbGV0LCAwLCB1bmRlZmluZWQsIFRlc3RVdGlscy5NQVhfRkVFICogKDRuKSk7XG4gICAgXG4gICAgLy8gdGVzdCBnZXR0aW5nIHR4cywgdHJhbnNmZXJzLCBhbmQgb3V0cHV0cyBmcm9tIHZpZXctb25seSB3YWxsZXRcbiAgICBhc3NlcnQoKGF3YWl0IHZpZXdPbmx5V2FsbGV0LmdldFR4cygpKS5sZW5ndGgsIFwiVmlldy1vbmx5IHdhbGxldCBoYXMgbm8gdHJhbnNhY3Rpb25zXCIpO1xuICAgIGFzc2VydCgoYXdhaXQgdmlld09ubHlXYWxsZXQuZ2V0VHJhbnNmZXJzKCkpLmxlbmd0aCwgXCJWaWV3LW9ubHkgd2FsbGV0IGhhcyBubyB0cmFuc2ZlcnNcIik7XG4gICAgYXNzZXJ0KChhd2FpdCB2aWV3T25seVdhbGxldC5nZXRPdXRwdXRzKCkpLmxlbmd0aCwgXCJWaWV3LW9ubHkgd2FsbGV0IGhhcyBubyBvdXRwdXRzXCIpO1xuICAgIFxuICAgIC8vIGNvbGxlY3QgaW5mbyBmcm9tIG1haW4gdGVzdCB3YWxsZXRcbiAgICBsZXQgcHJpbWFyeUFkZHJlc3MgPSBhd2FpdCB0aGlzLndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpO1xuICAgIGxldCBwcml2YXRlVmlld0tleSA9IGF3YWl0IHRoaXMud2FsbGV0LmdldFByaXZhdGVWaWV3S2V5KCk7XG4gICAgXG4gICAgLy8gdGVzdCBhbmQgc3luYyB2aWV3LW9ubHkgd2FsbGV0XG4gICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHZpZXdPbmx5V2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIHByaW1hcnlBZGRyZXNzKTtcbiAgICBhc3NlcnQuZXF1YWwoYXdhaXQgdmlld09ubHlXYWxsZXQuZ2V0UHJpdmF0ZVZpZXdLZXkoKSwgcHJpdmF0ZVZpZXdLZXkpO1xuICAgIGFzc2VydChhd2FpdCB2aWV3T25seVdhbGxldC5pc1ZpZXdPbmx5KCkpO1xuICAgIGxldCBlcnJNc2cgPSBcIlNob3VsZCBoYXZlIGZhaWxlZFwiO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBhd2FpdCB2aWV3T25seVdhbGxldC5nZXRTZWVkKCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyTXNnKTtcbiAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgIGlmIChlLm1lc3NhZ2UgPT09IGVyck1zZykgdGhyb3cgZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGF3YWl0IHZpZXdPbmx5V2FsbGV0LmdldFNlZWRMYW5ndWFnZSgpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGVyck1zZyk7XG4gICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICBpZiAoZS5tZXNzYWdlID09PSBlcnJNc2cpIHRocm93IGU7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBhd2FpdCB2aWV3T25seVdhbGxldC5nZXRQcml2YXRlU3BlbmRLZXkoKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihlcnJNc2cpO1xuICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgaWYgKGUubWVzc2FnZSA9PT0gZXJyTXNnKSB0aHJvdyBlO1xuICAgIH1cbiAgICBhc3NlcnQoYXdhaXQgdmlld09ubHlXYWxsZXQuaXNDb25uZWN0ZWRUb0RhZW1vbigpLCBcIldhbGxldCBjcmVhdGVkIGZyb20ga2V5cyBpcyBub3QgY29ubmVjdGVkIHRvIGF1dGhlbnRpY2F0ZWQgZGFlbW9uXCIpOyAgLy8gVE9ET1xuICAgIGF3YWl0IHZpZXdPbmx5V2FsbGV0LnN5bmMoKTtcbiAgICBhc3NlcnQoKGF3YWl0IHZpZXdPbmx5V2FsbGV0LmdldFR4cygpKS5sZW5ndGggPiAwKTtcbiAgICBcbiAgICAvLyBleHBvcnQgb3V0cHV0cyBmcm9tIHZpZXctb25seSB3YWxsZXRcbiAgICBsZXQgb3V0cHV0c0hleCA9IGF3YWl0IHZpZXdPbmx5V2FsbGV0LmV4cG9ydE91dHB1dHMoKTtcbiAgICBcbiAgICAvLyB0ZXN0IG9mZmxpbmUgd2FsbGV0XG4gICAgYXNzZXJ0KCFhd2FpdCBvZmZsaW5lV2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgYXNzZXJ0KCFhd2FpdCBvZmZsaW5lV2FsbGV0LmlzVmlld09ubHkoKSk7XG4gICAgaWYgKCEob2ZmbGluZVdhbGxldCBpbnN0YW5jZW9mIE1vbmVyb1dhbGxldFJwYykpIGFzc2VydC5lcXVhbChhd2FpdCBvZmZsaW5lV2FsbGV0LmdldFNlZWQoKSwgVGVzdFV0aWxzLlNFRUQpOyAvLyBUT0RPIG1vbmVyby1wcm9qZWN0OiBjYW5ub3QgZ2V0IHNlZWQgZnJvbSBvZmZsaW5lIHdhbGxldCBycGNcbiAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IG9mZmxpbmVXYWxsZXQuZ2V0VHhzKG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0SW5UeFBvb2woZmFsc2UpKSkubGVuZ3RoLCAwKTtcbiAgICBcbiAgICAvLyBpbXBvcnQgb3V0cHV0cyB0byBvZmZsaW5lIHdhbGxldFxuICAgIGxldCBudW1PdXRwdXRzSW1wb3J0ZWQgPSBhd2FpdCBvZmZsaW5lV2FsbGV0LmltcG9ydE91dHB1dHMob3V0cHV0c0hleCk7XG4gICAgYXNzZXJ0KG51bU91dHB1dHNJbXBvcnRlZCA+IDAsIFwiTm8gb3V0cHV0cyBpbXBvcnRlZFwiKTtcbiAgICBcbiAgICAvLyBleHBvcnQga2V5IGltYWdlcyBmcm9tIG9mZmxpbmUgd2FsbGV0XG4gICAgbGV0IGtleUltYWdlcyA9IGF3YWl0IG9mZmxpbmVXYWxsZXQuZXhwb3J0S2V5SW1hZ2VzKCk7XG4gICAgYXNzZXJ0KGtleUltYWdlcy5sZW5ndGggPiAwKTtcbiAgICBcbiAgICAvLyBpbXBvcnQga2V5IGltYWdlcyB0byB2aWV3LW9ubHkgd2FsbGV0XG4gICAgYXNzZXJ0KGF3YWl0IHZpZXdPbmx5V2FsbGV0LmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgYXdhaXQgdmlld09ubHlXYWxsZXQuaW1wb3J0S2V5SW1hZ2VzKGtleUltYWdlcyk7XG4gICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB2aWV3T25seVdhbGxldC5nZXRCYWxhbmNlKCkpLnRvU3RyaW5nKCksIChhd2FpdCB0aGlzLndhbGxldC5nZXRCYWxhbmNlKCkpLnRvU3RyaW5nKCkpO1xuICAgIFxuICAgIC8vIGNyZWF0ZSB1bnNpZ25lZCB0eCB1c2luZyB2aWV3LW9ubHkgd2FsbGV0XG4gICAgbGV0IHVuc2lnbmVkVHggPSBhd2FpdCB2aWV3T25seVdhbGxldC5jcmVhdGVUeCh7YWNjb3VudEluZGV4OiAwLCBhZGRyZXNzOiBwcmltYXJ5QWRkcmVzcywgYW1vdW50OiBUZXN0VXRpbHMuTUFYX0ZFRSAqICgzbil9KTtcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHVuc2lnbmVkVHguZ2V0VHhTZXQoKS5nZXRVbnNpZ25lZFR4SGV4KCksIFwic3RyaW5nXCIpO1xuICAgIGFzc2VydCh1bnNpZ25lZFR4LmdldFR4U2V0KCkuZ2V0VW5zaWduZWRUeEhleCgpKTtcbiAgICBcbiAgICAvLyBzaWduIHR4IHVzaW5nIG9mZmxpbmUgd2FsbGV0XG4gICAgbGV0IHNpZ25lZFR4U2V0ID0gYXdhaXQgb2ZmbGluZVdhbGxldC5zaWduVHhzKHVuc2lnbmVkVHguZ2V0VHhTZXQoKS5nZXRVbnNpZ25lZFR4SGV4KCkpO1xuICAgIGFzc2VydChzaWduZWRUeFNldC5nZXRTaWduZWRUeEhleCgpLmxlbmd0aCA+IDApO1xuICAgIGFzc2VydC5lcXVhbChzaWduZWRUeFNldC5nZXRUeHMoKS5sZW5ndGgsIDEpO1xuICAgIGFzc2VydChzaWduZWRUeFNldC5nZXRUeHMoKVswXS5nZXRIYXNoKCkubGVuZ3RoID4gMCk7XG4gICAgXG4gICAgLy8gcGFyc2Ugb3IgXCJkZXNjcmliZVwiIHVuc2lnbmVkIHR4IHNldFxuICAgIGxldCBkZXNjcmliZWRUeFNldCA9IGF3YWl0IG9mZmxpbmVXYWxsZXQuZGVzY3JpYmVVbnNpZ25lZFR4U2V0KHVuc2lnbmVkVHguZ2V0VHhTZXQoKS5nZXRVbnNpZ25lZFR4SGV4KCkpO1xuICAgIGF3YWl0IHRlc3REZXNjcmliZWRUeFNldChkZXNjcmliZWRUeFNldCk7XG4gICAgXG4gICAgLy8gc3VibWl0IHNpZ25lZCB0eCB1c2luZyB2aWV3LW9ubHkgd2FsbGV0XG4gICAgaWYgKHRoaXMudGVzdENvbmZpZy50ZXN0UmVsYXlzKSB7XG4gICAgICBsZXQgdHhIYXNoZXMgPSBhd2FpdCB2aWV3T25seVdhbGxldC5zdWJtaXRUeHMoc2lnbmVkVHhTZXQuZ2V0U2lnbmVkVHhIZXgoKSk7XG4gICAgICBhc3NlcnQuZXF1YWwodHhIYXNoZXMubGVuZ3RoLCAxKTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eEhhc2hlc1swXS5sZW5ndGgsIDY0KTtcbiAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodmlld09ubHlXYWxsZXQpOyAvLyB3YWl0IGZvciBjb25maXJtYXRpb24gZm9yIG90aGVyIHRlc3RzXG4gICAgfVxuICB9XG4gIFxuICBwcm90ZWN0ZWQgdGVzdEludmFsaWRBZGRyZXNzRXJyb3IoZXJyKSB7XG4gICAgYXNzZXJ0LmVxdWFsKFwiSW52YWxpZCBhZGRyZXNzXCIsIGVyci5tZXNzYWdlKTtcbiAgfVxuICBcbiAgcHJvdGVjdGVkIHRlc3RJbnZhbGlkVHhIYXNoRXJyb3IoZXJyKSB7XG4gICAgYXNzZXJ0LmVxdWFsKFwiVFggaGFzaCBoYXMgaW52YWxpZCBmb3JtYXRcIiwgZXJyLm1lc3NhZ2UpO1xuICB9XG4gIFxuICBwcm90ZWN0ZWQgdGVzdEludmFsaWRUeEtleUVycm9yKGVycikge1xuICAgIGFzc2VydC5lcXVhbChcIlR4IGtleSBoYXMgaW52YWxpZCBmb3JtYXRcIiwgZXJyLm1lc3NhZ2UpO1xuICB9XG4gIFxuICBwcm90ZWN0ZWQgdGVzdEludmFsaWRTaWduYXR1cmVFcnJvcihlcnIpIHtcbiAgICBhc3NlcnQuZXF1YWwoXCJTaWduYXR1cmUgc2l6ZSBtaXNtYXRjaCB3aXRoIGFkZGl0aW9uYWwgdHggcHVia2V5c1wiLCBlcnIubWVzc2FnZSk7XG4gIH1cbiAgXG4gIHByb3RlY3RlZCB0ZXN0Tm9TdWJhZGRyZXNzRXJyb3IoZXJyKSB7XG4gICAgYXNzZXJ0LmVxdWFsKFwiQWRkcmVzcyBtdXN0IG5vdCBiZSBhIHN1YmFkZHJlc3NcIiwgZXJyLm1lc3NhZ2UpO1xuICB9XG4gIFxuICBwcm90ZWN0ZWQgdGVzdFNpZ25hdHVyZUhlYWRlckNoZWNrRXJyb3IoZXJyKSB7XG4gICAgYXNzZXJ0LmVxdWFsKFwiU2lnbmF0dXJlIGhlYWRlciBjaGVjayBlcnJvclwiLCBlcnIubWVzc2FnZSk7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFBSSVZBVEUgU1RBVElDIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBcbmFzeW5jIGZ1bmN0aW9uIHRlc3RBY2NvdW50KGFjY291bnQpIHtcbiAgXG4gIC8vIHRlc3QgYWNjb3VudFxuICBhc3NlcnQoYWNjb3VudCk7XG4gIGFzc2VydChhY2NvdW50LmdldEluZGV4KCkgPj0gMCk7XG4gIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlQWRkcmVzcyhhY2NvdW50LmdldFByaW1hcnlBZGRyZXNzKCksIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpO1xuICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGFjY291bnQuZ2V0QmFsYW5jZSgpKTtcbiAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChhY2NvdW50LmdldFVubG9ja2VkQmFsYW5jZSgpKTtcbiAgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVBZGRyZXNzKGFjY291bnQuZ2V0UHJpbWFyeUFkZHJlc3MoKSwgVGVzdFV0aWxzLk5FVFdPUktfVFlQRSk7XG4gIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQoYWNjb3VudC5nZXRCYWxhbmNlKCkpO1xuICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGFjY291bnQuZ2V0VW5sb2NrZWRCYWxhbmNlKCkpO1xuICBcbiAgLy8gaWYgZ2l2ZW4sIHRlc3Qgc3ViYWRkcmVzc2VzIGFuZCB0aGF0IHRoZWlyIGJhbGFuY2VzIGFkZCB1cCB0byBhY2NvdW50IGJhbGFuY2VzXG4gIGlmIChhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpKSB7XG4gICAgbGV0IGJhbGFuY2UgPSBCaWdJbnQoMCk7XG4gICAgbGV0IHVubG9ja2VkQmFsYW5jZSA9IEJpZ0ludCgwKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFjY291bnQuZ2V0U3ViYWRkcmVzc2VzKCkubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRlc3RTdWJhZGRyZXNzKGFjY291bnQuZ2V0U3ViYWRkcmVzc2VzKClbaV0pO1xuICAgICAgYXNzZXJ0LmVxdWFsKGFjY291bnQuZ2V0U3ViYWRkcmVzc2VzKClbaV0uZ2V0QWNjb3VudEluZGV4KCksIGFjY291bnQuZ2V0SW5kZXgoKSk7XG4gICAgICBhc3NlcnQuZXF1YWwoYWNjb3VudC5nZXRTdWJhZGRyZXNzZXMoKVtpXS5nZXRJbmRleCgpLCBpKTtcbiAgICAgIGJhbGFuY2UgPSBiYWxhbmNlICsgKGFjY291bnQuZ2V0U3ViYWRkcmVzc2VzKClbaV0uZ2V0QmFsYW5jZSgpKTtcbiAgICAgIHVubG9ja2VkQmFsYW5jZSA9IHVubG9ja2VkQmFsYW5jZSArIChhY2NvdW50LmdldFN1YmFkZHJlc3NlcygpW2ldLmdldFVubG9ja2VkQmFsYW5jZSgpKTtcbiAgICB9XG4gICAgYXNzZXJ0LmVxdWFsKGFjY291bnQuZ2V0QmFsYW5jZSgpLCBiYWxhbmNlLCBcIlN1YmFkZHJlc3MgYmFsYW5jZXMgXCIgKyBiYWxhbmNlLnRvU3RyaW5nKCkgKyBcIiAhPSBhY2NvdW50IFwiICsgYWNjb3VudC5nZXRJbmRleCgpICsgXCIgYmFsYW5jZSBcIiArIGFjY291bnQuZ2V0QmFsYW5jZSgpLnRvU3RyaW5nKCkpO1xuICAgIGFzc2VydC5lcXVhbChhY2NvdW50LmdldFVubG9ja2VkQmFsYW5jZSgpLCB1bmxvY2tlZEJhbGFuY2UsIFwiU3ViYWRkcmVzcyB1bmxvY2tlZCBiYWxhbmNlcyBcIiArIHVubG9ja2VkQmFsYW5jZS50b1N0cmluZygpICsgXCIgIT0gYWNjb3VudCBcIiArIGFjY291bnQuZ2V0SW5kZXgoKSArIFwiIHVubG9ja2VkIGJhbGFuY2UgXCIgKyBhY2NvdW50LmdldFVubG9ja2VkQmFsYW5jZSgpLnRvU3RyaW5nKCkpO1xuICB9XG4gIFxuICAvLyB0YWcgbXVzdCBiZSB1bmRlZmluZWQgb3Igbm9uLWVtcHR5XG4gIGxldCB0YWcgPSBhY2NvdW50LmdldFRhZygpO1xuICBhc3NlcnQodGFnID09PSB1bmRlZmluZWQgfHwgdGFnLmxlbmd0aCA+IDApO1xufVxuXG5mdW5jdGlvbiB0ZXN0U3ViYWRkcmVzcyhzdWJhZGRyZXNzKSB7XG4gIGFzc2VydChzdWJhZGRyZXNzLmdldEFjY291bnRJbmRleCgpID49IDApO1xuICBhc3NlcnQoc3ViYWRkcmVzcy5nZXRJbmRleCgpID49IDApO1xuICBhc3NlcnQoc3ViYWRkcmVzcy5nZXRBZGRyZXNzKCkpO1xuICBhc3NlcnQoc3ViYWRkcmVzcy5nZXRMYWJlbCgpID09PSB1bmRlZmluZWQgfHwgdHlwZW9mIHN1YmFkZHJlc3MuZ2V0TGFiZWwoKSA9PT0gXCJzdHJpbmdcIik7XG4gIGlmICh0eXBlb2Ygc3ViYWRkcmVzcy5nZXRMYWJlbCgpID09PSBcInN0cmluZ1wiKSBhc3NlcnQoc3ViYWRkcmVzcy5nZXRMYWJlbCgpLmxlbmd0aCA+IDApO1xuICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KHN1YmFkZHJlc3MuZ2V0QmFsYW5jZSgpKTtcbiAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChzdWJhZGRyZXNzLmdldFVubG9ja2VkQmFsYW5jZSgpKTtcbiAgYXNzZXJ0KHN1YmFkZHJlc3MuZ2V0TnVtVW5zcGVudE91dHB1dHMoKSA+PSAwKTtcbiAgYXNzZXJ0KHR5cGVvZiBzdWJhZGRyZXNzLmdldElzVXNlZCgpID09PSBcImJvb2xlYW5cIik7XG4gIGlmIChzdWJhZGRyZXNzLmdldEJhbGFuY2UoKSA+IDBuKSBhc3NlcnQoc3ViYWRkcmVzcy5nZXRJc1VzZWQoKSk7XG4gIGFzc2VydChzdWJhZGRyZXNzLmdldE51bUJsb2Nrc1RvVW5sb2NrKCkgPj0gMCk7XG59XG5cbi8qKlxuICogR2V0cyByYW5kb20gdHJhbnNhY3Rpb25zLlxuICogXG4gKiBAcGFyYW0gd2FsbGV0IGlzIHRoZSB3YWxsZXQgdG8gcXVlcnkgZm9yIHRyYW5zYWN0aW9uc1xuICogQHBhcmFtIHF1ZXJ5IGNvbmZpZ3VyZXMgdGhlIHRyYW5zYWN0aW9ucyB0byByZXRyaWV2ZVxuICogQHBhcmFtIG1pblR4cyBzcGVjaWZpZXMgdGhlIG1pbmltdW0gbnVtYmVyIG9mIHRyYW5zYWN0aW9ucyAodW5kZWZpbmVkIGZvciBubyBtaW5pbXVtKVxuICogQHBhcmFtIG1heFR4cyBzcGVjaWZpZXMgdGhlIG1heGltdW0gbnVtYmVyIG9mIHRyYW5zYWN0aW9ucyAodW5kZWZpbmVkIGZvciBhbGwgZmlsdGVyZWQgdHJhbnNhY3Rpb25zKVxuICogQHJldHVybiB7TW9uZXJvVHhXYWxsZXRbXX0gYXJlIHRoZSByYW5kb20gdHJhbnNhY3Rpb25zXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGdldFJhbmRvbVRyYW5zYWN0aW9ucyh3YWxsZXQsIHF1ZXJ5LCBtaW5UeHMsIG1heFR4cykge1xuICBsZXQgdHhzID0gYXdhaXQgd2FsbGV0LmdldFR4cyhxdWVyeSk7XG4gIGlmIChtaW5UeHMgIT09IHVuZGVmaW5lZCkgYXNzZXJ0KHR4cy5sZW5ndGggPj0gbWluVHhzLCB0eHMubGVuZ3RoICsgXCIvXCIgKyBtaW5UeHMgKyBcIiB0cmFuc2FjdGlvbnMgZm91bmQgd2l0aCBxdWVyeTogXCIgKyBKU09OLnN0cmluZ2lmeShxdWVyeSkpO1xuICBHZW5VdGlscy5zaHVmZmxlKHR4cyk7XG4gIGlmIChtYXhUeHMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHR4cztcbiAgZWxzZSByZXR1cm4gdHhzLnNsaWNlKDAsIE1hdGgubWluKG1heFR4cywgdHhzLmxlbmd0aCkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiB0ZXN0VHJhbnNmZXIodHJhbnNmZXIsIGN0eD8pIHtcbiAgaWYgKGN0eCA9PT0gdW5kZWZpbmVkKSBjdHggPSB7fTtcbiAgYXNzZXJ0KHRyYW5zZmVyIGluc3RhbmNlb2YgTW9uZXJvVHJhbnNmZXIpO1xuICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KHRyYW5zZmVyLmdldEFtb3VudCgpKTtcbiAgaWYgKCFjdHguaXNTd2VlcE91dHB1dFJlc3BvbnNlKSBhc3NlcnQodHJhbnNmZXIuZ2V0QWNjb3VudEluZGV4KCkgPj0gMCk7XG4gIGlmICh0cmFuc2Zlci5nZXRJc0luY29taW5nKCkpIHRlc3RJbmNvbWluZ1RyYW5zZmVyKHRyYW5zZmVyKTtcbiAgZWxzZSBhd2FpdCB0ZXN0T3V0Z29pbmdUcmFuc2Zlcih0cmFuc2ZlciwgY3R4KTtcbiAgXG4gIC8vIHRyYW5zZmVyIGFuZCB0eCByZWZlcmVuY2UgZWFjaCBvdGhlclxuICBhc3NlcnQodHJhbnNmZXIuZ2V0VHgoKSk7XG4gIGlmICh0cmFuc2ZlciAhPT0gdHJhbnNmZXIuZ2V0VHgoKS5nZXRPdXRnb2luZ1RyYW5zZmVyKCkpIHtcbiAgICBhc3NlcnQodHJhbnNmZXIuZ2V0VHgoKS5nZXRJbmNvbWluZ1RyYW5zZmVycygpKTtcbiAgICBhc3NlcnQodHJhbnNmZXIuZ2V0VHgoKS5nZXRJbmNvbWluZ1RyYW5zZmVycygpLmluY2x1ZGVzKHRyYW5zZmVyIGFzIE1vbmVyb0luY29taW5nVHJhbnNmZXIpLCBcIlRyYW5zYWN0aW9uIGRvZXMgbm90IHJlZmVyZW5jZSBnaXZlbiB0cmFuc2ZlclwiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0ZXN0SW5jb21pbmdUcmFuc2Zlcih0cmFuc2Zlcikge1xuICBhc3NlcnQodHJhbnNmZXIuZ2V0SXNJbmNvbWluZygpKTtcbiAgYXNzZXJ0KCF0cmFuc2Zlci5nZXRJc091dGdvaW5nKCkpO1xuICBhc3NlcnQodHJhbnNmZXIuZ2V0QWRkcmVzcygpKTtcbiAgYXNzZXJ0KHRyYW5zZmVyLmdldFN1YmFkZHJlc3NJbmRleCgpID49IDApO1xuICBhc3NlcnQodHJhbnNmZXIuZ2V0TnVtU3VnZ2VzdGVkQ29uZmlybWF0aW9ucygpID4gMCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHRlc3RPdXRnb2luZ1RyYW5zZmVyKHRyYW5zZmVyLCBjdHgpIHtcbiAgYXNzZXJ0KCF0cmFuc2Zlci5nZXRJc0luY29taW5nKCkpO1xuICBhc3NlcnQodHJhbnNmZXIuZ2V0SXNPdXRnb2luZygpKTtcbiAgaWYgKCFjdHguaXNTZW5kUmVzcG9uc2UpIGFzc2VydCh0cmFuc2Zlci5nZXRTdWJhZGRyZXNzSW5kaWNlcygpKTtcbiAgaWYgKHRyYW5zZmVyLmdldFN1YmFkZHJlc3NJbmRpY2VzKCkpIHtcbiAgICBhc3NlcnQodHJhbnNmZXIuZ2V0U3ViYWRkcmVzc0luZGljZXMoKS5sZW5ndGggPj0gMSk7XG4gICAgZm9yIChsZXQgc3ViYWRkcmVzc0lkeCBvZiB0cmFuc2Zlci5nZXRTdWJhZGRyZXNzSW5kaWNlcygpKSBhc3NlcnQoc3ViYWRkcmVzc0lkeCA+PSAwKTtcbiAgfVxuICBpZiAodHJhbnNmZXIuZ2V0QWRkcmVzc2VzKCkpIHtcbiAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXIuZ2V0QWRkcmVzc2VzKCkubGVuZ3RoLCB0cmFuc2Zlci5nZXRTdWJhZGRyZXNzSW5kaWNlcygpLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgYWRkcmVzcyBvZiB0cmFuc2Zlci5nZXRBZGRyZXNzZXMoKSkgYXNzZXJ0KGFkZHJlc3MpO1xuICB9XG4gIFxuICAvLyB0ZXN0IGRlc3RpbmF0aW9ucyBzdW0gdG8gb3V0Z29pbmcgYW1vdW50XG4gIGlmICh0cmFuc2Zlci5nZXREZXN0aW5hdGlvbnMoKSkge1xuICAgIGFzc2VydCh0cmFuc2Zlci5nZXREZXN0aW5hdGlvbnMoKS5sZW5ndGggPiAwKTtcbiAgICBsZXQgc3VtID0gQmlnSW50KDApO1xuICAgIGZvciAobGV0IGRlc3RpbmF0aW9uIG9mIHRyYW5zZmVyLmdldERlc3RpbmF0aW9ucygpKSB7XG4gICAgICBhd2FpdCB0ZXN0RGVzdGluYXRpb24oZGVzdGluYXRpb24pO1xuICAgICAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChkZXN0aW5hdGlvbi5nZXRBbW91bnQoKSwgdHJ1ZSk7XG4gICAgICBzdW0gKz0gZGVzdGluYXRpb24uZ2V0QW1vdW50KCk7XG4gICAgfVxuICAgIGlmICh0cmFuc2Zlci5nZXRBbW91bnQoKSAhPT0gc3VtKSBjb25zb2xlLmxvZyh0cmFuc2Zlci5nZXRUeCgpLmdldFR4U2V0KCkgPT09IHVuZGVmaW5lZCA/IHRyYW5zZmVyLmdldFR4KCkudG9TdHJpbmcoKSA6IHRyYW5zZmVyLmdldFR4KCkuZ2V0VHhTZXQoKS50b1N0cmluZygpKTtcbiAgICBhc3NlcnQuZXF1YWwoc3VtLnRvU3RyaW5nKCksIHRyYW5zZmVyLmdldEFtb3VudCgpLnRvU3RyaW5nKCkpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHRlc3REZXN0aW5hdGlvbihkZXN0aW5hdGlvbikge1xuICBhd2FpdCBNb25lcm9VdGlscy52YWxpZGF0ZUFkZHJlc3MoZGVzdGluYXRpb24uZ2V0QWRkcmVzcygpLCBUZXN0VXRpbHMuTkVUV09SS19UWVBFKTtcbiAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChkZXN0aW5hdGlvbi5nZXRBbW91bnQoKSwgdHJ1ZSk7XG59XG5cbmZ1bmN0aW9uIHRlc3RJbnB1dFdhbGxldChpbnB1dCkge1xuICBhc3NlcnQoaW5wdXQpO1xuICBhc3NlcnQoaW5wdXQuZ2V0S2V5SW1hZ2UoKSk7XG4gIGFzc2VydChpbnB1dC5nZXRLZXlJbWFnZSgpLmdldEhleCgpKTtcbiAgYXNzZXJ0KGlucHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkubGVuZ3RoID4gMCk7XG4gIGFzc2VydChpbnB1dC5nZXRBbW91bnQoKSA9PT0gdW5kZWZpbmVkKTsgLy8gbXVzdCBnZXQgaW5mbyBzZXBhcmF0ZWx5XG59XG5cbmZ1bmN0aW9uIHRlc3RPdXRwdXRXYWxsZXQob3V0cHV0KSB7XG4gIGFzc2VydChvdXRwdXQpO1xuICBhc3NlcnQob3V0cHV0IGluc3RhbmNlb2YgTW9uZXJvT3V0cHV0V2FsbGV0KTtcbiAgYXNzZXJ0KG91dHB1dC5nZXRBY2NvdW50SW5kZXgoKSA+PSAwKTtcbiAgYXNzZXJ0KG91dHB1dC5nZXRTdWJhZGRyZXNzSW5kZXgoKSA+PSAwKTtcbiAgYXNzZXJ0KG91dHB1dC5nZXRJbmRleCgpID49IDApO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIG91dHB1dC5nZXRJc1NwZW50KCksIFwiYm9vbGVhblwiKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBvdXRwdXQuZ2V0SXNMb2NrZWQoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIG91dHB1dC5nZXRJc0Zyb3plbigpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydChvdXRwdXQuZ2V0S2V5SW1hZ2UoKSk7XG4gIGFzc2VydChvdXRwdXQuZ2V0S2V5SW1hZ2UoKSBpbnN0YW5jZW9mIE1vbmVyb0tleUltYWdlKTtcbiAgYXNzZXJ0KG91dHB1dC5nZXRLZXlJbWFnZSgpLmdldEhleCgpKTtcbiAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChvdXRwdXQuZ2V0QW1vdW50KCksIHRydWUpO1xuICBcbiAgLy8gb3V0cHV0IGhhcyBjaXJjdWxhciByZWZlcmVuY2UgdG8gaXRzIHRyYW5zYWN0aW9uIHdoaWNoIGhhcyBzb21lIGluaXRpYWxpemVkIGZpZWxkc1xuICBsZXQgdHggPSBvdXRwdXQuZ2V0VHgoKTtcbiAgYXNzZXJ0KHR4KTtcbiAgYXNzZXJ0KHR4IGluc3RhbmNlb2YgTW9uZXJvVHhXYWxsZXQpO1xuICBhc3NlcnQodHguZ2V0T3V0cHV0cygpLmluY2x1ZGVzKG91dHB1dCkpO1xuICBhc3NlcnQodHguZ2V0SGFzaCgpKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiB0eC5nZXRJc0xvY2tlZCgpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydC5lcXVhbCh0eC5nZXRJc0NvbmZpcm1lZCgpLCB0cnVlKTsgIC8vIFRPRE8gbW9uZXJvLXdhbGxldC1ycGM6IHBvc3NpYmxlIHRvIGdldCB1bmNvbmZpcm1lZCBvdXRwdXRzP1xuICBhc3NlcnQuZXF1YWwodHguZ2V0SXNSZWxheWVkKCksIHRydWUpO1xuICBhc3NlcnQuZXF1YWwodHguZ2V0SXNGYWlsZWQoKSwgZmFsc2UpO1xuICBhc3NlcnQodHguZ2V0SGVpZ2h0KCkgPiAwKTtcbiAgXG4gIC8vIHRlc3QgY29weWluZ1xuICBsZXQgY29weSA9IG91dHB1dC5jb3B5KCk7XG4gIGFzc2VydChjb3B5ICE9PSBvdXRwdXQpO1xuICBhc3NlcnQuZXF1YWwoY29weS50b1N0cmluZygpLCBvdXRwdXQudG9TdHJpbmcoKSk7XG4gIGFzc2VydC5lcXVhbChjb3B5LmdldFR4KCksIHVuZGVmaW5lZCk7ICAvLyBUT0RPOiBzaG91bGQgb3V0cHV0IGNvcHkgZG8gZGVlcCBjb3B5IG9mIHR4IHNvIG1vZGVscyBhcmUgZ3JhcGggaW5zdGVhZCBvZiB0cmVlPyAgV291bGQgbmVlZCB0byB3b3JrIG91dCBjaXJjdWxhciByZWZlcmVuY2VzXG59XG5cbmZ1bmN0aW9uIHRlc3RDb21tb25UeFNldHModHhzLCBoYXNTaWduZWQsIGhhc1Vuc2lnbmVkLCBoYXNNdWx0aXNpZykge1xuICBhc3NlcnQodHhzLmxlbmd0aCA+IDApO1xuICBcbiAgLy8gYXNzZXJ0IHRoYXQgYWxsIHNldHMgYXJlIHNhbWUgcmVmZXJlbmNlXG4gIGxldCBzZXQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgYXNzZXJ0KHR4c1tpXSBpbnN0YW5jZW9mIE1vbmVyb1R4KTtcbiAgICBpZiAoaSA9PT0gMCkgc2V0ID0gdHhzW2ldLmdldFR4U2V0KCk7XG4gICAgZWxzZSBhc3NlcnQodHhzW2ldLmdldFR4U2V0KCkgPT09IHNldCk7XG4gIH1cbiAgXG4gIC8vIHRlc3QgZXhwZWN0ZWQgc2V0XG4gIGFzc2VydChzZXQpO1xuICBpZiAoaGFzU2lnbmVkKSB7XG4gICAgYXNzZXJ0KHNldC5nZXRTaWduZWRUeFNldCgpKTtcbiAgICBhc3NlcnQoc2V0LmdldFNpZ25lZFR4U2V0KCkubGVuZ3RoID4gMCk7XG4gIH1cbiAgaWYgKGhhc1Vuc2lnbmVkKSB7XG4gICAgYXNzZXJ0KHNldC5nZXRVbnNpZ25lZFR4U2V0KCkpO1xuICAgIGFzc2VydChzZXQuZ2V0VW5zaWduZWRUeFNldCgpLmxlbmd0aCA+IDApO1xuICB9XG4gIGlmIChoYXNNdWx0aXNpZykge1xuICAgIGFzc2VydChzZXQuZ2V0TXVsdGlzaWdUeFNldCgpKTtcbiAgICBhc3NlcnQoc2V0LmdldE11bHRpc2lnVHhTZXQoKS5sZW5ndGggPiAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0ZXN0Q2hlY2tUeCh0eCwgY2hlY2s6IE1vbmVyb0NoZWNrVHgpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjaGVjay5nZXRJc0dvb2QoKSwgXCJib29sZWFuXCIpO1xuICBpZiAoY2hlY2suZ2V0SXNHb29kKCkpIHtcbiAgICBhc3NlcnQoY2hlY2suZ2V0TnVtQ29uZmlybWF0aW9ucygpID49IDApO1xuICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgY2hlY2suZ2V0SW5UeFBvb2woKSwgXCJib29sZWFuXCIpO1xuICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQoY2hlY2suZ2V0UmVjZWl2ZWRBbW91bnQoKSk7XG4gICAgaWYgKGNoZWNrLmdldEluVHhQb29sKCkpIGFzc2VydC5lcXVhbCgwLCBjaGVjay5nZXROdW1Db25maXJtYXRpb25zKCkpO1xuICAgIGVsc2UgYXNzZXJ0KGNoZWNrLmdldE51bUNvbmZpcm1hdGlvbnMoKSA+IDApOyAvLyBUT0RPIChtb25lcm8td2FsbC1ycGMpIHRoaXMgZmFpbHMgKGNvbmZpcm1hdGlvbnMgaXMgMCkgZm9yIChhdCBsZWFzdCBvbmUpIHRyYW5zYWN0aW9uIHRoYXQgaGFzIDEgY29uZmlybWF0aW9uIG9uIHRlc3RDaGVja1R4S2V5KClcbiAgfSBlbHNlIHtcbiAgICBhc3NlcnQuZXF1YWwoY2hlY2suZ2V0TnVtQ29uZmlybWF0aW9ucygpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRJblR4UG9vbCgpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbChjaGVjay5nZXRSZWNlaXZlZEFtb3VudCgpLCB1bmRlZmluZWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRlc3RDaGVja1Jlc2VydmUoY2hlY2s6IE1vbmVyb0NoZWNrUmVzZXJ2ZSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGNoZWNrLmdldElzR29vZCgpLCBcImJvb2xlYW5cIik7XG4gIGlmIChjaGVjay5nZXRJc0dvb2QoKSkge1xuICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQoY2hlY2suZ2V0VG90YWxBbW91bnQoKSk7XG4gICAgYXNzZXJ0KGNoZWNrLmdldFRvdGFsQW1vdW50KCkgPj0gMG4pO1xuICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQoY2hlY2suZ2V0VW5jb25maXJtZWRTcGVudEFtb3VudCgpKTtcbiAgICBhc3NlcnQoY2hlY2suZ2V0VW5jb25maXJtZWRTcGVudEFtb3VudCgpID49IDBuKTtcbiAgfSBlbHNlIHtcbiAgICBhc3NlcnQuZXF1YWwoY2hlY2suZ2V0VG90YWxBbW91bnQoKSwgdW5kZWZpbmVkKTtcbiAgICBhc3NlcnQuZXF1YWwoY2hlY2suZ2V0VW5jb25maXJtZWRTcGVudEFtb3VudCgpLCB1bmRlZmluZWQpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHRlc3REZXNjcmliZWRUeFNldChkZXNjcmliZWRUeFNldCkge1xuICBhc3NlcnQubm90RXF1YWwoZGVzY3JpYmVkVHhTZXQsIHVuZGVmaW5lZCk7XG4gIGFzc2VydChkZXNjcmliZWRUeFNldC5nZXRUeHMoKS5sZW5ndGggPiAwKTtcbiAgYXNzZXJ0LmVxdWFsKGRlc2NyaWJlZFR4U2V0LmdldFNpZ25lZFR4SGV4KCksIHVuZGVmaW5lZCk7XG4gIGFzc2VydC5lcXVhbChkZXNjcmliZWRUeFNldC5nZXRVbnNpZ25lZFR4SGV4KCksIHVuZGVmaW5lZCk7XG4gIFxuICAvLyB0ZXN0IGVhY2ggdHJhbnNhY3Rpb24gICAgICAgIFxuICAvLyBUT0RPOiB1c2UgY29tbW9uIHR4IHdhbGxldCB0ZXN0P1xuICBhc3NlcnQuZXF1YWwoZGVzY3JpYmVkVHhTZXQuZ2V0TXVsdGlzaWdUeEhleCgpLCB1bmRlZmluZWQpO1xuICBmb3IgKGxldCBkZXNjcmliZWRUeCBvZiBkZXNjcmliZWRUeFNldC5nZXRUeHMoKSkge1xuICAgIGFzc2VydChkZXNjcmliZWRUeC5nZXRUeFNldCgpID09PSBkZXNjcmliZWRUeFNldCk7XG4gICAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChkZXNjcmliZWRUeC5nZXRJbnB1dFN1bSgpLCB0cnVlKTtcbiAgICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGRlc2NyaWJlZFR4LmdldE91dHB1dFN1bSgpLCB0cnVlKTtcbiAgICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGRlc2NyaWJlZFR4LmdldEZlZSgpKTtcbiAgICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGRlc2NyaWJlZFR4LmdldENoYW5nZUFtb3VudCgpKTtcbiAgICBpZiAoZGVzY3JpYmVkVHguZ2V0Q2hhbmdlQW1vdW50KCkgPT09IDBuKSBhc3NlcnQuZXF1YWwoZGVzY3JpYmVkVHguZ2V0Q2hhbmdlQWRkcmVzcygpLCB1bmRlZmluZWQpO1xuICAgIGVsc2UgYXdhaXQgTW9uZXJvVXRpbHMudmFsaWRhdGVBZGRyZXNzKGRlc2NyaWJlZFR4LmdldENoYW5nZUFkZHJlc3MoKSwgVGVzdFV0aWxzLk5FVFdPUktfVFlQRSk7XG4gICAgYXNzZXJ0KGRlc2NyaWJlZFR4LmdldFJpbmdTaXplKCkgPiAxKTtcbiAgICBhc3NlcnQgKGRlc2NyaWJlZFR4LmdldFVubG9ja1RpbWUoKSA+PSAwbik7XG4gICAgYXNzZXJ0KGRlc2NyaWJlZFR4LmdldE51bUR1bW15T3V0cHV0cygpID49IDApO1xuICAgIGFzc2VydChkZXNjcmliZWRUeC5nZXRFeHRyYUhleCgpKTtcbiAgICBhc3NlcnQoZGVzY3JpYmVkVHguZ2V0UGF5bWVudElkKCkgPT09IHVuZGVmaW5lZCB8fCBkZXNjcmliZWRUeC5nZXRQYXltZW50SWQoKS5sZW5ndGggPiAwKTtcbiAgICBhc3NlcnQoZGVzY3JpYmVkVHguZ2V0SXNPdXRnb2luZygpKTtcbiAgICBhc3NlcnQubm90RXF1YWwoZGVzY3JpYmVkVHguZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5ub3RFcXVhbChkZXNjcmliZWRUeC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0RGVzdGluYXRpb25zKCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0KGRlc2NyaWJlZFR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKS5sZW5ndGggPiAwKTtcbiAgICBhc3NlcnQuZXF1YWwoZGVzY3JpYmVkVHguZ2V0SXNJbmNvbWluZygpLCB1bmRlZmluZWQpO1xuICAgIGZvciAobGV0IGRlc3RpbmF0aW9uIG9mIGRlc2NyaWJlZFR4LmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKSkge1xuICAgICAgYXdhaXQgdGVzdERlc3RpbmF0aW9uKGRlc3RpbmF0aW9uKTtcbiAgICB9XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gdGVzdEFkZHJlc3NCb29rRW50cnkoZW50cnkpIHtcbiAgYXNzZXJ0KGVudHJ5LmdldEluZGV4KCkgPj0gMCk7XG4gIGF3YWl0IE1vbmVyb1V0aWxzLnZhbGlkYXRlQWRkcmVzcyhlbnRyeS5nZXRBZGRyZXNzKCksIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGVudHJ5LmdldERlc2NyaXB0aW9uKCksIFwic3RyaW5nXCIpO1xufVxuXG4vKipcbiAqIFRlc3RzIHRoZSBpbnRlZ3JpdHkgb2YgdGhlIGZ1bGwgc3RydWN0dXJlIGluIHRoZSBnaXZlbiB0eHMgZnJvbSB0aGUgYmxvY2sgZG93blxuICogdG8gdHJhbnNmZXJzIC8gZGVzdGluYXRpb25zLlxuICovXG5mdW5jdGlvbiB0ZXN0R2V0VHhzU3RydWN0dXJlKHR4czogTW9uZXJvVHhXYWxsZXRbXSwgcXVlcnk/KSB7XG4gIFxuICAvLyBub3JtYWxpemUgcXVlcnlcbiAgaWYgKHF1ZXJ5ID09PSB1bmRlZmluZWQpIHF1ZXJ5ID0gbmV3IE1vbmVyb1R4UXVlcnkoKTtcbiAgaWYgKCEocXVlcnkgaW5zdGFuY2VvZiBNb25lcm9UeFF1ZXJ5KSkgcXVlcnkgPSBuZXcgTW9uZXJvVHhRdWVyeShxdWVyeSk7XG4gIFxuICAvLyBjb2xsZWN0IHVuaXF1ZSBibG9ja3MgaW4gb3JkZXIgKHVzaW5nIHNldCBhbmQgbGlzdCBpbnN0ZWFkIG9mIFRyZWVTZXQgZm9yIGRpcmVjdCBwb3J0YWJpbGl0eSB0byBvdGhlciBsYW5ndWFnZXMpXG4gIGxldCBzZWVuQmxvY2tzID0gbmV3IFNldCgpO1xuICBsZXQgYmxvY2tzOiBNb25lcm9CbG9ja1tdID0gW107XG4gIGxldCB1bmNvbmZpcm1lZFR4czogTW9uZXJvVHhXYWxsZXRbXSA9IFtdO1xuICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICBpZiAodHguZ2V0QmxvY2soKSA9PT0gdW5kZWZpbmVkKSB1bmNvbmZpcm1lZFR4cy5wdXNoKHR4KTtcbiAgICBlbHNlIHtcbiAgICAgIGFzc2VydCh0eC5nZXRCbG9jaygpLmdldFR4cygpLmluY2x1ZGVzKHR4KSk7XG4gICAgICBpZiAoIXNlZW5CbG9ja3MuaGFzKHR4LmdldEJsb2NrKCkpKSB7XG4gICAgICAgIHNlZW5CbG9ja3MuYWRkKHR4LmdldEJsb2NrKCkpO1xuICAgICAgICBibG9ja3MucHVzaCh0eC5nZXRCbG9jaygpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIC8vIHR4IGhhc2hlcyBtdXN0IGJlIGluIG9yZGVyIGlmIHJlcXVlc3RlZFxuICBpZiAocXVlcnkuZ2V0SGFzaGVzKCkgIT09IHVuZGVmaW5lZCkge1xuICAgIGFzc2VydC5lcXVhbCh0eHMubGVuZ3RoLCBxdWVyeS5nZXRIYXNoZXMoKS5sZW5ndGgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcXVlcnkuZ2V0SGFzaGVzKCkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFzc2VydC5lcXVhbCh0eHNbaV0uZ2V0SGFzaCgpLCBxdWVyeS5nZXRIYXNoZXMoKVtpXSk7XG4gICAgfVxuICB9XG4gIFxuICAvLyB0ZXN0IHRoYXQgdHhzIGFuZCBibG9ja3MgcmVmZXJlbmNlIGVhY2ggb3RoZXIgYW5kIGJsb2NrcyBhcmUgaW4gYXNjZW5kaW5nIG9yZGVyIHVubGVzcyBzcGVjaWZpYyB0eCBoYXNoZXMgcmVxdWVzdGVkXG4gIGxldCBpbmRleCA9IDA7XG4gIGxldCBwcmV2QmxvY2tIZWlnaHQ6IG51bWJlciB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgZm9yIChsZXQgYmxvY2sgb2YgYmxvY2tzKSB7XG4gICAgaWYgKHByZXZCbG9ja0hlaWdodCA9PT0gdW5kZWZpbmVkKSBwcmV2QmxvY2tIZWlnaHQgPSBibG9jay5nZXRIZWlnaHQoKTtcbiAgICBlbHNlIGlmIChxdWVyeS5nZXRIYXNoZXMoKSA9PT0gdW5kZWZpbmVkKSBhc3NlcnQoYmxvY2suZ2V0SGVpZ2h0KCkgPiBwcmV2QmxvY2tIZWlnaHQsIFwiQmxvY2tzIGFyZSBub3QgaW4gb3JkZXIgb2YgaGVpZ2h0czogXCIgKyBwcmV2QmxvY2tIZWlnaHQgKyBcIiB2cyBcIiArIGJsb2NrLmdldEhlaWdodCgpKTtcbiAgICBmb3IgKGxldCB0eCBvZiBibG9jay5nZXRUeHMoKSkge1xuICAgICAgYXNzZXJ0KHR4LmdldEJsb2NrKCkgPT09IGJsb2NrKTtcbiAgICAgIGlmIChxdWVyeS5nZXRIYXNoZXMoKSA9PT0gdW5kZWZpbmVkKSB7IFxuICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SGFzaCgpLCB0eHNbaW5kZXhdLmdldEhhc2goKSk7IC8vIHZlcmlmeSB0eCBvcmRlciBpcyBzZWxmLWNvbnNpc3RlbnQgd2l0aCBibG9ja3MgdW5sZXNzIHR4cyBtYW51YWxseSByZS1vcmRlcmVkIGJ5IHJlcXVlc3RpbmcgYnkgaGFzaFxuICAgICAgICBhc3NlcnQodHggPT09IHR4c1tpbmRleF0pO1xuICAgICAgfVxuICAgICAgaW5kZXgrKztcbiAgICB9XG4gIH1cbiAgYXNzZXJ0LmVxdWFsKGluZGV4ICsgdW5jb25maXJtZWRUeHMubGVuZ3RoLCB0eHMubGVuZ3RoKTtcbiAgXG4gIC8vIHRlc3QgdGhhdCBpbmNvbWluZyB0cmFuc2ZlcnMgYXJlIGluIG9yZGVyIG9mIGFzY2VuZGluZyBhY2NvdW50cyBhbmQgc3ViYWRkcmVzc2VzXG4gIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgIGxldCBwcmV2QWNjb3VudElkeDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBwcmV2U3ViYWRkcmVzc0lkeDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmICh0eC5nZXRJbmNvbWluZ1RyYW5zZmVycygpID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHR4LmdldEluY29taW5nVHJhbnNmZXJzKCkpIHtcbiAgICAgIGlmIChwcmV2QWNjb3VudElkeCA9PT0gdW5kZWZpbmVkKSBwcmV2QWNjb3VudElkeCA9IHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpO1xuICAgICAgZWxzZSB7XG4gICAgICAgIGFzc2VydChwcmV2QWNjb3VudElkeCA8PSB0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKSk7XG4gICAgICAgIGlmIChwcmV2QWNjb3VudElkeCA8IHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpKSB7XG4gICAgICAgICAgcHJldlN1YmFkZHJlc3NJZHggPSB1bmRlZmluZWQ7XG4gICAgICAgICAgcHJldkFjY291bnRJZHggPSB0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJldlN1YmFkZHJlc3NJZHggPT09IHVuZGVmaW5lZCkgcHJldlN1YmFkZHJlc3NJZHggPSB0cmFuc2Zlci5nZXRTdWJhZGRyZXNzSW5kZXgoKTtcbiAgICAgICAgZWxzZSBhc3NlcnQocHJldlN1YmFkZHJlc3NJZHggPCB0cmFuc2Zlci5nZXRTdWJhZGRyZXNzSW5kZXgoKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvdW50TnVtSW5zdGFuY2VzKGluc3RhbmNlcykge1xuICBsZXQgY291bnRzID0gbmV3IE1hcCgpO1xuICBmb3IgKGxldCBpbnN0YW5jZSBvZiBpbnN0YW5jZXMpIHtcbiAgICBsZXQgY291bnQgPSBjb3VudHMuZ2V0KGluc3RhbmNlKTtcbiAgICBjb3VudHMuc2V0KGluc3RhbmNlLCBjb3VudCA9PT0gdW5kZWZpbmVkID8gMSA6IGNvdW50ICsgMSk7XG4gIH1cbiAgcmV0dXJuIGNvdW50cztcbn1cblxuZnVuY3Rpb24gZ2V0TW9kZXMoY291bnRzKSB7XG4gIGxldCBtb2RlcyA9IG5ldyBTZXQoKTtcbiAgbGV0IG1heENvdW50O1xuICBmb3IgKGxldCBrZXkgb2YgY291bnRzLmtleXMoKSkge1xuICAgIGxldCBjb3VudCA9IGNvdW50cy5nZXQoa2V5KTtcbiAgICBpZiAobWF4Q291bnQgPT09IHVuZGVmaW5lZCB8fCBjb3VudCA+IG1heENvdW50KSBtYXhDb3VudCA9IGNvdW50O1xuICB9XG4gIGZvciAobGV0IGtleSBvZiBjb3VudHMua2V5cygpKSB7XG4gICAgbGV0IGNvdW50ID0gY291bnRzLmdldChrZXkpO1xuICAgIGlmIChjb3VudCA9PT0gbWF4Q291bnQpIG1vZGVzLmFkZChrZXkpO1xuICB9XG4gIHJldHVybiBtb2Rlcztcbn1cblxuLyoqXG4gKiBJbnRlcm5hbCB0ZXN0ZXIgZm9yIG91dHB1dCBub3RpZmljYXRpb25zLlxuICovXG5jbGFzcyBSZWNlaXZlZE91dHB1dE5vdGlmaWNhdGlvblRlc3RlciBleHRlbmRzIE1vbmVyb1dhbGxldExpc3RlbmVyIHtcblxuICB0eEhhc2g6IHN0cmluZztcbiAgdGVzdENvbXBsZXRlOiBib29sZWFuO1xuICB1bmxvY2tlZFNlZW46IGJvb2xlYW47XG4gIGxhc3RPbk5ld0Jsb2NrSGVpZ2h0OiBudW1iZXI7XG4gIGxhc3RPbkJhbGFuY2VzQ2hhbmdlZEJhbGFuY2U6IEJpZ0ludDtcbiAgbGFzdE9uQmFsYW5jZXNDaGFuZ2VkVW5sb2NrZWRCYWxhbmNlOiBCaWdJbnQ7XG4gIGxhc3ROb3RpZmllZE91dHB1dDogTW9uZXJvT3V0cHV0V2FsbGV0O1xuXG4gIGNvbnN0cnVjdG9yKHR4SGFzaCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy50eEhhc2ggPSB0eEhhc2g7XG4gICAgdGhpcy50ZXN0Q29tcGxldGUgPSBmYWxzZTtcbiAgICB0aGlzLnVubG9ja2VkU2VlbiA9IGZhbHNlO1xuICB9XG4gIFxuICBhc3luYyBvbk5ld0Jsb2NrKGhlaWdodCkge1xuICAgIHRoaXMubGFzdE9uTmV3QmxvY2tIZWlnaHQgPSBoZWlnaHQ7XG4gIH1cbiAgXG4gIGFzeW5jIG9uQmFsYW5jZXNDaGFuZ2VkKG5ld0JhbGFuY2UsIG5ld1VubG9ja2VkQmFsYW5jZSkge1xuICAgIHRoaXMubGFzdE9uQmFsYW5jZXNDaGFuZ2VkQmFsYW5jZSA9IG5ld0JhbGFuY2U7XG4gICAgdGhpcy5sYXN0T25CYWxhbmNlc0NoYW5nZWRVbmxvY2tlZEJhbGFuY2UgPSBuZXdVbmxvY2tlZEJhbGFuY2U7XG4gIH1cbiAgXG4gIGFzeW5jIG9uT3V0cHV0UmVjZWl2ZWQob3V0cHV0KSB7XG4gICAgaWYgKG91dHB1dC5nZXRUeCgpLmdldEhhc2goKSA9PT0gdGhpcy50eEhhc2gpIHRoaXMubGFzdE5vdGlmaWVkT3V0cHV0ID0gb3V0cHV0O1xuICB9XG59XG5cbi8qKlxuICogV2FsbGV0IGxpc3RlbmVyIHRvIGNvbGxlY3Qgb3V0cHV0IG5vdGlmaWNhdGlvbnMuXG4gKi9cbmNsYXNzIFdhbGxldE5vdGlmaWNhdGlvbkNvbGxlY3RvciBleHRlbmRzIE1vbmVyb1dhbGxldExpc3RlbmVyIHtcblxuICBsaXN0ZW5pbmc6IGFueTtcbiAgYmxvY2tOb3RpZmljYXRpb25zOiBhbnk7XG4gIGJhbGFuY2VOb3RpZmljYXRpb25zOiBhbnk7XG4gIG91dHB1dHNSZWNlaXZlZDogYW55O1xuICBvdXRwdXRzU3BlbnQ6IGFueTtcbiAgbGFzdE5vdGlmaWNhdGlvbjogYW55O1xuICBcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmxpc3RlbmluZyA9IHRydWU7XG4gICAgdGhpcy5ibG9ja05vdGlmaWNhdGlvbnMgPSBbXTtcbiAgICB0aGlzLmJhbGFuY2VOb3RpZmljYXRpb25zID0gW107XG4gICAgdGhpcy5vdXRwdXRzUmVjZWl2ZWQgPSBbXTtcbiAgICB0aGlzLm91dHB1dHNTcGVudCA9IFtdO1xuICB9XG4gIFxuICBhc3luYyBvbk5ld0Jsb2NrKGhlaWdodCkge1xuICAgIGFzc2VydCh0aGlzLmxpc3RlbmluZyk7XG4gICAgaWYgKHRoaXMuYmxvY2tOb3RpZmljYXRpb25zLmxlbmd0aCA+IDApIGFzc2VydChoZWlnaHQgPT09IHRoaXMuYmxvY2tOb3RpZmljYXRpb25zW3RoaXMuYmxvY2tOb3RpZmljYXRpb25zLmxlbmd0aCAtIDFdICsgMSk7XG4gICAgdGhpcy5ibG9ja05vdGlmaWNhdGlvbnMucHVzaChoZWlnaHQpO1xuICB9XG4gIFxuICBhc3luYyBvbkJhbGFuY2VzQ2hhbmdlZChuZXdCYWxhbmNlLCBuZXdVbmxvY2tlZEJhbGFuY2UpIHtcbiAgICBhc3NlcnQodGhpcy5saXN0ZW5pbmcpO1xuICAgIGlmICh0aGlzLmJhbGFuY2VOb3RpZmljYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMubGFzdE5vdGlmaWNhdGlvbiA9IHRoaXMuYmFsYW5jZU5vdGlmaWNhdGlvbnNbdGhpcy5iYWxhbmNlTm90aWZpY2F0aW9ucy5sZW5ndGggLSAxXTtcbiAgICAgIGFzc2VydChuZXdCYWxhbmNlLnRvU3RyaW5nKCkgIT09IHRoaXMubGFzdE5vdGlmaWNhdGlvbi5iYWxhbmNlLnRvU3RyaW5nKCkgfHwgbmV3VW5sb2NrZWRCYWxhbmNlLnRvU3RyaW5nKCkgIT09IHRoaXMubGFzdE5vdGlmaWNhdGlvbi51bmxvY2tlZEJhbGFuY2UudG9TdHJpbmcoKSk7XG4gICAgfVxuICAgIHRoaXMuYmFsYW5jZU5vdGlmaWNhdGlvbnMucHVzaCh7YmFsYW5jZTogbmV3QmFsYW5jZSwgdW5sb2NrZWRCYWxhbmNlOiBuZXdVbmxvY2tlZEJhbGFuY2V9KTtcbiAgfVxuICBcbiAgYXN5bmMgb25PdXRwdXRSZWNlaXZlZChvdXRwdXQpIHtcbiAgICBhc3NlcnQodGhpcy5saXN0ZW5pbmcpO1xuICAgIHRoaXMub3V0cHV0c1JlY2VpdmVkLnB1c2gob3V0cHV0KTtcbiAgfVxuICBcbiAgYXN5bmMgb25PdXRwdXRTcGVudChvdXRwdXQpIHtcbiAgICBhc3NlcnQodGhpcy5saXN0ZW5pbmcpO1xuICAgIHRoaXMub3V0cHV0c1NwZW50LnB1c2gob3V0cHV0KTtcbiAgfVxuICBcbiAgZ2V0QmxvY2tOb3RpZmljYXRpb25zKCkge1xuICAgIHJldHVybiB0aGlzLmJsb2NrTm90aWZpY2F0aW9ucztcbiAgfVxuICBcbiAgZ2V0QmFsYW5jZU5vdGlmaWNhdGlvbnMoKSB7XG4gICAgcmV0dXJuIHRoaXMuYmFsYW5jZU5vdGlmaWNhdGlvbnM7XG4gIH1cbiAgXG4gIGdldE91dHB1dHNSZWNlaXZlZChxdWVyeT8pIHtcbiAgICByZXR1cm4gRmlsdGVyLmFwcGx5KHF1ZXJ5LCB0aGlzLm91dHB1dHNSZWNlaXZlZCk7XG4gIH1cbiAgXG4gIGdldE91dHB1dHNTcGVudChxdWVyeT8pIHtcbiAgICByZXR1cm4gRmlsdGVyLmFwcGx5KHF1ZXJ5LCB0aGlzLm91dHB1dHNTcGVudCk7XG4gIH1cbiAgXG4gIHNldExpc3RlbmluZyhsaXN0ZW5pbmcpIHtcbiAgICB0aGlzLmxpc3Rl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