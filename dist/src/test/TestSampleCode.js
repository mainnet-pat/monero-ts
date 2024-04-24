"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _assert = _interopRequireDefault(require("assert"));
var _TestUtils = _interopRequireDefault(require("./utils/TestUtils"));
var moneroTs = _interopRequireWildcard(require("../../index"));function _getRequireWildcardCache(nodeInterop) {if (typeof WeakMap !== "function") return null;var cacheBabelInterop = new WeakMap();var cacheNodeInterop = new WeakMap();return (_getRequireWildcardCache = function (nodeInterop) {return nodeInterop ? cacheNodeInterop : cacheBabelInterop;})(nodeInterop);}function _interopRequireWildcard(obj, nodeInterop) {if (!nodeInterop && obj && obj.__esModule) {return obj;}if (obj === null || typeof obj !== "object" && typeof obj !== "function") {return { default: obj };}var cache = _getRequireWildcardCache(nodeInterop);if (cache && cache.has(obj)) {return cache.get(obj);}var newObj = {};var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;for (var key in obj) {if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;if (desc && (desc.get || desc.set)) {Object.defineProperty(newObj, key, desc);} else {newObj[key] = obj[key];}}}newObj.default = obj;if (cache) {cache.set(obj, newObj);}return newObj;}

/**
 * Test the sample code in README.md.
 */
class TestSampleCode {

