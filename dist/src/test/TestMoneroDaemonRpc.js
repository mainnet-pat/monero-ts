"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _assert = _interopRequireDefault(require("assert"));
var _TestUtils = _interopRequireDefault(require("./utils/TestUtils"));
var _index = require("../../index");




















// context for testing binary blocks
// TODO: binary blocks have inconsistent client-side pruning
// TODO: get_blocks_by_height.bin does not return output indices (#5127)
const BINARY_BLOCK_CTX = { hasHex: false, headerIsFull: false, hasTxs: true, ctx: { isPruned: false, isConfirmed: true, fromGetTxPool: false, hasOutputIndices: false, fromBinaryBlock: true } };

/**
 * Tests a Monero daemon.
 */
class TestMoneroDaemonRpc {

  // static variables
  static MAX_REQ_SIZE = "3000000";
  static DEFAULT_ID = "0000000000000000000000000000000000000000000000000000000000000000"; // uninitialized tx or block hash from daemon rpc
  static NUM_HEADERS_PER_REQ = 750; // number of headers to fetch and cache per request

  // state variables




  constructor(testConfig) {
    this.testConfig = testConfig;
    _TestUtils.default.WALLET_TX_TRACKER.reset(); // all wallets need to wait for txs to confirm to reliably sync
  }

  /**
   * Run all tests.
   */
  runTests() {
    let that = this;
    let testConfig = this.testConfig;
    describe("TEST MONERO DAEMON RPC", function () {

      // initialize wallet before all tests
      before(async function () {
        try {
          that.wallet = await _TestUtils.default.getWalletRpc();
          that.daemon = await _TestUtils.default.getDaemonRpc();
          _TestUtils.default.WALLET_TX_TRACKER.reset(); // all wallets need to wait for txs to confirm to reliably sync
        } catch (e) {
          console.error("Error before tests: ");
          console.error(e);
          throw e;
        }
      });

      // -------------------------- TEST NON RELAYS ---------------------------

      if (testConfig.testNonRelays && !_index.GenUtils.isBrowser())
      it("Can start and stop a daemon process", async function () {

        // create command to start monerod process
        let cmd = [
        _TestUtils.default.DAEMON_LOCAL_PATH,
        "--" + _index.GenUtils.getEnumKeyByValue(_index.MoneroNetworkType, _TestUtils.default.NETWORK_TYPE).toLowerCase(),
        "--no-igd",
        "--hide-my-port",
        "--data-dir", _TestUtils.default.MONERO_BINS_DIR + "/node1",
        "--p2p-bind-port", "58080",
        "--rpc-bind-port", "58081",
        "--rpc-login", "superuser:abctesting123",
        "--zmq-rpc-bind-port", "58082"];


        // start monerod process from command
        let daemon = await (0, _index.connectToDaemonRpc)(cmd);

        // query daemon
        let connection = await daemon.getRpcConnection();
        _assert.default.equal("http://127.0.0.1:58081", connection.getUri());
        _assert.default.equal("superuser", connection.getUsername());
        _assert.default.equal("abctesting123", connection.getPassword());
        (0, _assert.default)((await daemon.getHeight()) > 0);
        let info = await daemon.getInfo();
        testInfo(info);

        // stop daemon
        await daemon.stopProcess();
      });

      if (testConfig.testNonRelays)
      it("Can get the daemon's version", async function () {
        let version = await that.daemon.getVersion();
        (0, _assert.default)(version.getNumber() > 0);
        _assert.default.equal(typeof version.getIsRelease(), "boolean");
      });

      if (testConfig.testNonRelays)
      it("Can indicate if it's trusted", async function () {
        let isTrusted = await that.daemon.isTrusted();
        _assert.default.equal(typeof isTrusted, "boolean");
      });

      if (testConfig.testNonRelays)
      it("Can get the blockchain height", async function () {
        let height = await that.daemon.getHeight();
        (0, _assert.default)(height, "Height must be initialized");
        (0, _assert.default)(height > 0, "Height must be greater than 0");
      });

      if (testConfig.testNonRelays)
      it("Can get a block hash by height", async function () {
        let lastHeader = await that.daemon.getLastBlockHeader();
        let hash = await that.daemon.getBlockHash(lastHeader.getHeight());
        (0, _assert.default)(hash);
        _assert.default.equal(hash.length, 64);
      });

      if (testConfig.testNonRelays)
      it("Can get a block template", async function () {
        let template = await that.daemon.getBlockTemplate(_TestUtils.default.ADDRESS, 2);
        testBlockTemplate(template);
      });

      if (testConfig.testNonRelays)
      it("Can get the last block's header", async function () {
        let lastHeader = await that.daemon.getLastBlockHeader();
        testBlockHeader(lastHeader, true);
      });

      if (testConfig.testNonRelays)
      it("Can get a block header by hash", async function () {

        // retrieve by hash of last block
        let lastHeader = await that.daemon.getLastBlockHeader();
        let hash = await that.daemon.getBlockHash(lastHeader.getHeight());
        let header = await that.daemon.getBlockHeaderByHash(hash);
        testBlockHeader(header, true);
        _assert.default.deepEqual(header, lastHeader);

        // retrieve by hash of previous to last block
        hash = await that.daemon.getBlockHash(lastHeader.getHeight() - 1);
        header = await that.daemon.getBlockHeaderByHash(hash);
        testBlockHeader(header, true);
        _assert.default.equal(header.getHeight(), lastHeader.getHeight() - 1);
      });

      if (testConfig.testNonRelays)
      it("Can get a block header by height", async function () {

        // retrieve by height of last block
        let lastHeader = await that.daemon.getLastBlockHeader();
        let header = await that.daemon.getBlockHeaderByHeight(lastHeader.getHeight());
        testBlockHeader(header, true);
        _assert.default.deepEqual(header, lastHeader);

        // retrieve by height of previous to last block
        header = await that.daemon.getBlockHeaderByHeight(lastHeader.getHeight() - 1);
        testBlockHeader(header, true);
        _assert.default.equal(header.getHeight(), lastHeader.getHeight() - 1);
      });

      // TODO: test start with no end, vice versa, inclusivity
      if (testConfig.testNonRelays)
      it("Can get block headers by range", async function () {

        // determine start and end height based on number of blocks and how many blocks ago
        let numBlocks = 100;
        let numBlocksAgo = 100;
        let currentHeight = await that.daemon.getHeight();
        let startHeight = currentHeight - numBlocksAgo;
        let endHeight = currentHeight - (numBlocksAgo - numBlocks) - 1;

        // fetch headers
        let headers = await that.daemon.getBlockHeadersByRange(startHeight, endHeight);

        // test headers
        _assert.default.equal(headers.length, numBlocks);
        for (let i = 0; i < numBlocks; i++) {
          let header = headers[i];
          _assert.default.equal(header.getHeight(), startHeight + i);
          testBlockHeader(header, true);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get a block by hash", async function () {

        // context for testing blocks
        let testBlockCtx = { hasHex: true, headerIsFull: true, hasTxs: false };

        // retrieve by hash of last block
        let lastHeader = await that.daemon.getLastBlockHeader();
        let hash = await that.daemon.getBlockHash(lastHeader.getHeight());
        let block = await that.daemon.getBlockByHash(hash);
        testBlock(block, testBlockCtx);
        _assert.default.deepEqual(block, await that.daemon.getBlockByHeight(block.getHeight()));
        (0, _assert.default)(block.getTxs() === undefined);

        // retrieve by hash of previous to last block
        hash = await that.daemon.getBlockHash(lastHeader.getHeight() - 1);
        block = await that.daemon.getBlockByHash(hash);
        testBlock(block, testBlockCtx);
        _assert.default.deepEqual(block, await that.daemon.getBlockByHeight(lastHeader.getHeight() - 1));
        (0, _assert.default)(block.getTxs() === undefined);
      });

      if (testConfig.testNonRelays)
      it("Can get blocks by hash which includes transactions (binary)", async function () {
        throw new Error("Not implemented");
      });

      if (testConfig.testNonRelays)
      it("Can get a block by height", async function () {

        // context for testing blocks
        let testBlockCtx = { hasHex: true, headerIsFull: true, hasTxs: false };

        // retrieve by height of last block
        let lastHeader = await that.daemon.getLastBlockHeader();
        let block = await that.daemon.getBlockByHeight(lastHeader.getHeight());
        testBlock(block, testBlockCtx);
        _assert.default.deepEqual(block, await that.daemon.getBlockByHeight(block.getHeight()));

        // retrieve by height of previous to last block
        block = await that.daemon.getBlockByHeight(lastHeader.getHeight() - 1);
        testBlock(block, testBlockCtx);
        _assert.default.deepEqual(block.getHeight(), lastHeader.getHeight() - 1);
      });

      if (testConfig.testNonRelays)
      it("Can get blocks by height which includes transactions (binary)", async function () {

        // set number of blocks to test
        const numBlocks = 200;

        // select random heights  // TODO: this is horribly inefficient way of computing last 100 blocks if not shuffling
        let currentHeight = await that.daemon.getHeight();
        let allHeights = [];
        for (let i = 0; i < currentHeight - 1; i++) allHeights.push(i);
        //GenUtils.shuffle(allHeights);
        let heights = [];
        for (let i = allHeights.length - numBlocks; i < allHeights.length; i++) heights.push(allHeights[i]);

        //heights.push(allHeights[i]);

        // fetch blocks
        let blocks = await that.daemon.getBlocksByHeight(heights);

        // test blocks
        let txFound = false;
        _assert.default.equal(blocks.length, numBlocks);
        for (let i = 0; i < heights.length; i++) {
          let block = blocks[i];
          if (block.getTxs().length) txFound = true;
          testBlock(block, BINARY_BLOCK_CTX);
          _assert.default.equal(block.getHeight(), heights[i]);
        }
        (0, _assert.default)(txFound, "No transactions found to test");
      });

      if (testConfig.testNonRelays)
      it("Can get blocks by range in a single request", async function () {

        // get height range
        let numBlocks = 100;
        let numBlocksAgo = 190;
        (0, _assert.default)(numBlocks > 0);
        (0, _assert.default)(numBlocksAgo >= numBlocks);
        let height = await that.daemon.getHeight();
        (0, _assert.default)(height - numBlocksAgo + numBlocks - 1 < height);
        let startHeight = height - numBlocksAgo;
        let endHeight = height - numBlocksAgo + numBlocks - 1;

        // test known start and end heights
        await testGetBlocksRange(startHeight, endHeight, height, false);

        // test unspecified start
        await testGetBlocksRange(undefined, numBlocks - 1, height, false);

        // test unspecified end
        await testGetBlocksRange(height - numBlocks - 1, undefined, height, false);
      });

      // Can get blocks by range using chunked requests
      if (testConfig.testNonRelays)
      it("Can get blocks by range using chunked requests", async function () {

        // get long height range
        let numBlocks = Math.min((await that.daemon.getHeight()) - 2, 1440); // test up to ~2 days of blocks
        (0, _assert.default)(numBlocks > 0);
        let height = await that.daemon.getHeight();
        (0, _assert.default)(height - numBlocks - 1 < height);
        let startHeight = height - numBlocks;
        let endHeight = height - 1;

        // test known start and end heights
        await testGetBlocksRange(startHeight, endHeight, height, true);

        // test unspecified start
        await testGetBlocksRange(undefined, numBlocks - 1, height, true);

        // test unspecified end
        await testGetBlocksRange(endHeight - numBlocks - 1, undefined, height, true);
      });

      async function testGetBlocksRange(startHeight, endHeight, chainHeight, chunked) {

        // fetch blocks by range
        let realStartHeight = startHeight === undefined ? 0 : startHeight;
        let realEndHeight = endHeight === undefined ? chainHeight - 1 : endHeight;
        let blocks = chunked ? await that.daemon.getBlocksByRangeChunked(startHeight, endHeight) : await that.daemon.getBlocksByRange(startHeight, endHeight);
        _assert.default.equal(blocks.length, realEndHeight - realStartHeight + 1);

        // test each block
        for (let i = 0; i < blocks.length; i++) {
          _assert.default.equal(blocks[i].getHeight(), realStartHeight + i);
          testBlock(blocks[i], BINARY_BLOCK_CTX);
        }
      }

      if (testConfig.testNonRelays)
      it("Can get block hashes (binary)", async function () {
        //get_hashes.bin
        throw new Error("Not implemented");
      });

      if (testConfig.testNonRelays)
      it("Can get a transaction by hash with and without pruning", async function () {

        // fetch transaction hashes to test
        let txHashes = await getConfirmedTxHashes(that.daemon);

        // fetch each tx by hash without pruning
        for (let txHash of txHashes) {
          let tx = await that.daemon.getTx(txHash);
          testTx(tx, { isPruned: false, isConfirmed: true, fromGetTxPool: false });
        }

        // fetch each tx by hash with pruning
        for (let txHash of txHashes) {
          let tx = await that.daemon.getTx(txHash, true);
          testTx(tx, { isPruned: true, isConfirmed: true, fromGetTxPool: false });
        }

        // fetch invalid hash
        try {
          await that.daemon.getTx("invalid tx hash");
          throw new Error("fail");
        } catch (e) {
          _assert.default.equal("Invalid transaction hash", e.message);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get transactions by hashes with and without pruning", async function () {

        // fetch transaction hashes to test
        let txHashes = await getConfirmedTxHashes(that.daemon);
        (0, _assert.default)(txHashes.length > 0);

        // fetch txs by hash without pruning
        let txs = await that.daemon.getTxs(txHashes);
        _assert.default.equal(txs.length, txHashes.length);
        for (let tx of txs) {
          testTx(tx, { isPruned: false, isConfirmed: true, fromGetTxPool: false });
        }

        // fetch txs by hash with pruning
        txs = await that.daemon.getTxs(txHashes, true);
        _assert.default.equal(txs.length, txHashes.length);
        for (let tx of txs) {
          testTx(tx, { isPruned: true, isConfirmed: true, fromGetTxPool: false });
        }

        // fetch missing hash
        let tx = await that.wallet.createTx({ accountIndex: 0, address: await that.wallet.getPrimaryAddress(), amount: _TestUtils.default.MAX_FEE });
        _assert.default.equal(undefined, await that.daemon.getTx(tx.getHash()));
        txHashes.push(tx.getHash());
        let numTxs = txs.length;
        txs = await that.daemon.getTxs(txHashes);
        _assert.default.equal(numTxs, txs.length);

        // fetch invalid hash
        txHashes.push("invalid tx hash");
        try {
          await that.daemon.getTxs(txHashes);
          throw new Error("fail");
        } catch (e) {
          _assert.default.equal("Invalid transaction hash", e.message);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get transactions by hashes that are in the transaction pool", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet); // wait for wallet's txs in the pool to clear to ensure reliable sync

        // submit txs to the pool but don't relay
        let txHashes = [];
        for (let i = 1; i < 3; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
          _assert.default.equal(result.getIsRelayed(), false);
          txHashes.push(tx.getHash());
        }

        // fetch txs by hash
        let txs = await that.daemon.getTxs(txHashes);

        // test fetched txs
        _assert.default.equal(txs.length, txHashes.length);
        for (let tx of txs) {
          testTx(tx, { isConfirmed: false, fromGetTxPool: false, isPruned: false });
        }

        // clear txs from pool
        await that.daemon.flushTxPool(txHashes);
        await that.wallet.sync();
      });

      if (testConfig.testNonRelays)
      it("Can get a transaction hex by hash with and without pruning", async function () {

        // fetch transaction hashes to test
        let txHashes = await getConfirmedTxHashes(that.daemon);

        // fetch each tx hex by hash with and without pruning
        let hexes = [];
        let hexesPruned = [];
        for (let txHash of txHashes) {
          hexes.push(await that.daemon.getTxHex(txHash));
          hexesPruned.push(await that.daemon.getTxHex(txHash, true));
        }

        // test results
        _assert.default.equal(hexes.length, txHashes.length);
        _assert.default.equal(hexesPruned.length, txHashes.length);
        for (let i = 0; i < hexes.length; i++) {
          _assert.default.equal(typeof hexes[i], "string");
          _assert.default.equal(typeof hexesPruned[i], "string");
          (0, _assert.default)(hexesPruned[i].length > 0);
          (0, _assert.default)(hexes[i].length > hexesPruned[i].length); // pruned hex is shorter
        }

        // fetch invalid hash
        try {
          await that.daemon.getTxHex("invalid tx hash");
          throw new Error("fail");
        } catch (e) {
          _assert.default.equal("Invalid transaction hash", e.message);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get transaction hexes by hashes with and without pruning", async function () {

        // fetch transaction hashes to test
        let txHashes = await getConfirmedTxHashes(that.daemon);

        // fetch tx hexes by hash with and without pruning
        let hexes = await that.daemon.getTxHexes(txHashes);
        let hexesPruned = await that.daemon.getTxHexes(txHashes, true);

        // test results
        _assert.default.equal(hexes.length, txHashes.length);
        _assert.default.equal(hexesPruned.length, txHashes.length);
        for (let i = 0; i < hexes.length; i++) {
          _assert.default.equal(typeof hexes[i], "string");
          _assert.default.equal(typeof hexesPruned[i], "string");
          (0, _assert.default)(hexesPruned[i].length > 0);
          (0, _assert.default)(hexes[i].length > hexesPruned[i].length); // pruned hex is shorter
        }

        // fetch invalid hash
        txHashes.push("invalid tx hash");
        try {
          await that.daemon.getTxHexes(txHashes);
          throw new Error("fail");
        } catch (e) {
          _assert.default.equal("Invalid transaction hash", e.message);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get the miner transaction sum", async function () {
        let sum = await that.daemon.getMinerTxSum(0, Math.min(50000, await that.daemon.getHeight()));
        testMinerTxSum(sum);
      });

      if (testConfig.testNonRelays)
      it("Can get a fee estimate", async function () {
        let feeEstimate = await that.daemon.getFeeEstimate();
        _TestUtils.default.testUnsignedBigInt(feeEstimate.getFee(), true);
        (0, _assert.default)(feeEstimate.getFees().length === 4); // slow, normal, fast, fastest
        for (let i = 0; i < 4; i++) _TestUtils.default.testUnsignedBigInt(feeEstimate.getFees()[i], true);
        _TestUtils.default.testUnsignedBigInt(feeEstimate.getQuantizationMask(), true);
      });

      if (testConfig.testNonRelays)
      it("Can get all transactions in the transaction pool", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // submit tx to pool but don't relay
        let tx = await getUnrelayedTx(that.wallet, 0);
        let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
        testSubmitTxResultGood(result);
        _assert.default.equal(result.getIsRelayed(), false);

        // fetch txs in pool
        let txs = await that.daemon.getTxPool();

        // test txs
        (0, _assert.default)(Array.isArray(txs));
        (0, _assert.default)(txs.length > 0, "Test requires an unconfirmed tx in the tx pool");
        for (let tx of txs) {
          testTx(tx, { isPruned: false, isConfirmed: false, fromGetTxPool: true });
        }

        // flush the tx from the pool, gg
        await that.daemon.flushTxPool(tx.getHash());
        await that.wallet.sync();
      });

      if (testConfig.testNonRelays)
      it("Can get hashes of transactions in the transaction pool (binary)", async function () {
        // TODO: get_transaction_pool_hashes.bin
        throw new Error("Not implemented");
      });

      if (testConfig.testNonRelays)
      it("Can get the transaction pool backlog (binary)", async function () {
        // TODO: get_txpool_backlog
        throw new Error("Not implemented");
      });

      if (testConfig.testNonRelays)
      it("Can get transaction pool statistics", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        let err;
        let txIds = [];
        try {

          // submit txs to the pool but don't relay
          for (let i = 1; i < 3; i++) {

            // submit tx hex
            let tx = await getUnrelayedTx(that.wallet, i);
            let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
            _assert.default.equal(result.getIsGood(), true, "Bad tx submit result: " + result.toJson());

            // get tx pool stats
            let stats = await that.daemon.getTxPoolStats();
            (0, _assert.default)(stats.getNumTxs() > i - 1);
            testTxPoolStats(stats);
          }
        } catch (e) {
          err = e;
        }

        // flush txs
        await that.daemon.flushTxPool(txIds);
        if (err) throw err;
      });

      if (testConfig.testNonRelays)
      it("Can flush all transactions from the pool", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // preserve original transactions in the pool
        let txPoolBefore = await that.daemon.getTxPool();

        // submit txs to the pool but don't relay
        for (let i = 0; i < 2; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
        }
        _assert.default.equal((await that.daemon.getTxPool()).length, txPoolBefore.length + 2);

        // flush tx pool
        await that.daemon.flushTxPool();
        _assert.default.equal((await that.daemon.getTxPool()).length, 0);

        // re-submit original transactions
        for (let tx of txPoolBefore) {
          let result = await that.daemon.submitTxHex(tx.getFullHex(), tx.getIsRelayed());
          testSubmitTxResultGood(result);
        }

        // pool is back to original state
        _assert.default.equal((await that.daemon.getTxPool()).length, txPoolBefore.length);

        // sync wallet for next test
        await that.wallet.sync();
      });

      if (testConfig.testNonRelays)
      it("Can flush a transaction from the pool by hash", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // preserve original transactions in the pool
        let txPoolBefore = await that.daemon.getTxPool();

        // submit txs to the pool but don't relay
        let txs = [];
        for (let i = 1; i < 3; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
          txs.push(tx);
        }

        // remove each tx from the pool by hash and test
        for (let i = 0; i < txs.length; i++) {

          // flush tx from pool
          await that.daemon.flushTxPool(txs[i].getHash());

          // test tx pool
          let poolTxs = await that.daemon.getTxPool();
          _assert.default.equal(poolTxs.length, txs.length - i - 1);
        }

        // pool is back to original state
        _assert.default.equal((await that.daemon.getTxPool()).length, txPoolBefore.length);

        // sync wallet for next test
        await that.wallet.sync();
      });

      if (testConfig.testNonRelays)
      it("Can flush transactions from the pool by hashes", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // preserve original transactions in the pool
        let txPoolBefore = await that.daemon.getTxPool();

        // submit txs to the pool but don't relay
        let txHashes = [];
        for (let i = 1; i < 3; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
          txHashes.push(tx.getHash());
        }
        _assert.default.equal((await that.daemon.getTxPool()).length, txPoolBefore.length + txHashes.length);

        // remove all txs by hashes
        await that.daemon.flushTxPool(txHashes);

        // pool is back to original state
        _assert.default.equal((await that.daemon.getTxPool()).length, txPoolBefore.length, "Tx pool size is different from start");
        await that.wallet.sync();
      });

      if (testConfig.testNonRelays)
      it("Can get the spent status of key images", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // submit txs to the pool to collect key images then flush them
        let txs = [];
        for (let i = 1; i < 3; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          await that.daemon.submitTxHex(tx.getFullHex(), true);
          txs.push(tx);
        }
        let keyImages = [];
        let txHashes = txs.map((tx) => tx.getHash());
        for (let tx of await that.daemon.getTxs(txHashes)) {
          for (let input of tx.getInputs()) keyImages.push(input.getKeyImage().getHex());
        }
        await that.daemon.flushTxPool(txHashes);

        // key images are not spent
        await testSpentStatuses(keyImages, _index.MoneroKeyImageSpentStatus.NOT_SPENT);

        // submit txs to the pool but don't relay
        for (let tx of txs) await that.daemon.submitTxHex(tx.getFullHex(), true);

        // key images are in the tx pool
        await testSpentStatuses(keyImages, _index.MoneroKeyImageSpentStatus.TX_POOL);

        // collect key images of confirmed txs
        keyImages = [];
        txs = await getConfirmedTxs(that.daemon, 10);
        for (let tx of txs) {
          for (let input of tx.getInputs()) keyImages.push(input.getKeyImage().getHex());
        }

        // key images are all spent
        await testSpentStatuses(keyImages, _index.MoneroKeyImageSpentStatus.CONFIRMED);

        // flush this test's txs from pool
        await that.daemon.flushTxPool(txHashes);

        // helper function to check the spent status of a key image or array of key images
        async function testSpentStatuses(keyImages, expectedStatus) {

          // test image
          for (let keyImage of keyImages) {
            _assert.default.equal(await that.daemon.getKeyImageSpentStatus(keyImage), expectedStatus);
          }

          // test array of images
          let statuses = keyImages.length == 0 ? [] : await that.daemon.getKeyImageSpentStatuses(keyImages);
          (0, _assert.default)(Array.isArray(statuses));
          _assert.default.equal(statuses.length, keyImages.length);
          for (let status of statuses) _assert.default.equal(status, expectedStatus);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get output indices given a list of transaction hashes (binary)", async function () {
        throw new Error("Not implemented"); // get_o_indexes.bin
      });

      if (testConfig.testNonRelays)
      it("Can get outputs given a list of output amounts and indices (binary)", async function () {
        throw new Error("Not implemented"); // get_outs.bin
      });

      if (testConfig.testNonRelays)
      it("Can get an output histogram (binary)", async function () {
        let entries = await that.daemon.getOutputHistogram();
        (0, _assert.default)(Array.isArray(entries));
        (0, _assert.default)(entries.length > 0);
        for (let entry of entries) {
          testOutputHistogramEntry(entry);
        }
      });

      // if (testConfig.testNonRelays)
      // it("Can get an output distribution (binary)", async function() {
      //   let amounts: bigint[] = [];
      //   amounts.push(BigInt(0));
      //   amounts.push(BigInt(1));
      //   amounts.push(BigInt(10));
      //   amounts.push(BigInt(100));
      //   amounts.push(BigInt(1000));
      //   amounts.push(BigInt(10000));
      //   amounts.push(BigInt(100000));
      //   amounts.push(BigInt(1000000));
      //   let entries = await that.daemon.getOutputDistribution(amounts);
      //   for (let entry of entries) {
      //     testOutputDistributionEntry(entry);
      //   }
      // });

      if (testConfig.testNonRelays)
      it("Can get general information", async function () {
        let info = await that.daemon.getInfo();
        testInfo(info);
      });

      if (testConfig.testNonRelays)
      it("Can get sync information", async function () {
        let syncInfo = await that.daemon.getSyncInfo();
        testSyncInfo(syncInfo);
      });

      if (testConfig.testNonRelays)
      it("Can get hard fork information", async function () {
        let hardForkInfo = await that.daemon.getHardForkInfo();
        testHardForkInfo(hardForkInfo);
      });

      if (testConfig.testNonRelays)
      it("Can get alternative chains", async function () {
        let altChains = await that.daemon.getAltChains();
        (0, _assert.default)(Array.isArray(altChains) && altChains.length >= 0);
        for (let altChain of altChains) {
          testAltChain(altChain);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get alternative block hashes", async function () {
        let altBlockHashes = await that.daemon.getAltBlockHashes();
        (0, _assert.default)(Array.isArray(altBlockHashes) && altBlockHashes.length >= 0);
        for (let altBlockHash of altBlockHashes) {
          _assert.default.equal(typeof altBlockHash, "string");
          _assert.default.equal(altBlockHash.length, 64); // TODO: common validation
        }
      });

      if (testConfig.testNonRelays)
      it("Can get, set, and reset a download bandwidth limit", async function () {
        let initVal = await that.daemon.getDownloadLimit();
        (0, _assert.default)(initVal > 0);
        let setVal = initVal * 2;
        await that.daemon.setDownloadLimit(setVal);
        _assert.default.equal(await that.daemon.getDownloadLimit(), setVal);
        let resetVal = await that.daemon.resetDownloadLimit();
        _assert.default.equal(resetVal, initVal);

        // test invalid limits
        try {
          await that.daemon.setDownloadLimit(0);
          throw new Error("Should have thrown error on invalid input");
        } catch (e) {
          _assert.default.equal("Download limit must be an integer greater than 0", e.message);
        }
        try {
          await that.daemon.setDownloadLimit(1.2);
          throw new Error("Should have thrown error on invalid input");
        } catch (e) {
          _assert.default.equal("Download limit must be an integer greater than 0", e.message);
        }
        _assert.default.equal(await that.daemon.getDownloadLimit(), initVal);
      });

      if (testConfig.testNonRelays)
      it("Can get, set, and reset an upload bandwidth limit", async function () {
        let initVal = await that.daemon.getUploadLimit();
        (0, _assert.default)(initVal > 0);
        let setVal = initVal * 2;
        await that.daemon.setUploadLimit(setVal);
        _assert.default.equal(await that.daemon.getUploadLimit(), setVal);
        let resetVal = await that.daemon.resetUploadLimit();
        _assert.default.equal(resetVal, initVal);

        // test invalid limits
        try {
          await that.daemon.setUploadLimit(0);
          throw new Error("Should have thrown error on invalid input");
        } catch (e) {
          _assert.default.equal("Upload limit must be an integer greater than 0", e.message);
        }
        try {
          await that.daemon.setUploadLimit(1.2);
          throw new Error("Should have thrown error on invalid input");
        } catch (e) {
          _assert.default.equal("Upload limit must be an integer greater than 0", e.message);
        }
        _assert.default.equal(await that.daemon.getUploadLimit(), initVal);
      });

      if (testConfig.testNonRelays)
      it("Can get peers with active incoming or outgoing peers", async function () {
        let peers = await that.daemon.getPeers();
        (0, _assert.default)(Array.isArray(peers));
        (0, _assert.default)(peers.length > 0, "Daemon has no incoming or outgoing peers to test");
        for (let peer of peers) {
          testPeer(peer);
        }
      });

      if (testConfig.testNonRelays)
      it("Can get known peers which may be online or offline", async function () {
        let peers = await that.daemon.getKnownPeers();
        (0, _assert.default)(peers.length > 0, "Daemon has no known peers to test");
        for (let peer of peers) {
          testKnownPeer(peer);
        }
      });

      if (testConfig.testNonRelays)
      it("Can limit the number of outgoing peers", async function () {
        await that.daemon.setOutgoingPeerLimit(0);
        await that.daemon.setOutgoingPeerLimit(8);
        await that.daemon.setOutgoingPeerLimit(10);
      });

      if (testConfig.testNonRelays)
      it("Can limit the number of incoming peers", async function () {
        await that.daemon.setIncomingPeerLimit(0);
        await that.daemon.setIncomingPeerLimit(8);
        await that.daemon.setIncomingPeerLimit(10);
      });

      if (testConfig.testNonRelays)
      it("Can ban a peer", async function () {

        // set ban
        let ban = new _index.MoneroBan({
          host: "192.168.1.56",
          isBanned: true,
          seconds: 60
        });
        await that.daemon.setPeerBan(ban);

        // test ban
        let bans = await that.daemon.getPeerBans();
        let found = false;
        for (let aBan of bans) {
          testMoneroBan(aBan);
          if (aBan.getHost() === "192.168.1.56") found = true;
        }
        (0, _assert.default)(found);
      });

      if (testConfig.testNonRelays)
      it("Can ban peers", async function () {

        // set bans
        let ban1 = new _index.MoneroBan();
        ban1.setHost("192.168.1.52");
        ban1.setIsBanned(true);
        ban1.setSeconds(60);
        let ban2 = new _index.MoneroBan();
        ban2.setHost("192.168.1.53");
        ban2.setIsBanned(true);
        ban2.setSeconds(60);
        let bans = [];
        bans.push(ban1);
        bans.push(ban2);
        await that.daemon.setPeerBans(bans);

        // test bans
        bans = await that.daemon.getPeerBans();
        let found1 = false;
        let found2 = false;
        for (let aBan of bans) {
          testMoneroBan(aBan);
          if (aBan.getHost() === "192.168.1.52") found1 = true;
          if (aBan.getHost() === "192.168.1.53") found2 = true;
        }
        (0, _assert.default)(found1);
        (0, _assert.default)(found2);
      });

      if (testConfig.testNonRelays)
      it("Can start and stop mining", async function () {

        // stop mining at beginning of test
        try {await that.daemon.stopMining();}
        catch (e) {}

        // generate address to mine to
        let address = await that.wallet.getPrimaryAddress();

        // start mining
        await that.daemon.startMining(address, 2, false, true);

        // stop mining
        await that.daemon.stopMining();
      });

      if (testConfig.testNonRelays)
      it("Can get mining status", async function () {

        try {

          // stop mining at beginning of test
          try {await that.daemon.stopMining();}
          catch (e) {}

          // test status without mining
          let status = await that.daemon.getMiningStatus();
          _assert.default.equal(status.getIsActive(), false);
          _assert.default.equal(status.getAddress(), undefined);
          _assert.default.equal(status.getSpeed(), 0);
          _assert.default.equal(status.getNumThreads(), 0);
          _assert.default.equal(status.getIsBackground(), undefined);

          // test status with mining
          let address = await that.wallet.getPrimaryAddress();
          let threadCount = 3;
          let isBackground = false;
          await that.daemon.startMining(address, threadCount, isBackground, true);
          status = await that.daemon.getMiningStatus();
          _assert.default.equal(status.getIsActive(), true);
          _assert.default.equal(status.getAddress(), address);
          (0, _assert.default)(status.getSpeed() >= 0);
          _assert.default.equal(status.getNumThreads(), threadCount);
          _assert.default.equal(status.getIsBackground(), isBackground);
        } catch (e) {
          throw e;
        } finally {

          // stop mining at end of test
          try {await that.daemon.stopMining();}
          catch (e) {}
        }
      });

      if (testConfig.testNonRelays)
      it("Can submit a mined block to the network", async function () {

        // get template to mine on
        let template = await that.daemon.getBlockTemplate(_TestUtils.default.ADDRESS);

        // TODO test mining and submitting block

        // try to submit block hashing blob without nonce
        try {
          await that.daemon.submitBlock(template.getBlockHashingBlob());
          throw new Error("Should have thrown error");
        } catch (e) {
          _assert.default.equal(e.getCode(), -7);
          _assert.default.equal(e.message, "Block not accepted");
        }
      });

      if (testConfig.testNonRelays)
      it("Can prune the blockchain", async function () {
        let result = await that.daemon.pruneBlockchain(true);
        if (result.getIsPruned()) {
          (0, _assert.default)(result.getPruningSeed() > 0);
        } else {
          _assert.default.equal(result.getPruningSeed(), 0);
        }
      });

      if (testConfig.testNonRelays)
      it("Can check for an update", async function () {
        let result = await that.daemon.checkForUpdate();
        testUpdateCheckResult(result);
      });

      if (testConfig.testNonRelays)
      it("Can download an update", async function () {

        // download to default path
        let result = await that.daemon.downloadUpdate();
        testUpdateDownloadResult(result);

        // download to defined path
        let path = "test_download_" + +new Date().getTime() + ".tar.bz2";
        result = await that.daemon.downloadUpdate(path);
        testUpdateDownloadResult(result, path);

        // test invalid path
        if (result.getIsUpdateAvailable()) {
          try {
            result = await that.daemon.downloadUpdate("./ohhai/there");
            throw new Error("Should have thrown error");
          } catch (e) {
            _assert.default.notEqual("Should have thrown error", e.message);
            _assert.default.equal(e.statusCode, 500); // TODO monerod: this causes a 500 in that.daemon rpc
          }
        }
      });

      if (testConfig.testNonRelays)
      it("Can be stopped", async function () {
        return; // test is disabled to not interfere with other tests

        // give the daemon time to shut down
        await new Promise(function (resolve) {setTimeout(resolve, _TestUtils.default.SYNC_PERIOD_IN_MS);});

        // stop the daemon
        await that.daemon.stop();

        // give the daemon 10 seconds to shut down
        await new Promise(function (resolve) {setTimeout(resolve, 10000);});

        // try to interact with the that.daemon
        try {
          await that.daemon.getHeight();
          throw new Error("Should have thrown error");
        } catch (e) {
          console.log(e);
          _assert.default.notEqual("Should have thrown error", e.message);
        }
      });

      // ---------------------------- TEST RELAYS -----------------------------

      if (testConfig.testRelays)
      it("Can submit a tx in hex format to the pool and relay in one call", async function () {

        // wait one time for wallet txs in the pool to clear
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);

        // create 2 txs, the second will double spend outputs of first
        let tx1 = await getUnrelayedTx(that.wallet, 2); // TODO: this test requires tx to be from/to different accounts else the occlusion issue (#4500) causes the tx to not be recognized by the wallet at all
        let tx2 = await getUnrelayedTx(that.wallet, 2);

        // submit and relay tx1
        let result = await that.daemon.submitTxHex(tx1.getFullHex());
        _assert.default.equal(result.getIsRelayed(), true);
        testSubmitTxResultGood(result);

        // tx1 is in the pool
        let txs = await that.daemon.getTxPool();
        let found = false;
        for (let aTx of txs) {
          if (aTx.getHash() === tx1.getHash()) {
            _assert.default.equal(aTx.getIsRelayed(), true);
            found = true;
            break;
          }
        }
        (0, _assert.default)(found, "Tx1 was not found after being submitted to the that.daemon's tx pool");

        // tx1 is recognized by the wallet
        await that.wallet.sync();
        await that.wallet.getTx(tx1.getHash());

        // submit and relay tx2 hex which double spends tx1
        result = await that.daemon.submitTxHex(tx2.getFullHex());
        _assert.default.equal(result.getIsRelayed(), true);
        testSubmitTxResultDoubleSpend(result);

        // tx2 is in not the pool
        txs = await that.daemon.getTxPool();
        found = false;
        for (let aTx of txs) {
          if (aTx.getHash() === tx2.getHash()) {
            found = true;
            break;
          }
        }
        (0, _assert.default)(!found, "Tx2 should not be in the pool because it double spends tx1 which is in the pool");

        // all wallets will need to wait for tx to confirm in order to properly sync
        _TestUtils.default.WALLET_TX_TRACKER.reset();
      });

      if (testConfig.testRelays && !testConfig.liteMode)
      it("Can submit a tx in hex format to the pool then relay", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        let tx = await getUnrelayedTx(that.wallet, 1);
        await testSubmitThenRelay([tx]);
      });

      if (testConfig.testRelays && !testConfig.liteMode)
      it("Can submit txs in hex format to the pool then relay", async function () {
        await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        let txs = [];
        txs.push(await getUnrelayedTx(that.wallet, 1));
        txs.push(await getUnrelayedTx(that.wallet, 2)); // TODO: accounts cannot be re-used across send tests else isRelayed is true; wallet needs to update?
        await testSubmitThenRelay(txs);
      });

      async function testSubmitThenRelay(txs) {

        // submit txs hex but don't relay
        let txHashes = [];
        for (let tx of txs) {
          txHashes.push(tx.getHash());
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
          _assert.default.equal(result.getIsRelayed(), false);

          // ensure tx is in pool
          let poolTxs = await that.daemon.getTxPool();
          let found = false;
          for (let aTx of poolTxs) {
            if (aTx.getHash() === tx.getHash()) {
              _assert.default.equal(aTx.getIsRelayed(), false);
              found = true;
              break;
            }
          }
          (0, _assert.default)(found, "Tx was not found after being submitted to the that.daemon's tx pool");

          // fetch tx by hash and ensure not relayed
          let fetchedTx = await that.daemon.getTx(tx.getHash());
          _assert.default.equal(fetchedTx.getIsRelayed(), false);
        }

        // relay the txs
        try {
          txHashes.length === 1 ? await that.daemon.relayTxByHash(txHashes[0]) : await that.daemon.relayTxsByHash(txHashes);
        } catch (e) {
          await that.daemon.flushTxPool(txHashes); // flush txs when relay fails to prevent double spends in other tests  
          throw e;
        }

        // wait for txs to be relayed // TODO (monero-project): all txs should be relayed: https://github.com/monero-project/monero/issues/8523
        await new Promise(function (resolve) {setTimeout(resolve, 1000);});

        // ensure txs are relayed
        let poolTxs = await that.daemon.getTxPool();
        for (let tx of txs) {
          let found = false;
          for (let aTx of poolTxs) {
            if (aTx.getHash() === tx.getHash()) {
              _assert.default.equal(aTx.getIsRelayed(), true);
              found = true;
              break;
            }
          }
          (0, _assert.default)(found, "Tx was not found after being submitted to the that.daemon's tx pool");
        }

        // wallets will need to wait for tx to confirm in order to properly sync
        _TestUtils.default.WALLET_TX_TRACKER.reset();
      }

      // ------------------------ TEST NOTIFICATIONS --------------------------

      if (!testConfig.liteMode && testConfig.testNotifications)
      it("Can notify listeners when a new block is added to the chain", async function () {
        let err;
        try {

          // start mining if possible to help push the network along
          let address = await that.wallet.getPrimaryAddress();
          try {await that.daemon.startMining(address, 8, false, true);}
          catch (e) {if ("BUSY" === e.message) throw e;}

          // register a listener
          let listenerHeader;
          let listener = new class extends _index.MoneroDaemonListener {
            async onBlockHeader(header) {
              listenerHeader = header;
            }
          }();
          await that.daemon.addListener(listener);

          // wait for next block notification
          let header = await that.daemon.waitForNextBlockHeader();
          await that.daemon.removeListener(listener); // otherwise daemon will keep polling
          testBlockHeader(header, true);

          // test that listener was called with equivalent header
          _assert.default.deepEqual(listenerHeader, header);
        } catch (e) {
          err = e;
        }

        // finally
        try {await that.daemon.stopMining();}
        catch (e) {}
        if (err) throw err;
      });
    });
  }
}exports.default = TestMoneroDaemonRpc;

function testBlockHeader(header, isFull) {
  (0, _assert.default)(typeof isFull === "boolean");
  (0, _assert.default)(header);
  (0, _assert.default)(header.getHeight() >= 0);
  (0, _assert.default)(header.getMajorVersion() > 0);
  (0, _assert.default)(header.getMinorVersion() >= 0);
  if (header.getHeight() === 0) (0, _assert.default)(header.getTimestamp() === 0);else
  (0, _assert.default)(header.getTimestamp() > 0);
  (0, _assert.default)(header.getPrevHash());
  (0, _assert.default)(header.getNonce() !== undefined);
  if (header.getNonce() === 0) console.log("WARNING: header nonce is 0 at height " + header.getHeight()); // TODO (monero-project): why is header nonce 0?
  else (0, _assert.default)(header.getNonce() > 0);
  _assert.default.equal(typeof header.getNonce(), "number");
  (0, _assert.default)(header.getPowHash() === undefined); // never seen defined
  (0, _assert.default)(!isFull ? undefined === header.getSize() : header.getSize());
  (0, _assert.default)(!isFull ? undefined === header.getDepth() : header.getDepth() >= 0);
  (0, _assert.default)(!isFull ? undefined === header.getDifficulty() : header.getDifficulty() > 0);
  (0, _assert.default)(!isFull ? undefined === header.getCumulativeDifficulty() : header.getCumulativeDifficulty() > 0);
  (0, _assert.default)(!isFull ? undefined === header.getHash() : header.getHash().length === 64);
  (0, _assert.default)(!isFull ? undefined === header.getMinerTxHash() : header.getMinerTxHash().length === 64);
  (0, _assert.default)(!isFull ? undefined === header.getNumTxs() : header.getNumTxs() >= 0);
  (0, _assert.default)(!isFull ? undefined === header.getOrphanStatus() : typeof header.getOrphanStatus() === "boolean");
  (0, _assert.default)(!isFull ? undefined === header.getReward() : header.getReward());
  (0, _assert.default)(!isFull ? undefined === header.getWeight() : header.getWeight());
}

// TODO: test block deep copy
function testBlock(block, ctx) {

  // check inputs
  (0, _assert.default)(ctx);
  _assert.default.equal(typeof ctx.hasHex, "boolean");
  _assert.default.equal(typeof ctx.headerIsFull, "boolean");
  _assert.default.equal(typeof ctx.hasTxs, "boolean");

  // test required fields
  (0, _assert.default)(block);
  (0, _assert.default)(Array.isArray(block.getTxHashes()));
  (0, _assert.default)(block.getTxHashes().length >= 0);
  testMinerTx(block.getMinerTx()); // TODO: miner tx doesn't have as much stuff, can't call testTx?
  testBlockHeader(block, ctx.headerIsFull);

  if (ctx.hasHex) {
    (0, _assert.default)(block.getHex());
    (0, _assert.default)(block.getHex().length > 1);
  } else {
    (0, _assert.default)(block.getHex() === undefined);
  }

  if (ctx.hasTxs) {
    (0, _assert.default)(typeof ctx.ctx === "object");
    (0, _assert.default)(block.getTxs() instanceof Array);
    for (let tx of block.getTxs()) {
      (0, _assert.default)(block === tx.getBlock());
      testTx(tx, ctx.ctx);
    }
  } else {
    (0, _assert.default)(ctx.ctx === undefined);
    (0, _assert.default)(block.getTxs() === undefined);
  }
}

function testMinerTx(minerTx) {
  (0, _assert.default)(minerTx);
  (0, _assert.default)(minerTx instanceof _index.MoneroTx);
  _assert.default.equal(typeof minerTx.getIsMinerTx(), "boolean");
  (0, _assert.default)(minerTx.getIsMinerTx());

  (0, _assert.default)(minerTx.getVersion() >= 0);
  (0, _assert.default)(minerTx.getExtra() instanceof Uint8Array);
  (0, _assert.default)(minerTx.getExtra().length > 0);
  (0, _assert.default)(minerTx.getUnlockTime() >= BigInt(0));

  // TODO: miner tx does not have hashes in binary requests so this will fail, need to derive using prunable data
  //  testTx(minerTx, {
  //    hasJson: false,
  //    isPruned: true,
  //    isFull: false,
  //    isConfirmed: true,
  //    isMinerTx: true,
  //    fromGetTxPool: false,
  //  })
}

// TODO: how to test output indices? comes back with /get_transactions, maybe others
function testTx(tx, ctx) {

  // check inputs
  (0, _assert.default)(tx);
  _assert.default.equal(typeof ctx, "object");
  _assert.default.equal(typeof ctx.isPruned, "boolean");
  _assert.default.equal(typeof ctx.isConfirmed, "boolean");
  _assert.default.equal(typeof ctx.fromGetTxPool, "boolean");

  // standard across all txs
  (0, _assert.default)(tx.getHash().length === 64);
  if (tx.getIsRelayed() === undefined) (0, _assert.default)(tx.getInTxPool()); // TODO monerod: add relayed to get_transactions
  else _assert.default.equal(typeof tx.getIsRelayed(), "boolean");
  _assert.default.equal(typeof tx.getIsConfirmed(), "boolean");
  _assert.default.equal(typeof tx.getInTxPool(), "boolean");
  _assert.default.equal(typeof tx.getIsMinerTx(), "boolean");
  _assert.default.equal(typeof tx.getIsDoubleSpendSeen(), "boolean");
  (0, _assert.default)(tx.getVersion() >= 0);
  (0, _assert.default)(tx.getUnlockTime() >= BigInt(0));
  (0, _assert.default)(tx.getInputs());
  (0, _assert.default)(tx.getOutputs());
  (0, _assert.default)(tx.getExtra() instanceof Uint8Array);
  (0, _assert.default)(tx.getExtra().length > 0);
  _TestUtils.default.testUnsignedBigInt(tx.getFee(), true);

  // test presence of output indices
  // TODO: change this over to outputs only
  if (tx.getIsMinerTx()) _assert.default.equal(tx.getOutputIndices(), undefined); // TODO: how to get output indices for miner transactions?
  if (tx.getInTxPool() || ctx.fromGetTxPool || ctx.hasOutputIndices === false) _assert.default.equal(tx.getOutputIndices(), undefined);else
  (0, _assert.default)(tx.getOutputIndices());
  if (tx.getOutputIndices()) (0, _assert.default)(tx.getOutputIndices().length > 0);

  // test confirmed ctx
  if (ctx.isConfirmed === true) _assert.default.equal(tx.getIsConfirmed(), true);
  if (ctx.isConfirmed === false) _assert.default.equal(tx.getIsConfirmed(), false);

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
    if (ctx.fromBinaryBlock) _assert.default.equal(tx.getNumConfirmations(), undefined);else
    (0, _assert.default)(tx.getNumConfirmations() > 0);
  } else {
    _assert.default.equal(tx.getBlock(), undefined);
    _assert.default.equal(tx.getNumConfirmations(), 0);
  }

  // test in tx pool
  if (tx.getInTxPool()) {
    _assert.default.equal(tx.getIsConfirmed(), false);
    _assert.default.equal(tx.getIsDoubleSpendSeen(), false);
    _assert.default.equal(tx.getLastFailedHeight(), undefined);
    _assert.default.equal(tx.getLastFailedHash(), undefined);
    (0, _assert.default)(tx.getReceivedTimestamp() > 0);
    if (ctx.fromGetTxPool) {
      (0, _assert.default)(tx.getSize() > 0);
      (0, _assert.default)(tx.getWeight() > 0);
      _assert.default.equal(typeof tx.getIsKeptByBlock(), "boolean");
      (0, _assert.default)(tx.getMaxUsedBlockHeight() >= 0);
      (0, _assert.default)(tx.getMaxUsedBlockHash());
    }
    _assert.default.equal(tx.getLastFailedHeight(), undefined);
    _assert.default.equal(tx.getLastFailedHash(), undefined);
  } else {
    _assert.default.equal(tx.getLastRelayedTimestamp(), undefined);
  }

  // test miner tx
  if (tx.getIsMinerTx()) {
    _assert.default.equal(tx.getFee(), 0n);
    _assert.default.equal(tx.getInputs(), undefined);
    _assert.default.equal(tx.getSignatures(), undefined);
  } else {
    if (tx.getSignatures() !== undefined) (0, _assert.default)(tx.getSignatures().length > 0);
  }

  // test failed  // TODO: what else to test associated with failed
  if (tx.getIsFailed()) {
    (0, _assert.default)(tx.getReceivedTimestamp() > 0);
  } else {
    if (tx.getIsRelayed() === undefined) _assert.default.equal(tx.getRelay(), undefined); // TODO monerod: add relayed to get_transactions
    else if (tx.getIsRelayed()) _assert.default.equal(tx.getIsDoubleSpendSeen(), false);else
    {
      _assert.default.equal(tx.getIsRelayed(), false);
      if (ctx.fromGetTxPool) {
        _assert.default.equal(tx.getRelay(), false);
        _assert.default.equal(typeof tx.getIsDoubleSpendSeen(), "boolean");
      }
    }
  }
  _assert.default.equal(tx.getLastFailedHeight(), undefined);
  _assert.default.equal(tx.getLastFailedHash(), undefined);

  // received time only for tx pool or failed txs
  if (tx.getReceivedTimestamp() !== undefined) {
    (0, _assert.default)(tx.getInTxPool() || tx.getIsFailed());
  }

  // test inputs and outputs
  (0, _assert.default)(tx.getInputs() && Array.isArray(tx.getInputs()) && tx.getInputs().length >= 0);
  (0, _assert.default)(tx.getOutputs() && Array.isArray(tx.getOutputs()) && tx.getOutputs().length >= 0);
  if (!tx.getIsMinerTx()) (0, _assert.default)(tx.getInputs().length > 0);
  for (let input of tx.getInputs()) {
    (0, _assert.default)(tx === input.getTx());
    testVin(input, ctx);
  }
  (0, _assert.default)(tx.getOutputs().length > 0);
  for (let output of tx.getOutputs()) {
    (0, _assert.default)(tx === output.getTx());
    testOutput(output, ctx);
  }

  // test pruned vs not pruned
  if (ctx.fromGetTxPool || ctx.fromBinaryBlock) _assert.default.equal(tx.getPrunableHash(), undefined); // TODO monerod: tx pool txs do not have prunable hash, TODO: getBlocksByHeight() has inconsistent client-side pruning
  else (0, _assert.default)(tx.getPrunableHash());
  if (ctx.isPruned) {
    _assert.default.equal(tx.getRctSigPrunable(), undefined);
    _assert.default.equal(tx.getSize(), undefined);
    _assert.default.equal(tx.getLastRelayedTimestamp(), undefined);
    _assert.default.equal(tx.getReceivedTimestamp(), undefined);
    _assert.default.equal(tx.getFullHex(), undefined);
    (0, _assert.default)(tx.getPrunedHex());
  } else {
    _assert.default.equal(tx.getPrunedHex(), undefined);
    (0, _assert.default)(tx.getVersion() >= 0);
    (0, _assert.default)(tx.getUnlockTime() >= 0n);
    (0, _assert.default)(tx.getExtra() instanceof Uint8Array);
    (0, _assert.default)(tx.getExtra().length > 0);
    if (ctx.fromBinaryBlock) _assert.default.equal(tx.getFullHex(), undefined); // TODO: getBlocksByHeight() has inconsistent client-side pruning
    else (0, _assert.default)(tx.getFullHex().length > 0);
    if (ctx.fromBinaryBlock) _assert.default.equal(tx.getRctSigPrunable(), undefined); // TODO: getBlocksByHeight() has inconsistent client-side pruning
    //else assert.equal(typeof tx.getRctSigPrunable().nbp, "number");
    _assert.default.equal(tx.getIsDoubleSpendSeen(), false);
    if (tx.getIsConfirmed()) {
      _assert.default.equal(tx.getLastRelayedTimestamp(), undefined);
      _assert.default.equal(tx.getReceivedTimestamp(), undefined);
    } else {
      if (tx.getIsRelayed()) (0, _assert.default)(tx.getLastRelayedTimestamp() > 0);else
      _assert.default.equal(tx.getLastRelayedTimestamp(), undefined);
      (0, _assert.default)(tx.getReceivedTimestamp() > 0);
    }
  }

  if (tx.getIsFailed()) {

    // TODO: implement this
  }
  // test deep copy
  if (!ctx.doNotTestCopy) testTxCopy(tx, ctx);
}

function testBlockTemplate(template) {
  (0, _assert.default)(template);
  (0, _assert.default)(template.getBlockTemplateBlob());
  (0, _assert.default)(template.getBlockHashingBlob());
  (0, _assert.default)(template.getDifficulty());
  _assert.default.equal(typeof template.getDifficulty(), "bigint");
  (0, _assert.default)(template.getExpectedReward());
  (0, _assert.default)(template.getHeight());
  (0, _assert.default)(template.getPrevHash());
  (0, _assert.default)(template.getReservedOffset());
  _assert.default.equal(typeof template.getSeedHeight(), "number");
  (0, _assert.default)(template.getSeedHeight() > 0);
  _assert.default.equal(typeof template.getSeedHash(), "string");
  (0, _assert.default)(template.getSeedHash());
  // next seed hash can be null or initialized  // TODO: test circumstances for each
}

function testInfo(info) {
  (0, _assert.default)(info.getVersion());
  (0, _assert.default)(info.getNumAltBlocks() >= 0);
  (0, _assert.default)(info.getBlockSizeLimit());
  (0, _assert.default)(info.getBlockSizeMedian());
  (0, _assert.default)(info.getBootstrapDaemonAddress() === undefined || typeof info.getBootstrapDaemonAddress() === "string" && info.getBootstrapDaemonAddress().length > 0);
  (0, _assert.default)(info.getCumulativeDifficulty());
  _assert.default.equal(typeof info.getCumulativeDifficulty(), "bigint");
  (0, _assert.default)(info.getFreeSpace());
  (0, _assert.default)(info.getNumOfflinePeers() >= 0);
  (0, _assert.default)(info.getNumOnlinePeers() >= 0);
  (0, _assert.default)(info.getHeight() >= 0);
  (0, _assert.default)(info.getHeightWithoutBootstrap());
  (0, _assert.default)(info.getNumIncomingConnections() >= 0);
  (0, _assert.default)(info.getNetworkType());
  _assert.default.equal(typeof info.getIsOffline(), "boolean");
  (0, _assert.default)(info.getNumOutgoingConnections() >= 0);
  (0, _assert.default)(info.getNumRpcConnections() >= 0);
  (0, _assert.default)(info.getStartTimestamp());
  (0, _assert.default)(info.getAdjustedTimestamp());
  (0, _assert.default)(info.getTarget());
  (0, _assert.default)(info.getTargetHeight() >= 0);
  (0, _assert.default)(info.getNumTxs() >= 0);
  (0, _assert.default)(info.getNumTxsPool() >= 0);
  _assert.default.equal(typeof info.getWasBootstrapEverUsed(), "boolean");
  (0, _assert.default)(info.getBlockWeightLimit());
  (0, _assert.default)(info.getBlockWeightMedian());
  (0, _assert.default)(info.getDatabaseSize() > 0);
  (0, _assert.default)(typeof info.getUpdateAvailable() === "boolean");
  _TestUtils.default.testUnsignedBigInt(info.getCredits(), false);
  _assert.default.equal(typeof info.getTopBlockHash(), "string");
  (0, _assert.default)(info.getTopBlockHash());
  _assert.default.equal("boolean", typeof info.getIsBusySyncing());
  _assert.default.equal("boolean", typeof info.getIsSynchronized());
}

function testSyncInfo(syncInfo) {// TODO: consistent naming, daemon in name?
  (0, _assert.default)(syncInfo instanceof _index.MoneroDaemonSyncInfo);
  (0, _assert.default)(syncInfo.getHeight() >= 0);
  if (syncInfo.getPeers() !== undefined) {
    (0, _assert.default)(syncInfo.getPeers().length > 0);
    for (let peer of syncInfo.getPeers()) {
      testPeer(peer);
    }
  }
  if (syncInfo.getSpans() !== undefined) {// TODO: test that this is being hit, so far not used
    (0, _assert.default)(syncInfo.getSpans().length > 0);
    for (let span of syncInfo.getSpans()) {
      testConnectionSpan(span);
    }
  }
  (0, _assert.default)(syncInfo.getNextNeededPruningSeed() >= 0);
  _assert.default.equal(syncInfo.getOverview(), undefined);
  _TestUtils.default.testUnsignedBigInt(syncInfo.getCredits(), false);
  _assert.default.equal(syncInfo.getTopBlockHash(), undefined);
}

function testConnectionSpan(span) {
  _assert.default.notEqual(span, undefined);
  _assert.default.notEqual(span.getConnectionId(), undefined);
  (0, _assert.default)(span.getConnectionId().length > 0);
  (0, _assert.default)(span.getStartHeight() > 0);
  (0, _assert.default)(span.getNumBlocks() > 0);
  (0, _assert.default)(span.getRemoteAddress() === undefined || span.getRemoteAddress().length > 0);
  (0, _assert.default)(span.getRate() > 0);
  (0, _assert.default)(span.getSpeed() >= 0);
  (0, _assert.default)(span.getSize() > 0);
}

function testHardForkInfo(hardForkInfo) {
  _assert.default.notEqual(hardForkInfo.getEarliestHeight(), undefined);
  _assert.default.notEqual(hardForkInfo.getIsEnabled(), undefined);
  _assert.default.notEqual(hardForkInfo.getState(), undefined);
  _assert.default.notEqual(hardForkInfo.getThreshold(), undefined);
  _assert.default.notEqual(hardForkInfo.getVersion(), undefined);
  _assert.default.notEqual(hardForkInfo.getNumVotes(), undefined);
  _assert.default.notEqual(hardForkInfo.getVoting(), undefined);
  _assert.default.notEqual(hardForkInfo.getWindow(), undefined);
  _TestUtils.default.testUnsignedBigInt(hardForkInfo.getCredits(), false);
  _assert.default.equal(hardForkInfo.getTopBlockHash(), undefined);
}

function testMoneroBan(ban) {
  _assert.default.notEqual(ban.getHost(), undefined);
  _assert.default.notEqual(ban.getIp(), undefined);
  _assert.default.notEqual(ban.getSeconds(), undefined);
}

function testMinerTxSum(txSum) {
  _TestUtils.default.testUnsignedBigInt(txSum.getEmissionSum(), true);
  _TestUtils.default.testUnsignedBigInt(txSum.getFeeSum(), true);
}

function testOutputHistogramEntry(entry) {
  _TestUtils.default.testUnsignedBigInt(entry.getAmount());
  (0, _assert.default)(entry.getNumInstances() >= 0);
  (0, _assert.default)(entry.getNumUnlockedInstances() >= 0);
  (0, _assert.default)(entry.getNumRecentInstances() >= 0);
}

function testOutputDistributionEntry(entry) {
  _TestUtils.default.testUnsignedBigInt(entry.getAmount());
  (0, _assert.default)(entry.getBase() >= 0);
  (0, _assert.default)(Array.isArray(entry.getDistribution()) && entry.getDistribution().length > 0);
  (0, _assert.default)(entry.getStartHeight() >= 0);
}

function testSubmitTxResultGood(result) {
  testSubmitTxResultCommon(result);
  try {
    _assert.default.equal(result.getIsDoubleSpendSeen(), false, "tx submission is double spend.");
    _assert.default.equal(result.getIsFeeTooLow(), false);
    _assert.default.equal(result.getIsMixinTooLow(), false);
    _assert.default.equal(result.getHasInvalidInput(), false);
    _assert.default.equal(result.getHasInvalidOutput(), false);
    _assert.default.equal(result.getHasTooFewOutputs(), false);
    _assert.default.equal(result.getIsOverspend(), false);
    _assert.default.equal(result.getIsTooBig(), false);
    _assert.default.equal(result.getSanityCheckFailed(), false);
    _TestUtils.default.testUnsignedBigInt(result.getCredits(), false); // 0 credits
    _assert.default.equal(result.getTopBlockHash(), undefined);
    _assert.default.equal(result.getIsTxExtraTooBig(), false);
    _assert.default.equal(result.getIsGood(), true);
  } catch (e) {
    console.log("Submit result is not good: " + JSON.stringify(result.toJson()));
    throw e;
  }
}

function testSubmitTxResultDoubleSpend(result) {
  testSubmitTxResultCommon(result);
  _assert.default.equal(result.getIsGood(), false);
  _assert.default.equal(result.getIsDoubleSpendSeen(), true);
  _assert.default.equal(result.getIsFeeTooLow(), false);
  _assert.default.equal(result.getIsMixinTooLow(), false);
  _assert.default.equal(result.getHasInvalidInput(), false);
  _assert.default.equal(result.getHasInvalidOutput(), false);
  _assert.default.equal(result.getIsOverspend(), false);
  _assert.default.equal(result.getIsTooBig(), false);
}

function testSubmitTxResultCommon(result) {
  _assert.default.equal(typeof result.getIsGood(), "boolean");
  _assert.default.equal(typeof result.getIsRelayed(), "boolean");
  _assert.default.equal(typeof result.getIsDoubleSpendSeen(), "boolean");
  _assert.default.equal(typeof result.getIsFeeTooLow(), "boolean");
  _assert.default.equal(typeof result.getIsMixinTooLow(), "boolean");
  _assert.default.equal(typeof result.getHasInvalidInput(), "boolean");
  _assert.default.equal(typeof result.getHasInvalidOutput(), "boolean");
  _assert.default.equal(typeof result.getIsOverspend(), "boolean");
  _assert.default.equal(typeof result.getIsTooBig(), "boolean");
  _assert.default.equal(typeof result.getSanityCheckFailed(), "boolean");
  (0, _assert.default)(result.getReason() === undefined || result.getReason().length > 0);
}

function testTxPoolStats(stats) {
  (0, _assert.default)(stats);
  (0, _assert.default)(stats.getNumTxs() >= 0);
  if (stats.getNumTxs() > 0) {
    if (stats.getNumTxs() === 1) _assert.default.equal(stats.getHisto(), undefined);else
    {
      (0, _assert.default)(stats.getHisto());
      (0, _assert.default)(stats.getHisto().size > 0);
      for (let key of stats.getHisto().keys()) {
        (0, _assert.default)(stats.getHisto().get(key) >= 0);
      }
    }
    (0, _assert.default)(stats.getBytesMax() > 0);
    (0, _assert.default)(stats.getBytesMed() > 0);
    (0, _assert.default)(stats.getBytesMin() > 0);
    (0, _assert.default)(stats.getBytesTotal() > 0);
    (0, _assert.default)(stats.getHisto98pc() === undefined || stats.getHisto98pc() > 0);
    (0, _assert.default)(stats.getOldestTimestamp() > 0);
    (0, _assert.default)(stats.getNum10m() >= 0);
    (0, _assert.default)(stats.getNumDoubleSpends() >= 0);
    (0, _assert.default)(stats.getNumFailing() >= 0);
    (0, _assert.default)(stats.getNumNotRelayed() >= 0);
  } else {
    _assert.default.equal(stats.getBytesMax(), undefined);
    _assert.default.equal(stats.getBytesMed(), undefined);
    _assert.default.equal(stats.getBytesMin(), undefined);
    _assert.default.equal(stats.getBytesTotal(), 0);
    _assert.default.equal(stats.getHisto98pc(), undefined);
    _assert.default.equal(stats.getOldestTimestamp(), undefined);
    _assert.default.equal(stats.getNum10m(), 0);
    _assert.default.equal(stats.getNumDoubleSpends(), 0);
    _assert.default.equal(stats.getNumFailing(), 0);
    _assert.default.equal(stats.getNumNotRelayed(), 0);
    _assert.default.equal(stats.getHisto(), undefined);
  }
}