  runTests() {
    describe("Test sample code", function () {
      let that = this; // Unnecessary? That is never used in the following code
      let wallet;

      // initialize wallet
      before(async function () {
        try {

          // all wallets need to wait for txs to confirm to reliably sync
          _TestUtils.default.WALLET_TX_TRACKER.reset();

          // create rpc test wallet
          let walletRpc = await _TestUtils.default.getWalletRpc();
          await walletRpc.close();
          // create directory for test wallets if it doesn't exist
          let fs = await _TestUtils.default.getDefaultFs();
          if (!fs.existsSync(_TestUtils.default.TEST_WALLETS_DIR)) {
            if (!fs.existsSync(process.cwd())) fs.mkdirSync(process.cwd(), { recursive: true }); // create current process directory for relative paths which does not exist in memory fs
            fs.mkdirSync(_TestUtils.default.TEST_WALLETS_DIR);
          }
          // create full test wallet
          wallet = await _TestUtils.default.getWalletFull();

        } catch (e) {
          console.error("Error before tests: ");
          console.error(e);
          throw e;
        }
      });
      after(async function () {
        if (wallet) await wallet.close(true);
      });

      it("Sample code demonstration", async function () {

        // import monero-ts (or import as needed)
        // import moneroTs from "monero-ts"; // *** UNCOMMENT IN README ***

        // connect to daemon
        let daemon = await moneroTs.connectToDaemonRpc("http://localhost:28081");
        let height = await daemon.getHeight(); // 1523651
        let txsInPool = await daemon.getTxPool(); // get transactions in the pool

        // create wallet from mnemonic phrase using WebAssembly bindings to monero-project
        let walletFull = await moneroTs.createWalletFull({
          path: "./test_wallets/" + moneroTs.GenUtils.getUUID(), // *** CHANGE README TO "sample_wallet_full"
          fs: await _TestUtils.default.getDefaultFs(), // *** REMOVE FROM README SAMPLE ***
          password: "supersecretpassword123",
          networkType: moneroTs.MoneroNetworkType.TESTNET,
          seed: _TestUtils.default.SEED, // *** REPLACE README WITH SEED ***
          restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT, // *** REPLACE README WITH FIRST RECEIVE HEIGHT ***
          server: { // provide url or MoneroRpcConnection
            uri: "http://localhost:28081",
            username: "superuser",
            password: "abctesting123"
          }
        });

        // synchronize with progress notifications
        await walletFull.sync(new class extends moneroTs.MoneroWalletListener {
          async onSyncProgress(height, startHeight, endHeight, percentDone, message) {

            // feed a progress bar?
          }}());

        // synchronize in the background every 5 seconds
        await walletFull.startSyncing(5000);

        // receive notifications when funds are received, confirmed, and unlocked
        let fundsReceived = false;
        await walletFull.addListener(new class extends moneroTs.MoneroWalletListener {
          async onOutputReceived(output) {
            let amount = output.getAmount();
            let txHash = output.getTx().getHash();
            let isConfirmed = output.getTx().getIsConfirmed();
            let isLocked = output.getTx().getIsLocked();
            fundsReceived = true;
          }
        }());

        // connect to wallet RPC and open wallet
        let walletRpc = await moneroTs.connectToWalletRpc("http://localhost:28084", "rpc_user", "abc123");
        await walletRpc.openWallet("test_wallet_1", "supersecretpassword123"); // *** CHANGE README TO "sample_wallet_rpc" ***
        let primaryAddress = await walletRpc.getPrimaryAddress(); // 555zgduFhmKd2o8rPUz...
        let balance = await walletRpc.getBalance(); // 533648366742
        let txs = await walletRpc.getTxs(); // get transactions containing transfers to/from the wallet

        // send funds from RPC wallet to WebAssembly wallet
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(walletRpc); // *** REMOVE FROM README SAMPLE ***
        let createdTx = await walletRpc.createTx({
          accountIndex: 0,
          address: await walletFull.getAddress(1, 0),
          amount: 250000000000n, // send 0.25 XMR (denominated in atomic units)
          relay: false // create transaction and relay to the network if true
        });
        let fee = createdTx.getFee(); // "Are you sure you want to send... ?"
        await walletRpc.relayTx(createdTx); // relay the transaction

        // recipient receives unconfirmed funds within 5 seconds
        await new Promise(function (resolve) {setTimeout(resolve, 5000);});
        (0, _assert.default)(fundsReceived);

        // save and close WebAssembly wallet
        await walletFull.close(true);
      });

      it("Connection manager demonstration", async function () {

        // import monero-ts (or import types individually)
        // import moneroTs from "monero-ts"; // *** UNCOMMENT IN README ***

        // create connection manager
        let connectionManager = new moneroTs.MoneroConnectionManager();

        // add managed connections with priorities
        await connectionManager.addConnection({ uri: "http://localhost:28081", priority: 1 }); // use localhost as first priority
        await connectionManager.addConnection("http://example.com"); // default priority is prioritized last

        // set current connection
        await connectionManager.setConnection({ uri: "http://foo.bar", username: "admin", password: "password" }); // connection is added if new

        // create or open wallet governed by connection manager
        let walletFull = await moneroTs.createWalletFull({
          path: "./test_wallets/" + moneroTs.GenUtils.getUUID(), // *** CHANGE README TO "sample_wallet_full"
          password: "supersecretpassword123",
          networkType: moneroTs.MoneroNetworkType.TESTNET,
          connectionManager: connectionManager,
          seed: _TestUtils.default.SEED, // *** REPLACE IN README ***
          restoreHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT, // *** REPLACE IN README ***
          fs: await _TestUtils.default.getDefaultFs() // *** REPLACE IN README ***
        });

        // check connection status
        await connectionManager.checkConnection();

        // receive notifications of any changes to current connection
        connectionManager.addListener(new class extends moneroTs.MoneroConnectionManagerListener {
          async onConnectionChanged(connection) {
            console.log("Connection changed to: " + connection);
          }
        }());

        // check connections every 10 seconds (in order of priority) and switch to the best
        connectionManager.startPolling(10000);

        // get best available connection in order of priority then response time
        let bestConnection = await connectionManager.getBestAvailableConnection();

        // check status of all connections
        await connectionManager.checkConnections();

        // get connections in order of current connection, online status from last check, priority, and name
        let connections = connectionManager.getConnections();

        // clear connection manager
        await connectionManager.clear();
      });

      it("Test developer guide transaction queries", async function () {

        // get a transaction by hash
        let tx = await wallet.getTx((await wallet.getTxs())[0].getHash()); // REPLACE WITH BELOW FOR MD FILE
        //let tx = await wallet.getTx("9fb2cb7c73743002f131b72874e77b1152891968dc1f2849d3439ace8bae6d8e");

        // get unconfirmed transactions
        let txs = await wallet.getTxs({
          isConfirmed: false
        });
        for (let tx of txs) {
          (0, _assert.default)(!tx.getIsConfirmed());
        }

        // get transactions since height 582106 with incoming transfers to
        // account 0, subaddress 0
        txs = await wallet.getTxs({
          minHeight: 582106,
          transferQuery: {
            isIncoming: true,
            accountIndex: 0,
            subaddressIndex: 1
          }
        });
        for (let tx of txs) {
          (0, _assert.default)(tx.getIsConfirmed());
          (0, _assert.default)(tx.getHeight() >= 582106);
          let found = false;
          for (let transfer of tx.getTransfers()) {
            if (transfer.getIsIncoming() && transfer.getAccountIndex() === 0 && transfer.getSubaddressIndex() === 1) {
              found = true;
              break;
            }
          }
          (0, _assert.default)(found);
        }

        // get transactions with available outputs
        txs = await wallet.getTxs({
          isLocked: false,
          outputQuery: {
            isSpent: false
          }
        });
        for (let tx of txs) {
          (0, _assert.default)(!tx.getIsLocked());
          (0, _assert.default)(tx.getOutputs().length > 0);
          let found = false;
          for (let output of tx.getOutputsWallet()) {
            if (!output.getIsSpent()) {
              found = true;
              break;
            }
          }
          if (!found) {
            console.log(tx.getOutputs());
          }
          (0, _assert.default)(found);
        }
      });

      it("Test developer guide transfer queries", async function () {

        // get all transfers
        let transfers = await wallet.getTransfers();

        // get incoming transfers to account 0, subaddress 1
        transfers = await wallet.getTransfers({
          isIncoming: true,
          accountIndex: 0,
          subaddressIndex: 1
        });
        for (let transfer of transfers) {
          _assert.default.equal(transfer.getIsIncoming(), true);
          _assert.default.equal(transfer.getAccountIndex(), 0);
          _assert.default.equal(transfer.getSubaddressIndex(), 1);
        }

        // get transfers in the tx pool
        transfers = await wallet.getTransfers({
          txQuery: {
            inTxPool: true
          }
        });
        for (let transfer of transfers) {
          _assert.default.equal(transfer.getTx().getInTxPool(), true);
        }

        // get confirmed outgoing transfers since a block height
        transfers = await wallet.getTransfers({
          isIncoming: false,
          txQuery: {
            isConfirmed: true,
            minHeight: _TestUtils.default.FIRST_RECEIVE_HEIGHT // *** REPLACE WITH NUMBER IN .MD FILE ***
          }
        });
        (0, _assert.default)(transfers.length > 0);
        for (let transfer of transfers) {
          (0, _assert.default)(transfer.getIsOutgoing());
          (0, _assert.default)(transfer.getTx().getIsConfirmed());
          (0, _assert.default)(transfer.getTx().getHeight() >= _TestUtils.default.FIRST_RECEIVE_HEIGHT);
        }
      });

      it("Test developer guide output queries", async function () {

        // get all outputs
        let outputs = await wallet.getOutputs();
        (0, _assert.default)(outputs.length > 0);

        // get outputs available to be spent
        outputs = await wallet.getOutputs({
          isSpent: false,
          txQuery: {
            isLocked: false
          }
        });
        (0, _assert.default)(outputs.length > 0);
        for (let output of outputs) {
          (0, _assert.default)(!output.getIsSpent());
          (0, _assert.default)(!output.getTx().getIsLocked());
        }

        // get outputs by amount
        let amount = outputs[0].getAmount();
        outputs = await wallet.getOutputs({
          amount: amount // *** REPLACE WITH bigint IN .MD FILE ***
        });
        (0, _assert.default)(outputs.length > 0);
        for (let output of outputs) _assert.default.equal(output.getAmount().toString(), amount.toString());

        // get outputs received to a specific subaddress
        outputs = await wallet.getOutputs({
          accountIndex: 0,
          subaddressIndex: 1
        });
        (0, _assert.default)(outputs.length > 0);
        for (let output of outputs) {
          _assert.default.equal(output.getAccountIndex(), 0);
          _assert.default.equal(output.getSubaddressIndex(), 1);
        }

        // get output by key image
        let keyImage = outputs[0].getKeyImage().getHex();
        outputs = await wallet.getOutputs({
          keyImage: {
            hex: keyImage
          }
        });
        _assert.default.equal(outputs.length, 1);
        _assert.default.equal(outputs[0].getKeyImage().getHex(), keyImage);
      });

      it("Test developer guide send funds", async function () {

        // create in-memory test wallet with randomly generated seed
        let wallet = await moneroTs.createWalletFull({
          password: "abctesting123",
          networkType: moneroTs.MoneroNetworkType.TESTNET,
          server: "http://localhost:28081",
          proxyToWorker: _TestUtils.default.PROXY_TO_WORKER
        });

        try {

          // create a transaction to send funds to an address, but do not relay
          let tx = await wallet.createTx({
            accountIndex: 0, // source account to send funds from
            address: "9tsUiG9bwcU7oTbAdBwBk2PzxFtysge5qcEsHEpetmEKgerHQa1fDqH7a4FiquZmms7yM22jdifVAD7jAb2e63GSJMuhY75",
            amount: 1000000000000n // send 1 XMR (denominated in atomic units)
          });

          // can confirm with the user
          let fee = tx.getFee(); // "Are you sure you want to send... ?"

          // relay the transaction
          let hash = await wallet.relayTx(tx);
        } catch (err) {
          if (err.message !== "not enough money") throw err;
        }

        try {

          // send funds to a single destination
          let tx = await wallet.createTx({
            accountIndex: 0, // source account to send funds from
            address: "9tsUiG9bwcU7oTbAdBwBk2PzxFtysge5qcEsHEpetmEKgerHQa1fDqH7a4FiquZmms7yM22jdifVAD7jAb2e63GSJMuhY75",
            amount: 1000000000000n, // send 1 XMR (denominated in atomic units)
            relay: true // relay the transaction to the network
          });
        } catch (err) {
          if (err.message !== "not enough money") throw err;
        }

        try {

          // send funds from a specific subaddress to multiple destinations,
          // allowing transfers to be split across multiple transactions if needed
          let txs = await wallet.createTxs({
            accountIndex: 0, // source account to send funds from
            subaddressIndex: 1, // source subaddress to send funds from
            destinations: [{
              address: "9tsUiG9bwcU7oTbAdBwBk2PzxFtysge5qcEsHEpetmEKgerHQa1fDqH7a4FiquZmms7yM22jdifVAD7jAb2e63GSJMuhY75",
              amount: 500000000000n // send 0.5 XMR (denominated in atomic units)
            }, {
              address: "9tsUiG9bwcU7oTbAdBwBk2PzxFtysge5qcEsHEpetmEKgerHQa1fDqH7a4FiquZmms7yM22jdifVAD7jAb2e63GSJMuhY75",
              amount: 500000000000n // send 0.5 XMR (denominated in atomic units)
            }],
            priority: moneroTs.MoneroTxPriority.ELEVATED,
            relay: true // relay the transaction to the network
          });
        } catch (err) {
          if (err.message !== "not enough money") throw err;
        }

        try {

          // sweep an output
          let tx = await wallet.sweepOutput({
            address: "9tsUiG9bwcU7oTbAdBwBk2PzxFtysge5qcEsHEpetmEKgerHQa1fDqH7a4FiquZmms7yM22jdifVAD7jAb2e63GSJMuhY75",
            keyImage: "b7afd6afbb1615c98b1c0350b81c98a77d6d4fc0ab92020d25fd76aca0914f1e",
            relay: true
          });
        } catch (err) {
          if (err.message !== "No outputs found") throw err;
        }

        try {

          // sweep all unlocked funds in a wallet
          let txs = await wallet.sweepUnlocked({
            address: "9tsUiG9bwcU7oTbAdBwBk2PzxFtysge5qcEsHEpetmEKgerHQa1fDqH7a4FiquZmms7yM22jdifVAD7jAb2e63GSJMuhY75",
            relay: true
          });
        } catch (err) {
          if (err.message !== "No unlocked balance in the specified account") throw err;
        }

        try {

          // sweep unlocked funds in an account
          let txs = await wallet.sweepUnlocked({
            accountIndex: 0,
            address: "9tsUiG9bwcU7oTbAdBwBk2PzxFtysge5qcEsHEpetmEKgerHQa1fDqH7a4FiquZmms7yM22jdifVAD7jAb2e63GSJMuhY75",
            relay: true
          });
        } catch (err) {
          if (err.message !== "No unlocked balance in the specified account") throw err;
        }

        try {

          // sweep unlocked funds in a subaddress
          let txs = await wallet.sweepUnlocked({
            accountIndex: 0,
            subaddressIndex: 0,
            address: "9tsUiG9bwcU7oTbAdBwBk2PzxFtysge5qcEsHEpetmEKgerHQa1fDqH7a4FiquZmms7yM22jdifVAD7jAb2e63GSJMuhY75",
            relay: true
          });
        } catch (err) {
          if (err.message !== "No unlocked balance in the specified account") throw err;
        }
      });
    });
  }
}exports.default = TestSampleCode;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYXNzZXJ0IiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfVGVzdFV0aWxzIiwibW9uZXJvVHMiLCJfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCIsIl9nZXRSZXF1aXJlV2lsZGNhcmRDYWNoZSIsIm5vZGVJbnRlcm9wIiwiV2Vha01hcCIsImNhY2hlQmFiZWxJbnRlcm9wIiwiY2FjaGVOb2RlSW50ZXJvcCIsIm9iaiIsIl9fZXNNb2R1bGUiLCJkZWZhdWx0IiwiY2FjaGUiLCJoYXMiLCJnZXQiLCJuZXdPYmoiLCJoYXNQcm9wZXJ0eURlc2NyaXB0b3IiLCJPYmplY3QiLCJkZWZpbmVQcm9wZXJ0eSIsImdldE93blByb3BlcnR5RGVzY3JpcHRvciIsImtleSIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsImRlc2MiLCJzZXQiLCJUZXN0U2FtcGxlQ29kZSIsInJ1blRlc3RzIiwiZGVzY3JpYmUiLCJ0aGF0Iiwid2FsbGV0IiwiYmVmb3JlIiwiVGVzdFV0aWxzIiwiV0FMTEVUX1RYX1RSQUNLRVIiLCJyZXNldCIsIndhbGxldFJwYyIsImdldFdhbGxldFJwYyIsImNsb3NlIiwiZnMiLCJnZXREZWZhdWx0RnMiLCJleGlzdHNTeW5jIiwiVEVTVF9XQUxMRVRTX0RJUiIsInByb2Nlc3MiLCJjd2QiLCJta2RpclN5bmMiLCJyZWN1cnNpdmUiLCJnZXRXYWxsZXRGdWxsIiwiZSIsImNvbnNvbGUiLCJlcnJvciIsImFmdGVyIiwiaXQiLCJkYWVtb24iLCJjb25uZWN0VG9EYWVtb25ScGMiLCJoZWlnaHQiLCJnZXRIZWlnaHQiLCJ0eHNJblBvb2wiLCJnZXRUeFBvb2wiLCJ3YWxsZXRGdWxsIiwiY3JlYXRlV2FsbGV0RnVsbCIsInBhdGgiLCJHZW5VdGlscyIsImdldFVVSUQiLCJwYXNzd29yZCIsIm5ldHdvcmtUeXBlIiwiTW9uZXJvTmV0d29ya1R5cGUiLCJURVNUTkVUIiwic2VlZCIsIlNFRUQiLCJyZXN0b3JlSGVpZ2h0IiwiRklSU1RfUkVDRUlWRV9IRUlHSFQiLCJzZXJ2ZXIiLCJ1cmkiLCJ1c2VybmFtZSIsInN5bmMiLCJNb25lcm9XYWxsZXRMaXN0ZW5lciIsIm9uU3luY1Byb2dyZXNzIiwic3RhcnRIZWlnaHQiLCJlbmRIZWlnaHQiLCJwZXJjZW50RG9uZSIsIm1lc3NhZ2UiLCJzdGFydFN5bmNpbmciLCJmdW5kc1JlY2VpdmVkIiwiYWRkTGlzdGVuZXIiLCJvbk91dHB1dFJlY2VpdmVkIiwib3V0cHV0IiwiYW1vdW50IiwiZ2V0QW1vdW50IiwidHhIYXNoIiwiZ2V0VHgiLCJnZXRIYXNoIiwiaXNDb25maXJtZWQiLCJnZXRJc0NvbmZpcm1lZCIsImlzTG9ja2VkIiwiZ2V0SXNMb2NrZWQiLCJjb25uZWN0VG9XYWxsZXRScGMiLCJvcGVuV2FsbGV0IiwicHJpbWFyeUFkZHJlc3MiLCJnZXRQcmltYXJ5QWRkcmVzcyIsImJhbGFuY2UiLCJnZXRCYWxhbmNlIiwidHhzIiwiZ2V0VHhzIiwid2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sIiwiY3JlYXRlZFR4IiwiY3JlYXRlVHgiLCJhY2NvdW50SW5kZXgiLCJhZGRyZXNzIiwiZ2V0QWRkcmVzcyIsInJlbGF5IiwiZmVlIiwiZ2V0RmVlIiwicmVsYXlUeCIsIlByb21pc2UiLCJyZXNvbHZlIiwic2V0VGltZW91dCIsImFzc2VydCIsImNvbm5lY3Rpb25NYW5hZ2VyIiwiTW9uZXJvQ29ubmVjdGlvbk1hbmFnZXIiLCJhZGRDb25uZWN0aW9uIiwicHJpb3JpdHkiLCJzZXRDb25uZWN0aW9uIiwiY2hlY2tDb25uZWN0aW9uIiwiTW9uZXJvQ29ubmVjdGlvbk1hbmFnZXJMaXN0ZW5lciIsIm9uQ29ubmVjdGlvbkNoYW5nZWQiLCJjb25uZWN0aW9uIiwibG9nIiwic3RhcnRQb2xsaW5nIiwiYmVzdENvbm5lY3Rpb24iLCJnZXRCZXN0QXZhaWxhYmxlQ29ubmVjdGlvbiIsImNoZWNrQ29ubmVjdGlvbnMiLCJjb25uZWN0aW9ucyIsImdldENvbm5lY3Rpb25zIiwiY2xlYXIiLCJ0eCIsIm1pbkhlaWdodCIsInRyYW5zZmVyUXVlcnkiLCJpc0luY29taW5nIiwic3ViYWRkcmVzc0luZGV4IiwiZm91bmQiLCJ0cmFuc2ZlciIsImdldFRyYW5zZmVycyIsImdldElzSW5jb21pbmciLCJnZXRBY2NvdW50SW5kZXgiLCJnZXRTdWJhZGRyZXNzSW5kZXgiLCJvdXRwdXRRdWVyeSIsImlzU3BlbnQiLCJnZXRPdXRwdXRzIiwibGVuZ3RoIiwiZ2V0T3V0cHV0c1dhbGxldCIsImdldElzU3BlbnQiLCJ0cmFuc2ZlcnMiLCJlcXVhbCIsInR4UXVlcnkiLCJpblR4UG9vbCIsImdldEluVHhQb29sIiwiZ2V0SXNPdXRnb2luZyIsIm91dHB1dHMiLCJ0b1N0cmluZyIsImtleUltYWdlIiwiZ2V0S2V5SW1hZ2UiLCJnZXRIZXgiLCJoZXgiLCJwcm94eVRvV29ya2VyIiwiUFJPWFlfVE9fV09SS0VSIiwiaGFzaCIsImVyciIsImNyZWF0ZVR4cyIsImRlc3RpbmF0aW9ucyIsIk1vbmVyb1R4UHJpb3JpdHkiLCJFTEVWQVRFRCIsInN3ZWVwT3V0cHV0Iiwic3dlZXBVbmxvY2tlZCIsImV4cG9ydHMiXSwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdGVzdC9UZXN0U2FtcGxlQ29kZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCBUZXN0VXRpbHMgZnJvbSBcIi4vdXRpbHMvVGVzdFV0aWxzXCI7XG5pbXBvcnQgKiBhcyBtb25lcm9UcyBmcm9tIFwiLi4vLi4vaW5kZXhcIjtcblxuLyoqXG4gKiBUZXN0IHRoZSBzYW1wbGUgY29kZSBpbiBSRUFETUUubWQuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlc3RTYW1wbGVDb2RlIHtcbiAgXG4gIHJ1blRlc3RzKCkge1xuICAgIGRlc2NyaWJlKFwiVGVzdCBzYW1wbGUgY29kZVwiLCBmdW5jdGlvbigpIHtcbiAgICAgIGxldCB0aGF0ID0gdGhpczsgLy8gVW5uZWNlc3Nhcnk/IFRoYXQgaXMgbmV2ZXIgdXNlZCBpbiB0aGUgZm9sbG93aW5nIGNvZGVcbiAgICAgIGxldCB3YWxsZXQ6IG1vbmVyb1RzLk1vbmVyb1dhbGxldEZ1bGw7XG4gICAgICBcbiAgICAgIC8vIGluaXRpYWxpemUgd2FsbGV0XG4gICAgICBiZWZvcmUoYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRyeSB7XG5cbiAgICAgICAgICAvLyBhbGwgd2FsbGV0cyBuZWVkIHRvIHdhaXQgZm9yIHR4cyB0byBjb25maXJtIHRvIHJlbGlhYmx5IHN5bmNcbiAgICAgICAgICBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIucmVzZXQoKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBjcmVhdGUgcnBjIHRlc3Qgd2FsbGV0XG4gICAgICAgICAgbGV0IHdhbGxldFJwYyA9IGF3YWl0IFRlc3RVdGlscy5nZXRXYWxsZXRScGMoKTtcbiAgICAgICAgICBhd2FpdCB3YWxsZXRScGMuY2xvc2UoKTtcbiAgICAgICAgICAvLyBjcmVhdGUgZGlyZWN0b3J5IGZvciB0ZXN0IHdhbGxldHMgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgIGxldCBmcyA9IGF3YWl0IFRlc3RVdGlscy5nZXREZWZhdWx0RnMoKTtcbiAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoVGVzdFV0aWxzLlRFU1RfV0FMTEVUU19ESVIpKSB7XG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMocHJvY2Vzcy5jd2QoKSkpIGZzLm1rZGlyU3luYyhwcm9jZXNzLmN3ZCgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTsgIC8vIGNyZWF0ZSBjdXJyZW50IHByb2Nlc3MgZGlyZWN0b3J5IGZvciByZWxhdGl2ZSBwYXRocyB3aGljaCBkb2VzIG5vdCBleGlzdCBpbiBtZW1vcnkgZnNcbiAgICAgICAgICAgIGZzLm1rZGlyU3luYyhUZXN0VXRpbHMuVEVTVF9XQUxMRVRTX0RJUik7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNyZWF0ZSBmdWxsIHRlc3Qgd2FsbGV0XG4gICAgICAgICAgd2FsbGV0ID0gYXdhaXQgVGVzdFV0aWxzLmdldFdhbGxldEZ1bGwoKTtcblxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGJlZm9yZSB0ZXN0czogXCIpO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBhZnRlcihhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHdhbGxldCkgYXdhaXQgd2FsbGV0LmNsb3NlKHRydWUpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGl0KFwiU2FtcGxlIGNvZGUgZGVtb25zdHJhdGlvblwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGltcG9ydCBtb25lcm8tdHMgKG9yIGltcG9ydCBhcyBuZWVkZWQpXG4gICAgICAgIC8vIGltcG9ydCBtb25lcm9UcyBmcm9tIFwibW9uZXJvLXRzXCI7IC8vICoqKiBVTkNPTU1FTlQgSU4gUkVBRE1FICoqKlxuXG4gICAgICAgIC8vIGNvbm5lY3QgdG8gZGFlbW9uXG4gICAgICAgIGxldCBkYWVtb24gPSBhd2FpdCBtb25lcm9Ucy5jb25uZWN0VG9EYWVtb25ScGMoXCJodHRwOi8vbG9jYWxob3N0OjI4MDgxXCIpO1xuICAgICAgICBsZXQgaGVpZ2h0ID0gYXdhaXQgZGFlbW9uLmdldEhlaWdodCgpOyAgICAgICAgLy8gMTUyMzY1MVxuICAgICAgICBsZXQgdHhzSW5Qb29sID0gYXdhaXQgZGFlbW9uLmdldFR4UG9vbCgpOyAgICAgLy8gZ2V0IHRyYW5zYWN0aW9ucyBpbiB0aGUgcG9vbFxuXG4gICAgICAgIC8vIGNyZWF0ZSB3YWxsZXQgZnJvbSBtbmVtb25pYyBwaHJhc2UgdXNpbmcgV2ViQXNzZW1ibHkgYmluZGluZ3MgdG8gbW9uZXJvLXByb2plY3RcbiAgICAgICAgbGV0IHdhbGxldEZ1bGwgPSBhd2FpdCBtb25lcm9Ucy5jcmVhdGVXYWxsZXRGdWxsKHtcbiAgICAgICAgICBwYXRoOiBcIi4vdGVzdF93YWxsZXRzL1wiICsgbW9uZXJvVHMuR2VuVXRpbHMuZ2V0VVVJRCgpLCAgLy8gKioqIENIQU5HRSBSRUFETUUgVE8gXCJzYW1wbGVfd2FsbGV0X2Z1bGxcIlxuICAgICAgICAgIGZzOiBhd2FpdCBUZXN0VXRpbHMuZ2V0RGVmYXVsdEZzKCksICAgICAgICAgICAgICAgICAgICAgLy8gKioqIFJFTU9WRSBGUk9NIFJFQURNRSBTQU1QTEUgKioqXG4gICAgICAgICAgcGFzc3dvcmQ6IFwic3VwZXJzZWNyZXRwYXNzd29yZDEyM1wiLFxuICAgICAgICAgIG5ldHdvcmtUeXBlOiBtb25lcm9Ucy5Nb25lcm9OZXR3b3JrVHlwZS5URVNUTkVULFxuICAgICAgICAgIHNlZWQ6IFRlc3RVdGlscy5TRUVELCAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gKioqIFJFUExBQ0UgUkVBRE1FIFdJVEggU0VFRCAqKipcbiAgICAgICAgICByZXN0b3JlSGVpZ2h0OiBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQsIC8vICoqKiBSRVBMQUNFIFJFQURNRSBXSVRIIEZJUlNUIFJFQ0VJVkUgSEVJR0hUICoqKlxuICAgICAgICAgIHNlcnZlcjogeyAvLyBwcm92aWRlIHVybCBvciBNb25lcm9ScGNDb25uZWN0aW9uXG4gICAgICAgICAgICB1cmk6IFwiaHR0cDovL2xvY2FsaG9zdDoyODA4MVwiLFxuICAgICAgICAgICAgdXNlcm5hbWU6IFwic3VwZXJ1c2VyXCIsXG4gICAgICAgICAgICBwYXNzd29yZDogXCJhYmN0ZXN0aW5nMTIzXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHN5bmNocm9uaXplIHdpdGggcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xuICAgICAgICBhd2FpdCB3YWxsZXRGdWxsLnN5bmMobmV3IGNsYXNzIGV4dGVuZHMgbW9uZXJvVHMuTW9uZXJvV2FsbGV0TGlzdGVuZXIge1xuICAgICAgICAgIGFzeW5jIG9uU3luY1Byb2dyZXNzKGhlaWdodDogbnVtYmVyLCBzdGFydEhlaWdodDogbnVtYmVyLCBlbmRIZWlnaHQ6IG51bWJlciwgcGVyY2VudERvbmU6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nKSB7XG4gICAgICAgICAgICAvLyBmZWVkIGEgcHJvZ3Jlc3MgYmFyP1xuICAgICAgICAgIH1cbiAgICAgICAgfSBhcyBtb25lcm9Ucy5Nb25lcm9XYWxsZXRMaXN0ZW5lcik7XG5cbiAgICAgICAgLy8gc3luY2hyb25pemUgaW4gdGhlIGJhY2tncm91bmQgZXZlcnkgNSBzZWNvbmRzXG4gICAgICAgIGF3YWl0IHdhbGxldEZ1bGwuc3RhcnRTeW5jaW5nKDUwMDApO1xuICAgICAgICBcbiAgICAgICAgLy8gcmVjZWl2ZSBub3RpZmljYXRpb25zIHdoZW4gZnVuZHMgYXJlIHJlY2VpdmVkLCBjb25maXJtZWQsIGFuZCB1bmxvY2tlZFxuICAgICAgICBsZXQgZnVuZHNSZWNlaXZlZCA9IGZhbHNlO1xuICAgICAgICBhd2FpdCB3YWxsZXRGdWxsLmFkZExpc3RlbmVyKG5ldyBjbGFzcyBleHRlbmRzIG1vbmVyb1RzLk1vbmVyb1dhbGxldExpc3RlbmVyIHtcbiAgICAgICAgICBhc3luYyBvbk91dHB1dFJlY2VpdmVkKG91dHB1dDogbW9uZXJvVHMuTW9uZXJvT3V0cHV0V2FsbGV0KSB7XG4gICAgICAgICAgICBsZXQgYW1vdW50ID0gb3V0cHV0LmdldEFtb3VudCgpO1xuICAgICAgICAgICAgbGV0IHR4SGFzaCA9IG91dHB1dC5nZXRUeCgpLmdldEhhc2goKTtcbiAgICAgICAgICAgIGxldCBpc0NvbmZpcm1lZCA9IG91dHB1dC5nZXRUeCgpLmdldElzQ29uZmlybWVkKCk7XG4gICAgICAgICAgICBsZXQgaXNMb2NrZWQgPSBvdXRwdXQuZ2V0VHgoKS5nZXRJc0xvY2tlZCgpO1xuICAgICAgICAgICAgZnVuZHNSZWNlaXZlZCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBjb25uZWN0IHRvIHdhbGxldCBSUEMgYW5kIG9wZW4gd2FsbGV0XG4gICAgICAgIGxldCB3YWxsZXRScGMgPSBhd2FpdCBtb25lcm9Ucy5jb25uZWN0VG9XYWxsZXRScGMoXCJodHRwOi8vbG9jYWxob3N0OjI4MDg0XCIsIFwicnBjX3VzZXJcIiwgXCJhYmMxMjNcIik7XG4gICAgICAgIGF3YWl0IHdhbGxldFJwYy5vcGVuV2FsbGV0KFwidGVzdF93YWxsZXRfMVwiLCBcInN1cGVyc2VjcmV0cGFzc3dvcmQxMjNcIik7ICAvLyAqKiogQ0hBTkdFIFJFQURNRSBUTyBcInNhbXBsZV93YWxsZXRfcnBjXCIgKioqXG4gICAgICAgIGxldCBwcmltYXJ5QWRkcmVzcyA9IGF3YWl0IHdhbGxldFJwYy5nZXRQcmltYXJ5QWRkcmVzcygpOyAvLyA1NTV6Z2R1RmhtS2QybzhyUFV6Li4uXG4gICAgICAgIGxldCBiYWxhbmNlID0gYXdhaXQgd2FsbGV0UnBjLmdldEJhbGFuY2UoKTsgICAvLyA1MzM2NDgzNjY3NDJcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHdhbGxldFJwYy5nZXRUeHMoKTsgICAgICAgICAgIC8vIGdldCB0cmFuc2FjdGlvbnMgY29udGFpbmluZyB0cmFuc2ZlcnMgdG8vZnJvbSB0aGUgd2FsbGV0XG5cbiAgICAgICAgLy8gc2VuZCBmdW5kcyBmcm9tIFJQQyB3YWxsZXQgdG8gV2ViQXNzZW1ibHkgd2FsbGV0XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wod2FsbGV0UnBjKTsgLy8gKioqIFJFTU9WRSBGUk9NIFJFQURNRSBTQU1QTEUgKioqXG4gICAgICAgIGxldCBjcmVhdGVkVHggPSBhd2FpdCB3YWxsZXRScGMuY3JlYXRlVHgoe1xuICAgICAgICAgIGFjY291bnRJbmRleDogMCxcbiAgICAgICAgICBhZGRyZXNzOiBhd2FpdCB3YWxsZXRGdWxsLmdldEFkZHJlc3MoMSwgMCksXG4gICAgICAgICAgYW1vdW50OiAyNTAwMDAwMDAwMDBuLCAvLyBzZW5kIDAuMjUgWE1SIChkZW5vbWluYXRlZCBpbiBhdG9taWMgdW5pdHMpXG4gICAgICAgICAgcmVsYXk6IGZhbHNlIC8vIGNyZWF0ZSB0cmFuc2FjdGlvbiBhbmQgcmVsYXkgdG8gdGhlIG5ldHdvcmsgaWYgdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgICAgbGV0IGZlZSA9IGNyZWF0ZWRUeC5nZXRGZWUoKTsgLy8gXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gc2VuZC4uLiA/XCJcbiAgICAgICAgYXdhaXQgd2FsbGV0UnBjLnJlbGF5VHgoY3JlYXRlZFR4KTsgLy8gcmVsYXkgdGhlIHRyYW5zYWN0aW9uXG4gICAgICAgIFxuICAgICAgICAvLyByZWNpcGllbnQgcmVjZWl2ZXMgdW5jb25maXJtZWQgZnVuZHMgd2l0aGluIDUgc2Vjb25kc1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwMCk7IH0pO1xuICAgICAgICBhc3NlcnQoZnVuZHNSZWNlaXZlZCk7XG4gICAgICAgIFxuICAgICAgICAvLyBzYXZlIGFuZCBjbG9zZSBXZWJBc3NlbWJseSB3YWxsZXRcbiAgICAgICAgYXdhaXQgd2FsbGV0RnVsbC5jbG9zZSh0cnVlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpdChcIkNvbm5lY3Rpb24gbWFuYWdlciBkZW1vbnN0cmF0aW9uXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8vIGltcG9ydCBtb25lcm8tdHMgKG9yIGltcG9ydCB0eXBlcyBpbmRpdmlkdWFsbHkpXG4gICAgICAgIC8vIGltcG9ydCBtb25lcm9UcyBmcm9tIFwibW9uZXJvLXRzXCI7IC8vICoqKiBVTkNPTU1FTlQgSU4gUkVBRE1FICoqKlxuICAgICAgICBcbiAgICAgICAgLy8gY3JlYXRlIGNvbm5lY3Rpb24gbWFuYWdlclxuICAgICAgICBsZXQgY29ubmVjdGlvbk1hbmFnZXIgPSBuZXcgbW9uZXJvVHMuTW9uZXJvQ29ubmVjdGlvbk1hbmFnZXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGFkZCBtYW5hZ2VkIGNvbm5lY3Rpb25zIHdpdGggcHJpb3JpdGllc1xuICAgICAgICBhd2FpdCBjb25uZWN0aW9uTWFuYWdlci5hZGRDb25uZWN0aW9uKHt1cmk6IFwiaHR0cDovL2xvY2FsaG9zdDoyODA4MVwiLCBwcmlvcml0eTogMX0pOyAvLyB1c2UgbG9jYWxob3N0IGFzIGZpcnN0IHByaW9yaXR5XG4gICAgICAgIGF3YWl0IGNvbm5lY3Rpb25NYW5hZ2VyLmFkZENvbm5lY3Rpb24oXCJodHRwOi8vZXhhbXBsZS5jb21cIik7IC8vIGRlZmF1bHQgcHJpb3JpdHkgaXMgcHJpb3JpdGl6ZWQgbGFzdFxuICAgICAgICBcbiAgICAgICAgLy8gc2V0IGN1cnJlbnQgY29ubmVjdGlvblxuICAgICAgICBhd2FpdCBjb25uZWN0aW9uTWFuYWdlci5zZXRDb25uZWN0aW9uKHt1cmk6IFwiaHR0cDovL2Zvby5iYXJcIiwgdXNlcm5hbWU6IFwiYWRtaW5cIiwgcGFzc3dvcmQ6IFwicGFzc3dvcmRcIn0pOyAvLyBjb25uZWN0aW9uIGlzIGFkZGVkIGlmIG5ld1xuXG4gICAgICAgIC8vIGNyZWF0ZSBvciBvcGVuIHdhbGxldCBnb3Zlcm5lZCBieSBjb25uZWN0aW9uIG1hbmFnZXJcbiAgICAgICAgbGV0IHdhbGxldEZ1bGwgPSBhd2FpdCBtb25lcm9Ucy5jcmVhdGVXYWxsZXRGdWxsKHtcbiAgICAgICAgICBwYXRoOiBcIi4vdGVzdF93YWxsZXRzL1wiICsgbW9uZXJvVHMuR2VuVXRpbHMuZ2V0VVVJRCgpLCAvLyAqKiogQ0hBTkdFIFJFQURNRSBUTyBcInNhbXBsZV93YWxsZXRfZnVsbFwiXG4gICAgICAgICAgcGFzc3dvcmQ6IFwic3VwZXJzZWNyZXRwYXNzd29yZDEyM1wiLFxuICAgICAgICAgIG5ldHdvcmtUeXBlOiBtb25lcm9Ucy5Nb25lcm9OZXR3b3JrVHlwZS5URVNUTkVULFxuICAgICAgICAgIGNvbm5lY3Rpb25NYW5hZ2VyOiBjb25uZWN0aW9uTWFuYWdlcixcbiAgICAgICAgICBzZWVkOiBUZXN0VXRpbHMuU0VFRCwgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICoqKiBSRVBMQUNFIElOIFJFQURNRSAqKipcbiAgICAgICAgICByZXN0b3JlSGVpZ2h0OiBUZXN0VXRpbHMuRklSU1RfUkVDRUlWRV9IRUlHSFQsIC8vICoqKiBSRVBMQUNFIElOIFJFQURNRSAqKipcbiAgICAgICAgICBmczogYXdhaXQgVGVzdFV0aWxzLmdldERlZmF1bHRGcygpICAgICAgICAgICAgIC8vICoqKiBSRVBMQUNFIElOIFJFQURNRSAqKipcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBjaGVjayBjb25uZWN0aW9uIHN0YXR1c1xuICAgICAgICBhd2FpdCBjb25uZWN0aW9uTWFuYWdlci5jaGVja0Nvbm5lY3Rpb24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlY2VpdmUgbm90aWZpY2F0aW9ucyBvZiBhbnkgY2hhbmdlcyB0byBjdXJyZW50IGNvbm5lY3Rpb25cbiAgICAgICAgY29ubmVjdGlvbk1hbmFnZXIuYWRkTGlzdGVuZXIobmV3IGNsYXNzIGV4dGVuZHMgbW9uZXJvVHMuTW9uZXJvQ29ubmVjdGlvbk1hbmFnZXJMaXN0ZW5lciB7XG4gICAgICAgICAgYXN5bmMgb25Db25uZWN0aW9uQ2hhbmdlZChjb25uZWN0aW9uOiBtb25lcm9Ucy5Nb25lcm9ScGNDb25uZWN0aW9uKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3Rpb24gY2hhbmdlZCB0bzogXCIgKyBjb25uZWN0aW9uKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gY2hlY2sgY29ubmVjdGlvbnMgZXZlcnkgMTAgc2Vjb25kcyAoaW4gb3JkZXIgb2YgcHJpb3JpdHkpIGFuZCBzd2l0Y2ggdG8gdGhlIGJlc3RcbiAgICAgICAgY29ubmVjdGlvbk1hbmFnZXIuc3RhcnRQb2xsaW5nKDEwMDAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBiZXN0IGF2YWlsYWJsZSBjb25uZWN0aW9uIGluIG9yZGVyIG9mIHByaW9yaXR5IHRoZW4gcmVzcG9uc2UgdGltZVxuICAgICAgICBsZXQgYmVzdENvbm5lY3Rpb24gPSBhd2FpdCBjb25uZWN0aW9uTWFuYWdlci5nZXRCZXN0QXZhaWxhYmxlQ29ubmVjdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gY2hlY2sgc3RhdHVzIG9mIGFsbCBjb25uZWN0aW9uc1xuICAgICAgICBhd2FpdCBjb25uZWN0aW9uTWFuYWdlci5jaGVja0Nvbm5lY3Rpb25zKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgY29ubmVjdGlvbnMgaW4gb3JkZXIgb2YgY3VycmVudCBjb25uZWN0aW9uLCBvbmxpbmUgc3RhdHVzIGZyb20gbGFzdCBjaGVjaywgcHJpb3JpdHksIGFuZCBuYW1lXG4gICAgICAgIGxldCBjb25uZWN0aW9ucyA9IGNvbm5lY3Rpb25NYW5hZ2VyLmdldENvbm5lY3Rpb25zKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBjbGVhciBjb25uZWN0aW9uIG1hbmFnZXJcbiAgICAgICAgYXdhaXQgY29ubmVjdGlvbk1hbmFnZXIuY2xlYXIoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpdChcIlRlc3QgZGV2ZWxvcGVyIGd1aWRlIHRyYW5zYWN0aW9uIHF1ZXJpZXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgYSB0cmFuc2FjdGlvbiBieSBoYXNoXG4gICAgICAgIGxldCB0eCA9IGF3YWl0IHdhbGxldC5nZXRUeCgoYXdhaXQgd2FsbGV0LmdldFR4cygpKVswXS5nZXRIYXNoKCkpOyAvLyBSRVBMQUNFIFdJVEggQkVMT1cgRk9SIE1EIEZJTEVcbiAgICAgICAgLy9sZXQgdHggPSBhd2FpdCB3YWxsZXQuZ2V0VHgoXCI5ZmIyY2I3YzczNzQzMDAyZjEzMWI3Mjg3NGU3N2IxMTUyODkxOTY4ZGMxZjI4NDlkMzQzOWFjZThiYWU2ZDhlXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IHVuY29uZmlybWVkIHRyYW5zYWN0aW9uc1xuICAgICAgICBsZXQgdHhzID0gYXdhaXQgd2FsbGV0LmdldFR4cyh7XG4gICAgICAgICAgaXNDb25maXJtZWQ6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBhc3NlcnQoIXR4LmdldElzQ29uZmlybWVkKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdHJhbnNhY3Rpb25zIHNpbmNlIGhlaWdodCA1ODIxMDYgd2l0aCBpbmNvbWluZyB0cmFuc2ZlcnMgdG9cbiAgICAgICAgLy8gYWNjb3VudCAwLCBzdWJhZGRyZXNzIDBcbiAgICAgICAgdHhzID0gYXdhaXQgd2FsbGV0LmdldFR4cyh7XG4gICAgICAgICAgbWluSGVpZ2h0OiA1ODIxMDYsXG4gICAgICAgICAgdHJhbnNmZXJRdWVyeToge1xuICAgICAgICAgICAgaXNJbmNvbWluZzogdHJ1ZSxcbiAgICAgICAgICAgIGFjY291bnRJbmRleDogMCxcbiAgICAgICAgICAgIHN1YmFkZHJlc3NJbmRleDogMVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIGFzc2VydCh0eC5nZXRJc0NvbmZpcm1lZCgpKTtcbiAgICAgICAgICBhc3NlcnQodHguZ2V0SGVpZ2h0KCkgPj0gNTgyMTA2KVxuICAgICAgICAgIGxldCBmb3VuZDogYm9vbGVhbiA9IGZhbHNlO1xuICAgICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHR4LmdldFRyYW5zZmVycygpKSB7XG4gICAgICAgICAgICBpZiAodHJhbnNmZXIuZ2V0SXNJbmNvbWluZygpICYmIHRyYW5zZmVyLmdldEFjY291bnRJbmRleCgpID09PSAwICYmICh0cmFuc2ZlciBhcyBtb25lcm9Ucy5Nb25lcm9JbmNvbWluZ1RyYW5zZmVyKS5nZXRTdWJhZGRyZXNzSW5kZXgoKSA9PT0gMSkge1xuICAgICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBhc3NlcnQoZm91bmQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdHJhbnNhY3Rpb25zIHdpdGggYXZhaWxhYmxlIG91dHB1dHNcbiAgICAgICAgdHhzID0gYXdhaXQgd2FsbGV0LmdldFR4cyh7XG4gICAgICAgICAgaXNMb2NrZWQ6IGZhbHNlLFxuICAgICAgICAgIG91dHB1dFF1ZXJ5OiB7XG4gICAgICAgICAgICBpc1NwZW50OiBmYWxzZSxcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICBhc3NlcnQoIXR4LmdldElzTG9ja2VkKCkpO1xuICAgICAgICAgIGFzc2VydCh0eC5nZXRPdXRwdXRzKCkubGVuZ3RoID4gMCk7XG4gICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIHR4LmdldE91dHB1dHNXYWxsZXQoKSkge1xuICAgICAgICAgICAgaWYgKCFvdXRwdXQuZ2V0SXNTcGVudCgpKSB7XG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghZm91bmQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHR4LmdldE91dHB1dHMoKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFzc2VydChmb3VuZCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpdChcIlRlc3QgZGV2ZWxvcGVyIGd1aWRlIHRyYW5zZmVyIHF1ZXJpZXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgYWxsIHRyYW5zZmVyc1xuICAgICAgICBsZXQgdHJhbnNmZXJzID0gYXdhaXQgd2FsbGV0LmdldFRyYW5zZmVycygpO1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGluY29taW5nIHRyYW5zZmVycyB0byBhY2NvdW50IDAsIHN1YmFkZHJlc3MgMVxuICAgICAgICB0cmFuc2ZlcnMgPSBhd2FpdCB3YWxsZXQuZ2V0VHJhbnNmZXJzKHtcbiAgICAgICAgICBpc0luY29taW5nOiB0cnVlLFxuICAgICAgICAgIGFjY291bnRJbmRleDogMCxcbiAgICAgICAgICBzdWJhZGRyZXNzSW5kZXg6IDFcbiAgICAgICAgfSk7XG4gICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHRyYW5zZmVycykge1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0cmFuc2Zlci5nZXRJc0luY29taW5nKCksIHRydWUpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0cmFuc2Zlci5nZXRBY2NvdW50SW5kZXgoKSwgMCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKCh0cmFuc2ZlciBhcyBtb25lcm9Ucy5Nb25lcm9JbmNvbWluZ1RyYW5zZmVyKS5nZXRTdWJhZGRyZXNzSW5kZXgoKSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCB0cmFuc2ZlcnMgaW4gdGhlIHR4IHBvb2xcbiAgICAgICAgdHJhbnNmZXJzID0gYXdhaXQgd2FsbGV0LmdldFRyYW5zZmVycyh7XG4gICAgICAgICAgdHhRdWVyeToge1xuICAgICAgICAgICAgaW5UeFBvb2w6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBmb3IgKGxldCB0cmFuc2ZlciBvZiB0cmFuc2ZlcnMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHJhbnNmZXIuZ2V0VHgoKS5nZXRJblR4UG9vbCgpLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGNvbmZpcm1lZCBvdXRnb2luZyB0cmFuc2ZlcnMgc2luY2UgYSBibG9jayBoZWlnaHRcbiAgICAgICAgdHJhbnNmZXJzID0gYXdhaXQgd2FsbGV0LmdldFRyYW5zZmVycyh7XG4gICAgICAgICAgaXNJbmNvbWluZzogZmFsc2UsXG4gICAgICAgICAgdHhRdWVyeToge1xuICAgICAgICAgICAgaXNDb25maXJtZWQ6IHRydWUsXG4gICAgICAgICAgICBtaW5IZWlnaHQ6IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCAgIC8vICoqKiBSRVBMQUNFIFdJVEggTlVNQkVSIElOIC5NRCBGSUxFICoqKlxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGFzc2VydCh0cmFuc2ZlcnMubGVuZ3RoID4gMCk7XG4gICAgICAgIGZvciAobGV0IHRyYW5zZmVyIG9mIHRyYW5zZmVycykge1xuICAgICAgICAgIGFzc2VydCh0cmFuc2Zlci5nZXRJc091dGdvaW5nKCkpO1xuICAgICAgICAgIGFzc2VydCh0cmFuc2Zlci5nZXRUeCgpLmdldElzQ29uZmlybWVkKCkpO1xuICAgICAgICAgIGFzc2VydCh0cmFuc2Zlci5nZXRUeCgpLmdldEhlaWdodCgpID49IFRlc3RVdGlscy5GSVJTVF9SRUNFSVZFX0hFSUdIVCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpdChcIlRlc3QgZGV2ZWxvcGVyIGd1aWRlIG91dHB1dCBxdWVyaWVzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGFsbCBvdXRwdXRzXG4gICAgICAgIGxldCBvdXRwdXRzID0gYXdhaXQgd2FsbGV0LmdldE91dHB1dHMoKTtcbiAgICAgICAgYXNzZXJ0KG91dHB1dHMubGVuZ3RoID4gMCk7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgb3V0cHV0cyBhdmFpbGFibGUgdG8gYmUgc3BlbnRcbiAgICAgICAgb3V0cHV0cyA9IGF3YWl0IHdhbGxldC5nZXRPdXRwdXRzKHtcbiAgICAgICAgICBpc1NwZW50OiBmYWxzZSxcbiAgICAgICAgICB0eFF1ZXJ5OiB7XG4gICAgICAgICAgICBpc0xvY2tlZDogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBhc3NlcnQob3V0cHV0cy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHtcbiAgICAgICAgICBhc3NlcnQoIW91dHB1dC5nZXRJc1NwZW50KCkpO1xuICAgICAgICAgIGFzc2VydCghb3V0cHV0LmdldFR4KCkuZ2V0SXNMb2NrZWQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGdldCBvdXRwdXRzIGJ5IGFtb3VudFxuICAgICAgICBsZXQgYW1vdW50ID0gb3V0cHV0c1swXS5nZXRBbW91bnQoKTtcbiAgICAgICAgb3V0cHV0cyA9IGF3YWl0IHdhbGxldC5nZXRPdXRwdXRzKHtcbiAgICAgICAgICBhbW91bnQ6IGFtb3VudCAgICAvLyAqKiogUkVQTEFDRSBXSVRIIGJpZ2ludCBJTiAuTUQgRklMRSAqKipcbiAgICAgICAgfSk7XG4gICAgICAgIGFzc2VydChvdXRwdXRzLmxlbmd0aCA+IDApO1xuICAgICAgICBmb3IgKGxldCBvdXRwdXQgb2Ygb3V0cHV0cykgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRBbW91bnQoKS50b1N0cmluZygpLCBhbW91bnQudG9TdHJpbmcoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgb3V0cHV0cyByZWNlaXZlZCB0byBhIHNwZWNpZmljIHN1YmFkZHJlc3NcbiAgICAgICAgb3V0cHV0cyA9IGF3YWl0IHdhbGxldC5nZXRPdXRwdXRzKHtcbiAgICAgICAgICBhY2NvdW50SW5kZXg6IDAsXG4gICAgICAgICAgc3ViYWRkcmVzc0luZGV4OiAxXG4gICAgICAgIH0pO1xuICAgICAgICBhc3NlcnQob3V0cHV0cy5sZW5ndGggPiAwKTtcbiAgICAgICAgZm9yIChsZXQgb3V0cHV0IG9mIG91dHB1dHMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldEFjY291bnRJbmRleCgpLCAwKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0LmdldFN1YmFkZHJlc3NJbmRleCgpLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IG91dHB1dCBieSBrZXkgaW1hZ2VcbiAgICAgICAgbGV0IGtleUltYWdlOiBzdHJpbmcgPSBvdXRwdXRzWzBdLmdldEtleUltYWdlKCkuZ2V0SGV4KCk7XG4gICAgICAgIG91dHB1dHMgPSBhd2FpdCB3YWxsZXQuZ2V0T3V0cHV0cyh7XG4gICAgICAgICAga2V5SW1hZ2U6IHtcbiAgICAgICAgICAgIGhleDoga2V5SW1hZ2VcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0cy5sZW5ndGgsIDEpO1xuICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0c1swXS5nZXRLZXlJbWFnZSgpLmdldEhleCgpLCBrZXlJbWFnZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaXQoXCJUZXN0IGRldmVsb3BlciBndWlkZSBzZW5kIGZ1bmRzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8vIGNyZWF0ZSBpbi1tZW1vcnkgdGVzdCB3YWxsZXQgd2l0aCByYW5kb21seSBnZW5lcmF0ZWQgc2VlZFxuICAgICAgICBsZXQgd2FsbGV0ID0gYXdhaXQgbW9uZXJvVHMuY3JlYXRlV2FsbGV0RnVsbCh7XG4gICAgICAgICAgcGFzc3dvcmQ6IFwiYWJjdGVzdGluZzEyM1wiLFxuICAgICAgICAgIG5ldHdvcmtUeXBlOiBtb25lcm9Ucy5Nb25lcm9OZXR3b3JrVHlwZS5URVNUTkVULFxuICAgICAgICAgIHNlcnZlcjogXCJodHRwOi8vbG9jYWxob3N0OjI4MDgxXCIsXG4gICAgICAgICAgcHJveHlUb1dvcmtlcjogVGVzdFV0aWxzLlBST1hZX1RPX1dPUktFUlxuICAgICAgICB9KTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGNyZWF0ZSBhIHRyYW5zYWN0aW9uIHRvIHNlbmQgZnVuZHMgdG8gYW4gYWRkcmVzcywgYnV0IGRvIG5vdCByZWxheVxuICAgICAgICAgIGxldCB0eCA9IGF3YWl0IHdhbGxldC5jcmVhdGVUeCh7XG4gICAgICAgICAgICBhY2NvdW50SW5kZXg6IDAsICAvLyBzb3VyY2UgYWNjb3VudCB0byBzZW5kIGZ1bmRzIGZyb21cbiAgICAgICAgICAgIGFkZHJlc3M6IFwiOXRzVWlHOWJ3Y1U3b1RiQWRCd0JrMlB6eEZ0eXNnZTVxY0VzSEVwZXRtRUtnZXJIUWExZkRxSDdhNEZpcXVabW1zN3lNMjJqZGlmVkFEN2pBYjJlNjNHU0pNdWhZNzVcIixcbiAgICAgICAgICAgIGFtb3VudDogMTAwMDAwMDAwMDAwMG4gLy8gc2VuZCAxIFhNUiAoZGVub21pbmF0ZWQgaW4gYXRvbWljIHVuaXRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGNhbiBjb25maXJtIHdpdGggdGhlIHVzZXJcbiAgICAgICAgICBsZXQgZmVlID0gdHguZ2V0RmVlKCk7ICAvLyBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBzZW5kLi4uID9cIlxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHJlbGF5IHRoZSB0cmFuc2FjdGlvblxuICAgICAgICAgIGxldCBoYXNoID0gYXdhaXQgd2FsbGV0LnJlbGF5VHgodHgpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIGlmIChlcnIubWVzc2FnZSAhPT0gXCJub3QgZW5vdWdoIG1vbmV5XCIpIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzZW5kIGZ1bmRzIHRvIGEgc2luZ2xlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgbGV0IHR4ID0gYXdhaXQgd2FsbGV0LmNyZWF0ZVR4KHtcbiAgICAgICAgICAgIGFjY291bnRJbmRleDogMCwgIC8vIHNvdXJjZSBhY2NvdW50IHRvIHNlbmQgZnVuZHMgZnJvbVxuICAgICAgICAgICAgYWRkcmVzczogXCI5dHNVaUc5YndjVTdvVGJBZEJ3QmsyUHp4RnR5c2dlNXFjRXNIRXBldG1FS2dlckhRYTFmRHFIN2E0RmlxdVptbXM3eU0yMmpkaWZWQUQ3akFiMmU2M0dTSk11aFk3NVwiLFxuICAgICAgICAgICAgYW1vdW50OiAxMDAwMDAwMDAwMDAwbiwgLy8gc2VuZCAxIFhNUiAoZGVub21pbmF0ZWQgaW4gYXRvbWljIHVuaXRzKVxuICAgICAgICAgICAgcmVsYXk6IHRydWUgLy8gcmVsYXkgdGhlIHRyYW5zYWN0aW9uIHRvIHRoZSBuZXR3b3JrXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgaWYgKGVyci5tZXNzYWdlICE9PSBcIm5vdCBlbm91Z2ggbW9uZXlcIikgdGhyb3cgZXJyO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzZW5kIGZ1bmRzIGZyb20gYSBzcGVjaWZpYyBzdWJhZGRyZXNzIHRvIG11bHRpcGxlIGRlc3RpbmF0aW9ucyxcbiAgICAgICAgICAvLyBhbGxvd2luZyB0cmFuc2ZlcnMgdG8gYmUgc3BsaXQgYWNyb3NzIG11bHRpcGxlIHRyYW5zYWN0aW9ucyBpZiBuZWVkZWRcbiAgICAgICAgICBsZXQgdHhzID0gYXdhaXQgd2FsbGV0LmNyZWF0ZVR4cyh7XG4gICAgICAgICAgICBhY2NvdW50SW5kZXg6IDAsICAgIC8vIHNvdXJjZSBhY2NvdW50IHRvIHNlbmQgZnVuZHMgZnJvbVxuICAgICAgICAgICAgc3ViYWRkcmVzc0luZGV4OiAxLCAvLyBzb3VyY2Ugc3ViYWRkcmVzcyB0byBzZW5kIGZ1bmRzIGZyb21cbiAgICAgICAgICAgIGRlc3RpbmF0aW9uczogW3tcbiAgICAgICAgICAgICAgICBhZGRyZXNzOiBcIjl0c1VpRzlid2NVN29UYkFkQndCazJQenhGdHlzZ2U1cWNFc0hFcGV0bUVLZ2VySFFhMWZEcUg3YTRGaXF1Wm1tczd5TTIyamRpZlZBRDdqQWIyZTYzR1NKTXVoWTc1XCIsXG4gICAgICAgICAgICAgICAgYW1vdW50OiA1MDAwMDAwMDAwMDBuLCAvLyBzZW5kIDAuNSBYTVIgKGRlbm9taW5hdGVkIGluIGF0b21pYyB1bml0cylcbiAgICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIGFkZHJlc3M6IFwiOXRzVWlHOWJ3Y1U3b1RiQWRCd0JrMlB6eEZ0eXNnZTVxY0VzSEVwZXRtRUtnZXJIUWExZkRxSDdhNEZpcXVabW1zN3lNMjJqZGlmVkFEN2pBYjJlNjNHU0pNdWhZNzVcIixcbiAgICAgICAgICAgICAgICBhbW91bnQ6IDUwMDAwMDAwMDAwMG4sIC8vIHNlbmQgMC41IFhNUiAoZGVub21pbmF0ZWQgaW4gYXRvbWljIHVuaXRzKVxuICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgIHByaW9yaXR5OiBtb25lcm9Ucy5Nb25lcm9UeFByaW9yaXR5LkVMRVZBVEVELFxuICAgICAgICAgICAgcmVsYXk6IHRydWUgLy8gcmVsYXkgdGhlIHRyYW5zYWN0aW9uIHRvIHRoZSBuZXR3b3JrXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgaWYgKGVyci5tZXNzYWdlICE9PSBcIm5vdCBlbm91Z2ggbW9uZXlcIikgdGhyb3cgZXJyO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzd2VlcCBhbiBvdXRwdXRcbiAgICAgICAgICBsZXQgdHggPSBhd2FpdCB3YWxsZXQuc3dlZXBPdXRwdXQoe1xuICAgICAgICAgICAgYWRkcmVzczogXCI5dHNVaUc5YndjVTdvVGJBZEJ3QmsyUHp4RnR5c2dlNXFjRXNIRXBldG1FS2dlckhRYTFmRHFIN2E0RmlxdVptbXM3eU0yMmpkaWZWQUQ3akFiMmU2M0dTSk11aFk3NVwiLFxuICAgICAgICAgICAga2V5SW1hZ2U6IFwiYjdhZmQ2YWZiYjE2MTVjOThiMWMwMzUwYjgxYzk4YTc3ZDZkNGZjMGFiOTIwMjBkMjVmZDc2YWNhMDkxNGYxZVwiLFxuICAgICAgICAgICAgcmVsYXk6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICBpZiAoZXJyLm1lc3NhZ2UgIT09IFwiTm8gb3V0cHV0cyBmb3VuZFwiKSB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gc3dlZXAgYWxsIHVubG9ja2VkIGZ1bmRzIGluIGEgd2FsbGV0XG4gICAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHdhbGxldC5zd2VlcFVubG9ja2VkKHtcbiAgICAgICAgICAgIGFkZHJlc3M6IFwiOXRzVWlHOWJ3Y1U3b1RiQWRCd0JrMlB6eEZ0eXNnZTVxY0VzSEVwZXRtRUtnZXJIUWExZkRxSDdhNEZpcXVabW1zN3lNMjJqZGlmVkFEN2pBYjJlNjNHU0pNdWhZNzVcIixcbiAgICAgICAgICAgIHJlbGF5OiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgaWYgKGVyci5tZXNzYWdlICE9PSBcIk5vIHVubG9ja2VkIGJhbGFuY2UgaW4gdGhlIHNwZWNpZmllZCBhY2NvdW50XCIpIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzd2VlcCB1bmxvY2tlZCBmdW5kcyBpbiBhbiBhY2NvdW50XG4gICAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHdhbGxldC5zd2VlcFVubG9ja2VkKHtcbiAgICAgICAgICAgIGFjY291bnRJbmRleDogMCxcbiAgICAgICAgICAgIGFkZHJlc3M6IFwiOXRzVWlHOWJ3Y1U3b1RiQWRCd0JrMlB6eEZ0eXNnZTVxY0VzSEVwZXRtRUtnZXJIUWExZkRxSDdhNEZpcXVabW1zN3lNMjJqZGlmVkFEN2pBYjJlNjNHU0pNdWhZNzVcIixcbiAgICAgICAgICAgIHJlbGF5OiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgaWYgKGVyci5tZXNzYWdlICE9PSBcIk5vIHVubG9ja2VkIGJhbGFuY2UgaW4gdGhlIHNwZWNpZmllZCBhY2NvdW50XCIpIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBzd2VlcCB1bmxvY2tlZCBmdW5kcyBpbiBhIHN1YmFkZHJlc3NcbiAgICAgICAgICBsZXQgdHhzID0gYXdhaXQgd2FsbGV0LnN3ZWVwVW5sb2NrZWQoe1xuICAgICAgICAgICAgYWNjb3VudEluZGV4OiAwLFxuICAgICAgICAgICAgc3ViYWRkcmVzc0luZGV4OiAwLFxuICAgICAgICAgICAgYWRkcmVzczogXCI5dHNVaUc5YndjVTdvVGJBZEJ3QmsyUHp4RnR5c2dlNXFjRXNIRXBldG1FS2dlckhRYTFmRHFIN2E0RmlxdVptbXM3eU0yMmpkaWZWQUQ3akFiMmU2M0dTSk11aFk3NVwiLFxuICAgICAgICAgICAgcmVsYXk6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICBpZiAoZXJyLm1lc3NhZ2UgIT09IFwiTm8gdW5sb2NrZWQgYmFsYW5jZSBpbiB0aGUgc3BlY2lmaWVkIGFjY291bnRcIikgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIl0sIm1hcHBpbmdzIjoieUxBQUEsSUFBQUEsT0FBQSxHQUFBQyxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUMsVUFBQSxHQUFBRixzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUUsUUFBQSxHQUFBQyx1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