async function getUnrelayedTx(wallet, accountIdx) {
  let config = new _index.MoneroTxConfig({ accountIndex: accountIdx, address: await wallet.getPrimaryAddress(), amount: _TestUtils.default.MAX_FEE });
  let tx = await wallet.createTx(config);
  (0, _assert.default)(tx.getFullHex());
  _assert.default.equal(tx.getRelay(), false);
  return tx;
}

function testVin(input, ctx) {
  testOutput(input);
  testKeyImage(input.getKeyImage(), ctx);
  (0, _assert.default)(input.getRingOutputIndices() && Array.isArray(input.getRingOutputIndices()) && input.getRingOutputIndices().length > 0);
  for (let index of input.getRingOutputIndices()) {
    _assert.default.equal(typeof index, "number");
    (0, _assert.default)(index >= 0);
  }
}

function testKeyImage(image, ctx) {
  (0, _assert.default)(image instanceof _index.MoneroKeyImage);
  (0, _assert.default)(image.getHex());
  if (image.getSignature() !== undefined) {
    _assert.default.equal(typeof image.getSignature(), "string");
    (0, _assert.default)(image.getSignature().length > 0);
  }
}

function testOutput(output, ctx) {
  (0, _assert.default)(output instanceof _index.MoneroOutput);
  _TestUtils.default.testUnsignedBigInt(output.getAmount());
  if (ctx) {
    if (output.getTx().getInTxPool() || ctx.fromGetTxPool || ctx.hasOutputIndices === false) _assert.default.equal(output.getIndex(), undefined); // TODO: get_blocks_by_height.bin (#5127), get_transaction_pool, and tx pool txs do not return output indices 
    else (0, _assert.default)(output.getIndex() >= 0);
    (0, _assert.default)(output.getStealthPublicKey() && output.getStealthPublicKey().length === 64);
  }
}

async function getConfirmedTxs(daemon, numTxs) {
  let txs = [];
  let numBlocksPerReq = 50;
  for (let startIdx = (await daemon.getHeight()) - numBlocksPerReq - 1; startIdx >= 0; startIdx -= numBlocksPerReq) {
    let blocks = await daemon.getBlocksByRange(startIdx, startIdx + numBlocksPerReq);
    for (let block of blocks) {
      if (!block.getTxs()) continue;
      for (let tx of block.getTxs()) {
        txs.push(tx);
        if (txs.length === numTxs) return txs;
      }
    }
  }
  throw new Error("Could not get " + numTxs + " confirmed txs");
}

function testAltChain(altChain) {
  (0, _assert.default)(altChain instanceof _index.MoneroAltChain);
  (0, _assert.default)(Array.isArray(altChain.getBlockHashes()) && altChain.getBlockHashes().length > 0);
  _TestUtils.default.testUnsignedBigInt(altChain.getDifficulty(), true);
  (0, _assert.default)(altChain.getHeight() > 0);
  (0, _assert.default)(altChain.getLength() > 0);
  (0, _assert.default)(altChain.getMainChainParentBlockHash().length === 64);
}

function testPeer(peer) {
  (0, _assert.default)(peer instanceof _index.MoneroPeer);
  testKnownPeer(peer, true);
  (0, _assert.default)(peer.getId());
  (0, _assert.default)(peer.getAvgDownload() >= 0);
  (0, _assert.default)(peer.getAvgUpload() >= 0);
  (0, _assert.default)(peer.getCurrentDownload() >= 0);
  (0, _assert.default)(peer.getCurrentUpload() >= 0);
  (0, _assert.default)(peer.getHeight() >= 0);
  (0, _assert.default)(peer.getLiveTime() >= 0);
  _assert.default.equal(typeof peer.getIsLocalIp(), "boolean");
  _assert.default.equal(typeof peer.getIsLocalHost(), "boolean");
  (0, _assert.default)(peer.getNumReceives() >= 0);
  (0, _assert.default)(peer.getReceiveIdleTime() >= 0);
  (0, _assert.default)(peer.getNumSends() >= 0);
  (0, _assert.default)(peer.getSendIdleTime() >= 0);
  (0, _assert.default)(peer.getState());
  (0, _assert.default)(peer.getNumSupportFlags() >= 0);
}

function testKnownPeer(peer, fromConnection) {
  (0, _assert.default)(peer instanceof _index.MoneroPeer);
  _assert.default.equal(typeof peer.getId(), "string");
  _assert.default.equal(typeof peer.getHost(), "string");
  (0, _assert.default)(typeof peer.getPort() === "number");
  (0, _assert.default)(peer.getPort() > 0);
  (0, _assert.default)(peer.getRpcPort() === undefined || typeof peer.getRpcPort() === "number" && peer.getRpcPort() >= 0);
  _assert.default.equal(typeof peer.getIsOnline(), "boolean");
  if (peer.getRpcCreditsPerHash() !== undefined) _TestUtils.default.testUnsignedBigInt(peer.getRpcCreditsPerHash());
  if (fromConnection) _assert.default.equal(undefined, peer.getLastSeenTimestamp());else
  {
    if (peer.getLastSeenTimestamp() < 0) console.log("Last seen timestamp is invalid: " + peer.getLastSeenTimestamp());
    (0, _assert.default)(peer.getLastSeenTimestamp() >= 0);
  }
  (0, _assert.default)(peer.getPruningSeed() === undefined || peer.getPruningSeed() >= 0);
}

function testUpdateCheckResult(result) {
  (0, _assert.default)(result instanceof _index.MoneroDaemonUpdateCheckResult);
  _assert.default.equal(typeof result.getIsUpdateAvailable(), "boolean");
  if (result.getIsUpdateAvailable()) {
    (0, _assert.default)(result.getAutoUri(), "No auto uri; is daemon online?");
    (0, _assert.default)(result.getUserUri());
    _assert.default.equal(typeof result.getVersion(), "string");
    _assert.default.equal(typeof result.getHash(), "string");
    _assert.default.equal(result.getHash().length, 64);
  } else {
    _assert.default.equal(result.getAutoUri(), undefined);
    _assert.default.equal(result.getUserUri(), undefined);
    _assert.default.equal(result.getVersion(), undefined);
    _assert.default.equal(result.getHash(), undefined);
  }
}

function testUpdateDownloadResult(result, path) {
  testUpdateCheckResult(result);
  if (result.isUpdateAvailable()) {
    if (path) _assert.default.equal(result.getDownloadPath(), path);else
    (0, _assert.default)(result.getDownloadPath());
  } else {
    _assert.default.equal(result.getDownloadPath(), undefined);
  }
}

async function getConfirmedTxHashes(daemon) {
  let numTxs = 5;
  let txHashes = [];
  let height = await daemon.getHeight();
  while (txHashes.length < numTxs && height > 0) {
    let block = await daemon.getBlockByHeight(--height);
    for (let txHash of block.getTxHashes()) txHashes.push(txHash);
  }
  return txHashes;
}

function testTxCopy(tx, ctx) {

  // copy tx and test
  let copy = tx.copy();
  (0, _assert.default)(copy instanceof _index.MoneroTx);
  _assert.default.equal(copy.getBlock(), undefined);
  if (tx.getBlock()) copy.setBlock(tx.getBlock().copy().setTxs([copy])); // copy block for testing equality
  _assert.default.equal(copy.toString(), tx.toString());

  // test different input references
  if (copy.getInputs() === undefined) _assert.default.equal(tx.getInputs(), undefined);else
  {
    (0, _assert.default)(copy.getInputs() !== tx.getInputs());
    for (let i = 0; i < copy.getInputs().length; i++) {
      _assert.default.equal(tx.getInputs()[i].getAmount(), copy.getInputs()[i].getAmount());
    }
  }

  // test different output references
  if (copy.getOutputs() === undefined) _assert.default.equal(tx.getOutputs(), undefined);else
  {
    (0, _assert.default)(copy.getOutputs() !== tx.getOutputs());
    for (let i = 0; i < copy.getOutputs().length; i++) {
      _assert.default.equal(tx.getOutputs()[i].getAmount(), copy.getOutputs()[i].getAmount());
    }
  }

  // test copied tx
  ctx = Object.assign({}, ctx);
  ctx.doNotTestCopy = true;
  if (tx.getBlock()) copy.setBlock(tx.getBlock().copy().setTxs([copy])); // copy block for testing
  testTx(copy, ctx);

  // test merging with copy
  let merged = copy.merge(copy.copy());
  _assert.default.equal(merged.toString(), tx.toString());
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYXNzZXJ0IiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfVGVzdFV0aWxzIiwiX2luZGV4IiwiQklOQVJZX0JMT0NLX0NUWCIsImhhc0hleCIsImhlYWRlcklzRnVsbCIsImhhc1R4cyIsImN0eCIsImlzUHJ1bmVkIiwiaXNDb25maXJtZWQiLCJmcm9tR2V0VHhQb29sIiwiaGFzT3V0cHV0SW5kaWNlcyIsImZyb21CaW5hcnlCbG9jayIsIlRlc3RNb25lcm9EYWVtb25ScGMiLCJNQVhfUkVRX1NJWkUiLCJERUZBVUxUX0lEIiwiTlVNX0hFQURFUlNfUEVSX1JFUSIsImNvbnN0cnVjdG9yIiwidGVzdENvbmZpZyIsIlRlc3RVdGlscyIsIldBTExFVF9UWF9UUkFDS0VSIiwicmVzZXQiLCJydW5UZXN0cyIsInRoYXQiLCJkZXNjcmliZSIsImJlZm9yZSIsIndhbGxldCIsImdldFdhbGxldFJwYyIsImRhZW1vbiIsImdldERhZW1vblJwYyIsImUiLCJjb25zb2xlIiwiZXJyb3IiLCJ0ZXN0Tm9uUmVsYXlzIiwiR2VuVXRpbHMiLCJpc0Jyb3dzZXIiLCJpdCIsImNtZCIsIkRBRU1PTl9MT0NBTF9QQVRIIiwiZ2V0RW51bUtleUJ5VmFsdWUiLCJNb25lcm9OZXR3b3JrVHlwZSIsIk5FVFdPUktfVFlQRSIsInRvTG93ZXJDYXNlIiwiTU9ORVJPX0JJTlNfRElSIiwiY29ubmVjdFRvRGFlbW9uUnBjIiwiY29ubmVjdGlvbiIsImdldFJwY0Nvbm5lY3Rpb24iLCJhc3NlcnQiLCJlcXVhbCIsImdldFVyaSIsImdldFVzZXJuYW1lIiwiZ2V0UGFzc3dvcmQiLCJnZXRIZWlnaHQiLCJpbmZvIiwiZ2V0SW5mbyIsInRlc3RJbmZvIiwic3RvcFByb2Nlc3MiLCJ2ZXJzaW9uIiwiZ2V0VmVyc2lvbiIsImdldE51bWJlciIsImdldElzUmVsZWFzZSIsImlzVHJ1c3RlZCIsImhlaWdodCIsImxhc3RIZWFkZXIiLCJnZXRMYXN0QmxvY2tIZWFkZXIiLCJoYXNoIiwiZ2V0QmxvY2tIYXNoIiwibGVuZ3RoIiwidGVtcGxhdGUiLCJnZXRCbG9ja1RlbXBsYXRlIiwiQUREUkVTUyIsInRlc3RCbG9ja1RlbXBsYXRlIiwidGVzdEJsb2NrSGVhZGVyIiwiaGVhZGVyIiwiZ2V0QmxvY2tIZWFkZXJCeUhhc2giLCJkZWVwRXF1YWwiLCJnZXRCbG9ja0hlYWRlckJ5SGVpZ2h0IiwibnVtQmxvY2tzIiwibnVtQmxvY2tzQWdvIiwiY3VycmVudEhlaWdodCIsInN0YXJ0SGVpZ2h0IiwiZW5kSGVpZ2h0IiwiaGVhZGVycyIsImdldEJsb2NrSGVhZGVyc0J5UmFuZ2UiLCJpIiwidGVzdEJsb2NrQ3R4IiwiYmxvY2siLCJnZXRCbG9ja0J5SGFzaCIsInRlc3RCbG9jayIsImdldEJsb2NrQnlIZWlnaHQiLCJnZXRUeHMiLCJ1bmRlZmluZWQiLCJFcnJvciIsImFsbEhlaWdodHMiLCJwdXNoIiwiaGVpZ2h0cyIsImJsb2NrcyIsImdldEJsb2Nrc0J5SGVpZ2h0IiwidHhGb3VuZCIsInRlc3RHZXRCbG9ja3NSYW5nZSIsIk1hdGgiLCJtaW4iLCJjaGFpbkhlaWdodCIsImNodW5rZWQiLCJyZWFsU3RhcnRIZWlnaHQiLCJyZWFsRW5kSGVpZ2h0IiwiZ2V0QmxvY2tzQnlSYW5nZUNodW5rZWQiLCJnZXRCbG9ja3NCeVJhbmdlIiwidHhIYXNoZXMiLCJnZXRDb25maXJtZWRUeEhhc2hlcyIsInR4SGFzaCIsInR4IiwiZ2V0VHgiLCJ0ZXN0VHgiLCJtZXNzYWdlIiwidHhzIiwiY3JlYXRlVHgiLCJhY2NvdW50SW5kZXgiLCJhZGRyZXNzIiwiZ2V0UHJpbWFyeUFkZHJlc3MiLCJhbW91bnQiLCJNQVhfRkVFIiwiZ2V0SGFzaCIsIm51bVR4cyIsIndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbCIsImdldFVucmVsYXllZFR4IiwicmVzdWx0Iiwic3VibWl0VHhIZXgiLCJnZXRGdWxsSGV4IiwidGVzdFN1Ym1pdFR4UmVzdWx0R29vZCIsImdldElzUmVsYXllZCIsImZsdXNoVHhQb29sIiwic3luYyIsImhleGVzIiwiaGV4ZXNQcnVuZWQiLCJnZXRUeEhleCIsImdldFR4SGV4ZXMiLCJzdW0iLCJnZXRNaW5lclR4U3VtIiwidGVzdE1pbmVyVHhTdW0iLCJmZWVFc3RpbWF0ZSIsImdldEZlZUVzdGltYXRlIiwidGVzdFVuc2lnbmVkQmlnSW50IiwiZ2V0RmVlIiwiZ2V0RmVlcyIsImdldFF1YW50aXphdGlvbk1hc2siLCJnZXRUeFBvb2wiLCJBcnJheSIsImlzQXJyYXkiLCJlcnIiLCJ0eElkcyIsImdldElzR29vZCIsInRvSnNvbiIsInN0YXRzIiwiZ2V0VHhQb29sU3RhdHMiLCJnZXROdW1UeHMiLCJ0ZXN0VHhQb29sU3RhdHMiLCJ0eFBvb2xCZWZvcmUiLCJwb29sVHhzIiwia2V5SW1hZ2VzIiwibWFwIiwiaW5wdXQiLCJnZXRJbnB1dHMiLCJnZXRLZXlJbWFnZSIsImdldEhleCIsInRlc3RTcGVudFN0YXR1c2VzIiwiTW9uZXJvS2V5SW1hZ2VTcGVudFN0YXR1cyIsIk5PVF9TUEVOVCIsIlRYX1BPT0wiLCJnZXRDb25maXJtZWRUeHMiLCJDT05GSVJNRUQiLCJleHBlY3RlZFN0YXR1cyIsImtleUltYWdlIiwiZ2V0S2V5SW1hZ2VTcGVudFN0YXR1cyIsInN0YXR1c2VzIiwiZ2V0S2V5SW1hZ2VTcGVudFN0YXR1c2VzIiwic3RhdHVzIiwiZW50cmllcyIsImdldE91dHB1dEhpc3RvZ3JhbSIsImVudHJ5IiwidGVzdE91dHB1dEhpc3RvZ3JhbUVudHJ5Iiwic3luY0luZm8iLCJnZXRTeW5jSW5mbyIsInRlc3RTeW5jSW5mbyIsImhhcmRGb3JrSW5mbyIsImdldEhhcmRGb3JrSW5mbyIsInRlc3RIYXJkRm9ya0luZm8iLCJhbHRDaGFpbnMiLCJnZXRBbHRDaGFpbnMiLCJhbHRDaGFpbiIsInRlc3RBbHRDaGFpbiIsImFsdEJsb2NrSGFzaGVzIiwiZ2V0QWx0QmxvY2tIYXNoZXMiLCJhbHRCbG9ja0hhc2giLCJpbml0VmFsIiwiZ2V0RG93bmxvYWRMaW1pdCIsInNldFZhbCIsInNldERvd25sb2FkTGltaXQiLCJyZXNldFZhbCIsInJlc2V0RG93bmxvYWRMaW1pdCIsImdldFVwbG9hZExpbWl0Iiwic2V0VXBsb2FkTGltaXQiLCJyZXNldFVwbG9hZExpbWl0IiwicGVlcnMiLCJnZXRQZWVycyIsInBlZXIiLCJ0ZXN0UGVlciIsImdldEtub3duUGVlcnMiLCJ0ZXN0S25vd25QZWVyIiwic2V0T3V0Z29pbmdQZWVyTGltaXQiLCJzZXRJbmNvbWluZ1BlZXJMaW1pdCIsImJhbiIsIk1vbmVyb0JhbiIsImhvc3QiLCJpc0Jhbm5lZCIsInNlY29uZHMiLCJzZXRQZWVyQmFuIiwiYmFucyIsImdldFBlZXJCYW5zIiwiZm91bmQiLCJhQmFuIiwidGVzdE1vbmVyb0JhbiIsImdldEhvc3QiLCJiYW4xIiwic2V0SG9zdCIsInNldElzQmFubmVkIiwic2V0U2Vjb25kcyIsImJhbjIiLCJzZXRQZWVyQmFucyIsImZvdW5kMSIsImZvdW5kMiIsInN0b3BNaW5pbmciLCJzdGFydE1pbmluZyIsImdldE1pbmluZ1N0YXR1cyIsImdldElzQWN0aXZlIiwiZ2V0QWRkcmVzcyIsImdldFNwZWVkIiwiZ2V0TnVtVGhyZWFkcyIsImdldElzQmFja2dyb3VuZCIsInRocmVhZENvdW50IiwiaXNCYWNrZ3JvdW5kIiwic3VibWl0QmxvY2siLCJnZXRCbG9ja0hhc2hpbmdCbG9iIiwiZ2V0Q29kZSIsInBydW5lQmxvY2tjaGFpbiIsImdldElzUHJ1bmVkIiwiZ2V0UHJ1bmluZ1NlZWQiLCJjaGVja0ZvclVwZGF0ZSIsInRlc3RVcGRhdGVDaGVja1Jlc3VsdCIsImRvd25sb2FkVXBkYXRlIiwidGVzdFVwZGF0ZURvd25sb2FkUmVzdWx0IiwicGF0aCIsIkRhdGUiLCJnZXRUaW1lIiwiZ2V0SXNVcGRhdGVBdmFpbGFibGUiLCJub3RFcXVhbCIsInN0YXR1c0NvZGUiLCJQcm9taXNlIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJTWU5DX1BFUklPRF9JTl9NUyIsInN0b3AiLCJsb2ciLCJ0ZXN0UmVsYXlzIiwidHgxIiwidHgyIiwiYVR4IiwidGVzdFN1Ym1pdFR4UmVzdWx0RG91YmxlU3BlbmQiLCJsaXRlTW9kZSIsInRlc3RTdWJtaXRUaGVuUmVsYXkiLCJmZXRjaGVkVHgiLCJyZWxheVR4QnlIYXNoIiwicmVsYXlUeHNCeUhhc2giLCJ0ZXN0Tm90aWZpY2F0aW9ucyIsImxpc3RlbmVySGVhZGVyIiwibGlzdGVuZXIiLCJNb25lcm9EYWVtb25MaXN0ZW5lciIsIm9uQmxvY2tIZWFkZXIiLCJhZGRMaXN0ZW5lciIsIndhaXRGb3JOZXh0QmxvY2tIZWFkZXIiLCJyZW1vdmVMaXN0ZW5lciIsImV4cG9ydHMiLCJkZWZhdWx0IiwiaXNGdWxsIiwiZ2V0TWFqb3JWZXJzaW9uIiwiZ2V0TWlub3JWZXJzaW9uIiwiZ2V0VGltZXN0YW1wIiwiZ2V0UHJldkhhc2giLCJnZXROb25jZSIsImdldFBvd0hhc2giLCJnZXRTaXplIiwiZ2V0RGVwdGgiLCJnZXREaWZmaWN1bHR5IiwiZ2V0Q3VtdWxhdGl2ZURpZmZpY3VsdHkiLCJnZXRNaW5lclR4SGFzaCIsImdldE9ycGhhblN0YXR1cyIsImdldFJld2FyZCIsImdldFdlaWdodCIsImdldFR4SGFzaGVzIiwidGVzdE1pbmVyVHgiLCJnZXRNaW5lclR4IiwiZ2V0QmxvY2siLCJtaW5lclR4IiwiTW9uZXJvVHgiLCJnZXRJc01pbmVyVHgiLCJnZXRFeHRyYSIsIlVpbnQ4QXJyYXkiLCJnZXRVbmxvY2tUaW1lIiwiQmlnSW50IiwiZ2V0SW5UeFBvb2wiLCJnZXRJc0NvbmZpcm1lZCIsImdldElzRG91YmxlU3BlbmRTZWVuIiwiZ2V0T3V0cHV0cyIsImdldE91dHB1dEluZGljZXMiLCJpbmNsdWRlcyIsImdldElzRmFpbGVkIiwiZ2V0UmVsYXkiLCJnZXROdW1Db25maXJtYXRpb25zIiwiZ2V0TGFzdEZhaWxlZEhlaWdodCIsImdldExhc3RGYWlsZWRIYXNoIiwiZ2V0UmVjZWl2ZWRUaW1lc3RhbXAiLCJnZXRJc0tlcHRCeUJsb2NrIiwiZ2V0TWF4VXNlZEJsb2NrSGVpZ2h0IiwiZ2V0TWF4VXNlZEJsb2NrSGFzaCIsImdldExhc3RSZWxheWVkVGltZXN0YW1wIiwiZ2V0U2lnbmF0dXJlcyIsInRlc3RWaW4iLCJvdXRwdXQiLCJ0ZXN0T3V0cHV0IiwiZ2V0UHJ1bmFibGVIYXNoIiwiZ2V0UmN0U2lnUHJ1bmFibGUiLCJnZXRQcnVuZWRIZXgiLCJkb05vdFRlc3RDb3B5IiwidGVzdFR4Q29weSIsImdldEJsb2NrVGVtcGxhdGVCbG9iIiwiZ2V0RXhwZWN0ZWRSZXdhcmQiLCJnZXRSZXNlcnZlZE9mZnNldCIsImdldFNlZWRIZWlnaHQiLCJnZXRTZWVkSGFzaCIsImdldE51bUFsdEJsb2NrcyIsImdldEJsb2NrU2l6ZUxpbWl0IiwiZ2V0QmxvY2tTaXplTWVkaWFuIiwiZ2V0Qm9vdHN0cmFwRGFlbW9uQWRkcmVzcyIsImdldEZyZWVTcGFjZSIsImdldE51bU9mZmxpbmVQZWVycyIsImdldE51bU9ubGluZVBlZXJzIiwiZ2V0SGVpZ2h0V2l0aG91dEJvb3RzdHJhcCIsImdldE51bUluY29taW5nQ29ubmVjdGlvbnMiLCJnZXROZXR3b3JrVHlwZSIsImdldElzT2ZmbGluZSIsImdldE51bU91dGdvaW5nQ29ubmVjdGlvbnMiLCJnZXROdW1ScGNDb25uZWN0aW9ucyIsImdldFN0YXJ0VGltZXN0YW1wIiwiZ2V0QWRqdXN0ZWRUaW1lc3RhbXAiLCJnZXRUYXJnZXQiLCJnZXRUYXJnZXRIZWlnaHQiLCJnZXROdW1UeHNQb29sIiwiZ2V0V2FzQm9vdHN0cmFwRXZlclVzZWQiLCJnZXRCbG9ja1dlaWdodExpbWl0IiwiZ2V0QmxvY2tXZWlnaHRNZWRpYW4iLCJnZXREYXRhYmFzZVNpemUiLCJnZXRVcGRhdGVBdmFpbGFibGUiLCJnZXRDcmVkaXRzIiwiZ2V0VG9wQmxvY2tIYXNoIiwiZ2V0SXNCdXN5U3luY2luZyIsImdldElzU3luY2hyb25pemVkIiwiTW9uZXJvRGFlbW9uU3luY0luZm8iLCJnZXRTcGFucyIsInNwYW4iLCJ0ZXN0Q29ubmVjdGlvblNwYW4iLCJnZXROZXh0TmVlZGVkUHJ1bmluZ1NlZWQiLCJnZXRPdmVydmlldyIsImdldENvbm5lY3Rpb25JZCIsImdldFN0YXJ0SGVpZ2h0IiwiZ2V0TnVtQmxvY2tzIiwiZ2V0UmVtb3RlQWRkcmVzcyIsImdldFJhdGUiLCJnZXRFYXJsaWVzdEhlaWdodCIsImdldElzRW5hYmxlZCIsImdldFN0YXRlIiwiZ2V0VGhyZXNob2xkIiwiZ2V0TnVtVm90ZXMiLCJnZXRWb3RpbmciLCJnZXRXaW5kb3ciLCJnZXRJcCIsImdldFNlY29uZHMiLCJ0eFN1bSIsImdldEVtaXNzaW9uU3VtIiwiZ2V0RmVlU3VtIiwiZ2V0QW1vdW50IiwiZ2V0TnVtSW5zdGFuY2VzIiwiZ2V0TnVtVW5sb2NrZWRJbnN0YW5jZXMiLCJnZXROdW1SZWNlbnRJbnN0YW5jZXMiLCJ0ZXN0T3V0cHV0RGlzdHJpYnV0aW9uRW50cnkiLCJnZXRCYXNlIiwiZ2V0RGlzdHJpYnV0aW9uIiwidGVzdFN1Ym1pdFR4UmVzdWx0Q29tbW9uIiwiZ2V0SXNGZWVUb29Mb3ciLCJnZXRJc01peGluVG9vTG93IiwiZ2V0SGFzSW52YWxpZElucHV0IiwiZ2V0SGFzSW52YWxpZE91dHB1dCIsImdldEhhc1Rvb0Zld091dHB1dHMiLCJnZXRJc092ZXJzcGVuZCIsImdldElzVG9vQmlnIiwiZ2V0U2FuaXR5Q2hlY2tGYWlsZWQiLCJnZXRJc1R4RXh0cmFUb29CaWciLCJKU09OIiwic3RyaW5naWZ5IiwiZ2V0UmVhc29uIiwiZ2V0SGlzdG8iLCJzaXplIiwia2V5Iiwia2V5cyIsImdldCIsImdldEJ5dGVzTWF4IiwiZ2V0Qnl0ZXNNZWQiLCJnZXRCeXRlc01pbiIsImdldEJ5dGVzVG90YWwiLCJnZXRIaXN0bzk4cGMiLCJnZXRPbGRlc3RUaW1lc3RhbXAiLCJnZXROdW0xMG0iLCJnZXROdW1Eb3VibGVTcGVuZHMiLCJnZXROdW1GYWlsaW5nIiwiZ2V0TnVtTm90UmVsYXllZCIsImFjY291bnRJZHgiLCJjb25maWciLCJNb25lcm9UeENvbmZpZyIsInRlc3RLZXlJbWFnZSIsImdldFJpbmdPdXRwdXRJbmRpY2VzIiwiaW5kZXgiLCJpbWFnZSIsIk1vbmVyb0tleUltYWdlIiwiZ2V0U2lnbmF0dXJlIiwiTW9uZXJvT3V0cHV0IiwiZ2V0SW5kZXgiLCJnZXRTdGVhbHRoUHVibGljS2V5IiwibnVtQmxvY2tzUGVyUmVxIiwic3RhcnRJZHgiLCJNb25lcm9BbHRDaGFpbiIsImdldEJsb2NrSGFzaGVzIiwiZ2V0TGVuZ3RoIiwiZ2V0TWFpbkNoYWluUGFyZW50QmxvY2tIYXNoIiwiTW9uZXJvUGVlciIsImdldElkIiwiZ2V0QXZnRG93bmxvYWQiLCJnZXRBdmdVcGxvYWQiLCJnZXRDdXJyZW50RG93bmxvYWQiLCJnZXRDdXJyZW50VXBsb2FkIiwiZ2V0TGl2ZVRpbWUiLCJnZXRJc0xvY2FsSXAiLCJnZXRJc0xvY2FsSG9zdCIsImdldE51bVJlY2VpdmVzIiwiZ2V0UmVjZWl2ZUlkbGVUaW1lIiwiZ2V0TnVtU2VuZHMiLCJnZXRTZW5kSWRsZVRpbWUiLCJnZXROdW1TdXBwb3J0RmxhZ3MiLCJmcm9tQ29ubmVjdGlvbiIsImdldFBvcnQiLCJnZXRScGNQb3J0IiwiZ2V0SXNPbmxpbmUiLCJnZXRScGNDcmVkaXRzUGVySGFzaCIsImdldExhc3RTZWVuVGltZXN0YW1wIiwiTW9uZXJvRGFlbW9uVXBkYXRlQ2hlY2tSZXN1bHQiLCJnZXRBdXRvVXJpIiwiZ2V0VXNlclVyaSIsImlzVXBkYXRlQXZhaWxhYmxlIiwiZ2V0RG93bmxvYWRQYXRoIiwiY29weSIsInNldEJsb2NrIiwic2V0VHhzIiwidG9TdHJpbmciLCJPYmplY3QiLCJhc3NpZ24iLCJtZXJnZWQiLCJtZXJnZSJdLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90ZXN0L1Rlc3RNb25lcm9EYWVtb25ScGMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFzc2VydCBmcm9tIFwiYXNzZXJ0XCI7XG5pbXBvcnQgVGVzdFV0aWxzIGZyb20gXCIuL3V0aWxzL1Rlc3RVdGlsc1wiO1xuaW1wb3J0IHtjb25uZWN0VG9EYWVtb25ScGMsXG4gICAgICAgIEdlblV0aWxzLFxuICAgICAgICBNb25lcm9EYWVtb25JbmZvLFxuICAgICAgICBNb25lcm9OZXR3b3JrVHlwZSxcbiAgICAgICAgTW9uZXJvVHhXYWxsZXQsXG4gICAgICAgIE1vbmVyb1R4LFxuICAgICAgICBNb25lcm9LZXlJbWFnZVNwZW50U3RhdHVzLFxuICAgICAgICBNb25lcm9XYWxsZXQsXG4gICAgICAgIE1vbmVyb0RhZW1vbixcbiAgICAgICAgTW9uZXJvUGVlcixcbiAgICAgICAgTW9uZXJvRGFlbW9uVXBkYXRlQ2hlY2tSZXN1bHQsXG4gICAgICAgIE1vbmVyb0JhbixcbiAgICAgICAgTW9uZXJvRGFlbW9uTGlzdGVuZXIsXG4gICAgICAgIE1vbmVyb0RhZW1vblN5bmNJbmZvLFxuICAgICAgICBNb25lcm9UeENvbmZpZyxcbiAgICAgICAgTW9uZXJvS2V5SW1hZ2UsXG4gICAgICAgIE1vbmVyb091dHB1dCxcbiAgICAgICAgTW9uZXJvQWx0Q2hhaW4sXG4gICAgICAgIE1vbmVyb1N1Ym1pdFR4UmVzdWx0LFxuICAgICAgICBNb25lcm9UeFBvb2xTdGF0c30gZnJvbSBcIi4uLy4uL2luZGV4XCI7XG5cbi8vIGNvbnRleHQgZm9yIHRlc3RpbmcgYmluYXJ5IGJsb2Nrc1xuLy8gVE9ETzogYmluYXJ5IGJsb2NrcyBoYXZlIGluY29uc2lzdGVudCBjbGllbnQtc2lkZSBwcnVuaW5nXG4vLyBUT0RPOiBnZXRfYmxvY2tzX2J5X2hlaWdodC5iaW4gZG9lcyBub3QgcmV0dXJuIG91dHB1dCBpbmRpY2VzICgjNTEyNylcbmNvbnN0IEJJTkFSWV9CTE9DS19DVFggPSB7IGhhc0hleDogZmFsc2UsIGhlYWRlcklzRnVsbDogZmFsc2UsIGhhc1R4czogdHJ1ZSwgY3R4OiB7IGlzUHJ1bmVkOiBmYWxzZSwgaXNDb25maXJtZWQ6IHRydWUsIGZyb21HZXRUeFBvb2w6IGZhbHNlLCBoYXNPdXRwdXRJbmRpY2VzOiBmYWxzZSwgZnJvbUJpbmFyeUJsb2NrOiB0cnVlIH0gfTtcblxuLyoqXG4gKiBUZXN0cyBhIE1vbmVybyBkYWVtb24uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRlc3RNb25lcm9EYWVtb25ScGMge1xuXG4gIC8vIHN0YXRpYyB2YXJpYWJsZXNcbiAgc3RhdGljIHJlYWRvbmx5IE1BWF9SRVFfU0laRSA9IFwiMzAwMDAwMFwiO1xuICBzdGF0aWMgcmVhZG9ubHkgREVGQVVMVF9JRCA9IFwiMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMFwiOyAvLyB1bmluaXRpYWxpemVkIHR4IG9yIGJsb2NrIGhhc2ggZnJvbSBkYWVtb24gcnBjXG4gIHN0YXRpYyByZWFkb25seSBOVU1fSEVBREVSU19QRVJfUkVRID0gNzUwOyAvLyBudW1iZXIgb2YgaGVhZGVycyB0byBmZXRjaCBhbmQgY2FjaGUgcGVyIHJlcXVlc3RcblxuICAvLyBzdGF0ZSB2YXJpYWJsZXNcbiAgdGVzdENvbmZpZzogYW55O1xuICB3YWxsZXQ6IE1vbmVyb1dhbGxldDtcbiAgZGFlbW9uOiBNb25lcm9EYWVtb247XG4gIFxuICBjb25zdHJ1Y3Rvcih0ZXN0Q29uZmlnKSB7XG4gICAgdGhpcy50ZXN0Q29uZmlnID0gdGVzdENvbmZpZztcbiAgICBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIucmVzZXQoKTsgLy8gYWxsIHdhbGxldHMgbmVlZCB0byB3YWl0IGZvciB0eHMgdG8gY29uZmlybSB0byByZWxpYWJseSBzeW5jXG4gIH1cbiAgXG4gIC8qKlxuICAgKiBSdW4gYWxsIHRlc3RzLlxuICAgKi9cbiAgcnVuVGVzdHMoKSB7XG4gICAgbGV0IHRoYXQgPSB0aGlzO1xuICAgIGxldCB0ZXN0Q29uZmlnID0gdGhpcy50ZXN0Q29uZmlnO1xuICAgIGRlc2NyaWJlKFwiVEVTVCBNT05FUk8gREFFTU9OIFJQQ1wiLCBmdW5jdGlvbigpIHtcbiAgICAgIFxuICAgICAgLy8gaW5pdGlhbGl6ZSB3YWxsZXQgYmVmb3JlIGFsbCB0ZXN0c1xuICAgICAgYmVmb3JlKGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoYXQud2FsbGV0ID0gYXdhaXQgVGVzdFV0aWxzLmdldFdhbGxldFJwYygpO1xuICAgICAgICAgIHRoYXQuZGFlbW9uID0gYXdhaXQgVGVzdFV0aWxzLmdldERhZW1vblJwYygpO1xuICAgICAgICAgIFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi5yZXNldCgpOyAvLyBhbGwgd2FsbGV0cyBuZWVkIHRvIHdhaXQgZm9yIHR4cyB0byBjb25maXJtIHRvIHJlbGlhYmx5IHN5bmNcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBiZWZvcmUgdGVzdHM6IFwiKTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBURVNUIE5PTiBSRUxBWVMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMgJiYgIUdlblV0aWxzLmlzQnJvd3NlcigpKVxuICAgICAgaXQoXCJDYW4gc3RhcnQgYW5kIHN0b3AgYSBkYWVtb24gcHJvY2Vzc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSBjb21tYW5kIHRvIHN0YXJ0IG1vbmVyb2QgcHJvY2Vzc1xuICAgICAgICBsZXQgY21kID0gW1xuICAgICAgICAgICAgVGVzdFV0aWxzLkRBRU1PTl9MT0NBTF9QQVRILFxuICAgICAgICAgICAgXCItLVwiICsgR2VuVXRpbHMuZ2V0RW51bUtleUJ5VmFsdWUoTW9uZXJvTmV0d29ya1R5cGUsIFRlc3RVdGlscy5ORVRXT1JLX1RZUEUpIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgICAgXCItLW5vLWlnZFwiLFxuICAgICAgICAgICAgXCItLWhpZGUtbXktcG9ydFwiLFxuICAgICAgICAgICAgXCItLWRhdGEtZGlyXCIsIFRlc3RVdGlscy5NT05FUk9fQklOU19ESVIgKyBcIi9ub2RlMVwiLFxuICAgICAgICAgICAgXCItLXAycC1iaW5kLXBvcnRcIiwgXCI1ODA4MFwiLFxuICAgICAgICAgICAgXCItLXJwYy1iaW5kLXBvcnRcIiwgXCI1ODA4MVwiLFxuICAgICAgICAgICAgXCItLXJwYy1sb2dpblwiLCBcInN1cGVydXNlcjphYmN0ZXN0aW5nMTIzXCIsXG4gICAgICAgICAgICBcIi0tem1xLXJwYy1iaW5kLXBvcnRcIiwgXCI1ODA4MlwiXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBzdGFydCBtb25lcm9kIHByb2Nlc3MgZnJvbSBjb21tYW5kXG4gICAgICAgIGxldCBkYWVtb24gPSBhd2FpdCBjb25uZWN0VG9EYWVtb25ScGMoY21kKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHF1ZXJ5IGRhZW1vblxuICAgICAgICBsZXQgY29ubmVjdGlvbiA9IGF3YWl0IGRhZW1vbi5nZXRScGNDb25uZWN0aW9uKCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChcImh0dHA6Ly8xMjcuMC4wLjE6NTgwODFcIiwgY29ubmVjdGlvbi5nZXRVcmkoKSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChcInN1cGVydXNlclwiLCBjb25uZWN0aW9uLmdldFVzZXJuYW1lKCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoXCJhYmN0ZXN0aW5nMTIzXCIsIGNvbm5lY3Rpb24uZ2V0UGFzc3dvcmQoKSk7XG4gICAgICAgIGFzc2VydChhd2FpdCBkYWVtb24uZ2V0SGVpZ2h0KCkgPiAwKTtcbiAgICAgICAgbGV0IGluZm8gPSBhd2FpdCBkYWVtb24uZ2V0SW5mbygpO1xuICAgICAgICB0ZXN0SW5mbyhpbmZvKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN0b3AgZGFlbW9uXG4gICAgICAgIGF3YWl0IGRhZW1vbi5zdG9wUHJvY2VzcygpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdGhlIGRhZW1vbidzIHZlcnNpb25cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCB2ZXJzaW9uID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0VmVyc2lvbigpO1xuICAgICAgICBhc3NlcnQodmVyc2lvbi5nZXROdW1iZXIoKSA+IDApO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHZlcnNpb24uZ2V0SXNSZWxlYXNlKCksIFwiYm9vbGVhblwiKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gaW5kaWNhdGUgaWYgaXQncyB0cnVzdGVkXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgaXNUcnVzdGVkID0gYXdhaXQgdGhhdC5kYWVtb24uaXNUcnVzdGVkKCk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgaXNUcnVzdGVkLCBcImJvb2xlYW5cIik7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCB0aGUgYmxvY2tjaGFpbiBoZWlnaHRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBoZWlnaHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKTtcbiAgICAgICAgYXNzZXJ0KGhlaWdodCwgXCJIZWlnaHQgbXVzdCBiZSBpbml0aWFsaXplZFwiKTtcbiAgICAgICAgYXNzZXJ0KGhlaWdodCA+IDAsIFwiSGVpZ2h0IG11c3QgYmUgZ3JlYXRlciB0aGFuIDBcIik7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBhIGJsb2NrIGhhc2ggYnkgaGVpZ2h0XCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgbGFzdEhlYWRlciA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldExhc3RCbG9ja0hlYWRlcigpO1xuICAgICAgICBsZXQgaGFzaCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEJsb2NrSGFzaChsYXN0SGVhZGVyLmdldEhlaWdodCgpKTtcbiAgICAgICAgYXNzZXJ0KGhhc2gpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoaGFzaC5sZW5ndGgsIDY0KTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGEgYmxvY2sgdGVtcGxhdGVcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCB0ZW1wbGF0ZSA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEJsb2NrVGVtcGxhdGUoVGVzdFV0aWxzLkFERFJFU1MsIDIpO1xuICAgICAgICB0ZXN0QmxvY2tUZW1wbGF0ZSh0ZW1wbGF0ZSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCB0aGUgbGFzdCBibG9jaydzIGhlYWRlclwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGxhc3RIZWFkZXIgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRMYXN0QmxvY2tIZWFkZXIoKTtcbiAgICAgICAgdGVzdEJsb2NrSGVhZGVyKGxhc3RIZWFkZXIsIHRydWUpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYSBibG9jayBoZWFkZXIgYnkgaGFzaFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHJldHJpZXZlIGJ5IGhhc2ggb2YgbGFzdCBibG9ja1xuICAgICAgICBsZXQgbGFzdEhlYWRlciA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldExhc3RCbG9ja0hlYWRlcigpO1xuICAgICAgICBsZXQgaGFzaCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEJsb2NrSGFzaChsYXN0SGVhZGVyLmdldEhlaWdodCgpKTtcbiAgICAgICAgbGV0IGhlYWRlciA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEJsb2NrSGVhZGVyQnlIYXNoKGhhc2gpO1xuICAgICAgICB0ZXN0QmxvY2tIZWFkZXIoaGVhZGVyLCB0cnVlKTtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChoZWFkZXIsIGxhc3RIZWFkZXIpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmV0cmlldmUgYnkgaGFzaCBvZiBwcmV2aW91cyB0byBsYXN0IGJsb2NrXG4gICAgICAgIGhhc2ggPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRCbG9ja0hhc2gobGFzdEhlYWRlci5nZXRIZWlnaHQoKSAtIDEpO1xuICAgICAgICBoZWFkZXIgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRCbG9ja0hlYWRlckJ5SGFzaChoYXNoKTtcbiAgICAgICAgdGVzdEJsb2NrSGVhZGVyKGhlYWRlciwgdHJ1ZSk7XG4gICAgICAgIGFzc2VydC5lcXVhbChoZWFkZXIuZ2V0SGVpZ2h0KCksIGxhc3RIZWFkZXIuZ2V0SGVpZ2h0KCkgLSAxKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGEgYmxvY2sgaGVhZGVyIGJ5IGhlaWdodFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHJldHJpZXZlIGJ5IGhlaWdodCBvZiBsYXN0IGJsb2NrXG4gICAgICAgIGxldCBsYXN0SGVhZGVyID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0TGFzdEJsb2NrSGVhZGVyKCk7XG4gICAgICAgIGxldCBoZWFkZXIgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRCbG9ja0hlYWRlckJ5SGVpZ2h0KGxhc3RIZWFkZXIuZ2V0SGVpZ2h0KCkpO1xuICAgICAgICB0ZXN0QmxvY2tIZWFkZXIoaGVhZGVyLCB0cnVlKTtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChoZWFkZXIsIGxhc3RIZWFkZXIpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmV0cmlldmUgYnkgaGVpZ2h0IG9mIHByZXZpb3VzIHRvIGxhc3QgYmxvY2tcbiAgICAgICAgaGVhZGVyID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0QmxvY2tIZWFkZXJCeUhlaWdodChsYXN0SGVhZGVyLmdldEhlaWdodCgpIC0gMSk7XG4gICAgICAgIHRlc3RCbG9ja0hlYWRlcihoZWFkZXIsIHRydWUpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoaGVhZGVyLmdldEhlaWdodCgpLCBsYXN0SGVhZGVyLmdldEhlaWdodCgpIC0gMSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgLy8gVE9ETzogdGVzdCBzdGFydCB3aXRoIG5vIGVuZCwgdmljZSB2ZXJzYSwgaW5jbHVzaXZpdHlcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYmxvY2sgaGVhZGVycyBieSByYW5nZVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGRldGVybWluZSBzdGFydCBhbmQgZW5kIGhlaWdodCBiYXNlZCBvbiBudW1iZXIgb2YgYmxvY2tzIGFuZCBob3cgbWFueSBibG9ja3MgYWdvXG4gICAgICAgIGxldCBudW1CbG9ja3MgPSAxMDA7XG4gICAgICAgIGxldCBudW1CbG9ja3NBZ28gPSAxMDA7XG4gICAgICAgIGxldCBjdXJyZW50SGVpZ2h0ID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCk7XG4gICAgICAgIGxldCBzdGFydEhlaWdodCA9IGN1cnJlbnRIZWlnaHQgLSBudW1CbG9ja3NBZ287XG4gICAgICAgIGxldCBlbmRIZWlnaHQgPSBjdXJyZW50SGVpZ2h0IC0gKG51bUJsb2Nrc0FnbyAtIG51bUJsb2NrcykgLSAxO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggaGVhZGVyc1xuICAgICAgICBsZXQgaGVhZGVycyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEJsb2NrSGVhZGVyc0J5UmFuZ2Uoc3RhcnRIZWlnaHQsIGVuZEhlaWdodCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGhlYWRlcnNcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGhlYWRlcnMubGVuZ3RoLCBudW1CbG9ja3MpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bUJsb2NrczsgaSsrKSB7XG4gICAgICAgICAgbGV0IGhlYWRlciA9IGhlYWRlcnNbaV07XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGhlYWRlci5nZXRIZWlnaHQoKSwgc3RhcnRIZWlnaHQgKyBpKTtcbiAgICAgICAgICB0ZXN0QmxvY2tIZWFkZXIoaGVhZGVyLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYSBibG9jayBieSBoYXNoXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gY29udGV4dCBmb3IgdGVzdGluZyBibG9ja3NcbiAgICAgICAgbGV0IHRlc3RCbG9ja0N0eCA9IHsgaGFzSGV4OiB0cnVlLCBoZWFkZXJJc0Z1bGw6IHRydWUsIGhhc1R4czogZmFsc2UgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJldHJpZXZlIGJ5IGhhc2ggb2YgbGFzdCBibG9ja1xuICAgICAgICBsZXQgbGFzdEhlYWRlciA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldExhc3RCbG9ja0hlYWRlcigpO1xuICAgICAgICBsZXQgaGFzaCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEJsb2NrSGFzaChsYXN0SGVhZGVyLmdldEhlaWdodCgpKTtcbiAgICAgICAgbGV0IGJsb2NrID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0QmxvY2tCeUhhc2goaGFzaCk7XG4gICAgICAgIHRlc3RCbG9jayhibG9jaywgdGVzdEJsb2NrQ3R4KTtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChibG9jaywgYXdhaXQgdGhhdC5kYWVtb24uZ2V0QmxvY2tCeUhlaWdodChibG9jay5nZXRIZWlnaHQoKSkpO1xuICAgICAgICBhc3NlcnQoYmxvY2suZ2V0VHhzKCkgPT09IHVuZGVmaW5lZCk7XG4gICAgICAgIFxuICAgICAgICAvLyByZXRyaWV2ZSBieSBoYXNoIG9mIHByZXZpb3VzIHRvIGxhc3QgYmxvY2tcbiAgICAgICAgaGFzaCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEJsb2NrSGFzaChsYXN0SGVhZGVyLmdldEhlaWdodCgpIC0gMSk7XG4gICAgICAgIGJsb2NrID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0QmxvY2tCeUhhc2goaGFzaCk7XG4gICAgICAgIHRlc3RCbG9jayhibG9jaywgdGVzdEJsb2NrQ3R4KTtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChibG9jaywgYXdhaXQgdGhhdC5kYWVtb24uZ2V0QmxvY2tCeUhlaWdodChsYXN0SGVhZGVyLmdldEhlaWdodCgpIC0gMSkpO1xuICAgICAgICBhc3NlcnQoYmxvY2suZ2V0VHhzKCkgPT09IHVuZGVmaW5lZCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBibG9ja3MgYnkgaGFzaCB3aGljaCBpbmNsdWRlcyB0cmFuc2FjdGlvbnMgKGJpbmFyeSlcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgICAgIH0pXG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYSBibG9jayBieSBoZWlnaHRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBjb250ZXh0IGZvciB0ZXN0aW5nIGJsb2Nrc1xuICAgICAgICBsZXQgdGVzdEJsb2NrQ3R4ID0geyBoYXNIZXg6IHRydWUsIGhlYWRlcklzRnVsbDogdHJ1ZSwgaGFzVHhzOiBmYWxzZSB9O1xuICAgICAgICBcbiAgICAgICAgLy8gcmV0cmlldmUgYnkgaGVpZ2h0IG9mIGxhc3QgYmxvY2tcbiAgICAgICAgbGV0IGxhc3RIZWFkZXIgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRMYXN0QmxvY2tIZWFkZXIoKTtcbiAgICAgICAgbGV0IGJsb2NrID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0QmxvY2tCeUhlaWdodChsYXN0SGVhZGVyLmdldEhlaWdodCgpKTtcbiAgICAgICAgdGVzdEJsb2NrKGJsb2NrLCB0ZXN0QmxvY2tDdHgpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGJsb2NrLCBhd2FpdCB0aGF0LmRhZW1vbi5nZXRCbG9ja0J5SGVpZ2h0KGJsb2NrLmdldEhlaWdodCgpKSk7XG4gICAgICAgIFxuICAgICAgICAvLyByZXRyaWV2ZSBieSBoZWlnaHQgb2YgcHJldmlvdXMgdG8gbGFzdCBibG9ja1xuICAgICAgICBibG9jayA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEJsb2NrQnlIZWlnaHQobGFzdEhlYWRlci5nZXRIZWlnaHQoKSAtIDEpO1xuICAgICAgICB0ZXN0QmxvY2soYmxvY2ssIHRlc3RCbG9ja0N0eCk7XG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoYmxvY2suZ2V0SGVpZ2h0KCksIGxhc3RIZWFkZXIuZ2V0SGVpZ2h0KCkgLSAxKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGJsb2NrcyBieSBoZWlnaHQgd2hpY2ggaW5jbHVkZXMgdHJhbnNhY3Rpb25zIChiaW5hcnkpXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gc2V0IG51bWJlciBvZiBibG9ja3MgdG8gdGVzdFxuICAgICAgICBjb25zdCBudW1CbG9ja3MgPSAyMDA7XG4gICAgICAgIFxuICAgICAgICAvLyBzZWxlY3QgcmFuZG9tIGhlaWdodHMgIC8vIFRPRE86IHRoaXMgaXMgaG9ycmlibHkgaW5lZmZpY2llbnQgd2F5IG9mIGNvbXB1dGluZyBsYXN0IDEwMCBibG9ja3MgaWYgbm90IHNodWZmbGluZ1xuICAgICAgICBsZXQgY3VycmVudEhlaWdodCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpO1xuICAgICAgICBsZXQgYWxsSGVpZ2h0czogbnVtYmVyW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXJyZW50SGVpZ2h0IC0gMTsgaSsrKSBhbGxIZWlnaHRzLnB1c2goaSk7XG4gICAgICAgIC8vR2VuVXRpbHMuc2h1ZmZsZShhbGxIZWlnaHRzKTtcbiAgICAgICAgbGV0IGhlaWdodHM6IG51bWJlcltdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSBhbGxIZWlnaHRzLmxlbmd0aCAtIG51bUJsb2NrczsgaSA8IGFsbEhlaWdodHMubGVuZ3RoOyBpKyspIGhlaWdodHMucHVzaChhbGxIZWlnaHRzW2ldKTtcbiAgICAgICAgXG4gICAgICAgIC8vaGVpZ2h0cy5wdXNoKGFsbEhlaWdodHNbaV0pO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggYmxvY2tzXG4gICAgICAgIGxldCBibG9ja3MgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRCbG9ja3NCeUhlaWdodChoZWlnaHRzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgYmxvY2tzXG4gICAgICAgIGxldCB0eEZvdW5kID0gZmFsc2U7XG4gICAgICAgIGFzc2VydC5lcXVhbChibG9ja3MubGVuZ3RoLCBudW1CbG9ja3MpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGhlaWdodHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBsZXQgYmxvY2sgPSBibG9ja3NbaV07XG4gICAgICAgICAgaWYgKGJsb2NrLmdldFR4cygpLmxlbmd0aCkgdHhGb3VuZCA9IHRydWU7XG4gICAgICAgICAgdGVzdEJsb2NrKGJsb2NrLCBCSU5BUllfQkxPQ0tfQ1RYKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYmxvY2suZ2V0SGVpZ2h0KCksIGhlaWdodHNbaV0pOyAgICAgIFxuICAgICAgICB9XG4gICAgICAgIGFzc2VydCh0eEZvdW5kLCBcIk5vIHRyYW5zYWN0aW9ucyBmb3VuZCB0byB0ZXN0XCIpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYmxvY2tzIGJ5IHJhbmdlIGluIGEgc2luZ2xlIHJlcXVlc3RcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgaGVpZ2h0IHJhbmdlXG4gICAgICAgIGxldCBudW1CbG9ja3MgPSAxMDA7XG4gICAgICAgIGxldCBudW1CbG9ja3NBZ28gPSAxOTA7XG4gICAgICAgIGFzc2VydChudW1CbG9ja3MgPiAwKTtcbiAgICAgICAgYXNzZXJ0KG51bUJsb2Nrc0FnbyA+PSBudW1CbG9ja3MpO1xuICAgICAgICBsZXQgaGVpZ2h0ID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCk7XG4gICAgICAgIGFzc2VydChoZWlnaHQgLSBudW1CbG9ja3NBZ28gKyBudW1CbG9ja3MgLSAxIDwgaGVpZ2h0KTtcbiAgICAgICAgbGV0IHN0YXJ0SGVpZ2h0ID0gaGVpZ2h0IC0gbnVtQmxvY2tzQWdvO1xuICAgICAgICBsZXQgZW5kSGVpZ2h0ID0gaGVpZ2h0IC0gbnVtQmxvY2tzQWdvICsgbnVtQmxvY2tzIC0gMTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3Qga25vd24gc3RhcnQgYW5kIGVuZCBoZWlnaHRzXG4gICAgICAgIGF3YWl0IHRlc3RHZXRCbG9ja3NSYW5nZShzdGFydEhlaWdodCwgZW5kSGVpZ2h0LCBoZWlnaHQsIGZhbHNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdW5zcGVjaWZpZWQgc3RhcnRcbiAgICAgICAgYXdhaXQgdGVzdEdldEJsb2Nrc1JhbmdlKHVuZGVmaW5lZCwgbnVtQmxvY2tzIC0gMSwgaGVpZ2h0LCBmYWxzZSk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHVuc3BlY2lmaWVkIGVuZFxuICAgICAgICBhd2FpdCB0ZXN0R2V0QmxvY2tzUmFuZ2UoaGVpZ2h0IC0gbnVtQmxvY2tzIC0gMSwgdW5kZWZpbmVkLCBoZWlnaHQsIGZhbHNlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAvLyBDYW4gZ2V0IGJsb2NrcyBieSByYW5nZSB1c2luZyBjaHVua2VkIHJlcXVlc3RzXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGJsb2NrcyBieSByYW5nZSB1c2luZyBjaHVua2VkIHJlcXVlc3RzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZ2V0IGxvbmcgaGVpZ2h0IHJhbmdlXG4gICAgICAgIGxldCBudW1CbG9ja3MgPSBNYXRoLm1pbihhd2FpdCB0aGF0LmRhZW1vbi5nZXRIZWlnaHQoKSAtIDIsIDE0NDApOyAvLyB0ZXN0IHVwIHRvIH4yIGRheXMgb2YgYmxvY2tzXG4gICAgICAgIGFzc2VydChudW1CbG9ja3MgPiAwKTtcbiAgICAgICAgbGV0IGhlaWdodCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpO1xuICAgICAgICBhc3NlcnQoaGVpZ2h0IC0gbnVtQmxvY2tzIC0gMSA8IGhlaWdodCk7XG4gICAgICAgIGxldCBzdGFydEhlaWdodCA9IGhlaWdodCAtIG51bUJsb2NrcztcbiAgICAgICAgbGV0IGVuZEhlaWdodCA9IGhlaWdodCAtIDE7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGtub3duIHN0YXJ0IGFuZCBlbmQgaGVpZ2h0c1xuICAgICAgICBhd2FpdCB0ZXN0R2V0QmxvY2tzUmFuZ2Uoc3RhcnRIZWlnaHQsIGVuZEhlaWdodCwgaGVpZ2h0LCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdW5zcGVjaWZpZWQgc3RhcnRcbiAgICAgICAgYXdhaXQgdGVzdEdldEJsb2Nrc1JhbmdlKHVuZGVmaW5lZCwgbnVtQmxvY2tzIC0gMSwgaGVpZ2h0LCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHRlc3QgdW5zcGVjaWZpZWQgZW5kXG4gICAgICAgIGF3YWl0IHRlc3RHZXRCbG9ja3NSYW5nZShlbmRIZWlnaHQgLSBudW1CbG9ja3MgLSAxLCB1bmRlZmluZWQsIGhlaWdodCwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgYXN5bmMgZnVuY3Rpb24gdGVzdEdldEJsb2Nrc1JhbmdlKHN0YXJ0SGVpZ2h0LCBlbmRIZWlnaHQsIGNoYWluSGVpZ2h0LCBjaHVua2VkKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCBibG9ja3MgYnkgcmFuZ2VcbiAgICAgICAgbGV0IHJlYWxTdGFydEhlaWdodCA9IHN0YXJ0SGVpZ2h0ID09PSB1bmRlZmluZWQgPyAwIDogc3RhcnRIZWlnaHQ7XG4gICAgICAgIGxldCByZWFsRW5kSGVpZ2h0ID0gZW5kSGVpZ2h0ID09PSB1bmRlZmluZWQgPyBjaGFpbkhlaWdodCAtIDEgOiBlbmRIZWlnaHQ7XG4gICAgICAgIGxldCBibG9ja3MgPSBjaHVua2VkID8gYXdhaXQgdGhhdC5kYWVtb24uZ2V0QmxvY2tzQnlSYW5nZUNodW5rZWQoc3RhcnRIZWlnaHQsIGVuZEhlaWdodCkgOiBhd2FpdCB0aGF0LmRhZW1vbi5nZXRCbG9ja3NCeVJhbmdlKHN0YXJ0SGVpZ2h0LCBlbmRIZWlnaHQpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYmxvY2tzLmxlbmd0aCwgcmVhbEVuZEhlaWdodCAtIHJlYWxTdGFydEhlaWdodCArIDEpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBlYWNoIGJsb2NrXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmxvY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGJsb2Nrc1tpXS5nZXRIZWlnaHQoKSwgcmVhbFN0YXJ0SGVpZ2h0ICsgaSk7XG4gICAgICAgICAgdGVzdEJsb2NrKGJsb2Nrc1tpXSwgQklOQVJZX0JMT0NLX0NUWCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBibG9jayBoYXNoZXMgKGJpbmFyeSlcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vZ2V0X2hhc2hlcy5iaW5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkXCIpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgYSB0cmFuc2FjdGlvbiBieSBoYXNoIHdpdGggYW5kIHdpdGhvdXQgcHJ1bmluZ1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIHRyYW5zYWN0aW9uIGhhc2hlcyB0byB0ZXN0XG4gICAgICAgIGxldCB0eEhhc2hlcyA9IGF3YWl0IGdldENvbmZpcm1lZFR4SGFzaGVzKHRoYXQuZGFlbW9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIGVhY2ggdHggYnkgaGFzaCB3aXRob3V0IHBydW5pbmdcbiAgICAgICAgZm9yIChsZXQgdHhIYXNoIG9mIHR4SGFzaGVzKSB7XG4gICAgICAgICAgbGV0IHR4ID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHgodHhIYXNoKTtcbiAgICAgICAgICB0ZXN0VHgodHgsIHtpc1BydW5lZDogZmFsc2UsIGlzQ29uZmlybWVkOiB0cnVlLCBmcm9tR2V0VHhQb29sOiBmYWxzZX0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCBlYWNoIHR4IGJ5IGhhc2ggd2l0aCBwcnVuaW5nXG4gICAgICAgIGZvciAobGV0IHR4SGFzaCBvZiB0eEhhc2hlcykge1xuICAgICAgICAgIGxldCB0eCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4KHR4SGFzaCwgdHJ1ZSk7XG4gICAgICAgICAgdGVzdFR4KHR4LCB7aXNQcnVuZWQ6IHRydWUsIGlzQ29uZmlybWVkOiB0cnVlLCBmcm9tR2V0VHhQb29sOiBmYWxzZX0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCBpbnZhbGlkIGhhc2hcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeChcImludmFsaWQgdHggaGFzaFwiKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmYWlsXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoXCJJbnZhbGlkIHRyYW5zYWN0aW9uIGhhc2hcIiwgZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdCAoXCJDYW4gZ2V0IHRyYW5zYWN0aW9ucyBieSBoYXNoZXMgd2l0aCBhbmQgd2l0aG91dCBwcnVuaW5nXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggdHJhbnNhY3Rpb24gaGFzaGVzIHRvIHRlc3RcbiAgICAgICAgbGV0IHR4SGFzaGVzID0gYXdhaXQgZ2V0Q29uZmlybWVkVHhIYXNoZXModGhhdC5kYWVtb24pO1xuICAgICAgICBhc3NlcnQodHhIYXNoZXMubGVuZ3RoID4gMCk7XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCB0eHMgYnkgaGFzaCB3aXRob3V0IHBydW5pbmdcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4cyh0eEhhc2hlcyk7XG4gICAgICAgIGFzc2VydC5lcXVhbCh0eHMubGVuZ3RoLCB0eEhhc2hlcy5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICB0ZXN0VHgodHgsIHtpc1BydW5lZDogZmFsc2UsIGlzQ29uZmlybWVkOiB0cnVlLCBmcm9tR2V0VHhQb29sOiBmYWxzZX0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCB0eHMgYnkgaGFzaCB3aXRoIHBydW5pbmdcbiAgICAgICAgdHhzID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHhzKHR4SGFzaGVzLCB0cnVlKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHR4cy5sZW5ndGgsIHR4SGFzaGVzLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykge1xuICAgICAgICAgIHRlc3RUeCh0eCwge2lzUHJ1bmVkOiB0cnVlLCBpc0NvbmZpcm1lZDogdHJ1ZSwgZnJvbUdldFR4UG9vbDogZmFsc2V9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggbWlzc2luZyBoYXNoXG4gICAgICAgIGxldCB0eCA9IGF3YWl0IHRoYXQud2FsbGV0LmNyZWF0ZVR4KHthY2NvdW50SW5kZXg6IDAsIGFkZHJlc3M6IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCksIGFtb3VudDogVGVzdFV0aWxzLk1BWF9GRUV9KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHVuZGVmaW5lZCwgYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHgodHguZ2V0SGFzaCgpKSk7XG4gICAgICAgIHR4SGFzaGVzLnB1c2godHguZ2V0SGFzaCgpKTtcbiAgICAgICAgbGV0IG51bVR4cyA9IHR4cy5sZW5ndGg7XG4gICAgICAgIHR4cyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4cyh0eEhhc2hlcyk7XG4gICAgICAgIGFzc2VydC5lcXVhbChudW1UeHMsIHR4cy5sZW5ndGgpO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggaW52YWxpZCBoYXNoXG4gICAgICAgIHR4SGFzaGVzLnB1c2goXCJpbnZhbGlkIHR4IGhhc2hcIik7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHhzKHR4SGFzaGVzKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmYWlsXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoXCJJbnZhbGlkIHRyYW5zYWN0aW9uIGhhc2hcIiwgZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdHJhbnNhY3Rpb25zIGJ5IGhhc2hlcyB0aGF0IGFyZSBpbiB0aGUgdHJhbnNhY3Rpb24gcG9vbFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbCh0aGF0LndhbGxldCk7IC8vIHdhaXQgZm9yIHdhbGxldCdzIHR4cyBpbiB0aGUgcG9vbCB0byBjbGVhciB0byBlbnN1cmUgcmVsaWFibGUgc3luY1xuICAgICAgICBcbiAgICAgICAgLy8gc3VibWl0IHR4cyB0byB0aGUgcG9vbCBidXQgZG9uJ3QgcmVsYXlcbiAgICAgICAgbGV0IHR4SGFzaGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDM7IGkrKykge1xuICAgICAgICAgIGxldCB0eCA9IGF3YWl0IGdldFVucmVsYXllZFR4KHRoYXQud2FsbGV0LCBpKTtcbiAgICAgICAgICBsZXQgcmVzdWx0ID0gYXdhaXQgdGhhdC5kYWVtb24uc3VibWl0VHhIZXgodHguZ2V0RnVsbEhleCgpLCB0cnVlKTtcbiAgICAgICAgICB0ZXN0U3VibWl0VHhSZXN1bHRHb29kKHJlc3VsdCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRJc1JlbGF5ZWQoKSwgZmFsc2UpO1xuICAgICAgICAgIHR4SGFzaGVzLnB1c2godHguZ2V0SGFzaCgpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggdHhzIGJ5IGhhc2hcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4cyh0eEhhc2hlcyk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGZldGNoZWQgdHhzXG4gICAgICAgIGFzc2VydC5lcXVhbCh0eHMubGVuZ3RoLCB0eEhhc2hlcy5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICB0ZXN0VHgodHgsIHtpc0NvbmZpcm1lZDogZmFsc2UsIGZyb21HZXRUeFBvb2w6IGZhbHNlLCBpc1BydW5lZDogZmFsc2V9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gY2xlYXIgdHhzIGZyb20gcG9vbFxuICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5mbHVzaFR4UG9vbCh0eEhhc2hlcyk7XG4gICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnN5bmMoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGEgdHJhbnNhY3Rpb24gaGV4IGJ5IGhhc2ggd2l0aCBhbmQgd2l0aG91dCBwcnVuaW5nXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggdHJhbnNhY3Rpb24gaGFzaGVzIHRvIHRlc3RcbiAgICAgICAgbGV0IHR4SGFzaGVzID0gYXdhaXQgZ2V0Q29uZmlybWVkVHhIYXNoZXModGhhdC5kYWVtb24pO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggZWFjaCB0eCBoZXggYnkgaGFzaCB3aXRoIGFuZCB3aXRob3V0IHBydW5pbmdcbiAgICAgICAgbGV0IGhleGVzOiBzdHJpbmdbXSA9IFtdXG4gICAgICAgIGxldCBoZXhlc1BydW5lZDogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdHhIYXNoIG9mIHR4SGFzaGVzKSB7XG4gICAgICAgICAgaGV4ZXMucHVzaChhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeEhleCh0eEhhc2gpKTtcbiAgICAgICAgICBoZXhlc1BydW5lZC5wdXNoKGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4SGV4KHR4SGFzaCwgdHJ1ZSkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IHJlc3VsdHNcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGhleGVzLmxlbmd0aCwgdHhIYXNoZXMubGVuZ3RoKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGhleGVzUHJ1bmVkLmxlbmd0aCwgdHhIYXNoZXMubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBoZXhlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgaGV4ZXNbaV0sIFwic3RyaW5nXCIpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgaGV4ZXNQcnVuZWRbaV0sIFwic3RyaW5nXCIpO1xuICAgICAgICAgIGFzc2VydChoZXhlc1BydW5lZFtpXS5sZW5ndGggPiAwKTtcbiAgICAgICAgICBhc3NlcnQoaGV4ZXNbaV0ubGVuZ3RoID4gaGV4ZXNQcnVuZWRbaV0ubGVuZ3RoKTsgLy8gcHJ1bmVkIGhleCBpcyBzaG9ydGVyXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGZldGNoIGludmFsaWQgaGFzaFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4SGV4KFwiaW52YWxpZCB0eCBoYXNoXCIpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImZhaWxcIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChcIkludmFsaWQgdHJhbnNhY3Rpb24gaGFzaFwiLCBlLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCB0cmFuc2FjdGlvbiBoZXhlcyBieSBoYXNoZXMgd2l0aCBhbmQgd2l0aG91dCBwcnVuaW5nXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggdHJhbnNhY3Rpb24gaGFzaGVzIHRvIHRlc3RcbiAgICAgICAgbGV0IHR4SGFzaGVzID0gYXdhaXQgZ2V0Q29uZmlybWVkVHhIYXNoZXModGhhdC5kYWVtb24pO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggdHggaGV4ZXMgYnkgaGFzaCB3aXRoIGFuZCB3aXRob3V0IHBydW5pbmdcbiAgICAgICAgbGV0IGhleGVzID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHhIZXhlcyh0eEhhc2hlcyk7XG4gICAgICAgIGxldCBoZXhlc1BydW5lZCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4SGV4ZXModHhIYXNoZXMsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCByZXN1bHRzXG4gICAgICAgIGFzc2VydC5lcXVhbChoZXhlcy5sZW5ndGgsIHR4SGFzaGVzLmxlbmd0aCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChoZXhlc1BydW5lZC5sZW5ndGgsIHR4SGFzaGVzLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaGV4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHlwZW9mIGhleGVzW2ldLCBcInN0cmluZ1wiKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwodHlwZW9mIGhleGVzUHJ1bmVkW2ldLCBcInN0cmluZ1wiKTtcbiAgICAgICAgICBhc3NlcnQoaGV4ZXNQcnVuZWRbaV0ubGVuZ3RoID4gMCk7XG4gICAgICAgICAgYXNzZXJ0KGhleGVzW2ldLmxlbmd0aCA+IGhleGVzUHJ1bmVkW2ldLmxlbmd0aCk7IC8vIHBydW5lZCBoZXggaXMgc2hvcnRlclxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmZXRjaCBpbnZhbGlkIGhhc2hcbiAgICAgICAgdHhIYXNoZXMucHVzaChcImludmFsaWQgdHggaGFzaFwiKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeEhleGVzKHR4SGFzaGVzKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmYWlsXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoXCJJbnZhbGlkIHRyYW5zYWN0aW9uIGhhc2hcIiwgZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgdGhlIG1pbmVyIHRyYW5zYWN0aW9uIHN1bVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IHN1bSA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldE1pbmVyVHhTdW0oMCwgTWF0aC5taW4oNTAwMDAsIGF3YWl0IHRoYXQuZGFlbW9uLmdldEhlaWdodCgpKSk7XG4gICAgICAgIHRlc3RNaW5lclR4U3VtKHN1bSk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBhIGZlZSBlc3RpbWF0ZVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGZlZUVzdGltYXRlID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0RmVlRXN0aW1hdGUoKTtcbiAgICAgICAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChmZWVFc3RpbWF0ZS5nZXRGZWUoKSwgdHJ1ZSk7XG4gICAgICAgIGFzc2VydChmZWVFc3RpbWF0ZS5nZXRGZWVzKCkubGVuZ3RoID09PSA0KTsgLy8gc2xvdywgbm9ybWFsLCBmYXN0LCBmYXN0ZXN0XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNDsgaSsrKSBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGZlZUVzdGltYXRlLmdldEZlZXMoKVtpXSwgdHJ1ZSk7XG4gICAgICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQoZmVlRXN0aW1hdGUuZ2V0UXVhbnRpemF0aW9uTWFzaygpLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGFsbCB0cmFuc2FjdGlvbnMgaW4gdGhlIHRyYW5zYWN0aW9uIHBvb2xcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3VibWl0IHR4IHRvIHBvb2wgYnV0IGRvbid0IHJlbGF5XG4gICAgICAgIGxldCB0eCA9IGF3YWl0IGdldFVucmVsYXllZFR4KHRoYXQud2FsbGV0LCAwKTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLnN1Ym1pdFR4SGV4KHR4LmdldEZ1bGxIZXgoKSwgdHJ1ZSk7XG4gICAgICAgIHRlc3RTdWJtaXRUeFJlc3VsdEdvb2QocmVzdWx0KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRJc1JlbGF5ZWQoKSwgZmFsc2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gZmV0Y2ggdHhzIGluIHBvb2xcbiAgICAgICAgbGV0IHR4cyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4UG9vbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCB0eHNcbiAgICAgICAgYXNzZXJ0KEFycmF5LmlzQXJyYXkodHhzKSk7XG4gICAgICAgIGFzc2VydCh0eHMubGVuZ3RoID4gMCwgXCJUZXN0IHJlcXVpcmVzIGFuIHVuY29uZmlybWVkIHR4IGluIHRoZSB0eCBwb29sXCIpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiB0eHMpIHtcbiAgICAgICAgICB0ZXN0VHgodHgsIHsgaXNQcnVuZWQ6IGZhbHNlLCBpc0NvbmZpcm1lZDogZmFsc2UsIGZyb21HZXRUeFBvb2w6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGZsdXNoIHRoZSB0eCBmcm9tIHRoZSBwb29sLCBnZ1xuICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5mbHVzaFR4UG9vbCh0eC5nZXRIYXNoKCkpO1xuICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5zeW5jKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBoYXNoZXMgb2YgdHJhbnNhY3Rpb25zIGluIHRoZSB0cmFuc2FjdGlvbiBwb29sIChiaW5hcnkpXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBUT0RPOiBnZXRfdHJhbnNhY3Rpb25fcG9vbF9oYXNoZXMuYmluXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IHRoZSB0cmFuc2FjdGlvbiBwb29sIGJhY2tsb2cgKGJpbmFyeSlcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFRPRE86IGdldF90eHBvb2xfYmFja2xvZ1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWRcIik7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCB0cmFuc2FjdGlvbiBwb29sIHN0YXRpc3RpY3NcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICBsZXQgdHhJZHMgPSBbXTtcbiAgICAgICAgdHJ5IHtcblxuICAgICAgICAgIC8vIHN1Ym1pdCB0eHMgdG8gdGhlIHBvb2wgYnV0IGRvbid0IHJlbGF5XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gc3VibWl0IHR4IGhleFxuICAgICAgICAgICAgbGV0IHR4ID0gYXdhaXQgZ2V0VW5yZWxheWVkVHgodGhhdC53YWxsZXQsIGkpO1xuICAgICAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLnN1Ym1pdFR4SGV4KHR4LmdldEZ1bGxIZXgoKSwgdHJ1ZSk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldElzR29vZCgpLCB0cnVlLCBcIkJhZCB0eCBzdWJtaXQgcmVzdWx0OiBcIiArIHJlc3VsdC50b0pzb24oKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGdldCB0eCBwb29sIHN0YXRzXG4gICAgICAgICAgICBsZXQgc3RhdHMgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeFBvb2xTdGF0cygpO1xuICAgICAgICAgICAgYXNzZXJ0KHN0YXRzLmdldE51bVR4cygpID4gaSAtIDEpO1xuICAgICAgICAgICAgdGVzdFR4UG9vbFN0YXRzKHN0YXRzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZmx1c2ggdHhzXG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLmZsdXNoVHhQb29sKHR4SWRzKTtcbiAgICAgICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBmbHVzaCBhbGwgdHJhbnNhY3Rpb25zIGZyb20gdGhlIHBvb2xcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gcHJlc2VydmUgb3JpZ2luYWwgdHJhbnNhY3Rpb25zIGluIHRoZSBwb29sXG4gICAgICAgIGxldCB0eFBvb2xCZWZvcmUgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeFBvb2woKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN1Ym1pdCB0eHMgdG8gdGhlIHBvb2wgYnV0IGRvbid0IHJlbGF5XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMjsgaSsrKSB7XG4gICAgICAgICAgbGV0IHR4ID0gYXdhaXQgZ2V0VW5yZWxheWVkVHgodGhhdC53YWxsZXQsIGkpO1xuICAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5zdWJtaXRUeEhleCh0eC5nZXRGdWxsSGV4KCksIHRydWUpO1xuICAgICAgICAgIHRlc3RTdWJtaXRUeFJlc3VsdEdvb2QocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4UG9vbCgpKS5sZW5ndGgsIHR4UG9vbEJlZm9yZS5sZW5ndGggKyAyKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGZsdXNoIHR4IHBvb2xcbiAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24uZmx1c2hUeFBvb2woKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeFBvb2woKSkubGVuZ3RoLCAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHJlLXN1Ym1pdCBvcmlnaW5hbCB0cmFuc2FjdGlvbnNcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhQb29sQmVmb3JlKSB7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLnN1Ym1pdFR4SGV4KHR4LmdldEZ1bGxIZXgoKSwgdHguZ2V0SXNSZWxheWVkKCkpO1xuICAgICAgICAgIHRlc3RTdWJtaXRUeFJlc3VsdEdvb2QocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gcG9vbCBpcyBiYWNrIHRvIG9yaWdpbmFsIHN0YXRlXG4gICAgICAgIGFzc2VydC5lcXVhbCgoYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHhQb29sKCkpLmxlbmd0aCwgdHhQb29sQmVmb3JlLmxlbmd0aCk7XG4gICAgICAgIFxuICAgICAgICAvLyBzeW5jIHdhbGxldCBmb3IgbmV4dCB0ZXN0XG4gICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LnN5bmMoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZmx1c2ggYSB0cmFuc2FjdGlvbiBmcm9tIHRoZSBwb29sIGJ5IGhhc2hcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gcHJlc2VydmUgb3JpZ2luYWwgdHJhbnNhY3Rpb25zIGluIHRoZSBwb29sXG4gICAgICAgIGxldCB0eFBvb2xCZWZvcmUgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeFBvb2woKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN1Ym1pdCB0eHMgdG8gdGhlIHBvb2wgYnV0IGRvbid0IHJlbGF5XG4gICAgICAgIGxldCB0eHM6IE1vbmVyb1R4W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgICBsZXQgdHggPSBhd2FpdCBnZXRVbnJlbGF5ZWRUeCh0aGF0LndhbGxldCwgaSk7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLnN1Ym1pdFR4SGV4KHR4LmdldEZ1bGxIZXgoKSwgdHJ1ZSk7XG4gICAgICAgICAgdGVzdFN1Ym1pdFR4UmVzdWx0R29vZChyZXN1bHQpO1xuICAgICAgICAgIHR4cy5wdXNoKHR4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlbW92ZSBlYWNoIHR4IGZyb20gdGhlIHBvb2wgYnkgaGFzaCBhbmQgdGVzdFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHR4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIGZsdXNoIHR4IGZyb20gcG9vbFxuICAgICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLmZsdXNoVHhQb29sKHR4c1tpXS5nZXRIYXNoKCkpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgdHggcG9vbFxuICAgICAgICAgIGxldCBwb29sVHhzID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHhQb29sKCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHBvb2xUeHMubGVuZ3RoLCB0eHMubGVuZ3RoIC0gaSAtIDEpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBwb29sIGlzIGJhY2sgdG8gb3JpZ2luYWwgc3RhdGVcbiAgICAgICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeFBvb2woKSkubGVuZ3RoLCB0eFBvb2xCZWZvcmUubGVuZ3RoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN5bmMgd2FsbGV0IGZvciBuZXh0IHRlc3RcbiAgICAgICAgYXdhaXQgdGhhdC53YWxsZXQuc3luYygpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBmbHVzaCB0cmFuc2FjdGlvbnMgZnJvbSB0aGUgcG9vbCBieSBoYXNoZXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gcHJlc2VydmUgb3JpZ2luYWwgdHJhbnNhY3Rpb25zIGluIHRoZSBwb29sXG4gICAgICAgIGxldCB0eFBvb2xCZWZvcmUgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeFBvb2woKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN1Ym1pdCB0eHMgdG8gdGhlIHBvb2wgYnV0IGRvbid0IHJlbGF5XG4gICAgICAgIGxldCB0eEhhc2hlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgICBsZXQgdHggPSBhd2FpdCBnZXRVbnJlbGF5ZWRUeCh0aGF0LndhbGxldCwgaSk7XG4gICAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLnN1Ym1pdFR4SGV4KHR4LmdldEZ1bGxIZXgoKSwgdHJ1ZSk7XG4gICAgICAgICAgdGVzdFN1Ym1pdFR4UmVzdWx0R29vZChyZXN1bHQpO1xuICAgICAgICAgIHR4SGFzaGVzLnB1c2godHguZ2V0SGFzaCgpKTtcbiAgICAgICAgfVxuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4UG9vbCgpKS5sZW5ndGgsIHR4UG9vbEJlZm9yZS5sZW5ndGggKyB0eEhhc2hlcy5sZW5ndGgpO1xuICAgICAgICBcbiAgICAgICAgLy8gcmVtb3ZlIGFsbCB0eHMgYnkgaGFzaGVzXG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLmZsdXNoVHhQb29sKHR4SGFzaGVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHBvb2wgaXMgYmFjayB0byBvcmlnaW5hbCBzdGF0ZVxuICAgICAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4UG9vbCgpKS5sZW5ndGgsIHR4UG9vbEJlZm9yZS5sZW5ndGgsIFwiVHggcG9vbCBzaXplIGlzIGRpZmZlcmVudCBmcm9tIHN0YXJ0XCIpO1xuICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5zeW5jKCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCB0aGUgc3BlbnQgc3RhdHVzIG9mIGtleSBpbWFnZXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3VibWl0IHR4cyB0byB0aGUgcG9vbCB0byBjb2xsZWN0IGtleSBpbWFnZXMgdGhlbiBmbHVzaCB0aGVtXG4gICAgICAgIGxldCB0eHM6IE1vbmVyb1R4W10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgICBsZXQgdHggPSBhd2FpdCBnZXRVbnJlbGF5ZWRUeCh0aGF0LndhbGxldCwgaSk7XG4gICAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24uc3VibWl0VHhIZXgodHguZ2V0RnVsbEhleCgpLCB0cnVlKTtcbiAgICAgICAgICB0eHMucHVzaCh0eCk7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGtleUltYWdlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgbGV0IHR4SGFzaGVzID0gdHhzLm1hcCh0eCA9PiB0eC5nZXRIYXNoKCkpO1xuICAgICAgICBmb3IgKGxldCB0eCBvZiBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeHModHhIYXNoZXMpKSB7XG4gICAgICAgICAgZm9yIChsZXQgaW5wdXQgb2YgdHguZ2V0SW5wdXRzKCkpIGtleUltYWdlcy5wdXNoKGlucHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLmZsdXNoVHhQb29sKHR4SGFzaGVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGtleSBpbWFnZXMgYXJlIG5vdCBzcGVudFxuICAgICAgICBhd2FpdCB0ZXN0U3BlbnRTdGF0dXNlcyhrZXlJbWFnZXMsIE1vbmVyb0tleUltYWdlU3BlbnRTdGF0dXMuTk9UX1NQRU5UKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN1Ym1pdCB0eHMgdG8gdGhlIHBvb2wgYnV0IGRvbid0IHJlbGF5XG4gICAgICAgIGZvciAobGV0IHR4IG9mIHR4cykgYXdhaXQgdGhhdC5kYWVtb24uc3VibWl0VHhIZXgodHguZ2V0RnVsbEhleCgpLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGtleSBpbWFnZXMgYXJlIGluIHRoZSB0eCBwb29sXG4gICAgICAgIGF3YWl0IHRlc3RTcGVudFN0YXR1c2VzKGtleUltYWdlcywgTW9uZXJvS2V5SW1hZ2VTcGVudFN0YXR1cy5UWF9QT09MKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNvbGxlY3Qga2V5IGltYWdlcyBvZiBjb25maXJtZWQgdHhzXG4gICAgICAgIGtleUltYWdlcyA9IFtdO1xuICAgICAgICB0eHMgPSBhd2FpdCBnZXRDb25maXJtZWRUeHModGhhdC5kYWVtb24sIDEwKTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgZm9yIChsZXQgaW5wdXQgb2YgdHguZ2V0SW5wdXRzKCkpIGtleUltYWdlcy5wdXNoKGlucHV0LmdldEtleUltYWdlKCkuZ2V0SGV4KCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBrZXkgaW1hZ2VzIGFyZSBhbGwgc3BlbnRcbiAgICAgICAgYXdhaXQgdGVzdFNwZW50U3RhdHVzZXMoa2V5SW1hZ2VzLCBNb25lcm9LZXlJbWFnZVNwZW50U3RhdHVzLkNPTkZJUk1FRCk7XG4gICAgICAgIFxuICAgICAgICAvLyBmbHVzaCB0aGlzIHRlc3QncyB0eHMgZnJvbSBwb29sXG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLmZsdXNoVHhQb29sKHR4SGFzaGVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGhlbHBlciBmdW5jdGlvbiB0byBjaGVjayB0aGUgc3BlbnQgc3RhdHVzIG9mIGEga2V5IGltYWdlIG9yIGFycmF5IG9mIGtleSBpbWFnZXNcbiAgICAgICAgYXN5bmMgZnVuY3Rpb24gdGVzdFNwZW50U3RhdHVzZXMoa2V5SW1hZ2VzLCBleHBlY3RlZFN0YXR1cykge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgaW1hZ2VcbiAgICAgICAgICBmb3IgKGxldCBrZXlJbWFnZSBvZiBrZXlJbWFnZXMpIHtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB0aGF0LmRhZW1vbi5nZXRLZXlJbWFnZVNwZW50U3RhdHVzKGtleUltYWdlKSwgZXhwZWN0ZWRTdGF0dXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IGFycmF5IG9mIGltYWdlc1xuICAgICAgICAgIGxldCBzdGF0dXNlcyA9IGtleUltYWdlcy5sZW5ndGggPT0gMCA/IFtdIDogYXdhaXQgdGhhdC5kYWVtb24uZ2V0S2V5SW1hZ2VTcGVudFN0YXR1c2VzKGtleUltYWdlcyk7XG4gICAgICAgICAgYXNzZXJ0KEFycmF5LmlzQXJyYXkoc3RhdHVzZXMpKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoc3RhdHVzZXMubGVuZ3RoLCBrZXlJbWFnZXMubGVuZ3RoKTtcbiAgICAgICAgICBmb3IgKGxldCBzdGF0dXMgb2Ygc3RhdHVzZXMpIGFzc2VydC5lcXVhbChzdGF0dXMsIGV4cGVjdGVkU3RhdHVzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgb3V0cHV0IGluZGljZXMgZ2l2ZW4gYSBsaXN0IG9mIHRyYW5zYWN0aW9uIGhhc2hlcyAoYmluYXJ5KVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkXCIpOyAvLyBnZXRfb19pbmRleGVzLmJpblxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgb3V0cHV0cyBnaXZlbiBhIGxpc3Qgb2Ygb3V0cHV0IGFtb3VudHMgYW5kIGluZGljZXMgKGJpbmFyeSlcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTsgLy8gZ2V0X291dHMuYmluXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBhbiBvdXRwdXQgaGlzdG9ncmFtIChiaW5hcnkpXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgZW50cmllcyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldE91dHB1dEhpc3RvZ3JhbSgpO1xuICAgICAgICBhc3NlcnQoQXJyYXkuaXNBcnJheShlbnRyaWVzKSk7XG4gICAgICAgIGFzc2VydChlbnRyaWVzLmxlbmd0aCA+IDApO1xuICAgICAgICBmb3IgKGxldCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgICAgdGVzdE91dHB1dEhpc3RvZ3JhbUVudHJ5KGVudHJ5KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICAvLyBpdChcIkNhbiBnZXQgYW4gb3V0cHV0IGRpc3RyaWJ1dGlvbiAoYmluYXJ5KVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgIC8vICAgbGV0IGFtb3VudHM6IGJpZ2ludFtdID0gW107XG4gICAgICAvLyAgIGFtb3VudHMucHVzaChCaWdJbnQoMCkpO1xuICAgICAgLy8gICBhbW91bnRzLnB1c2goQmlnSW50KDEpKTtcbiAgICAgIC8vICAgYW1vdW50cy5wdXNoKEJpZ0ludCgxMCkpO1xuICAgICAgLy8gICBhbW91bnRzLnB1c2goQmlnSW50KDEwMCkpO1xuICAgICAgLy8gICBhbW91bnRzLnB1c2goQmlnSW50KDEwMDApKTtcbiAgICAgIC8vICAgYW1vdW50cy5wdXNoKEJpZ0ludCgxMDAwMCkpO1xuICAgICAgLy8gICBhbW91bnRzLnB1c2goQmlnSW50KDEwMDAwMCkpO1xuICAgICAgLy8gICBhbW91bnRzLnB1c2goQmlnSW50KDEwMDAwMDApKTtcbiAgICAgIC8vICAgbGV0IGVudHJpZXMgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRPdXRwdXREaXN0cmlidXRpb24oYW1vdW50cyk7XG4gICAgICAvLyAgIGZvciAobGV0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIC8vICAgICB0ZXN0T3V0cHV0RGlzdHJpYnV0aW9uRW50cnkoZW50cnkpO1xuICAgICAgLy8gICB9XG4gICAgICAvLyB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBnZW5lcmFsIGluZm9ybWF0aW9uXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgaW5mbyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEluZm8oKTtcbiAgICAgICAgdGVzdEluZm8oaW5mbyk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBzeW5jIGluZm9ybWF0aW9uXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgc3luY0luZm8gPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRTeW5jSW5mbygpO1xuICAgICAgICB0ZXN0U3luY0luZm8oc3luY0luZm8pO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgaGFyZCBmb3JrIGluZm9ybWF0aW9uXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgaGFyZEZvcmtJbmZvID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGFyZEZvcmtJbmZvKCk7XG4gICAgICAgIHRlc3RIYXJkRm9ya0luZm8oaGFyZEZvcmtJbmZvKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGFsdGVybmF0aXZlIGNoYWluc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGFsdENoYWlucyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEFsdENoYWlucygpO1xuICAgICAgICBhc3NlcnQoQXJyYXkuaXNBcnJheShhbHRDaGFpbnMpICYmIGFsdENoYWlucy5sZW5ndGggPj0gMCk7XG4gICAgICAgIGZvciAobGV0IGFsdENoYWluIG9mIGFsdENoYWlucykge1xuICAgICAgICAgIHRlc3RBbHRDaGFpbihhbHRDaGFpbik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IGFsdGVybmF0aXZlIGJsb2NrIGhhc2hlc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGFsdEJsb2NrSGFzaGVzID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0QWx0QmxvY2tIYXNoZXMoKTtcbiAgICAgICAgYXNzZXJ0KEFycmF5LmlzQXJyYXkoYWx0QmxvY2tIYXNoZXMpICYmIGFsdEJsb2NrSGFzaGVzLmxlbmd0aCA+PSAwKTtcbiAgICAgICAgZm9yIChsZXQgYWx0QmxvY2tIYXNoIG9mIGFsdEJsb2NrSGFzaGVzKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBhbHRCbG9ja0hhc2gsIFwic3RyaW5nXCIpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhbHRCbG9ja0hhc2gubGVuZ3RoLCA2NCk7ICAvLyBUT0RPOiBjb21tb24gdmFsaWRhdGlvblxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCwgc2V0LCBhbmQgcmVzZXQgYSBkb3dubG9hZCBiYW5kd2lkdGggbGltaXRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBpbml0VmFsID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0RG93bmxvYWRMaW1pdCgpO1xuICAgICAgICBhc3NlcnQoaW5pdFZhbCA+IDApO1xuICAgICAgICBsZXQgc2V0VmFsID0gaW5pdFZhbCAqIDI7XG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLnNldERvd25sb2FkTGltaXQoc2V0VmFsKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHRoYXQuZGFlbW9uLmdldERvd25sb2FkTGltaXQoKSwgc2V0VmFsKTtcbiAgICAgICAgbGV0IHJlc2V0VmFsID0gYXdhaXQgdGhhdC5kYWVtb24ucmVzZXREb3dubG9hZExpbWl0KCk7XG4gICAgICAgIGFzc2VydC5lcXVhbChyZXNldFZhbCwgaW5pdFZhbCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGludmFsaWQgbGltaXRzXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24uc2V0RG93bmxvYWRMaW1pdCgwKTtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXJyb3Igb24gaW52YWxpZCBpbnB1dFwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKFwiRG93bmxvYWQgbGltaXQgbXVzdCBiZSBhbiBpbnRlZ2VyIGdyZWF0ZXIgdGhhbiAwXCIsIGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zZXREb3dubG9hZExpbWl0KDEuMik7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGVycm9yIG9uIGludmFsaWQgaW5wdXRcIik7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChcIkRvd25sb2FkIGxpbWl0IG11c3QgYmUgYW4gaW50ZWdlciBncmVhdGVyIHRoYW4gMFwiLCBlLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGFzc2VydC5lcXVhbChhd2FpdCB0aGF0LmRhZW1vbi5nZXREb3dubG9hZExpbWl0KCksIGluaXRWYWwpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQsIHNldCwgYW5kIHJlc2V0IGFuIHVwbG9hZCBiYW5kd2lkdGggbGltaXRcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBpbml0VmFsID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0VXBsb2FkTGltaXQoKTtcbiAgICAgICAgYXNzZXJ0KGluaXRWYWwgPiAwKTtcbiAgICAgICAgbGV0IHNldFZhbCA9IGluaXRWYWwgKiAyO1xuICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zZXRVcGxvYWRMaW1pdChzZXRWYWwpO1xuICAgICAgICBhc3NlcnQuZXF1YWwoYXdhaXQgdGhhdC5kYWVtb24uZ2V0VXBsb2FkTGltaXQoKSwgc2V0VmFsKTtcbiAgICAgICAgbGV0IHJlc2V0VmFsID0gYXdhaXQgdGhhdC5kYWVtb24ucmVzZXRVcGxvYWRMaW1pdCgpO1xuICAgICAgICBhc3NlcnQuZXF1YWwocmVzZXRWYWwsIGluaXRWYWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gdGVzdCBpbnZhbGlkIGxpbWl0c1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLnNldFVwbG9hZExpbWl0KDApO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBlcnJvciBvbiBpbnZhbGlkIGlucHV0XCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoXCJVcGxvYWQgbGltaXQgbXVzdCBiZSBhbiBpbnRlZ2VyIGdyZWF0ZXIgdGhhbiAwXCIsIGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zZXRVcGxvYWRMaW1pdCgxLjIpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBlcnJvciBvbiBpbnZhbGlkIGlucHV0XCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoXCJVcGxvYWQgbGltaXQgbXVzdCBiZSBhbiBpbnRlZ2VyIGdyZWF0ZXIgdGhhbiAwXCIsIGUubWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHRoYXQuZGFlbW9uLmdldFVwbG9hZExpbWl0KCksIGluaXRWYWwpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBnZXQgcGVlcnMgd2l0aCBhY3RpdmUgaW5jb21pbmcgb3Igb3V0Z29pbmcgcGVlcnNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBwZWVycyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFBlZXJzKCk7XG4gICAgICAgIGFzc2VydChBcnJheS5pc0FycmF5KHBlZXJzKSk7XG4gICAgICAgIGFzc2VydChwZWVycy5sZW5ndGggPiAwLCBcIkRhZW1vbiBoYXMgbm8gaW5jb21pbmcgb3Igb3V0Z29pbmcgcGVlcnMgdG8gdGVzdFwiKTtcbiAgICAgICAgZm9yIChsZXQgcGVlciBvZiBwZWVycykge1xuICAgICAgICAgIHRlc3RQZWVyKHBlZXIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGdldCBrbm93biBwZWVycyB3aGljaCBtYXkgYmUgb25saW5lIG9yIG9mZmxpbmVcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBwZWVycyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldEtub3duUGVlcnMoKTtcbiAgICAgICAgYXNzZXJ0KHBlZXJzLmxlbmd0aCA+IDAsIFwiRGFlbW9uIGhhcyBubyBrbm93biBwZWVycyB0byB0ZXN0XCIpO1xuICAgICAgICBmb3IgKGxldCBwZWVyIG9mIHBlZXJzKSB7XG4gICAgICAgICAgdGVzdEtub3duUGVlcihwZWVyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBsaW1pdCB0aGUgbnVtYmVyIG9mIG91dGdvaW5nIHBlZXJzXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zZXRPdXRnb2luZ1BlZXJMaW1pdCgwKTtcbiAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24uc2V0T3V0Z29pbmdQZWVyTGltaXQoOCk7XG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLnNldE91dGdvaW5nUGVlckxpbWl0KDEwKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gbGltaXQgdGhlIG51bWJlciBvZiBpbmNvbWluZyBwZWVyc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24uc2V0SW5jb21pbmdQZWVyTGltaXQoMCk7XG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLnNldEluY29taW5nUGVlckxpbWl0KDgpO1xuICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zZXRJbmNvbWluZ1BlZXJMaW1pdCgxMCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGJhbiBhIHBlZXJcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBzZXQgYmFuXG4gICAgICAgIGxldCBiYW4gPSBuZXcgTW9uZXJvQmFuKHtcbiAgICAgICAgICBob3N0OiBcIjE5Mi4xNjguMS41NlwiLFxuICAgICAgICAgIGlzQmFubmVkOiB0cnVlLFxuICAgICAgICAgIHNlY29uZHM6IDYwXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zZXRQZWVyQmFuKGJhbik7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGJhblxuICAgICAgICBsZXQgYmFucyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFBlZXJCYW5zKCk7XG4gICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICBmb3IgKGxldCBhQmFuIG9mIGJhbnMpIHtcbiAgICAgICAgICB0ZXN0TW9uZXJvQmFuKGFCYW4pO1xuICAgICAgICAgIGlmIChhQmFuLmdldEhvc3QoKSA9PT0gXCIxOTIuMTY4LjEuNTZcIikgZm91bmQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGFzc2VydChmb3VuZCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdE5vblJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIGJhbiBwZWVyc1wiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgICAgIC8vIHNldCBiYW5zXG4gICAgICAgIGxldCBiYW4xID0gbmV3IE1vbmVyb0JhbigpO1xuICAgICAgICBiYW4xLnNldEhvc3QoXCIxOTIuMTY4LjEuNTJcIik7XG4gICAgICAgIGJhbjEuc2V0SXNCYW5uZWQodHJ1ZSk7XG4gICAgICAgIGJhbjEuc2V0U2Vjb25kcyg2MCk7XG4gICAgICAgIGxldCBiYW4yID0gbmV3IE1vbmVyb0JhbigpO1xuICAgICAgICBiYW4yLnNldEhvc3QoXCIxOTIuMTY4LjEuNTNcIik7XG4gICAgICAgIGJhbjIuc2V0SXNCYW5uZWQodHJ1ZSk7XG4gICAgICAgIGJhbjIuc2V0U2Vjb25kcyg2MCk7XG4gICAgICAgIGxldCBiYW5zOiBNb25lcm9CYW5bXSA9IFtdO1xuICAgICAgICBiYW5zLnB1c2goYmFuMSk7XG4gICAgICAgIGJhbnMucHVzaChiYW4yKTtcbiAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24uc2V0UGVlckJhbnMoYmFucyk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGJhbnNcbiAgICAgICAgYmFucyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFBlZXJCYW5zKCk7XG4gICAgICAgIGxldCBmb3VuZDEgPSBmYWxzZTtcbiAgICAgICAgbGV0IGZvdW5kMiA9IGZhbHNlO1xuICAgICAgICBmb3IgKGxldCBhQmFuIG9mIGJhbnMpIHtcbiAgICAgICAgICB0ZXN0TW9uZXJvQmFuKGFCYW4pO1xuICAgICAgICAgIGlmIChhQmFuLmdldEhvc3QoKSA9PT0gXCIxOTIuMTY4LjEuNTJcIikgZm91bmQxID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoYUJhbi5nZXRIb3N0KCkgPT09IFwiMTkyLjE2OC4xLjUzXCIpIGZvdW5kMiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0KGZvdW5kMSk7XG4gICAgICAgIGFzc2VydChmb3VuZDIpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBzdGFydCBhbmQgc3RvcCBtaW5pbmdcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBzdG9wIG1pbmluZyBhdCBiZWdpbm5pbmcgb2YgdGVzdFxuICAgICAgICB0cnkgeyBhd2FpdCB0aGF0LmRhZW1vbi5zdG9wTWluaW5nKCk7IH1cbiAgICAgICAgY2F0Y2goZSkgeyB9XG4gICAgICAgIFxuICAgICAgICAvLyBnZW5lcmF0ZSBhZGRyZXNzIHRvIG1pbmUgdG9cbiAgICAgICAgbGV0IGFkZHJlc3MgPSBhd2FpdCB0aGF0LndhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3RhcnQgbWluaW5nXG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLnN0YXJ0TWluaW5nKGFkZHJlc3MsIDIsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN0b3AgbWluaW5nXG4gICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLnN0b3BNaW5pbmcoKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gZ2V0IG1pbmluZyBzdGF0dXNcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHN0b3AgbWluaW5nIGF0IGJlZ2lubmluZyBvZiB0ZXN0XG4gICAgICAgICAgdHJ5IHsgYXdhaXQgdGhhdC5kYWVtb24uc3RvcE1pbmluZygpOyB9XG4gICAgICAgICAgY2F0Y2goZSkgeyB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCBzdGF0dXMgd2l0aG91dCBtaW5pbmdcbiAgICAgICAgICBsZXQgc3RhdHVzID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0TWluaW5nU3RhdHVzKCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHN0YXR1cy5nZXRJc0FjdGl2ZSgpLCBmYWxzZSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHN0YXR1cy5nZXRBZGRyZXNzKCksIHVuZGVmaW5lZCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHN0YXR1cy5nZXRTcGVlZCgpLCAwKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoc3RhdHVzLmdldE51bVRocmVhZHMoKSwgMCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHN0YXR1cy5nZXRJc0JhY2tncm91bmQoKSwgdW5kZWZpbmVkKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB0ZXN0IHN0YXR1cyB3aXRoIG1pbmluZ1xuICAgICAgICAgIGxldCBhZGRyZXNzID0gYXdhaXQgdGhhdC53YWxsZXQuZ2V0UHJpbWFyeUFkZHJlc3MoKTtcbiAgICAgICAgICBsZXQgdGhyZWFkQ291bnQgPSAzO1xuICAgICAgICAgIGxldCBpc0JhY2tncm91bmQgPSBmYWxzZTtcbiAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zdGFydE1pbmluZyhhZGRyZXNzLCB0aHJlYWRDb3VudCwgaXNCYWNrZ3JvdW5kLCB0cnVlKTtcbiAgICAgICAgICBzdGF0dXMgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRNaW5pbmdTdGF0dXMoKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoc3RhdHVzLmdldElzQWN0aXZlKCksIHRydWUpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChzdGF0dXMuZ2V0QWRkcmVzcygpLCBhZGRyZXNzKTtcbiAgICAgICAgICBhc3NlcnQoc3RhdHVzLmdldFNwZWVkKCkgPj0gMCk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHN0YXR1cy5nZXROdW1UaHJlYWRzKCksIHRocmVhZENvdW50KTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoc3RhdHVzLmdldElzQmFja2dyb3VuZCgpLCBpc0JhY2tncm91bmQpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHN0b3AgbWluaW5nIGF0IGVuZCBvZiB0ZXN0XG4gICAgICAgICAgdHJ5IHsgYXdhaXQgdGhhdC5kYWVtb24uc3RvcE1pbmluZygpOyB9XG4gICAgICAgICAgY2F0Y2goZSkgeyB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gc3VibWl0IGEgbWluZWQgYmxvY2sgdG8gdGhlIG5ldHdvcmtcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBnZXQgdGVtcGxhdGUgdG8gbWluZSBvblxuICAgICAgICBsZXQgdGVtcGxhdGUgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRCbG9ja1RlbXBsYXRlKFRlc3RVdGlscy5BRERSRVNTKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRPRE8gdGVzdCBtaW5pbmcgYW5kIHN1Ym1pdHRpbmcgYmxvY2tcbiAgICAgICAgXG4gICAgICAgIC8vIHRyeSB0byBzdWJtaXQgYmxvY2sgaGFzaGluZyBibG9iIHdpdGhvdXQgbm9uY2VcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zdWJtaXRCbG9jayh0ZW1wbGF0ZS5nZXRCbG9ja0hhc2hpbmdCbG9iKCkpO1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNob3VsZCBoYXZlIHRocm93biBlcnJvclwiKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUuZ2V0Q29kZSgpLCAtNyk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGUubWVzc2FnZSwgXCJCbG9jayBub3QgYWNjZXB0ZWRcIik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gcHJ1bmUgdGhlIGJsb2NrY2hhaW5cIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5wcnVuZUJsb2NrY2hhaW4odHJ1ZSk7XG4gICAgICAgIGlmIChyZXN1bHQuZ2V0SXNQcnVuZWQoKSkge1xuICAgICAgICAgIGFzc2VydChyZXN1bHQuZ2V0UHJ1bmluZ1NlZWQoKSA+IDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0UHJ1bmluZ1NlZWQoKSwgMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gY2hlY2sgZm9yIGFuIHVwZGF0ZVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLmNoZWNrRm9yVXBkYXRlKCk7XG4gICAgICAgIHRlc3RVcGRhdGVDaGVja1Jlc3VsdChyZXN1bHQpO1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICh0ZXN0Q29uZmlnLnRlc3ROb25SZWxheXMpXG4gICAgICBpdChcIkNhbiBkb3dubG9hZCBhbiB1cGRhdGVcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBkb3dubG9hZCB0byBkZWZhdWx0IHBhdGhcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLmRvd25sb2FkVXBkYXRlKCk7XG4gICAgICAgIHRlc3RVcGRhdGVEb3dubG9hZFJlc3VsdChyZXN1bHQpO1xuICAgICAgICBcbiAgICAgICAgLy8gZG93bmxvYWQgdG8gZGVmaW5lZCBwYXRoXG4gICAgICAgIGxldCBwYXRoID0gXCJ0ZXN0X2Rvd25sb2FkX1wiICsgK25ldyBEYXRlKCkuZ2V0VGltZSgpICsgXCIudGFyLmJ6MlwiO1xuICAgICAgICByZXN1bHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5kb3dubG9hZFVwZGF0ZShwYXRoKTtcbiAgICAgICAgdGVzdFVwZGF0ZURvd25sb2FkUmVzdWx0KHJlc3VsdCwgcGF0aCk7XG4gICAgICAgIFxuICAgICAgICAvLyB0ZXN0IGludmFsaWQgcGF0aFxuICAgICAgICBpZiAocmVzdWx0LmdldElzVXBkYXRlQXZhaWxhYmxlKCkpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhhdC5kYWVtb24uZG93bmxvYWRVcGRhdGUoXCIuL29oaGFpL3RoZXJlXCIpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGVycm9yXCIpO1xuICAgICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKFwiU2hvdWxkIGhhdmUgdGhyb3duIGVycm9yXCIsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwoZS5zdGF0dXNDb2RlLCA1MDApOyAgLy8gVE9ETyBtb25lcm9kOiB0aGlzIGNhdXNlcyBhIDUwMCBpbiB0aGF0LmRhZW1vbiBycGNcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0Tm9uUmVsYXlzKVxuICAgICAgaXQoXCJDYW4gYmUgc3RvcHBlZFwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuOyAvLyB0ZXN0IGlzIGRpc2FibGVkIHRvIG5vdCBpbnRlcmZlcmUgd2l0aCBvdGhlciB0ZXN0c1xuICAgICAgICBcbiAgICAgICAgLy8gZ2l2ZSB0aGUgZGFlbW9uIHRpbWUgdG8gc2h1dCBkb3duXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHsgc2V0VGltZW91dChyZXNvbHZlLCBUZXN0VXRpbHMuU1lOQ19QRVJJT0RfSU5fTVMpOyB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHN0b3AgdGhlIGRhZW1vblxuICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5zdG9wKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBnaXZlIHRoZSBkYWVtb24gMTAgc2Vjb25kcyB0byBzaHV0IGRvd25cbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkgeyBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDAwKTsgfSk7IFxuICAgICAgICBcbiAgICAgICAgLy8gdHJ5IHRvIGludGVyYWN0IHdpdGggdGhlIHRoYXQuZGFlbW9uXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24uZ2V0SGVpZ2h0KCk7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hvdWxkIGhhdmUgdGhyb3duIGVycm9yXCIpO1xuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICBhc3NlcnQubm90RXF1YWwoXCJTaG91bGQgaGF2ZSB0aHJvd24gZXJyb3JcIiwgZS5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gVEVTVCBSRUxBWVMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlbGF5cylcbiAgICAgIGl0KFwiQ2FuIHN1Ym1pdCBhIHR4IGluIGhleCBmb3JtYXQgdG8gdGhlIHBvb2wgYW5kIHJlbGF5IGluIG9uZSBjYWxsXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBcbiAgICAgICAgLy8gd2FpdCBvbmUgdGltZSBmb3Igd2FsbGV0IHR4cyBpbiB0aGUgcG9vbCB0byBjbGVhclxuICAgICAgICBhd2FpdCBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIud2FpdEZvcldhbGxldFR4c1RvQ2xlYXJQb29sKHRoYXQud2FsbGV0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIGNyZWF0ZSAyIHR4cywgdGhlIHNlY29uZCB3aWxsIGRvdWJsZSBzcGVuZCBvdXRwdXRzIG9mIGZpcnN0XG4gICAgICAgIGxldCB0eDEgPSBhd2FpdCBnZXRVbnJlbGF5ZWRUeCh0aGF0LndhbGxldCwgMik7ICAvLyBUT0RPOiB0aGlzIHRlc3QgcmVxdWlyZXMgdHggdG8gYmUgZnJvbS90byBkaWZmZXJlbnQgYWNjb3VudHMgZWxzZSB0aGUgb2NjbHVzaW9uIGlzc3VlICgjNDUwMCkgY2F1c2VzIHRoZSB0eCB0byBub3QgYmUgcmVjb2duaXplZCBieSB0aGUgd2FsbGV0IGF0IGFsbFxuICAgICAgICBsZXQgdHgyID0gYXdhaXQgZ2V0VW5yZWxheWVkVHgodGhhdC53YWxsZXQsIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3VibWl0IGFuZCByZWxheSB0eDFcbiAgICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLnN1Ym1pdFR4SGV4KHR4MS5nZXRGdWxsSGV4KCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldElzUmVsYXllZCgpLCB0cnVlKTtcbiAgICAgICAgdGVzdFN1Ym1pdFR4UmVzdWx0R29vZChyZXN1bHQpO1xuICAgICAgICBcbiAgICAgICAgLy8gdHgxIGlzIGluIHRoZSBwb29sXG4gICAgICAgIGxldCB0eHMgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeFBvb2woKTtcbiAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGFUeCBvZiB0eHMpIHtcbiAgICAgICAgICBpZiAoYVR4LmdldEhhc2goKSA9PT0gdHgxLmdldEhhc2goKSkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGFUeC5nZXRJc1JlbGF5ZWQoKSwgdHJ1ZSk7XG4gICAgICAgICAgICBmb3VuZCA9IHRydWU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXNzZXJ0KGZvdW5kLCBcIlR4MSB3YXMgbm90IGZvdW5kIGFmdGVyIGJlaW5nIHN1Ym1pdHRlZCB0byB0aGUgdGhhdC5kYWVtb24ncyB0eCBwb29sXCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gdHgxIGlzIHJlY29nbml6ZWQgYnkgdGhlIHdhbGxldFxuICAgICAgICBhd2FpdCB0aGF0LndhbGxldC5zeW5jKCk7XG4gICAgICAgIGF3YWl0IHRoYXQud2FsbGV0LmdldFR4KHR4MS5nZXRIYXNoKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gc3VibWl0IGFuZCByZWxheSB0eDIgaGV4IHdoaWNoIGRvdWJsZSBzcGVuZHMgdHgxXG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoYXQuZGFlbW9uLnN1Ym1pdFR4SGV4KHR4Mi5nZXRGdWxsSGV4KCkpO1xuICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldElzUmVsYXllZCgpLCB0cnVlKTtcbiAgICAgICAgdGVzdFN1Ym1pdFR4UmVzdWx0RG91YmxlU3BlbmQocmVzdWx0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIHR4MiBpcyBpbiBub3QgdGhlIHBvb2xcbiAgICAgICAgdHhzID0gYXdhaXQgdGhhdC5kYWVtb24uZ2V0VHhQb29sKCk7XG4gICAgICAgIGZvdW5kID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGFUeCBvZiB0eHMpIHtcbiAgICAgICAgICBpZiAoYVR4LmdldEhhc2goKSA9PT0gdHgyLmdldEhhc2goKSkge1xuICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFzc2VydCghZm91bmQsIFwiVHgyIHNob3VsZCBub3QgYmUgaW4gdGhlIHBvb2wgYmVjYXVzZSBpdCBkb3VibGUgc3BlbmRzIHR4MSB3aGljaCBpcyBpbiB0aGUgcG9vbFwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIGFsbCB3YWxsZXRzIHdpbGwgbmVlZCB0byB3YWl0IGZvciB0eCB0byBjb25maXJtIGluIG9yZGVyIHRvIHByb3Blcmx5IHN5bmNcbiAgICAgICAgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLnJlc2V0KCk7XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgaWYgKHRlc3RDb25maWcudGVzdFJlbGF5cyAmJiAhdGVzdENvbmZpZy5saXRlTW9kZSlcbiAgICAgIGl0KFwiQ2FuIHN1Ym1pdCBhIHR4IGluIGhleCBmb3JtYXQgdG8gdGhlIHBvb2wgdGhlbiByZWxheVwiLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgYXdhaXQgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbCh0aGF0LndhbGxldCk7XG4gICAgICAgIGxldCB0eCA9IGF3YWl0IGdldFVucmVsYXllZFR4KHRoYXQud2FsbGV0LCAxKTtcbiAgICAgICAgYXdhaXQgdGVzdFN1Ym1pdFRoZW5SZWxheShbdHhdKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBpZiAodGVzdENvbmZpZy50ZXN0UmVsYXlzICYmICF0ZXN0Q29uZmlnLmxpdGVNb2RlKVxuICAgICAgaXQoXCJDYW4gc3VibWl0IHR4cyBpbiBoZXggZm9ybWF0IHRvIHRoZSBwb29sIHRoZW4gcmVsYXlcIiwgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGF3YWl0IFRlc3RVdGlscy5XQUxMRVRfVFhfVFJBQ0tFUi53YWl0Rm9yV2FsbGV0VHhzVG9DbGVhclBvb2wodGhhdC53YWxsZXQpO1xuICAgICAgICBsZXQgdHhzOiBNb25lcm9UeFdhbGxldFtdID0gW107XG4gICAgICAgIHR4cy5wdXNoKGF3YWl0IGdldFVucmVsYXllZFR4KHRoYXQud2FsbGV0LCAxKSk7XG4gICAgICAgIHR4cy5wdXNoKGF3YWl0IGdldFVucmVsYXllZFR4KHRoYXQud2FsbGV0LCAyKSk7IC8vIFRPRE86IGFjY291bnRzIGNhbm5vdCBiZSByZS11c2VkIGFjcm9zcyBzZW5kIHRlc3RzIGVsc2UgaXNSZWxheWVkIGlzIHRydWU7IHdhbGxldCBuZWVkcyB0byB1cGRhdGU/XG4gICAgICAgIGF3YWl0IHRlc3RTdWJtaXRUaGVuUmVsYXkodHhzKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICBhc3luYyBmdW5jdGlvbiB0ZXN0U3VibWl0VGhlblJlbGF5KHR4cykge1xuICAgICAgICBcbiAgICAgICAgLy8gc3VibWl0IHR4cyBoZXggYnV0IGRvbid0IHJlbGF5XG4gICAgICAgIGxldCB0eEhhc2hlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgdHhIYXNoZXMucHVzaCh0eC5nZXRIYXNoKCkpO1xuICAgICAgICAgIGxldCByZXN1bHQgPSBhd2FpdCB0aGF0LmRhZW1vbi5zdWJtaXRUeEhleCh0eC5nZXRGdWxsSGV4KCksIHRydWUpO1xuICAgICAgICAgIHRlc3RTdWJtaXRUeFJlc3VsdEdvb2QocmVzdWx0KTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldElzUmVsYXllZCgpLCBmYWxzZSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gZW5zdXJlIHR4IGlzIGluIHBvb2xcbiAgICAgICAgICBsZXQgcG9vbFR4cyA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4UG9vbCgpO1xuICAgICAgICAgIGxldCBmb3VuZCA9IGZhbHNlO1xuICAgICAgICAgIGZvciAobGV0IGFUeCBvZiBwb29sVHhzKSB7XG4gICAgICAgICAgICBpZiAoYVR4LmdldEhhc2goKSA9PT0gdHguZ2V0SGFzaCgpKSB7XG4gICAgICAgICAgICAgIGFzc2VydC5lcXVhbChhVHguZ2V0SXNSZWxheWVkKCksIGZhbHNlKTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYXNzZXJ0KGZvdW5kLCBcIlR4IHdhcyBub3QgZm91bmQgYWZ0ZXIgYmVpbmcgc3VibWl0dGVkIHRvIHRoZSB0aGF0LmRhZW1vbidzIHR4IHBvb2xcIik7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gZmV0Y2ggdHggYnkgaGFzaCBhbmQgZW5zdXJlIG5vdCByZWxheWVkXG4gICAgICAgICAgbGV0IGZldGNoZWRUeCA9IGF3YWl0IHRoYXQuZGFlbW9uLmdldFR4KHR4LmdldEhhc2goKSk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGZldGNoZWRUeC5nZXRJc1JlbGF5ZWQoKSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyByZWxheSB0aGUgdHhzXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdHhIYXNoZXMubGVuZ3RoID09PSAxID8gYXdhaXQgdGhhdC5kYWVtb24ucmVsYXlUeEJ5SGFzaCh0eEhhc2hlc1swXSkgOiBhd2FpdCB0aGF0LmRhZW1vbi5yZWxheVR4c0J5SGFzaCh0eEhhc2hlcyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBhd2FpdCB0aGF0LmRhZW1vbi5mbHVzaFR4UG9vbCh0eEhhc2hlcyk7IC8vIGZsdXNoIHR4cyB3aGVuIHJlbGF5IGZhaWxzIHRvIHByZXZlbnQgZG91YmxlIHNwZW5kcyBpbiBvdGhlciB0ZXN0cyAgXG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gd2FpdCBmb3IgdHhzIHRvIGJlIHJlbGF5ZWQgLy8gVE9ETyAobW9uZXJvLXByb2plY3QpOiBhbGwgdHhzIHNob3VsZCBiZSByZWxheWVkOiBodHRwczovL2dpdGh1Yi5jb20vbW9uZXJvLXByb2plY3QvbW9uZXJvL2lzc3Vlcy84NTIzXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHsgc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKTsgfSk7ICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIGVuc3VyZSB0eHMgYXJlIHJlbGF5ZWRcbiAgICAgICAgbGV0IHBvb2xUeHMgPSBhd2FpdCB0aGF0LmRhZW1vbi5nZXRUeFBvb2woKTtcbiAgICAgICAgZm9yIChsZXQgdHggb2YgdHhzKSB7XG4gICAgICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgZm9yIChsZXQgYVR4IG9mIHBvb2xUeHMpIHtcbiAgICAgICAgICAgIGlmIChhVHguZ2V0SGFzaCgpID09PSB0eC5nZXRIYXNoKCkpIHtcbiAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKGFUeC5nZXRJc1JlbGF5ZWQoKSwgdHJ1ZSk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGFzc2VydChmb3VuZCwgXCJUeCB3YXMgbm90IGZvdW5kIGFmdGVyIGJlaW5nIHN1Ym1pdHRlZCB0byB0aGUgdGhhdC5kYWVtb24ncyB0eCBwb29sXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyB3YWxsZXRzIHdpbGwgbmVlZCB0byB3YWl0IGZvciB0eCB0byBjb25maXJtIGluIG9yZGVyIHRvIHByb3Blcmx5IHN5bmNcbiAgICAgICAgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLnJlc2V0KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBURVNUIE5PVElGSUNBVElPTlMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIFxuICAgICAgaWYgKCF0ZXN0Q29uZmlnLmxpdGVNb2RlICYmIHRlc3RDb25maWcudGVzdE5vdGlmaWNhdGlvbnMpXG4gICAgICBpdChcIkNhbiBub3RpZnkgbGlzdGVuZXJzIHdoZW4gYSBuZXcgYmxvY2sgaXMgYWRkZWQgdG8gdGhlIGNoYWluXCIsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgZXJyO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHN0YXJ0IG1pbmluZyBpZiBwb3NzaWJsZSB0byBoZWxwIHB1c2ggdGhlIG5ldHdvcmsgYWxvbmdcbiAgICAgICAgICBsZXQgYWRkcmVzcyA9IGF3YWl0IHRoYXQud2FsbGV0LmdldFByaW1hcnlBZGRyZXNzKCk7XG4gICAgICAgICAgdHJ5IHsgYXdhaXQgdGhhdC5kYWVtb24uc3RhcnRNaW5pbmcoYWRkcmVzcywgOCwgZmFsc2UsIHRydWUpOyB9XG4gICAgICAgICAgY2F0Y2ggKGU6IGFueSkgeyBpZiAoXCJCVVNZXCIgPT09IGUubWVzc2FnZSkgdGhyb3cgZTsgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHJlZ2lzdGVyIGEgbGlzdGVuZXJcbiAgICAgICAgICBsZXQgbGlzdGVuZXJIZWFkZXI7XG4gICAgICAgICAgbGV0IGxpc3RlbmVyID0gbmV3IGNsYXNzIGV4dGVuZHMgTW9uZXJvRGFlbW9uTGlzdGVuZXIge1xuICAgICAgICAgICAgYXN5bmMgb25CbG9ja0hlYWRlcihoZWFkZXIpIHtcbiAgICAgICAgICAgICAgbGlzdGVuZXJIZWFkZXIgPSBoZWFkZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGF3YWl0IHRoYXQuZGFlbW9uLmFkZExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyB3YWl0IGZvciBuZXh0IGJsb2NrIG5vdGlmaWNhdGlvblxuICAgICAgICAgIGxldCBoZWFkZXIgPSBhd2FpdCB0aGF0LmRhZW1vbi53YWl0Rm9yTmV4dEJsb2NrSGVhZGVyKCk7XG4gICAgICAgICAgYXdhaXQgdGhhdC5kYWVtb24ucmVtb3ZlTGlzdGVuZXIobGlzdGVuZXIpOyAvLyBvdGhlcndpc2UgZGFlbW9uIHdpbGwga2VlcCBwb2xsaW5nXG4gICAgICAgICAgdGVzdEJsb2NrSGVhZGVyKGhlYWRlciwgdHJ1ZSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdGVzdCB0aGF0IGxpc3RlbmVyIHdhcyBjYWxsZWQgd2l0aCBlcXVpdmFsZW50IGhlYWRlclxuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwobGlzdGVuZXJIZWFkZXIsIGhlYWRlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBlcnIgPSBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBmaW5hbGx5XG4gICAgICAgIHRyeSB7IGF3YWl0IHRoYXQuZGFlbW9uLnN0b3BNaW5pbmcoKTsgfVxuICAgICAgICBjYXRjaCAoZSkgeyB9XG4gICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRlc3RCbG9ja0hlYWRlcihoZWFkZXIsIGlzRnVsbCkge1xuICBhc3NlcnQodHlwZW9mIGlzRnVsbCA9PT0gXCJib29sZWFuXCIpO1xuICBhc3NlcnQoaGVhZGVyKTtcbiAgYXNzZXJ0KGhlYWRlci5nZXRIZWlnaHQoKSA+PSAwKTtcbiAgYXNzZXJ0KGhlYWRlci5nZXRNYWpvclZlcnNpb24oKSA+IDApO1xuICBhc3NlcnQoaGVhZGVyLmdldE1pbm9yVmVyc2lvbigpID49IDApO1xuICBpZiAoaGVhZGVyLmdldEhlaWdodCgpID09PSAwKSBhc3NlcnQoaGVhZGVyLmdldFRpbWVzdGFtcCgpID09PSAwKTtcbiAgZWxzZSBhc3NlcnQoaGVhZGVyLmdldFRpbWVzdGFtcCgpID4gMCk7XG4gIGFzc2VydChoZWFkZXIuZ2V0UHJldkhhc2goKSk7XG4gIGFzc2VydChoZWFkZXIuZ2V0Tm9uY2UoKSAhPT0gdW5kZWZpbmVkKTtcbiAgaWYgKGhlYWRlci5nZXROb25jZSgpID09PSAwKSBjb25zb2xlLmxvZyhcIldBUk5JTkc6IGhlYWRlciBub25jZSBpcyAwIGF0IGhlaWdodCBcIiArIGhlYWRlci5nZXRIZWlnaHQoKSk7IC8vIFRPRE8gKG1vbmVyby1wcm9qZWN0KTogd2h5IGlzIGhlYWRlciBub25jZSAwP1xuICBlbHNlIGFzc2VydChoZWFkZXIuZ2V0Tm9uY2UoKSA+IDApO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGhlYWRlci5nZXROb25jZSgpLCBcIm51bWJlclwiKTtcbiAgYXNzZXJ0KGhlYWRlci5nZXRQb3dIYXNoKCkgPT09IHVuZGVmaW5lZCk7ICAvLyBuZXZlciBzZWVuIGRlZmluZWRcbiAgYXNzZXJ0KCFpc0Z1bGwgPyB1bmRlZmluZWQgPT09IGhlYWRlci5nZXRTaXplKCkgOiBoZWFkZXIuZ2V0U2l6ZSgpKTtcbiAgYXNzZXJ0KCFpc0Z1bGwgPyB1bmRlZmluZWQgPT09IGhlYWRlci5nZXREZXB0aCgpIDogaGVhZGVyLmdldERlcHRoKCkgPj0gMCk7XG4gIGFzc2VydCghaXNGdWxsID8gdW5kZWZpbmVkID09PSBoZWFkZXIuZ2V0RGlmZmljdWx0eSgpIDogaGVhZGVyLmdldERpZmZpY3VsdHkoKSA+IDApO1xuICBhc3NlcnQoIWlzRnVsbCA/IHVuZGVmaW5lZCA9PT0gaGVhZGVyLmdldEN1bXVsYXRpdmVEaWZmaWN1bHR5KCkgOiBoZWFkZXIuZ2V0Q3VtdWxhdGl2ZURpZmZpY3VsdHkoKSA+IDApO1xuICBhc3NlcnQoIWlzRnVsbCA/IHVuZGVmaW5lZCA9PT0gaGVhZGVyLmdldEhhc2goKSA6IGhlYWRlci5nZXRIYXNoKCkubGVuZ3RoID09PSA2NCk7XG4gIGFzc2VydCghaXNGdWxsID8gdW5kZWZpbmVkID09PSBoZWFkZXIuZ2V0TWluZXJUeEhhc2goKSA6IGhlYWRlci5nZXRNaW5lclR4SGFzaCgpLmxlbmd0aCA9PT0gNjQpO1xuICBhc3NlcnQoIWlzRnVsbCA/IHVuZGVmaW5lZCA9PT0gaGVhZGVyLmdldE51bVR4cygpIDogaGVhZGVyLmdldE51bVR4cygpID49IDApO1xuICBhc3NlcnQoIWlzRnVsbCA/IHVuZGVmaW5lZCA9PT0gaGVhZGVyLmdldE9ycGhhblN0YXR1cygpIDogdHlwZW9mIGhlYWRlci5nZXRPcnBoYW5TdGF0dXMoKSA9PT0gXCJib29sZWFuXCIpO1xuICBhc3NlcnQoIWlzRnVsbCA/IHVuZGVmaW5lZCA9PT0gaGVhZGVyLmdldFJld2FyZCgpIDogaGVhZGVyLmdldFJld2FyZCgpKTtcbiAgYXNzZXJ0KCFpc0Z1bGwgPyB1bmRlZmluZWQgPT09IGhlYWRlci5nZXRXZWlnaHQoKSA6IGhlYWRlci5nZXRXZWlnaHQoKSk7XG59XG5cbi8vIFRPRE86IHRlc3QgYmxvY2sgZGVlcCBjb3B5XG5mdW5jdGlvbiB0ZXN0QmxvY2soYmxvY2ssIGN0eCkge1xuICBcbiAgLy8gY2hlY2sgaW5wdXRzXG4gIGFzc2VydChjdHgpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGN0eC5oYXNIZXgsIFwiYm9vbGVhblwiKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjdHguaGVhZGVySXNGdWxsLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgY3R4Lmhhc1R4cywgXCJib29sZWFuXCIpO1xuICBcbiAgLy8gdGVzdCByZXF1aXJlZCBmaWVsZHNcbiAgYXNzZXJ0KGJsb2NrKTtcbiAgYXNzZXJ0KEFycmF5LmlzQXJyYXkoYmxvY2suZ2V0VHhIYXNoZXMoKSkpO1xuICBhc3NlcnQoYmxvY2suZ2V0VHhIYXNoZXMoKS5sZW5ndGggPj0gMCk7XG4gIHRlc3RNaW5lclR4KGJsb2NrLmdldE1pbmVyVHgoKSk7ICAgLy8gVE9ETzogbWluZXIgdHggZG9lc24ndCBoYXZlIGFzIG11Y2ggc3R1ZmYsIGNhbid0IGNhbGwgdGVzdFR4P1xuICB0ZXN0QmxvY2tIZWFkZXIoYmxvY2ssIGN0eC5oZWFkZXJJc0Z1bGwpO1xuICBcbiAgaWYgKGN0eC5oYXNIZXgpIHtcbiAgICBhc3NlcnQoYmxvY2suZ2V0SGV4KCkpO1xuICAgIGFzc2VydChibG9jay5nZXRIZXgoKS5sZW5ndGggPiAxKTtcbiAgfSBlbHNlIHtcbiAgICBhc3NlcnQoYmxvY2suZ2V0SGV4KCkgPT09IHVuZGVmaW5lZClcbiAgfVxuICBcbiAgaWYgKGN0eC5oYXNUeHMpIHtcbiAgICBhc3NlcnQodHlwZW9mIGN0eC5jdHggPT09IFwib2JqZWN0XCIpO1xuICAgIGFzc2VydChibG9jay5nZXRUeHMoKSBpbnN0YW5jZW9mIEFycmF5KTtcbiAgICBmb3IgKGxldCB0eCBvZiBibG9jay5nZXRUeHMoKSkge1xuICAgICAgYXNzZXJ0KGJsb2NrID09PSB0eC5nZXRCbG9jaygpKTtcbiAgICAgIHRlc3RUeCh0eCwgY3R4LmN0eCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGFzc2VydChjdHguY3R4ID09PSB1bmRlZmluZWQpO1xuICAgIGFzc2VydChibG9jay5nZXRUeHMoKSA9PT0gdW5kZWZpbmVkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0ZXN0TWluZXJUeChtaW5lclR4KSB7XG4gIGFzc2VydChtaW5lclR4KTtcbiAgYXNzZXJ0KG1pbmVyVHggaW5zdGFuY2VvZiBNb25lcm9UeCk7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbWluZXJUeC5nZXRJc01pbmVyVHgoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQobWluZXJUeC5nZXRJc01pbmVyVHgoKSk7XG4gIFxuICBhc3NlcnQobWluZXJUeC5nZXRWZXJzaW9uKCkgPj0gMCk7XG4gIGFzc2VydChtaW5lclR4LmdldEV4dHJhKCkgaW5zdGFuY2VvZiBVaW50OEFycmF5KTtcbiAgYXNzZXJ0KG1pbmVyVHguZ2V0RXh0cmEoKS5sZW5ndGggPiAwKTtcbiAgYXNzZXJ0KG1pbmVyVHguZ2V0VW5sb2NrVGltZSgpID49IEJpZ0ludCgwKSk7XG5cbiAgLy8gVE9ETzogbWluZXIgdHggZG9lcyBub3QgaGF2ZSBoYXNoZXMgaW4gYmluYXJ5IHJlcXVlc3RzIHNvIHRoaXMgd2lsbCBmYWlsLCBuZWVkIHRvIGRlcml2ZSB1c2luZyBwcnVuYWJsZSBkYXRhXG4vLyAgdGVzdFR4KG1pbmVyVHgsIHtcbi8vICAgIGhhc0pzb246IGZhbHNlLFxuLy8gICAgaXNQcnVuZWQ6IHRydWUsXG4vLyAgICBpc0Z1bGw6IGZhbHNlLFxuLy8gICAgaXNDb25maXJtZWQ6IHRydWUsXG4vLyAgICBpc01pbmVyVHg6IHRydWUsXG4vLyAgICBmcm9tR2V0VHhQb29sOiBmYWxzZSxcbi8vICB9KVxufVxuXG4vLyBUT0RPOiBob3cgdG8gdGVzdCBvdXRwdXQgaW5kaWNlcz8gY29tZXMgYmFjayB3aXRoIC9nZXRfdHJhbnNhY3Rpb25zLCBtYXliZSBvdGhlcnNcbmZ1bmN0aW9uIHRlc3RUeCh0eDogTW9uZXJvVHgsIGN0eCkge1xuICBcbiAgLy8gY2hlY2sgaW5wdXRzXG4gIGFzc2VydCh0eCk7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgY3R4LCBcIm9iamVjdFwiKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjdHguaXNQcnVuZWQsIFwiYm9vbGVhblwiKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjdHguaXNDb25maXJtZWQsIFwiYm9vbGVhblwiKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjdHguZnJvbUdldFR4UG9vbCwgXCJib29sZWFuXCIpO1xuICBcbiAgLy8gc3RhbmRhcmQgYWNyb3NzIGFsbCB0eHNcbiAgYXNzZXJ0KHR4LmdldEhhc2goKS5sZW5ndGggPT09IDY0KTtcbiAgaWYgKHR4LmdldElzUmVsYXllZCgpID09PSB1bmRlZmluZWQpIGFzc2VydCh0eC5nZXRJblR4UG9vbCgpKTsgIC8vIFRPRE8gbW9uZXJvZDogYWRkIHJlbGF5ZWQgdG8gZ2V0X3RyYW5zYWN0aW9uc1xuICBlbHNlIGFzc2VydC5lcXVhbCh0eXBlb2YgdHguZ2V0SXNSZWxheWVkKCksIFwiYm9vbGVhblwiKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiB0eC5nZXRJc0NvbmZpcm1lZCgpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgdHguZ2V0SW5UeFBvb2woKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHR4LmdldElzTWluZXJUeCgpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgdHguZ2V0SXNEb3VibGVTcGVuZFNlZW4oKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQodHguZ2V0VmVyc2lvbigpID49IDApO1xuICBhc3NlcnQodHguZ2V0VW5sb2NrVGltZSgpID49IEJpZ0ludCgwKSk7XG4gIGFzc2VydCh0eC5nZXRJbnB1dHMoKSk7XG4gIGFzc2VydCh0eC5nZXRPdXRwdXRzKCkpO1xuICBhc3NlcnQodHguZ2V0RXh0cmEoKSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpO1xuICBhc3NlcnQodHguZ2V0RXh0cmEoKS5sZW5ndGggPiAwKTtcbiAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludCh0eC5nZXRGZWUoKSwgdHJ1ZSk7XG4gIFxuICAvLyB0ZXN0IHByZXNlbmNlIG9mIG91dHB1dCBpbmRpY2VzXG4gIC8vIFRPRE86IGNoYW5nZSB0aGlzIG92ZXIgdG8gb3V0cHV0cyBvbmx5XG4gIGlmICh0eC5nZXRJc01pbmVyVHgoKSkgYXNzZXJ0LmVxdWFsKHR4LmdldE91dHB1dEluZGljZXMoKSwgdW5kZWZpbmVkKTsgLy8gVE9ETzogaG93IHRvIGdldCBvdXRwdXQgaW5kaWNlcyBmb3IgbWluZXIgdHJhbnNhY3Rpb25zP1xuICBpZiAodHguZ2V0SW5UeFBvb2woKSB8fCBjdHguZnJvbUdldFR4UG9vbCB8fCBjdHguaGFzT3V0cHV0SW5kaWNlcyA9PT0gZmFsc2UpIGFzc2VydC5lcXVhbCh0eC5nZXRPdXRwdXRJbmRpY2VzKCksIHVuZGVmaW5lZCk7XG4gIGVsc2UgYXNzZXJ0KHR4LmdldE91dHB1dEluZGljZXMoKSk7XG4gIGlmICh0eC5nZXRPdXRwdXRJbmRpY2VzKCkpIGFzc2VydCh0eC5nZXRPdXRwdXRJbmRpY2VzKCkubGVuZ3RoID4gMCk7XG4gIFxuICAvLyB0ZXN0IGNvbmZpcm1lZCBjdHhcbiAgaWYgKGN0eC5pc0NvbmZpcm1lZCA9PT0gdHJ1ZSkgYXNzZXJ0LmVxdWFsKHR4LmdldElzQ29uZmlybWVkKCksIHRydWUpO1xuICBpZiAoY3R4LmlzQ29uZmlybWVkID09PSBmYWxzZSkgYXNzZXJ0LmVxdWFsKHR4LmdldElzQ29uZmlybWVkKCksIGZhbHNlKTtcbiAgXG4gIC8vIHRlc3QgY29uZmlybWVkXG4gIGlmICh0eC5nZXRJc0NvbmZpcm1lZCgpKSB7XG4gICAgYXNzZXJ0KHR4LmdldEJsb2NrKCkpO1xuICAgIGFzc2VydCh0eC5nZXRCbG9jaygpLmdldFR4cygpLmluY2x1ZGVzKHR4KSk7XG4gICAgYXNzZXJ0KHR4LmdldEJsb2NrKCkuZ2V0SGVpZ2h0KCkgPiAwKTtcbiAgICBhc3NlcnQodHguZ2V0QmxvY2soKS5nZXRUaW1lc3RhbXAoKSA+IDApO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJc1JlbGF5ZWQoKSwgdHJ1ZSk7XG4gICAgYXNzZXJ0LmVxdWFsKHR4LmdldElzRmFpbGVkKCksIGZhbHNlKTtcbiAgICBhc3NlcnQuZXF1YWwodHguZ2V0SW5UeFBvb2woKSwgZmFsc2UpO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRSZWxheSgpLCB0cnVlKTtcbiAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNEb3VibGVTcGVuZFNlZW4oKSwgZmFsc2UpO1xuICAgIGlmIChjdHguZnJvbUJpbmFyeUJsb2NrKSBhc3NlcnQuZXF1YWwodHguZ2V0TnVtQ29uZmlybWF0aW9ucygpLCB1bmRlZmluZWQpO1xuICAgIGVsc2UgYXNzZXJ0KHR4LmdldE51bUNvbmZpcm1hdGlvbnMoKSA+IDApO1xuICB9IGVsc2Uge1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRCbG9jaygpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXROdW1Db25maXJtYXRpb25zKCksIDApO1xuICB9XG4gIFxuICAvLyB0ZXN0IGluIHR4IHBvb2xcbiAgaWYgKHR4LmdldEluVHhQb29sKCkpIHtcbiAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNDb25maXJtZWQoKSwgZmFsc2UpO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJc0RvdWJsZVNwZW5kU2VlbigpLCBmYWxzZSk7XG4gICAgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RGYWlsZWRIZWlnaHQoKSwgdW5kZWZpbmVkKTtcbiAgICBhc3NlcnQuZXF1YWwodHguZ2V0TGFzdEZhaWxlZEhhc2goKSwgdW5kZWZpbmVkKTtcbiAgICBhc3NlcnQodHguZ2V0UmVjZWl2ZWRUaW1lc3RhbXAoKSA+IDApO1xuICAgIGlmIChjdHguZnJvbUdldFR4UG9vbCkge1xuICAgICAgYXNzZXJ0KHR4LmdldFNpemUoKSA+IDApO1xuICAgICAgYXNzZXJ0KHR4LmdldFdlaWdodCgpID4gMCk7XG4gICAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHR4LmdldElzS2VwdEJ5QmxvY2soKSwgXCJib29sZWFuXCIpO1xuICAgICAgYXNzZXJ0KHR4LmdldE1heFVzZWRCbG9ja0hlaWdodCgpID49IDApO1xuICAgICAgYXNzZXJ0KHR4LmdldE1heFVzZWRCbG9ja0hhc2goKSk7XG4gICAgfVxuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRMYXN0RmFpbGVkSGVpZ2h0KCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RGYWlsZWRIYXNoKCksIHVuZGVmaW5lZCk7XG4gIH0gZWxzZSB7XG4gICAgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RSZWxheWVkVGltZXN0YW1wKCksIHVuZGVmaW5lZCk7XG4gIH1cbiAgXG4gIC8vIHRlc3QgbWluZXIgdHhcbiAgaWYgKHR4LmdldElzTWluZXJUeCgpKSB7XG4gICAgYXNzZXJ0LmVxdWFsKHR4LmdldEZlZSgpLCAwbik7XG4gICAgYXNzZXJ0LmVxdWFsKHR4LmdldElucHV0cygpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRTaWduYXR1cmVzKCksIHVuZGVmaW5lZCk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHR4LmdldFNpZ25hdHVyZXMoKSAhPT0gdW5kZWZpbmVkKSBhc3NlcnQodHguZ2V0U2lnbmF0dXJlcygpLmxlbmd0aCA+IDApXG4gIH1cbiAgXG4gIC8vIHRlc3QgZmFpbGVkICAvLyBUT0RPOiB3aGF0IGVsc2UgdG8gdGVzdCBhc3NvY2lhdGVkIHdpdGggZmFpbGVkXG4gIGlmICh0eC5nZXRJc0ZhaWxlZCgpKSB7XG4gICAgYXNzZXJ0KHR4LmdldFJlY2VpdmVkVGltZXN0YW1wKCkgPiAwKVxuICB9IGVsc2Uge1xuICAgIGlmICh0eC5nZXRJc1JlbGF5ZWQoKSA9PT0gdW5kZWZpbmVkKSBhc3NlcnQuZXF1YWwodHguZ2V0UmVsYXkoKSwgdW5kZWZpbmVkKTsgLy8gVE9ETyBtb25lcm9kOiBhZGQgcmVsYXllZCB0byBnZXRfdHJhbnNhY3Rpb25zXG4gICAgZWxzZSBpZiAodHguZ2V0SXNSZWxheWVkKCkpIGFzc2VydC5lcXVhbCh0eC5nZXRJc0RvdWJsZVNwZW5kU2VlbigpLCBmYWxzZSk7XG4gICAgZWxzZSB7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SXNSZWxheWVkKCksIGZhbHNlKTtcbiAgICAgIGlmIChjdHguZnJvbUdldFR4UG9vbCkge1xuICAgICAgICBhc3NlcnQuZXF1YWwodHguZ2V0UmVsYXkoKSwgZmFsc2UpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHR4LmdldElzRG91YmxlU3BlbmRTZWVuKCksIFwiYm9vbGVhblwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RGYWlsZWRIZWlnaHQoKSwgdW5kZWZpbmVkKTtcbiAgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RGYWlsZWRIYXNoKCksIHVuZGVmaW5lZCk7XG4gIFxuICAvLyByZWNlaXZlZCB0aW1lIG9ubHkgZm9yIHR4IHBvb2wgb3IgZmFpbGVkIHR4c1xuICBpZiAodHguZ2V0UmVjZWl2ZWRUaW1lc3RhbXAoKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgYXNzZXJ0KHR4LmdldEluVHhQb29sKCkgfHwgdHguZ2V0SXNGYWlsZWQoKSk7XG4gIH1cbiAgXG4gIC8vIHRlc3QgaW5wdXRzIGFuZCBvdXRwdXRzXG4gIGFzc2VydCh0eC5nZXRJbnB1dHMoKSAmJiBBcnJheS5pc0FycmF5KHR4LmdldElucHV0cygpKSAmJiB0eC5nZXRJbnB1dHMoKS5sZW5ndGggPj0gMCk7XG4gIGFzc2VydCh0eC5nZXRPdXRwdXRzKCkgJiYgQXJyYXkuaXNBcnJheSh0eC5nZXRPdXRwdXRzKCkpICYmIHR4LmdldE91dHB1dHMoKS5sZW5ndGggPj0gMCk7XG4gIGlmICghdHguZ2V0SXNNaW5lclR4KCkpIGFzc2VydCh0eC5nZXRJbnB1dHMoKS5sZW5ndGggPiAwKTtcbiAgZm9yIChsZXQgaW5wdXQgb2YgdHguZ2V0SW5wdXRzKCkpIHtcbiAgICBhc3NlcnQodHggPT09IGlucHV0LmdldFR4KCkpO1xuICAgIHRlc3RWaW4oaW5wdXQsIGN0eCk7XG4gIH1cbiAgYXNzZXJ0KHR4LmdldE91dHB1dHMoKS5sZW5ndGggPiAwKTtcbiAgZm9yIChsZXQgb3V0cHV0IG9mIHR4LmdldE91dHB1dHMoKSkge1xuICAgIGFzc2VydCh0eCA9PT0gb3V0cHV0LmdldFR4KCkpO1xuICAgIHRlc3RPdXRwdXQob3V0cHV0LCBjdHgpO1xuICB9XG4gIFxuICAvLyB0ZXN0IHBydW5lZCB2cyBub3QgcHJ1bmVkXG4gIGlmIChjdHguZnJvbUdldFR4UG9vbCB8fCBjdHguZnJvbUJpbmFyeUJsb2NrKSBhc3NlcnQuZXF1YWwodHguZ2V0UHJ1bmFibGVIYXNoKCksIHVuZGVmaW5lZCk7ICAgLy8gVE9ETyBtb25lcm9kOiB0eCBwb29sIHR4cyBkbyBub3QgaGF2ZSBwcnVuYWJsZSBoYXNoLCBUT0RPOiBnZXRCbG9ja3NCeUhlaWdodCgpIGhhcyBpbmNvbnNpc3RlbnQgY2xpZW50LXNpZGUgcHJ1bmluZ1xuICBlbHNlIGFzc2VydCh0eC5nZXRQcnVuYWJsZUhhc2goKSk7XG4gIGlmIChjdHguaXNQcnVuZWQpIHtcbiAgICBhc3NlcnQuZXF1YWwodHguZ2V0UmN0U2lnUHJ1bmFibGUoKSwgdW5kZWZpbmVkKTtcbiAgICBhc3NlcnQuZXF1YWwodHguZ2V0U2l6ZSgpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRMYXN0UmVsYXllZFRpbWVzdGFtcCgpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRSZWNlaXZlZFRpbWVzdGFtcCgpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRGdWxsSGV4KCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0KHR4LmdldFBydW5lZEhleCgpKTtcbiAgfSBlbHNlIHtcbiAgICBhc3NlcnQuZXF1YWwodHguZ2V0UHJ1bmVkSGV4KCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0KHR4LmdldFZlcnNpb24oKSA+PSAwKTtcbiAgICBhc3NlcnQodHguZ2V0VW5sb2NrVGltZSgpID49IDBuKTtcbiAgICBhc3NlcnQodHguZ2V0RXh0cmEoKSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpO1xuICAgIGFzc2VydCh0eC5nZXRFeHRyYSgpLmxlbmd0aCA+IDApO1xuICAgIGlmIChjdHguZnJvbUJpbmFyeUJsb2NrKSBhc3NlcnQuZXF1YWwodHguZ2V0RnVsbEhleCgpLCB1bmRlZmluZWQpOyAgICAgICAgIC8vIFRPRE86IGdldEJsb2Nrc0J5SGVpZ2h0KCkgaGFzIGluY29uc2lzdGVudCBjbGllbnQtc2lkZSBwcnVuaW5nXG4gICAgZWxzZSBhc3NlcnQodHguZ2V0RnVsbEhleCgpLmxlbmd0aCA+IDApO1xuICAgIGlmIChjdHguZnJvbUJpbmFyeUJsb2NrKSBhc3NlcnQuZXF1YWwodHguZ2V0UmN0U2lnUHJ1bmFibGUoKSwgdW5kZWZpbmVkKTsgIC8vIFRPRE86IGdldEJsb2Nrc0J5SGVpZ2h0KCkgaGFzIGluY29uc2lzdGVudCBjbGllbnQtc2lkZSBwcnVuaW5nXG4gICAgLy9lbHNlIGFzc2VydC5lcXVhbCh0eXBlb2YgdHguZ2V0UmN0U2lnUHJ1bmFibGUoKS5uYnAsIFwibnVtYmVyXCIpO1xuICAgIGFzc2VydC5lcXVhbCh0eC5nZXRJc0RvdWJsZVNwZW5kU2VlbigpLCBmYWxzZSk7XG4gICAgaWYgKHR4LmdldElzQ29uZmlybWVkKCkpIHtcbiAgICAgIGFzc2VydC5lcXVhbCh0eC5nZXRMYXN0UmVsYXllZFRpbWVzdGFtcCgpLCB1bmRlZmluZWQpO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4LmdldFJlY2VpdmVkVGltZXN0YW1wKCksIHVuZGVmaW5lZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eC5nZXRJc1JlbGF5ZWQoKSkgYXNzZXJ0KHR4LmdldExhc3RSZWxheWVkVGltZXN0YW1wKCkgPiAwKTtcbiAgICAgIGVsc2UgYXNzZXJ0LmVxdWFsKHR4LmdldExhc3RSZWxheWVkVGltZXN0YW1wKCksIHVuZGVmaW5lZCk7XG4gICAgICBhc3NlcnQodHguZ2V0UmVjZWl2ZWRUaW1lc3RhbXAoKSA+IDApO1xuICAgIH1cbiAgfVxuICBcbiAgaWYgKHR4LmdldElzRmFpbGVkKCkpIHtcbiAgICAvLyBUT0RPOiBpbXBsZW1lbnQgdGhpc1xuICB9XG4gIFxuICAvLyB0ZXN0IGRlZXAgY29weVxuICBpZiAoIWN0eC5kb05vdFRlc3RDb3B5KSB0ZXN0VHhDb3B5KHR4LCBjdHgpO1xufVxuXG5mdW5jdGlvbiB0ZXN0QmxvY2tUZW1wbGF0ZSh0ZW1wbGF0ZSkge1xuICBhc3NlcnQodGVtcGxhdGUpO1xuICBhc3NlcnQodGVtcGxhdGUuZ2V0QmxvY2tUZW1wbGF0ZUJsb2IoKSk7XG4gIGFzc2VydCh0ZW1wbGF0ZS5nZXRCbG9ja0hhc2hpbmdCbG9iKCkpO1xuICBhc3NlcnQodGVtcGxhdGUuZ2V0RGlmZmljdWx0eSgpKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiB0ZW1wbGF0ZS5nZXREaWZmaWN1bHR5KCksIFwiYmlnaW50XCIpO1xuICBhc3NlcnQodGVtcGxhdGUuZ2V0RXhwZWN0ZWRSZXdhcmQoKSk7XG4gIGFzc2VydCh0ZW1wbGF0ZS5nZXRIZWlnaHQoKSk7XG4gIGFzc2VydCh0ZW1wbGF0ZS5nZXRQcmV2SGFzaCgpKTtcbiAgYXNzZXJ0KHRlbXBsYXRlLmdldFJlc2VydmVkT2Zmc2V0KCkpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHRlbXBsYXRlLmdldFNlZWRIZWlnaHQoKSwgXCJudW1iZXJcIik7XG4gIGFzc2VydCh0ZW1wbGF0ZS5nZXRTZWVkSGVpZ2h0KCkgPiAwKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiB0ZW1wbGF0ZS5nZXRTZWVkSGFzaCgpLCBcInN0cmluZ1wiKTtcbiAgYXNzZXJ0KHRlbXBsYXRlLmdldFNlZWRIYXNoKCkpO1xuICAvLyBuZXh0IHNlZWQgaGFzaCBjYW4gYmUgbnVsbCBvciBpbml0aWFsaXplZCAgLy8gVE9ETzogdGVzdCBjaXJjdW1zdGFuY2VzIGZvciBlYWNoXG59XG5cbmZ1bmN0aW9uIHRlc3RJbmZvKGluZm86IE1vbmVyb0RhZW1vbkluZm8pIHtcbiAgYXNzZXJ0KGluZm8uZ2V0VmVyc2lvbigpKTtcbiAgYXNzZXJ0KGluZm8uZ2V0TnVtQWx0QmxvY2tzKCkgPj0gMCk7XG4gIGFzc2VydChpbmZvLmdldEJsb2NrU2l6ZUxpbWl0KCkpO1xuICBhc3NlcnQoaW5mby5nZXRCbG9ja1NpemVNZWRpYW4oKSk7XG4gIGFzc2VydChpbmZvLmdldEJvb3RzdHJhcERhZW1vbkFkZHJlc3MoKSA9PT0gdW5kZWZpbmVkIHx8ICh0eXBlb2YgaW5mby5nZXRCb290c3RyYXBEYWVtb25BZGRyZXNzKCkgPT09IFwic3RyaW5nXCIgJiYgaW5mby5nZXRCb290c3RyYXBEYWVtb25BZGRyZXNzKCkubGVuZ3RoID4gMCkpO1xuICBhc3NlcnQoaW5mby5nZXRDdW11bGF0aXZlRGlmZmljdWx0eSgpKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBpbmZvLmdldEN1bXVsYXRpdmVEaWZmaWN1bHR5KCksIFwiYmlnaW50XCIpO1xuICBhc3NlcnQoaW5mby5nZXRGcmVlU3BhY2UoKSk7XG4gIGFzc2VydChpbmZvLmdldE51bU9mZmxpbmVQZWVycygpID49IDApO1xuICBhc3NlcnQoaW5mby5nZXROdW1PbmxpbmVQZWVycygpID49IDApO1xuICBhc3NlcnQoaW5mby5nZXRIZWlnaHQoKSA+PSAwKTtcbiAgYXNzZXJ0KGluZm8uZ2V0SGVpZ2h0V2l0aG91dEJvb3RzdHJhcCgpKTtcbiAgYXNzZXJ0KGluZm8uZ2V0TnVtSW5jb21pbmdDb25uZWN0aW9ucygpID49IDApO1xuICBhc3NlcnQoaW5mby5nZXROZXR3b3JrVHlwZSgpKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBpbmZvLmdldElzT2ZmbGluZSgpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydChpbmZvLmdldE51bU91dGdvaW5nQ29ubmVjdGlvbnMoKSA+PSAwKTtcbiAgYXNzZXJ0KGluZm8uZ2V0TnVtUnBjQ29ubmVjdGlvbnMoKSA+PSAwKTtcbiAgYXNzZXJ0KGluZm8uZ2V0U3RhcnRUaW1lc3RhbXAoKSk7XG4gIGFzc2VydChpbmZvLmdldEFkanVzdGVkVGltZXN0YW1wKCkpO1xuICBhc3NlcnQoaW5mby5nZXRUYXJnZXQoKSk7XG4gIGFzc2VydChpbmZvLmdldFRhcmdldEhlaWdodCgpID49IDApO1xuICBhc3NlcnQoaW5mby5nZXROdW1UeHMoKSA+PSAwKTtcbiAgYXNzZXJ0KGluZm8uZ2V0TnVtVHhzUG9vbCgpID49IDApO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGluZm8uZ2V0V2FzQm9vdHN0cmFwRXZlclVzZWQoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQoaW5mby5nZXRCbG9ja1dlaWdodExpbWl0KCkpO1xuICBhc3NlcnQoaW5mby5nZXRCbG9ja1dlaWdodE1lZGlhbigpKTtcbiAgYXNzZXJ0KGluZm8uZ2V0RGF0YWJhc2VTaXplKCkgPiAwKTtcbiAgYXNzZXJ0KHR5cGVvZiBpbmZvLmdldFVwZGF0ZUF2YWlsYWJsZSgpID09PSBcImJvb2xlYW5cIik7XG4gIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQoaW5mby5nZXRDcmVkaXRzKCksIGZhbHNlKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBpbmZvLmdldFRvcEJsb2NrSGFzaCgpLCBcInN0cmluZ1wiKTtcbiAgYXNzZXJ0KGluZm8uZ2V0VG9wQmxvY2tIYXNoKCkpO1xuICBhc3NlcnQuZXF1YWwoXCJib29sZWFuXCIsIHR5cGVvZiBpbmZvLmdldElzQnVzeVN5bmNpbmcoKSk7XG4gIGFzc2VydC5lcXVhbChcImJvb2xlYW5cIiwgdHlwZW9mIGluZm8uZ2V0SXNTeW5jaHJvbml6ZWQoKSk7XG59XG5cbmZ1bmN0aW9uIHRlc3RTeW5jSW5mbyhzeW5jSW5mbykgeyAvLyBUT0RPOiBjb25zaXN0ZW50IG5hbWluZywgZGFlbW9uIGluIG5hbWU/XG4gIGFzc2VydChzeW5jSW5mbyBpbnN0YW5jZW9mIE1vbmVyb0RhZW1vblN5bmNJbmZvKTtcbiAgYXNzZXJ0KHN5bmNJbmZvLmdldEhlaWdodCgpID49IDApO1xuICBpZiAoc3luY0luZm8uZ2V0UGVlcnMoKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgYXNzZXJ0KHN5bmNJbmZvLmdldFBlZXJzKCkubGVuZ3RoID4gMCk7XG4gICAgZm9yIChsZXQgcGVlciBvZiBzeW5jSW5mby5nZXRQZWVycygpKSB7XG4gICAgICB0ZXN0UGVlcihwZWVyKTtcbiAgICB9XG4gIH1cbiAgaWYgKHN5bmNJbmZvLmdldFNwYW5zKCkgIT09IHVuZGVmaW5lZCkgeyAgLy8gVE9ETzogdGVzdCB0aGF0IHRoaXMgaXMgYmVpbmcgaGl0LCBzbyBmYXIgbm90IHVzZWRcbiAgICBhc3NlcnQoc3luY0luZm8uZ2V0U3BhbnMoKS5sZW5ndGggPiAwKTtcbiAgICBmb3IgKGxldCBzcGFuIG9mIHN5bmNJbmZvLmdldFNwYW5zKCkpIHtcbiAgICAgIHRlc3RDb25uZWN0aW9uU3BhbihzcGFuKTtcbiAgICB9XG4gIH1cbiAgYXNzZXJ0KHN5bmNJbmZvLmdldE5leHROZWVkZWRQcnVuaW5nU2VlZCgpID49IDApO1xuICBhc3NlcnQuZXF1YWwoc3luY0luZm8uZ2V0T3ZlcnZpZXcoKSwgdW5kZWZpbmVkKTtcbiAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChzeW5jSW5mby5nZXRDcmVkaXRzKCksIGZhbHNlKTtcbiAgYXNzZXJ0LmVxdWFsKHN5bmNJbmZvLmdldFRvcEJsb2NrSGFzaCgpLCB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiB0ZXN0Q29ubmVjdGlvblNwYW4oc3Bhbikge1xuICBhc3NlcnQubm90RXF1YWwoc3BhbiwgdW5kZWZpbmVkKTtcbiAgYXNzZXJ0Lm5vdEVxdWFsKHNwYW4uZ2V0Q29ubmVjdGlvbklkKCksIHVuZGVmaW5lZCk7XG4gIGFzc2VydChzcGFuLmdldENvbm5lY3Rpb25JZCgpLmxlbmd0aCA+IDApO1xuICBhc3NlcnQoc3Bhbi5nZXRTdGFydEhlaWdodCgpID4gMCk7XG4gIGFzc2VydChzcGFuLmdldE51bUJsb2NrcygpID4gMCk7XG4gIGFzc2VydChzcGFuLmdldFJlbW90ZUFkZHJlc3MoKSA9PT0gdW5kZWZpbmVkIHx8IHNwYW4uZ2V0UmVtb3RlQWRkcmVzcygpLmxlbmd0aCA+IDApO1xuICBhc3NlcnQoc3Bhbi5nZXRSYXRlKCkgPiAwKTtcbiAgYXNzZXJ0KHNwYW4uZ2V0U3BlZWQoKSA+PSAwKTtcbiAgYXNzZXJ0KHNwYW4uZ2V0U2l6ZSgpID4gMCk7XG59XG5cbmZ1bmN0aW9uIHRlc3RIYXJkRm9ya0luZm8oaGFyZEZvcmtJbmZvKSB7XG4gIGFzc2VydC5ub3RFcXVhbChoYXJkRm9ya0luZm8uZ2V0RWFybGllc3RIZWlnaHQoKSwgdW5kZWZpbmVkKTtcbiAgYXNzZXJ0Lm5vdEVxdWFsKGhhcmRGb3JrSW5mby5nZXRJc0VuYWJsZWQoKSwgdW5kZWZpbmVkKTtcbiAgYXNzZXJ0Lm5vdEVxdWFsKGhhcmRGb3JrSW5mby5nZXRTdGF0ZSgpLCB1bmRlZmluZWQpO1xuICBhc3NlcnQubm90RXF1YWwoaGFyZEZvcmtJbmZvLmdldFRocmVzaG9sZCgpLCB1bmRlZmluZWQpO1xuICBhc3NlcnQubm90RXF1YWwoaGFyZEZvcmtJbmZvLmdldFZlcnNpb24oKSwgdW5kZWZpbmVkKTtcbiAgYXNzZXJ0Lm5vdEVxdWFsKGhhcmRGb3JrSW5mby5nZXROdW1Wb3RlcygpLCB1bmRlZmluZWQpO1xuICBhc3NlcnQubm90RXF1YWwoaGFyZEZvcmtJbmZvLmdldFZvdGluZygpLCB1bmRlZmluZWQpO1xuICBhc3NlcnQubm90RXF1YWwoaGFyZEZvcmtJbmZvLmdldFdpbmRvdygpLCB1bmRlZmluZWQpO1xuICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGhhcmRGb3JrSW5mby5nZXRDcmVkaXRzKCksIGZhbHNlKTtcbiAgYXNzZXJ0LmVxdWFsKGhhcmRGb3JrSW5mby5nZXRUb3BCbG9ja0hhc2goKSwgdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gdGVzdE1vbmVyb0JhbihiYW4pIHtcbiAgYXNzZXJ0Lm5vdEVxdWFsKGJhbi5nZXRIb3N0KCksIHVuZGVmaW5lZCk7XG4gIGFzc2VydC5ub3RFcXVhbChiYW4uZ2V0SXAoKSwgdW5kZWZpbmVkKTtcbiAgYXNzZXJ0Lm5vdEVxdWFsKGJhbi5nZXRTZWNvbmRzKCksIHVuZGVmaW5lZCk7XG59XG5cbmZ1bmN0aW9uIHRlc3RNaW5lclR4U3VtKHR4U3VtKSB7XG4gIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQodHhTdW0uZ2V0RW1pc3Npb25TdW0oKSwgdHJ1ZSk7XG4gIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQodHhTdW0uZ2V0RmVlU3VtKCksIHRydWUpO1xufVxuXG5mdW5jdGlvbiB0ZXN0T3V0cHV0SGlzdG9ncmFtRW50cnkoZW50cnkpIHtcbiAgVGVzdFV0aWxzLnRlc3RVbnNpZ25lZEJpZ0ludChlbnRyeS5nZXRBbW91bnQoKSk7XG4gIGFzc2VydChlbnRyeS5nZXROdW1JbnN0YW5jZXMoKSA+PSAwKTtcbiAgYXNzZXJ0KGVudHJ5LmdldE51bVVubG9ja2VkSW5zdGFuY2VzKCkgPj0gMCk7XG4gIGFzc2VydChlbnRyeS5nZXROdW1SZWNlbnRJbnN0YW5jZXMoKSA+PSAwKTtcbn1cblxuZnVuY3Rpb24gdGVzdE91dHB1dERpc3RyaWJ1dGlvbkVudHJ5KGVudHJ5KSB7XG4gIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQoZW50cnkuZ2V0QW1vdW50KCkpO1xuICBhc3NlcnQoZW50cnkuZ2V0QmFzZSgpID49IDApO1xuICBhc3NlcnQoQXJyYXkuaXNBcnJheShlbnRyeS5nZXREaXN0cmlidXRpb24oKSkgJiYgZW50cnkuZ2V0RGlzdHJpYnV0aW9uKCkubGVuZ3RoID4gMCk7XG4gIGFzc2VydChlbnRyeS5nZXRTdGFydEhlaWdodCgpID49IDApO1xufVxuXG5mdW5jdGlvbiB0ZXN0U3VibWl0VHhSZXN1bHRHb29kKHJlc3VsdDogTW9uZXJvU3VibWl0VHhSZXN1bHQpIHtcbiAgdGVzdFN1Ym1pdFR4UmVzdWx0Q29tbW9uKHJlc3VsdCk7XG4gIHRyeSB7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRJc0RvdWJsZVNwZW5kU2VlbigpLCBmYWxzZSwgXCJ0eCBzdWJtaXNzaW9uIGlzIGRvdWJsZSBzcGVuZC5cIik7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRJc0ZlZVRvb0xvdygpLCBmYWxzZSk7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRJc01peGluVG9vTG93KCksIGZhbHNlKTtcbiAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldEhhc0ludmFsaWRJbnB1dCgpLCBmYWxzZSk7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRIYXNJbnZhbGlkT3V0cHV0KCksIGZhbHNlKTtcbiAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldEhhc1Rvb0Zld091dHB1dHMoKSwgZmFsc2UpO1xuICAgIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0SXNPdmVyc3BlbmQoKSwgZmFsc2UpO1xuICAgIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0SXNUb29CaWcoKSwgZmFsc2UpO1xuICAgIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0U2FuaXR5Q2hlY2tGYWlsZWQoKSwgZmFsc2UpO1xuICAgIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQocmVzdWx0LmdldENyZWRpdHMoKSwgZmFsc2UpOyAvLyAwIGNyZWRpdHNcbiAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldFRvcEJsb2NrSGFzaCgpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0SXNUeEV4dHJhVG9vQmlnKCksIGZhbHNlKTtcbiAgICBhc3NlcnQuZXF1YWwocmVzdWx0LmdldElzR29vZCgpLCB0cnVlKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUubG9nKFwiU3VibWl0IHJlc3VsdCBpcyBub3QgZ29vZDogXCIgKyBKU09OLnN0cmluZ2lmeShyZXN1bHQudG9Kc29uKCkpKTtcbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRlc3RTdWJtaXRUeFJlc3VsdERvdWJsZVNwZW5kKHJlc3VsdDogTW9uZXJvU3VibWl0VHhSZXN1bHQpIHtcbiAgdGVzdFN1Ym1pdFR4UmVzdWx0Q29tbW9uKHJlc3VsdCk7XG4gIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0SXNHb29kKCksIGZhbHNlKTtcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRJc0RvdWJsZVNwZW5kU2VlbigpLCB0cnVlKTtcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRJc0ZlZVRvb0xvdygpLCBmYWxzZSk7XG4gIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0SXNNaXhpblRvb0xvdygpLCBmYWxzZSk7XG4gIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0SGFzSW52YWxpZElucHV0KCksIGZhbHNlKTtcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRIYXNJbnZhbGlkT3V0cHV0KCksIGZhbHNlKTtcbiAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRJc092ZXJzcGVuZCgpLCBmYWxzZSk7XG4gIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0SXNUb29CaWcoKSwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiB0ZXN0U3VibWl0VHhSZXN1bHRDb21tb24ocmVzdWx0OiBNb25lcm9TdWJtaXRUeFJlc3VsdCkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJlc3VsdC5nZXRJc0dvb2QoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJlc3VsdC5nZXRJc1JlbGF5ZWQoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJlc3VsdC5nZXRJc0RvdWJsZVNwZW5kU2VlbigpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVzdWx0LmdldElzRmVlVG9vTG93KCksIFwiYm9vbGVhblwiKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiByZXN1bHQuZ2V0SXNNaXhpblRvb0xvdygpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVzdWx0LmdldEhhc0ludmFsaWRJbnB1dCgpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVzdWx0LmdldEhhc0ludmFsaWRPdXRwdXQoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJlc3VsdC5nZXRJc092ZXJzcGVuZCgpLCBcImJvb2xlYW5cIik7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVzdWx0LmdldElzVG9vQmlnKCksIFwiYm9vbGVhblwiKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiByZXN1bHQuZ2V0U2FuaXR5Q2hlY2tGYWlsZWQoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQocmVzdWx0LmdldFJlYXNvbigpID09PSB1bmRlZmluZWQgfHwgcmVzdWx0LmdldFJlYXNvbigpLmxlbmd0aCA+IDApO1xufVxuXG5mdW5jdGlvbiB0ZXN0VHhQb29sU3RhdHMoc3RhdHM6IE1vbmVyb1R4UG9vbFN0YXRzKSB7XG4gIGFzc2VydChzdGF0cyk7XG4gIGFzc2VydChzdGF0cy5nZXROdW1UeHMoKSA+PSAwKTtcbiAgaWYgKHN0YXRzLmdldE51bVR4cygpID4gMCkge1xuICAgIGlmIChzdGF0cy5nZXROdW1UeHMoKSA9PT0gMSkgYXNzZXJ0LmVxdWFsKHN0YXRzLmdldEhpc3RvKCksIHVuZGVmaW5lZCk7XG4gICAgZWxzZSB7XG4gICAgICBhc3NlcnQoc3RhdHMuZ2V0SGlzdG8oKSk7XG4gICAgICBhc3NlcnQoc3RhdHMuZ2V0SGlzdG8oKS5zaXplID4gMCk7XG4gICAgICBmb3IgKGxldCBrZXkgb2Ygc3RhdHMuZ2V0SGlzdG8oKS5rZXlzKCkpIHtcbiAgICAgICAgYXNzZXJ0KHN0YXRzLmdldEhpc3RvKCkuZ2V0KGtleSkgPj0gMCk7XG4gICAgICB9XG4gICAgfVxuICAgIGFzc2VydChzdGF0cy5nZXRCeXRlc01heCgpID4gMCk7XG4gICAgYXNzZXJ0KHN0YXRzLmdldEJ5dGVzTWVkKCkgPiAwKTtcbiAgICBhc3NlcnQoc3RhdHMuZ2V0Qnl0ZXNNaW4oKSA+IDApO1xuICAgIGFzc2VydChzdGF0cy5nZXRCeXRlc1RvdGFsKCkgPiAwKTtcbiAgICBhc3NlcnQoc3RhdHMuZ2V0SGlzdG85OHBjKCkgPT09IHVuZGVmaW5lZCB8fCBzdGF0cy5nZXRIaXN0bzk4cGMoKSA+IDApO1xuICAgIGFzc2VydChzdGF0cy5nZXRPbGRlc3RUaW1lc3RhbXAoKSA+IDApO1xuICAgIGFzc2VydChzdGF0cy5nZXROdW0xMG0oKSA+PSAwKTtcbiAgICBhc3NlcnQoc3RhdHMuZ2V0TnVtRG91YmxlU3BlbmRzKCkgPj0gMCk7XG4gICAgYXNzZXJ0KHN0YXRzLmdldE51bUZhaWxpbmcoKSA+PSAwKTtcbiAgICBhc3NlcnQoc3RhdHMuZ2V0TnVtTm90UmVsYXllZCgpID49IDApO1xuICB9IGVsc2Uge1xuICAgIGFzc2VydC5lcXVhbChzdGF0cy5nZXRCeXRlc01heCgpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbChzdGF0cy5nZXRCeXRlc01lZCgpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbChzdGF0cy5nZXRCeXRlc01pbigpLCB1bmRlZmluZWQpO1xuICAgIGFzc2VydC5lcXVhbChzdGF0cy5nZXRCeXRlc1RvdGFsKCksIDApO1xuICAgIGFzc2VydC5lcXVhbChzdGF0cy5nZXRIaXN0bzk4cGMoKSwgdW5kZWZpbmVkKTtcbiAgICBhc3NlcnQuZXF1YWwoc3RhdHMuZ2V0T2xkZXN0VGltZXN0YW1wKCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0LmVxdWFsKHN0YXRzLmdldE51bTEwbSgpLCAwKTtcbiAgICBhc3NlcnQuZXF1YWwoc3RhdHMuZ2V0TnVtRG91YmxlU3BlbmRzKCksIDApO1xuICAgIGFzc2VydC5lcXVhbChzdGF0cy5nZXROdW1GYWlsaW5nKCksIDApO1xuICAgIGFzc2VydC5lcXVhbChzdGF0cy5nZXROdW1Ob3RSZWxheWVkKCksIDApO1xuICAgIGFzc2VydC5lcXVhbChzdGF0cy5nZXRIaXN0bygpLCB1bmRlZmluZWQpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFVucmVsYXllZFR4KHdhbGxldCwgYWNjb3VudElkeCkge1xuICBsZXQgY29uZmlnID0gbmV3IE1vbmVyb1R4Q29uZmlnKHthY2NvdW50SW5kZXg6IGFjY291bnRJZHgsIGFkZHJlc3M6IGF3YWl0IHdhbGxldC5nZXRQcmltYXJ5QWRkcmVzcygpLCBhbW91bnQ6IFRlc3RVdGlscy5NQVhfRkVFfSk7IFxuICBsZXQgdHggPSBhd2FpdCB3YWxsZXQuY3JlYXRlVHgoY29uZmlnKTtcbiAgYXNzZXJ0KHR4LmdldEZ1bGxIZXgoKSk7XG4gIGFzc2VydC5lcXVhbCh0eC5nZXRSZWxheSgpLCBmYWxzZSk7XG4gIHJldHVybiB0eDtcbn1cblxuZnVuY3Rpb24gdGVzdFZpbihpbnB1dCwgY3R4KSB7XG4gIHRlc3RPdXRwdXQoaW5wdXQpO1xuICB0ZXN0S2V5SW1hZ2UoaW5wdXQuZ2V0S2V5SW1hZ2UoKSwgY3R4KTtcbiAgYXNzZXJ0KGlucHV0LmdldFJpbmdPdXRwdXRJbmRpY2VzKCkgJiYgQXJyYXkuaXNBcnJheShpbnB1dC5nZXRSaW5nT3V0cHV0SW5kaWNlcygpKSAmJiBpbnB1dC5nZXRSaW5nT3V0cHV0SW5kaWNlcygpLmxlbmd0aCA+IDApO1xuICBmb3IgKGxldCBpbmRleCBvZiBpbnB1dC5nZXRSaW5nT3V0cHV0SW5kaWNlcygpKSB7XG4gICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBpbmRleCwgXCJudW1iZXJcIilcbiAgICBhc3NlcnQoaW5kZXggPj0gMCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdGVzdEtleUltYWdlKGltYWdlLCBjdHgpIHtcbiAgYXNzZXJ0KGltYWdlIGluc3RhbmNlb2YgTW9uZXJvS2V5SW1hZ2UpO1xuICBhc3NlcnQoaW1hZ2UuZ2V0SGV4KCkpO1xuICBpZiAoaW1hZ2UuZ2V0U2lnbmF0dXJlKCkgIT09IHVuZGVmaW5lZCkge1xuICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgaW1hZ2UuZ2V0U2lnbmF0dXJlKCksIFwic3RyaW5nXCIpO1xuICAgIGFzc2VydChpbWFnZS5nZXRTaWduYXR1cmUoKS5sZW5ndGggPiAwKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0ZXN0T3V0cHV0KG91dHB1dCwgY3R4PykgeyBcbiAgYXNzZXJ0KG91dHB1dCBpbnN0YW5jZW9mIE1vbmVyb091dHB1dCk7XG4gIFRlc3RVdGlscy50ZXN0VW5zaWduZWRCaWdJbnQob3V0cHV0LmdldEFtb3VudCgpKTtcbiAgaWYgKGN0eCkge1xuICAgIGlmIChvdXRwdXQuZ2V0VHgoKS5nZXRJblR4UG9vbCgpIHx8IGN0eC5mcm9tR2V0VHhQb29sIHx8IGN0eC5oYXNPdXRwdXRJbmRpY2VzID09PSBmYWxzZSkgYXNzZXJ0LmVxdWFsKG91dHB1dC5nZXRJbmRleCgpLCB1bmRlZmluZWQpOyAvLyBUT0RPOiBnZXRfYmxvY2tzX2J5X2hlaWdodC5iaW4gKCM1MTI3KSwgZ2V0X3RyYW5zYWN0aW9uX3Bvb2wsIGFuZCB0eCBwb29sIHR4cyBkbyBub3QgcmV0dXJuIG91dHB1dCBpbmRpY2VzIFxuICAgIGVsc2UgYXNzZXJ0KG91dHB1dC5nZXRJbmRleCgpID49IDApO1xuICAgIGFzc2VydChvdXRwdXQuZ2V0U3RlYWx0aFB1YmxpY0tleSgpICYmIG91dHB1dC5nZXRTdGVhbHRoUHVibGljS2V5KCkubGVuZ3RoID09PSA2NCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0Q29uZmlybWVkVHhzKGRhZW1vbiwgbnVtVHhzKSB7XG4gIGxldCB0eHM6IE1vbmVyb1R4W10gPSBbXTtcbiAgbGV0IG51bUJsb2Nrc1BlclJlcSA9IDUwO1xuICBmb3IgKGxldCBzdGFydElkeCA9IGF3YWl0IGRhZW1vbi5nZXRIZWlnaHQoKSAtIG51bUJsb2Nrc1BlclJlcSAtIDE7IHN0YXJ0SWR4ID49IDA7IHN0YXJ0SWR4IC09IG51bUJsb2Nrc1BlclJlcSkge1xuICAgIGxldCBibG9ja3MgPSBhd2FpdCBkYWVtb24uZ2V0QmxvY2tzQnlSYW5nZShzdGFydElkeCwgc3RhcnRJZHggKyBudW1CbG9ja3NQZXJSZXEpO1xuICAgIGZvciAobGV0IGJsb2NrIG9mIGJsb2Nrcykge1xuICAgICAgaWYgKCFibG9jay5nZXRUeHMoKSkgY29udGludWU7XG4gICAgICBmb3IgKGxldCB0eCBvZiBibG9jay5nZXRUeHMoKSkge1xuICAgICAgICB0eHMucHVzaCh0eCk7XG4gICAgICAgIGlmICh0eHMubGVuZ3RoID09PSBudW1UeHMpIHJldHVybiB0eHM7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBnZXQgXCIgKyBudW1UeHMgKyBcIiBjb25maXJtZWQgdHhzXCIpO1xufVxuXG5mdW5jdGlvbiB0ZXN0QWx0Q2hhaW4oYWx0Q2hhaW4pIHtcbiAgYXNzZXJ0KGFsdENoYWluIGluc3RhbmNlb2YgTW9uZXJvQWx0Q2hhaW4pO1xuICBhc3NlcnQoQXJyYXkuaXNBcnJheShhbHRDaGFpbi5nZXRCbG9ja0hhc2hlcygpKSAmJiBhbHRDaGFpbi5nZXRCbG9ja0hhc2hlcygpLmxlbmd0aCA+IDApO1xuICBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KGFsdENoYWluLmdldERpZmZpY3VsdHkoKSwgdHJ1ZSk7XG4gIGFzc2VydChhbHRDaGFpbi5nZXRIZWlnaHQoKSA+IDApO1xuICBhc3NlcnQoYWx0Q2hhaW4uZ2V0TGVuZ3RoKCkgPiAwKTtcbiAgYXNzZXJ0KGFsdENoYWluLmdldE1haW5DaGFpblBhcmVudEJsb2NrSGFzaCgpLmxlbmd0aCA9PT0gNjQpO1xufVxuXG5mdW5jdGlvbiB0ZXN0UGVlcihwZWVyKSB7XG4gIGFzc2VydChwZWVyIGluc3RhbmNlb2YgTW9uZXJvUGVlcik7XG4gIHRlc3RLbm93blBlZXIocGVlciwgdHJ1ZSk7XG4gIGFzc2VydChwZWVyLmdldElkKCkpO1xuICBhc3NlcnQocGVlci5nZXRBdmdEb3dubG9hZCgpID49IDApO1xuICBhc3NlcnQocGVlci5nZXRBdmdVcGxvYWQoKSA+PSAwKTtcbiAgYXNzZXJ0KHBlZXIuZ2V0Q3VycmVudERvd25sb2FkKCkgPj0gMCk7XG4gIGFzc2VydChwZWVyLmdldEN1cnJlbnRVcGxvYWQoKSA+PSAwKTtcbiAgYXNzZXJ0KHBlZXIuZ2V0SGVpZ2h0KCkgPj0gMCk7XG4gIGFzc2VydChwZWVyLmdldExpdmVUaW1lKCkgPj0gMCk7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcGVlci5nZXRJc0xvY2FsSXAoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHBlZXIuZ2V0SXNMb2NhbEhvc3QoKSwgXCJib29sZWFuXCIpO1xuICBhc3NlcnQocGVlci5nZXROdW1SZWNlaXZlcygpID49IDApO1xuICBhc3NlcnQocGVlci5nZXRSZWNlaXZlSWRsZVRpbWUoKSA+PSAwKTtcbiAgYXNzZXJ0KHBlZXIuZ2V0TnVtU2VuZHMoKSA+PSAwKTtcbiAgYXNzZXJ0KHBlZXIuZ2V0U2VuZElkbGVUaW1lKCkgPj0gMCk7XG4gIGFzc2VydChwZWVyLmdldFN0YXRlKCkpO1xuICBhc3NlcnQocGVlci5nZXROdW1TdXBwb3J0RmxhZ3MoKSA+PSAwKTtcbn1cblxuZnVuY3Rpb24gdGVzdEtub3duUGVlcihwZWVyLCBmcm9tQ29ubmVjdGlvbj8pIHtcbiAgYXNzZXJ0KHBlZXIgaW5zdGFuY2VvZiBNb25lcm9QZWVyKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBwZWVyLmdldElkKCksIFwic3RyaW5nXCIpO1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHBlZXIuZ2V0SG9zdCgpLCBcInN0cmluZ1wiKTtcbiAgYXNzZXJ0KHR5cGVvZiBwZWVyLmdldFBvcnQoKSA9PT0gXCJudW1iZXJcIik7XG4gIGFzc2VydChwZWVyLmdldFBvcnQoKSA+IDApO1xuICBhc3NlcnQocGVlci5nZXRScGNQb3J0KCkgPT09IHVuZGVmaW5lZCB8fCAodHlwZW9mIHBlZXIuZ2V0UnBjUG9ydCgpID09PSBcIm51bWJlclwiICYmIHBlZXIuZ2V0UnBjUG9ydCgpID49IDApKTtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBwZWVyLmdldElzT25saW5lKCksIFwiYm9vbGVhblwiKTtcbiAgaWYgKHBlZXIuZ2V0UnBjQ3JlZGl0c1Blckhhc2goKSAhPT0gdW5kZWZpbmVkKSBUZXN0VXRpbHMudGVzdFVuc2lnbmVkQmlnSW50KHBlZXIuZ2V0UnBjQ3JlZGl0c1Blckhhc2goKSk7XG4gIGlmIChmcm9tQ29ubmVjdGlvbikgYXNzZXJ0LmVxdWFsKHVuZGVmaW5lZCwgcGVlci5nZXRMYXN0U2VlblRpbWVzdGFtcCgpKTtcbiAgZWxzZSB7XG4gICAgaWYgKHBlZXIuZ2V0TGFzdFNlZW5UaW1lc3RhbXAoKSA8IDApIGNvbnNvbGUubG9nKFwiTGFzdCBzZWVuIHRpbWVzdGFtcCBpcyBpbnZhbGlkOiBcIiArIHBlZXIuZ2V0TGFzdFNlZW5UaW1lc3RhbXAoKSk7XG4gICAgYXNzZXJ0KHBlZXIuZ2V0TGFzdFNlZW5UaW1lc3RhbXAoKSA+PSAwKTtcbiAgfVxuICBhc3NlcnQocGVlci5nZXRQcnVuaW5nU2VlZCgpID09PSB1bmRlZmluZWQgfHwgcGVlci5nZXRQcnVuaW5nU2VlZCgpID49IDApO1xufVxuXG5mdW5jdGlvbiB0ZXN0VXBkYXRlQ2hlY2tSZXN1bHQocmVzdWx0KSB7XG4gIGFzc2VydChyZXN1bHQgaW5zdGFuY2VvZiBNb25lcm9EYWVtb25VcGRhdGVDaGVja1Jlc3VsdCk7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVzdWx0LmdldElzVXBkYXRlQXZhaWxhYmxlKCksIFwiYm9vbGVhblwiKTtcbiAgaWYgKHJlc3VsdC5nZXRJc1VwZGF0ZUF2YWlsYWJsZSgpKSB7XG4gICAgYXNzZXJ0KHJlc3VsdC5nZXRBdXRvVXJpKCksIFwiTm8gYXV0byB1cmk7IGlzIGRhZW1vbiBvbmxpbmU/XCIpO1xuICAgIGFzc2VydChyZXN1bHQuZ2V0VXNlclVyaSgpKTtcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHJlc3VsdC5nZXRWZXJzaW9uKCksIFwic3RyaW5nXCIpO1xuICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVzdWx0LmdldEhhc2goKSwgXCJzdHJpbmdcIik7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRIYXNoKCkubGVuZ3RoLCA2NCk7XG4gIH0gZWxzZSB7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRBdXRvVXJpKCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRVc2VyVXJpKCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRWZXJzaW9uKCksIHVuZGVmaW5lZCk7XG4gICAgYXNzZXJ0LmVxdWFsKHJlc3VsdC5nZXRIYXNoKCksIHVuZGVmaW5lZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdGVzdFVwZGF0ZURvd25sb2FkUmVzdWx0KHJlc3VsdCwgcGF0aD8pIHtcbiAgdGVzdFVwZGF0ZUNoZWNrUmVzdWx0KHJlc3VsdCk7XG4gIGlmIChyZXN1bHQuaXNVcGRhdGVBdmFpbGFibGUoKSkge1xuICAgIGlmIChwYXRoKSBhc3NlcnQuZXF1YWwocmVzdWx0LmdldERvd25sb2FkUGF0aCgpLCBwYXRoKTtcbiAgICBlbHNlIGFzc2VydChyZXN1bHQuZ2V0RG93bmxvYWRQYXRoKCkpO1xuICB9IGVsc2Uge1xuICAgIGFzc2VydC5lcXVhbChyZXN1bHQuZ2V0RG93bmxvYWRQYXRoKCksIHVuZGVmaW5lZCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0Q29uZmlybWVkVHhIYXNoZXMoZGFlbW9uKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBsZXQgbnVtVHhzID0gNTtcbiAgbGV0IHR4SGFzaGVzOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgaGVpZ2h0ID0gYXdhaXQgZGFlbW9uLmdldEhlaWdodCgpO1xuICB3aGlsZSAodHhIYXNoZXMubGVuZ3RoIDwgbnVtVHhzICYmIGhlaWdodCA+IDApIHtcbiAgICBsZXQgYmxvY2sgPSBhd2FpdCBkYWVtb24uZ2V0QmxvY2tCeUhlaWdodCgtLWhlaWdodCk7XG4gICAgZm9yIChsZXQgdHhIYXNoIG9mIGJsb2NrLmdldFR4SGFzaGVzKCkpIHR4SGFzaGVzLnB1c2godHhIYXNoKTtcbiAgfVxuICByZXR1cm4gdHhIYXNoZXM7XG59XG5cbmZ1bmN0aW9uIHRlc3RUeENvcHkodHg6IE1vbmVyb1R4LCBjdHgpIHtcbiAgXG4gIC8vIGNvcHkgdHggYW5kIHRlc3RcbiAgbGV0IGNvcHkgPSB0eC5jb3B5KCk7XG4gIGFzc2VydChjb3B5IGluc3RhbmNlb2YgTW9uZXJvVHgpO1xuICBhc3NlcnQuZXF1YWwoY29weS5nZXRCbG9jaygpLCB1bmRlZmluZWQpO1xuICBpZiAodHguZ2V0QmxvY2soKSkgY29weS5zZXRCbG9jayh0eC5nZXRCbG9jaygpLmNvcHkoKS5zZXRUeHMoW2NvcHldKSk7ICAvLyBjb3B5IGJsb2NrIGZvciB0ZXN0aW5nIGVxdWFsaXR5XG4gIGFzc2VydC5lcXVhbChjb3B5LnRvU3RyaW5nKCksIHR4LnRvU3RyaW5nKCkpO1xuICBcbiAgLy8gdGVzdCBkaWZmZXJlbnQgaW5wdXQgcmVmZXJlbmNlc1xuICBpZiAoY29weS5nZXRJbnB1dHMoKSA9PT0gdW5kZWZpbmVkKSBhc3NlcnQuZXF1YWwodHguZ2V0SW5wdXRzKCksIHVuZGVmaW5lZCk7XG4gIGVsc2Uge1xuICAgIGFzc2VydChjb3B5LmdldElucHV0cygpICE9PSB0eC5nZXRJbnB1dHMoKSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3B5LmdldElucHV0cygpLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0SW5wdXRzKClbaV0uZ2V0QW1vdW50KCksIGNvcHkuZ2V0SW5wdXRzKClbaV0uZ2V0QW1vdW50KCkpO1xuICAgIH1cbiAgfVxuICBcbiAgLy8gdGVzdCBkaWZmZXJlbnQgb3V0cHV0IHJlZmVyZW5jZXNcbiAgaWYgKGNvcHkuZ2V0T3V0cHV0cygpID09PSB1bmRlZmluZWQpIGFzc2VydC5lcXVhbCh0eC5nZXRPdXRwdXRzKCksIHVuZGVmaW5lZCk7XG4gIGVsc2Uge1xuICAgIGFzc2VydChjb3B5LmdldE91dHB1dHMoKSAhPT0gdHguZ2V0T3V0cHV0cygpKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvcHkuZ2V0T3V0cHV0cygpLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhc3NlcnQuZXF1YWwodHguZ2V0T3V0cHV0cygpW2ldLmdldEFtb3VudCgpLCBjb3B5LmdldE91dHB1dHMoKVtpXS5nZXRBbW91bnQoKSk7XG4gICAgfVxuICB9XG4gIFxuICAvLyB0ZXN0IGNvcGllZCB0eFxuICBjdHggPSBPYmplY3QuYXNzaWduKHt9LCBjdHgpO1xuICBjdHguZG9Ob3RUZXN0Q29weSA9IHRydWU7XG4gIGlmICh0eC5nZXRCbG9jaygpKSBjb3B5LnNldEJsb2NrKHR4LmdldEJsb2NrKCkuY29weSgpLnNldFR4cyhbY29weV0pKTsgLy8gY29weSBibG9jayBmb3IgdGVzdGluZ1xuICB0ZXN0VHgoY29weSwgY3R4KTtcbiAgXG4gIC8vIHRlc3QgbWVyZ2luZyB3aXRoIGNvcHlcbiAgbGV0IG1lcmdlZCA9IGNvcHkubWVyZ2UoY29weS5jb3B5KCkpO1xuICBhc3NlcnQuZXF1YWwobWVyZ2VkLnRvU3RyaW5nKCksIHR4LnRvU3RyaW5nKCkpO1xufVxuIl0sIm1hcHBpbmdzIjoieUxBQUEsSUFBQUEsT0FBQSxHQUFBQyxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUMsVUFBQSxHQUFBRixzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUUsTUFBQSxHQUFBRixPQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxQkE7QUFDQTtBQUNBO0FBQ0EsTUFBTUcsZ0JBQWdCLEdBQUcsRUFBRUMsTUFBTSxFQUFFLEtBQUssRUFBRUMsWUFBWSxFQUFFLEtBQUssRUFBRUMsTUFBTSxFQUFFLElBQUksRUFBRUMsR0FBRyxFQUFFLEVBQUVDLFFBQVEsRUFBRSxLQUFLLEVBQUVDLFdBQVcsRUFBRSxJQUFJLEVBQUVDLGFBQWEsRUFBRSxLQUFLLEVBQUVDLGdCQUFnQixFQUFFLEtBQUssRUFBRUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFaE07QUFDQTtBQUNBO0FBQ2UsTUFBTUMsbUJBQW1CLENBQUM7O0VB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