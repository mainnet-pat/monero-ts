"use strict";var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _assert = _interopRequireDefault(require("assert"));
var _TestUtils = _interopRequireDefault(require("./TestUtils"));
var _index = require("../../../index");






/**
 * Utilities to deep compare wallets.
 */
class WalletEqualityUtils {

  /**
   * Compare the keys of two wallets.
   */
  static async testWalletEqualityKeys(w1, w2) {
    _assert.default.equal(await w2.getSeed(), await w1.getSeed());
    _assert.default.equal(await w2.getPrimaryAddress(), await w1.getPrimaryAddress());
    _assert.default.equal(await w2.getPrivateViewKey(), await w1.getPrivateViewKey());
  }

  /**
   * Compares two wallets for equality using only on-chain data.
   * 
   * This test will sync the two wallets until their height is equal to guarantee equal state.
   * 
   * @param w1 a wallet to compare
   * @param w2 a wallet to compare
   */
  static async testWalletEqualityOnChain(w1, w2) {
    _TestUtils.default.WALLET_TX_TRACKER.reset(); // all wallets need to wait for txs to confirm to reliably sync

    // wait for relayed txs associated with wallets to clear pool
    _assert.default.equal(await w1.isConnectedToDaemon(), await w2.isConnectedToDaemon());
    if (await w1.isConnectedToDaemon()) await _TestUtils.default.WALLET_TX_TRACKER.waitForWalletTxsToClearPool([w1, w2]);

    // sync the wallets until same height
    while ((await w1.getHeight()) !== (await w2.getHeight())) {
      await w1.sync();
      await w2.sync();
    }

    // test that wallets are equal using only on-chain data
    _assert.default.equal(await w2.getHeight(), await w1.getHeight(), "Wallet heights are not equal after syncing");
    _assert.default.equal(await w2.getSeed(), await w1.getSeed());
    _assert.default.equal(await w2.getPrimaryAddress(), await w1.getPrimaryAddress());
    _assert.default.equal(await w2.getPrivateViewKey(), await w1.getPrivateViewKey());
    _assert.default.equal(await w2.getPrivateSpendKey(), await w1.getPrivateSpendKey());
    let txQuery = new _index.MoneroTxQuery().setIsConfirmed(true);
    await WalletEqualityUtils.testTxWalletsEqualOnChain(await w1.getTxs(txQuery), await w2.getTxs(txQuery));
    txQuery.setIncludeOutputs(true);
    await WalletEqualityUtils.testTxWalletsEqualOnChain(await w1.getTxs(txQuery), await w2.getTxs(txQuery)); // fetch and compare outputs
    await WalletEqualityUtils.testAccountsEqualOnChain(await w1.getAccounts(true), await w2.getAccounts(true));
    _assert.default.equal((await w2.getBalance()).toString(), (await w1.getBalance()).toString());
    _assert.default.equal((await w2.getUnlockedBalance()).toString(), (await w1.getUnlockedBalance()).toString());
    let transferQuery = new _index.MoneroTransferQuery().setTxQuery(new _index.MoneroTxQuery().setIsConfirmed(true));
    await WalletEqualityUtils.testTransfersEqualOnChain(await w1.getTransfers(transferQuery), await w2.getTransfers(transferQuery));
    let outputQuery = new _index.MoneroOutputQuery().setTxQuery(new _index.MoneroTxQuery().setIsConfirmed(true));
    await WalletEqualityUtils.testOutputWalletsEqualOnChain(await w1.getOutputs(outputQuery), await w2.getOutputs(outputQuery));
  }

  static async testAccountsEqualOnChain(accounts1, accounts2) {
    for (let i = 0; i < Math.max(accounts1.length, accounts2.length); i++) {
      if (i < accounts1.length && i < accounts2.length) {
        await WalletEqualityUtils.testAccountEqualOnChain(accounts1[i], accounts2[i]);
      } else if (i >= accounts1.length) {
        for (let j = i; j < accounts2.length; j++) {
          _assert.default.equal(accounts2[j].getBalance().toString(), 0n.toString());
          (0, _assert.default)(accounts2[j].getSubaddresses().length >= 1);
          for (let subaddress of accounts2[j].getSubaddresses()) (0, _assert.default)(!subaddress.getIsUsed());
        }
        return;
      } else {
        for (let j = i; j < accounts1.length; j++) {
          _assert.default.equal(accounts1[j].getBalance().toString(), 0n);
          (0, _assert.default)(accounts1[j].getSubaddresses().length >= 1);
          for (let subaddress of accounts1[j].getSubaddresses()) (0, _assert.default)(!subaddress.getIsUsed());
        }
        return;
      }
    }
  }

  static async testAccountEqualOnChain(account1, account2) {

    // nullify off-chain data for comparison
    let subaddresses1 = account1.getSubaddresses();
    let subaddresses2 = account2.getSubaddresses();
    account1.setSubaddresses(undefined);
    account2.setSubaddresses(undefined);
    account1.setTag(undefined);
    account2.setTag(undefined);

    // test account equality
    (0, _assert.default)(_index.GenUtils.equals(account2, account1));
    await WalletEqualityUtils.testSubaddressesEqualOnChainAux(subaddresses1, subaddresses2);
  }

  static async testSubaddressesEqualOnChainAux(subaddresses1, subaddresses2) {
    for (let i = 0; i < Math.max(subaddresses1.length, subaddresses2.length); i++) {
      if (i < subaddresses1.length && i < subaddresses2.length) {
        await WalletEqualityUtils.testSubaddressesEqualOnChainAux(subaddresses1[i], subaddresses2[i]);
      } else if (i >= subaddresses1.length) {
        for (let j = i; j < subaddresses2.length; j++) {
          _assert.default.equal(0n, subaddresses2[j].getBalance().toString());
          (0, _assert.default)(!subaddresses2[j].getIsUsed());
        }
        return;
      } else {
        for (let j = i; j < subaddresses1.length; j++) {
          _assert.default.equal(0n, subaddresses1[i].getBalance());
          (0, _assert.default)(!subaddresses1[j].getIsUsed());
        }
        return;
      }
    }
  }

  static async testSubaddressesEqualOnChain(subaddress1, subaddress2) {
    subaddress1.setLabel(undefined); // nullify off-chain data for comparison
    subaddress2.setLabel(undefined);
    (0, _assert.default)(_index.GenUtils.equals(subaddress2, subaddress1));
  }

  static async testTxWalletsEqualOnChain(txs1, txs2) {

    // nullify off-chain data for comparison
    let allTxs = [];
    for (let tx1 of txs1) allTxs.push(tx1);
    for (let tx2 of txs2) allTxs.push(tx2);
    for (let tx of allTxs) {
      tx.setNote(undefined);
      if (tx.getOutgoingTransfer() !== undefined) {
        tx.getOutgoingTransfer().setAddresses(undefined);
      }
    }

    // compare txs
    _assert.default.equal(txs2.length, txs1.length, "Wallets have different number of txs: " + txs1.length + " vs " + txs2.length);
    for (let tx1 of txs1) {
      let found = false;
      for (let tx2 of txs2) {
        if (tx1.getHash() === tx2.getHash()) {

          // transfer cached info if known for comparison
          if (tx1.getOutgoingTransfer() !== undefined && tx1.getOutgoingTransfer().getDestinations() !== undefined) {
            if (tx2.getOutgoingTransfer() === undefined || tx2.getOutgoingTransfer().getDestinations() === undefined) WalletEqualityUtils.transferCachedInfo(tx1, tx2);
          } else if (tx2.getOutgoingTransfer() !== undefined && tx2.getOutgoingTransfer().getDestinations() !== undefined) {
            WalletEqualityUtils.transferCachedInfo(tx2, tx1);
          }

          // test tx equality by merging
          (0, _assert.default)(_TestUtils.default.txsMergeable(tx1, tx2), "Txs are not mergeable");
          found = true;

          // test block equality except txs to ignore order
          let blockTxs1 = tx1.getBlock().getTxs();
          let blockTxs2 = tx2.getBlock().getTxs();
          tx1.getBlock().setTxs();
          tx2.getBlock().setTxs();
          (0, _assert.default)(_index.GenUtils.equals(tx2.getBlock().toJson(), tx1.getBlock().toJson()), "Tx blocks are not equal");
          tx1.getBlock().setTxs(blockTxs1);
          tx2.getBlock().setTxs(blockTxs2);
        }
      }
      (0, _assert.default)(found); // each tx must have one and only one match
    }
  }

  static async transferCachedInfo(src, tgt) {

    // fill in missing incoming transfers when sending from/to the same account
    if (src.getIncomingTransfers() !== undefined) {
      for (let inTransfer of src.getIncomingTransfers()) {
        if (inTransfer.getAccountIndex() === src.getOutgoingTransfer().getAccountIndex()) {
          tgt.getIncomingTransfers().push(inTransfer);
        }
      }
      // sort transfers
      tgt.getIncomingTransfers().sort(_index.MoneroWalletRpc.compareIncomingTransfers);
    }

    // transfer info to outgoing transfer
    if (tgt.getOutgoingTransfer() === undefined) tgt.setOutgoingTransfer(src.getOutgoingTransfer());else
    {
      tgt.getOutgoingTransfer().setDestinations(src.getOutgoingTransfer().getDestinations());
      tgt.getOutgoingTransfer().setAmount(src.getOutgoingTransfer().getAmount());
    }

    // transfer payment id if outgoing // TODO: monero-wallet-rpc does not provide payment id for outgoing transfer when cache missing https://github.com/monero-project/monero/issues/8378
    if (tgt.getOutgoingTransfer() !== undefined) tgt.setPaymentId(src.getPaymentId());
  }

  static async testTransfersEqualOnChain(transfers1, transfers2) {
    _assert.default.equal(transfers2.length, transfers1.length);

    // test and collect transfers per transaction
    let txsTransfers1 = {};
    let txsTransfers2 = {};
    let lastHeight = undefined;
    let lastTx1 = undefined;
    let lastTx2 = undefined;
    for (let i = 0; i < transfers1.length; i++) {
      let transfer1 = transfers1[i];
      let transfer2 = transfers2[i];

      // transfers must have same height even if they don't belong to same tx (because tx ordering within blocks is not currently provided by wallet2)
      _assert.default.equal(transfer2.getTx().getHeight(), transfer1.getTx().getHeight());

      // transfers must be in ascending order by height
      if (lastHeight === undefined) lastHeight = transfer1.getTx().getHeight();else
      (0, _assert.default)(lastHeight <= transfer1.getTx().getHeight());

      // transfers must be consecutive per transaction
      if (lastTx1 !== transfer1.getTx()) {
        (0, _assert.default)(!txsTransfers1[transfer1.getTx().getHash()]); // cannot be seen before
        lastTx1 = transfer1.getTx();
      }
      if (lastTx2 !== transfer2.getTx()) {
        (0, _assert.default)(!txsTransfers2[transfer2.getTx().getHash()]); // cannot be seen before
        lastTx2 = transfer2.getTx();
      }

      // collect tx1 transfer
      let txTransfers1 = txsTransfers1[transfer1.getTx().getHash()];
      if (txTransfers1 === undefined) {
        txTransfers1 = [];
        txsTransfers1[transfer1.getTx().getHash()] = txTransfers1;
      }
      txTransfers1.push(transfer1);

      // collect tx2 transfer
      let txTransfers2 = txsTransfers2[transfer2.getTx().getHash()];
      if (txTransfers2 === undefined) {
        txTransfers2 = [];
        txsTransfers2[transfer2.getTx().getHash()] = txTransfers2;
      }
      txTransfers2.push(transfer2);
    }

    // compare collected transfers per tx for equality
    for (let txHash of Object.keys(txsTransfers1)) {
      let txTransfers1 = txsTransfers1[txHash];
      let txTransfers2 = txsTransfers2[txHash];
      _assert.default.equal(txTransfers2.length, txTransfers1.length);

      // normalize and compare transfers
      for (let i = 0; i < txTransfers1.length; i++) {
        let transfer1 = txTransfers1[i];
        let transfer2 = txTransfers2[i];

        // normalize outgoing transfers
        if (transfer1 instanceof _index.MoneroOutgoingTransfer && transfer2 instanceof _index.MoneroOutgoingTransfer) {
          let ot1 = transfer1;
          let ot2 = transfer2;

          // transfer destination info if known for comparison
          if (ot1.getDestinations() !== undefined) {
            if (ot2.getDestinations() === undefined) await WalletEqualityUtils.transferCachedInfo(ot1.getTx(), ot2.getTx());
          } else if (ot2.getDestinations() !== undefined) {
            await WalletEqualityUtils.transferCachedInfo(ot2.getTx(), ot1.getTx());
          }

          // nullify other local wallet data
          ot1.setAddresses(undefined);
          ot2.setAddresses(undefined);
        }

        // normalize incoming transfers
        else {
          let it1 = transfer1;
          let it2 = transfer2;
          it1.setAddress(undefined);
          it2.setAddress(undefined);
        }

        // compare transfer equality
        (0, _assert.default)(_index.GenUtils.equals(transfer2.toJson(), transfer1.toJson()));
      }
    }
  }

  static async testOutputWalletsEqualOnChain(outputs1, outputs2) {
    _assert.default.equal(outputs2.length, outputs1.length);

    // test and collect outputs per transaction
    let txsOutputs1 = {};
    let txsOutputs2 = {};
    let lastHeight = undefined;
    let lastTx1 = undefined;
    let lastTx2 = undefined;
    for (let i = 0; i < outputs1.length; i++) {
      let output1 = outputs1[i];
      let output2 = outputs2[i];

      // outputs must have same height even if they don't belong to same tx (because tx ordering within blocks is not currently provided by wallet2)
      _assert.default.equal(output2.getTx().getHeight(), output1.getTx().getHeight());

      // outputs must be in ascending order by height
      if (lastHeight === undefined) lastHeight = output1.getTx().getHeight();else
      (0, _assert.default)(lastHeight <= output1.getTx().getHeight());

      // outputs must be consecutive per transaction
      if (lastTx1 !== output1.getTx()) {
        (0, _assert.default)(!txsOutputs1[output1.getTx().getHash()]); // cannot be seen before
        lastTx1 = output1.getTx();
      }
      if (lastTx2 !== output2.getTx()) {
        (0, _assert.default)(!txsOutputs2[output2.getTx().getHash()]); // cannot be seen before
        lastTx2 = output2.getTx();
      }

      // collect tx1 output
      let txOutputs1 = txsOutputs1[output1.getTx().getHash()];
      if (txOutputs1 === undefined) {
        txOutputs1 = [];
        txsOutputs1[output1.getTx().getHash()] = txOutputs1;
      }
      txOutputs1.push(output1);

      // collect tx2 output
      let txOutputs2 = txsOutputs2[output2.getTx().getHash()];
      if (txOutputs2 === undefined) {
        txOutputs2 = [];
        txsOutputs2[output2.getTx().getHash()] = txOutputs2;
      }
      txOutputs2.push(output2);
    }

    // compare collected outputs per tx for equality
    for (let txHash of Object.keys(txsOutputs1)) {
      let txOutputs1 = txsOutputs1[txHash];
      let txOutputs2 = txsOutputs2[txHash];
      _assert.default.equal(txOutputs2.length, txOutputs1.length);

      // normalize and compare outputs
      for (let i = 0; i < txOutputs1.length; i++) {
        let output1 = txOutputs1[i];
        let output2 = txOutputs2[i];
        _assert.default.equal(output2.getTx().getHash(), output1.getTx().getHash());
        (0, _assert.default)(_index.GenUtils.equals(output2.toJson(), output1.toJson()));
      }
    }
  }
}exports.default = WalletEqualityUtils;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfYXNzZXJ0IiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfVGVzdFV0aWxzIiwiX2luZGV4IiwiV2FsbGV0RXF1YWxpdHlVdGlscyIsInRlc3RXYWxsZXRFcXVhbGl0eUtleXMiLCJ3MSIsIncyIiwiYXNzZXJ0IiwiZXF1YWwiLCJnZXRTZWVkIiwiZ2V0UHJpbWFyeUFkZHJlc3MiLCJnZXRQcml2YXRlVmlld0tleSIsInRlc3RXYWxsZXRFcXVhbGl0eU9uQ2hhaW4iLCJUZXN0VXRpbHMiLCJXQUxMRVRfVFhfVFJBQ0tFUiIsInJlc2V0IiwiaXNDb25uZWN0ZWRUb0RhZW1vbiIsIndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbCIsImdldEhlaWdodCIsInN5bmMiLCJnZXRQcml2YXRlU3BlbmRLZXkiLCJ0eFF1ZXJ5IiwiTW9uZXJvVHhRdWVyeSIsInNldElzQ29uZmlybWVkIiwidGVzdFR4V2FsbGV0c0VxdWFsT25DaGFpbiIsImdldFR4cyIsInNldEluY2x1ZGVPdXRwdXRzIiwidGVzdEFjY291bnRzRXF1YWxPbkNoYWluIiwiZ2V0QWNjb3VudHMiLCJnZXRCYWxhbmNlIiwidG9TdHJpbmciLCJnZXRVbmxvY2tlZEJhbGFuY2UiLCJ0cmFuc2ZlclF1ZXJ5IiwiTW9uZXJvVHJhbnNmZXJRdWVyeSIsInNldFR4UXVlcnkiLCJ0ZXN0VHJhbnNmZXJzRXF1YWxPbkNoYWluIiwiZ2V0VHJhbnNmZXJzIiwib3V0cHV0UXVlcnkiLCJNb25lcm9PdXRwdXRRdWVyeSIsInRlc3RPdXRwdXRXYWxsZXRzRXF1YWxPbkNoYWluIiwiZ2V0T3V0cHV0cyIsImFjY291bnRzMSIsImFjY291bnRzMiIsImkiLCJNYXRoIiwibWF4IiwibGVuZ3RoIiwidGVzdEFjY291bnRFcXVhbE9uQ2hhaW4iLCJqIiwiZ2V0U3ViYWRkcmVzc2VzIiwic3ViYWRkcmVzcyIsImdldElzVXNlZCIsImFjY291bnQxIiwiYWNjb3VudDIiLCJzdWJhZGRyZXNzZXMxIiwic3ViYWRkcmVzc2VzMiIsInNldFN1YmFkZHJlc3NlcyIsInVuZGVmaW5lZCIsInNldFRhZyIsIkdlblV0aWxzIiwiZXF1YWxzIiwidGVzdFN1YmFkZHJlc3Nlc0VxdWFsT25DaGFpbkF1eCIsInRlc3RTdWJhZGRyZXNzZXNFcXVhbE9uQ2hhaW4iLCJzdWJhZGRyZXNzMSIsInN1YmFkZHJlc3MyIiwic2V0TGFiZWwiLCJ0eHMxIiwidHhzMiIsImFsbFR4cyIsInR4MSIsInB1c2giLCJ0eDIiLCJ0eCIsInNldE5vdGUiLCJnZXRPdXRnb2luZ1RyYW5zZmVyIiwic2V0QWRkcmVzc2VzIiwiZm91bmQiLCJnZXRIYXNoIiwiZ2V0RGVzdGluYXRpb25zIiwidHJhbnNmZXJDYWNoZWRJbmZvIiwidHhzTWVyZ2VhYmxlIiwiYmxvY2tUeHMxIiwiZ2V0QmxvY2siLCJibG9ja1R4czIiLCJzZXRUeHMiLCJ0b0pzb24iLCJzcmMiLCJ0Z3QiLCJnZXRJbmNvbWluZ1RyYW5zZmVycyIsImluVHJhbnNmZXIiLCJnZXRBY2NvdW50SW5kZXgiLCJzb3J0IiwiTW9uZXJvV2FsbGV0UnBjIiwiY29tcGFyZUluY29taW5nVHJhbnNmZXJzIiwic2V0T3V0Z29pbmdUcmFuc2ZlciIsInNldERlc3RpbmF0aW9ucyIsInNldEFtb3VudCIsImdldEFtb3VudCIsInNldFBheW1lbnRJZCIsImdldFBheW1lbnRJZCIsInRyYW5zZmVyczEiLCJ0cmFuc2ZlcnMyIiwidHhzVHJhbnNmZXJzMSIsInR4c1RyYW5zZmVyczIiLCJsYXN0SGVpZ2h0IiwibGFzdFR4MSIsImxhc3RUeDIiLCJ0cmFuc2ZlcjEiLCJ0cmFuc2ZlcjIiLCJnZXRUeCIsInR4VHJhbnNmZXJzMSIsInR4VHJhbnNmZXJzMiIsInR4SGFzaCIsIk9iamVjdCIsImtleXMiLCJNb25lcm9PdXRnb2luZ1RyYW5zZmVyIiwib3QxIiwib3QyIiwiaXQxIiwiaXQyIiwic2V0QWRkcmVzcyIsIm91dHB1dHMxIiwib3V0cHV0czIiLCJ0eHNPdXRwdXRzMSIsInR4c091dHB1dHMyIiwib3V0cHV0MSIsIm91dHB1dDIiLCJ0eE91dHB1dHMxIiwidHhPdXRwdXRzMiIsImV4cG9ydHMiLCJkZWZhdWx0Il0sInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3Rlc3QvdXRpbHMvV2FsbGV0RXF1YWxpdHlVdGlscy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCBUZXN0VXRpbHMgZnJvbSBcIi4vVGVzdFV0aWxzXCI7XG5pbXBvcnQge0dlblV0aWxzLFxuICAgICAgICBNb25lcm9UeFF1ZXJ5LFxuICAgICAgICBNb25lcm9UcmFuc2ZlclF1ZXJ5LFxuICAgICAgICBNb25lcm9PdXRwdXRRdWVyeSxcbiAgICAgICAgTW9uZXJvT3V0Z29pbmdUcmFuc2ZlcixcbiAgICAgICAgTW9uZXJvV2FsbGV0UnBjfSBmcm9tIFwiLi4vLi4vLi4vaW5kZXhcIjtcblxuLyoqXG4gKiBVdGlsaXRpZXMgdG8gZGVlcCBjb21wYXJlIHdhbGxldHMuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdhbGxldEVxdWFsaXR5VXRpbHMge1xuICBcbiAgLyoqXG4gICAqIENvbXBhcmUgdGhlIGtleXMgb2YgdHdvIHdhbGxldHMuXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgdGVzdFdhbGxldEVxdWFsaXR5S2V5cyh3MSwgdzIpIHtcbiAgICBhc3NlcnQuZXF1YWwoYXdhaXQgdzIuZ2V0U2VlZCgpLCBhd2FpdCB3MS5nZXRTZWVkKCkpO1xuICAgIGFzc2VydC5lcXVhbChhd2FpdCB3Mi5nZXRQcmltYXJ5QWRkcmVzcygpLCBhd2FpdCB3MS5nZXRQcmltYXJ5QWRkcmVzcygpKTtcbiAgICBhc3NlcnQuZXF1YWwoYXdhaXQgdzIuZ2V0UHJpdmF0ZVZpZXdLZXkoKSwgYXdhaXQgdzEuZ2V0UHJpdmF0ZVZpZXdLZXkoKSk7XG4gIH1cbiAgXG4gIC8qKlxuICAgKiBDb21wYXJlcyB0d28gd2FsbGV0cyBmb3IgZXF1YWxpdHkgdXNpbmcgb25seSBvbi1jaGFpbiBkYXRhLlxuICAgKiBcbiAgICogVGhpcyB0ZXN0IHdpbGwgc3luYyB0aGUgdHdvIHdhbGxldHMgdW50aWwgdGhlaXIgaGVpZ2h0IGlzIGVxdWFsIHRvIGd1YXJhbnRlZSBlcXVhbCBzdGF0ZS5cbiAgICogXG4gICAqIEBwYXJhbSB3MSBhIHdhbGxldCB0byBjb21wYXJlXG4gICAqIEBwYXJhbSB3MiBhIHdhbGxldCB0byBjb21wYXJlXG4gICAqL1xuICBzdGF0aWMgYXN5bmMgdGVzdFdhbGxldEVxdWFsaXR5T25DaGFpbih3MSwgdzIpIHtcbiAgICBUZXN0VXRpbHMuV0FMTEVUX1RYX1RSQUNLRVIucmVzZXQoKTsgLy8gYWxsIHdhbGxldHMgbmVlZCB0byB3YWl0IGZvciB0eHMgdG8gY29uZmlybSB0byByZWxpYWJseSBzeW5jXG4gICAgXG4gICAgLy8gd2FpdCBmb3IgcmVsYXllZCB0eHMgYXNzb2NpYXRlZCB3aXRoIHdhbGxldHMgdG8gY2xlYXIgcG9vbFxuICAgIGFzc2VydC5lcXVhbChhd2FpdCB3MS5pc0Nvbm5lY3RlZFRvRGFlbW9uKCksIGF3YWl0IHcyLmlzQ29ubmVjdGVkVG9EYWVtb24oKSk7XG4gICAgaWYgKGF3YWl0IHcxLmlzQ29ubmVjdGVkVG9EYWVtb24oKSkgYXdhaXQgVGVzdFV0aWxzLldBTExFVF9UWF9UUkFDS0VSLndhaXRGb3JXYWxsZXRUeHNUb0NsZWFyUG9vbChbdzEsIHcyXSk7XG4gICAgXG4gICAgLy8gc3luYyB0aGUgd2FsbGV0cyB1bnRpbCBzYW1lIGhlaWdodFxuICAgIHdoaWxlIChhd2FpdCB3MS5nZXRIZWlnaHQoKSAhPT0gYXdhaXQgdzIuZ2V0SGVpZ2h0KCkpIHtcbiAgICAgIGF3YWl0IHcxLnN5bmMoKTtcbiAgICAgIGF3YWl0IHcyLnN5bmMoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gdGVzdCB0aGF0IHdhbGxldHMgYXJlIGVxdWFsIHVzaW5nIG9ubHkgb24tY2hhaW4gZGF0YVxuICAgIGFzc2VydC5lcXVhbChhd2FpdCB3Mi5nZXRIZWlnaHQoKSwgYXdhaXQgdzEuZ2V0SGVpZ2h0KCksIFwiV2FsbGV0IGhlaWdodHMgYXJlIG5vdCBlcXVhbCBhZnRlciBzeW5jaW5nXCIpO1xuICAgIGFzc2VydC5lcXVhbChhd2FpdCB3Mi5nZXRTZWVkKCksIGF3YWl0IHcxLmdldFNlZWQoKSk7XG4gICAgYXNzZXJ0LmVxdWFsKGF3YWl0IHcyLmdldFByaW1hcnlBZGRyZXNzKCksIGF3YWl0IHcxLmdldFByaW1hcnlBZGRyZXNzKCkpO1xuICAgIGFzc2VydC5lcXVhbChhd2FpdCB3Mi5nZXRQcml2YXRlVmlld0tleSgpLCBhd2FpdCB3MS5nZXRQcml2YXRlVmlld0tleSgpKTtcbiAgICBhc3NlcnQuZXF1YWwoYXdhaXQgdzIuZ2V0UHJpdmF0ZVNwZW5kS2V5KCksIGF3YWl0IHcxLmdldFByaXZhdGVTcGVuZEtleSgpKTtcbiAgICBsZXQgdHhRdWVyeSA9IG5ldyBNb25lcm9UeFF1ZXJ5KCkuc2V0SXNDb25maXJtZWQodHJ1ZSk7XG4gICAgYXdhaXQgV2FsbGV0RXF1YWxpdHlVdGlscy50ZXN0VHhXYWxsZXRzRXF1YWxPbkNoYWluKGF3YWl0IHcxLmdldFR4cyh0eFF1ZXJ5KSwgYXdhaXQgdzIuZ2V0VHhzKHR4UXVlcnkpKTtcbiAgICB0eFF1ZXJ5LnNldEluY2x1ZGVPdXRwdXRzKHRydWUpO1xuICAgIGF3YWl0IFdhbGxldEVxdWFsaXR5VXRpbHMudGVzdFR4V2FsbGV0c0VxdWFsT25DaGFpbihhd2FpdCB3MS5nZXRUeHModHhRdWVyeSksIGF3YWl0IHcyLmdldFR4cyh0eFF1ZXJ5KSk7ICAvLyBmZXRjaCBhbmQgY29tcGFyZSBvdXRwdXRzXG4gICAgYXdhaXQgV2FsbGV0RXF1YWxpdHlVdGlscy50ZXN0QWNjb3VudHNFcXVhbE9uQ2hhaW4oYXdhaXQgdzEuZ2V0QWNjb3VudHModHJ1ZSksIGF3YWl0IHcyLmdldEFjY291bnRzKHRydWUpKTtcbiAgICBhc3NlcnQuZXF1YWwoKGF3YWl0IHcyLmdldEJhbGFuY2UoKSkudG9TdHJpbmcoKSwgKGF3YWl0IHcxLmdldEJhbGFuY2UoKSkudG9TdHJpbmcoKSk7XG4gICAgYXNzZXJ0LmVxdWFsKChhd2FpdCB3Mi5nZXRVbmxvY2tlZEJhbGFuY2UoKSkudG9TdHJpbmcoKSwgKGF3YWl0IHcxLmdldFVubG9ja2VkQmFsYW5jZSgpKS50b1N0cmluZygpKTtcbiAgICBsZXQgdHJhbnNmZXJRdWVyeSA9IG5ldyBNb25lcm9UcmFuc2ZlclF1ZXJ5KCkuc2V0VHhRdWVyeShuZXcgTW9uZXJvVHhRdWVyeSgpLnNldElzQ29uZmlybWVkKHRydWUpKTtcbiAgICBhd2FpdCBXYWxsZXRFcXVhbGl0eVV0aWxzLnRlc3RUcmFuc2ZlcnNFcXVhbE9uQ2hhaW4oYXdhaXQgdzEuZ2V0VHJhbnNmZXJzKHRyYW5zZmVyUXVlcnkpLCBhd2FpdCB3Mi5nZXRUcmFuc2ZlcnModHJhbnNmZXJRdWVyeSkpO1xuICAgIGxldCBvdXRwdXRRdWVyeSA9IG5ldyBNb25lcm9PdXRwdXRRdWVyeSgpLnNldFR4UXVlcnkobmV3IE1vbmVyb1R4UXVlcnkoKS5zZXRJc0NvbmZpcm1lZCh0cnVlKSk7XG4gICAgYXdhaXQgV2FsbGV0RXF1YWxpdHlVdGlscy50ZXN0T3V0cHV0V2FsbGV0c0VxdWFsT25DaGFpbihhd2FpdCB3MS5nZXRPdXRwdXRzKG91dHB1dFF1ZXJ5KSwgYXdhaXQgdzIuZ2V0T3V0cHV0cyhvdXRwdXRRdWVyeSkpO1xuICB9XG4gIFxuICBwcm90ZWN0ZWQgc3RhdGljIGFzeW5jIHRlc3RBY2NvdW50c0VxdWFsT25DaGFpbihhY2NvdW50czEsIGFjY291bnRzMikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5tYXgoYWNjb3VudHMxLmxlbmd0aCwgYWNjb3VudHMyLmxlbmd0aCk7IGkrKykge1xuICAgICAgaWYgKGkgPCBhY2NvdW50czEubGVuZ3RoICYmIGkgPCBhY2NvdW50czIubGVuZ3RoKSB7XG4gICAgICAgIGF3YWl0IFdhbGxldEVxdWFsaXR5VXRpbHMudGVzdEFjY291bnRFcXVhbE9uQ2hhaW4oYWNjb3VudHMxW2ldLCBhY2NvdW50czJbaV0pO1xuICAgICAgfSBlbHNlIGlmIChpID49IGFjY291bnRzMS5sZW5ndGgpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IGk7IGogPCBhY2NvdW50czIubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoYWNjb3VudHMyW2pdLmdldEJhbGFuY2UoKS50b1N0cmluZygpLCAwbi50b1N0cmluZygpKTtcbiAgICAgICAgICBhc3NlcnQoYWNjb3VudHMyW2pdLmdldFN1YmFkZHJlc3NlcygpLmxlbmd0aCA+PSAxKTtcbiAgICAgICAgICBmb3IgKGxldCBzdWJhZGRyZXNzIG9mIGFjY291bnRzMltqXS5nZXRTdWJhZGRyZXNzZXMoKSkgYXNzZXJ0KCFzdWJhZGRyZXNzLmdldElzVXNlZCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBqID0gaTsgaiA8IGFjY291bnRzMS5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChhY2NvdW50czFbal0uZ2V0QmFsYW5jZSgpLnRvU3RyaW5nKCksIDBuKTtcbiAgICAgICAgICBhc3NlcnQoYWNjb3VudHMxW2pdLmdldFN1YmFkZHJlc3NlcygpLmxlbmd0aCA+PSAxKTtcbiAgICAgICAgICBmb3IgKGxldCBzdWJhZGRyZXNzIG9mIGFjY291bnRzMVtqXS5nZXRTdWJhZGRyZXNzZXMoKSkgYXNzZXJ0KCFzdWJhZGRyZXNzLmdldElzVXNlZCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICBwcm90ZWN0ZWQgc3RhdGljIGFzeW5jIHRlc3RBY2NvdW50RXF1YWxPbkNoYWluKGFjY291bnQxLCBhY2NvdW50Mikge1xuICAgIFxuICAgIC8vIG51bGxpZnkgb2ZmLWNoYWluIGRhdGEgZm9yIGNvbXBhcmlzb25cbiAgICBsZXQgc3ViYWRkcmVzc2VzMSA9IGFjY291bnQxLmdldFN1YmFkZHJlc3NlcygpO1xuICAgIGxldCBzdWJhZGRyZXNzZXMyID0gYWNjb3VudDIuZ2V0U3ViYWRkcmVzc2VzKCk7XG4gICAgYWNjb3VudDEuc2V0U3ViYWRkcmVzc2VzKHVuZGVmaW5lZCk7XG4gICAgYWNjb3VudDIuc2V0U3ViYWRkcmVzc2VzKHVuZGVmaW5lZCk7XG4gICAgYWNjb3VudDEuc2V0VGFnKHVuZGVmaW5lZCk7XG4gICAgYWNjb3VudDIuc2V0VGFnKHVuZGVmaW5lZCk7XG4gICAgXG4gICAgLy8gdGVzdCBhY2NvdW50IGVxdWFsaXR5XG4gICAgYXNzZXJ0KEdlblV0aWxzLmVxdWFscyhhY2NvdW50MiwgYWNjb3VudDEpKTtcbiAgICBhd2FpdCBXYWxsZXRFcXVhbGl0eVV0aWxzLnRlc3RTdWJhZGRyZXNzZXNFcXVhbE9uQ2hhaW5BdXgoc3ViYWRkcmVzc2VzMSwgc3ViYWRkcmVzc2VzMik7XG4gIH1cbiAgXG4gIHByb3RlY3RlZCBzdGF0aWMgYXN5bmMgdGVzdFN1YmFkZHJlc3Nlc0VxdWFsT25DaGFpbkF1eChzdWJhZGRyZXNzZXMxLCBzdWJhZGRyZXNzZXMyKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1heChzdWJhZGRyZXNzZXMxLmxlbmd0aCwgc3ViYWRkcmVzc2VzMi5sZW5ndGgpOyBpKyspIHtcbiAgICAgIGlmIChpIDwgc3ViYWRkcmVzc2VzMS5sZW5ndGggJiYgaSA8IHN1YmFkZHJlc3NlczIubGVuZ3RoKSB7XG4gICAgICAgIGF3YWl0IFdhbGxldEVxdWFsaXR5VXRpbHMudGVzdFN1YmFkZHJlc3Nlc0VxdWFsT25DaGFpbkF1eChzdWJhZGRyZXNzZXMxW2ldLCBzdWJhZGRyZXNzZXMyW2ldKTtcbiAgICAgIH0gZWxzZSBpZiAoaSA+PSBzdWJhZGRyZXNzZXMxLmxlbmd0aCkge1xuICAgICAgICBmb3IgKGxldCBqID0gaTsgaiA8IHN1YmFkZHJlc3NlczIubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoMG4sIHN1YmFkZHJlc3NlczJbal0uZ2V0QmFsYW5jZSgpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgIGFzc2VydCghc3ViYWRkcmVzc2VzMltqXS5nZXRJc1VzZWQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IGk7IGogPCBzdWJhZGRyZXNzZXMxLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKDBuLCBzdWJhZGRyZXNzZXMxW2ldLmdldEJhbGFuY2UoKSk7XG4gICAgICAgICAgYXNzZXJ0KCFzdWJhZGRyZXNzZXMxW2pdLmdldElzVXNlZCgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICBzdGF0aWMgYXN5bmMgdGVzdFN1YmFkZHJlc3Nlc0VxdWFsT25DaGFpbihzdWJhZGRyZXNzMSwgc3ViYWRkcmVzczIpIHtcbiAgICBzdWJhZGRyZXNzMS5zZXRMYWJlbCh1bmRlZmluZWQpOyAvLyBudWxsaWZ5IG9mZi1jaGFpbiBkYXRhIGZvciBjb21wYXJpc29uXG4gICAgc3ViYWRkcmVzczIuc2V0TGFiZWwodW5kZWZpbmVkKTtcbiAgICBhc3NlcnQoR2VuVXRpbHMuZXF1YWxzKHN1YmFkZHJlc3MyLCBzdWJhZGRyZXNzMSkpO1xuICB9XG4gIFxuICBwcm90ZWN0ZWQgc3RhdGljIGFzeW5jIHRlc3RUeFdhbGxldHNFcXVhbE9uQ2hhaW4odHhzMSwgdHhzMikge1xuICAgIFxuICAgIC8vIG51bGxpZnkgb2ZmLWNoYWluIGRhdGEgZm9yIGNvbXBhcmlzb25cbiAgICBsZXQgYWxsVHhzOiBhbnkgPSBbXTtcbiAgICBmb3IgKGxldCB0eDEgb2YgdHhzMSkgYWxsVHhzLnB1c2godHgxKTtcbiAgICBmb3IgKGxldCB0eDIgb2YgdHhzMikgYWxsVHhzLnB1c2godHgyKTtcbiAgICBmb3IgKGxldCB0eCBvZiBhbGxUeHMpIHtcbiAgICAgIHR4LnNldE5vdGUodW5kZWZpbmVkKTtcbiAgICAgIGlmICh0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0eC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuc2V0QWRkcmVzc2VzKHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIGNvbXBhcmUgdHhzXG4gICAgYXNzZXJ0LmVxdWFsKHR4czIubGVuZ3RoLCB0eHMxLmxlbmd0aCwgXCJXYWxsZXRzIGhhdmUgZGlmZmVyZW50IG51bWJlciBvZiB0eHM6IFwiICsgdHhzMS5sZW5ndGggKyBcIiB2cyBcIiArIHR4czIubGVuZ3RoKTtcbiAgICBmb3IgKGxldCB0eDEgb2YgdHhzMSkge1xuICAgICAgbGV0IGZvdW5kID0gZmFsc2U7XG4gICAgICBmb3IgKGxldCB0eDIgb2YgdHhzMikge1xuICAgICAgICBpZiAodHgxLmdldEhhc2goKSA9PT0gdHgyLmdldEhhc2goKSkge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRyYW5zZmVyIGNhY2hlZCBpbmZvIGlmIGtub3duIGZvciBjb21wYXJpc29uXG4gICAgICAgICAgaWYgKHR4MS5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgIT09IHVuZGVmaW5lZCAmJiB0eDEuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldERlc3RpbmF0aW9ucygpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICh0eDIuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpID09PSB1bmRlZmluZWQgfHwgdHgyLmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKSA9PT0gdW5kZWZpbmVkKSBXYWxsZXRFcXVhbGl0eVV0aWxzLnRyYW5zZmVyQ2FjaGVkSW5mbyh0eDEsIHR4Mik7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eDIuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpICE9PSB1bmRlZmluZWQgJiYgdHgyLmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBXYWxsZXRFcXVhbGl0eVV0aWxzLnRyYW5zZmVyQ2FjaGVkSW5mbyh0eDIsIHR4MSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgdHggZXF1YWxpdHkgYnkgbWVyZ2luZ1xuICAgICAgICAgIGFzc2VydChUZXN0VXRpbHMudHhzTWVyZ2VhYmxlKHR4MSwgdHgyKSwgXCJUeHMgYXJlIG5vdCBtZXJnZWFibGVcIik7XG4gICAgICAgICAgZm91bmQgPSB0cnVlO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIHRlc3QgYmxvY2sgZXF1YWxpdHkgZXhjZXB0IHR4cyB0byBpZ25vcmUgb3JkZXJcbiAgICAgICAgICBsZXQgYmxvY2tUeHMxID0gdHgxLmdldEJsb2NrKCkuZ2V0VHhzKCk7XG4gICAgICAgICAgbGV0IGJsb2NrVHhzMiA9IHR4Mi5nZXRCbG9jaygpLmdldFR4cygpO1xuICAgICAgICAgIHR4MS5nZXRCbG9jaygpLnNldFR4cygpO1xuICAgICAgICAgIHR4Mi5nZXRCbG9jaygpLnNldFR4cygpO1xuICAgICAgICAgIGFzc2VydChHZW5VdGlscy5lcXVhbHModHgyLmdldEJsb2NrKCkudG9Kc29uKCksIHR4MS5nZXRCbG9jaygpLnRvSnNvbigpKSwgXCJUeCBibG9ja3MgYXJlIG5vdCBlcXVhbFwiKTtcbiAgICAgICAgICB0eDEuZ2V0QmxvY2soKS5zZXRUeHMoYmxvY2tUeHMxKTtcbiAgICAgICAgICB0eDIuZ2V0QmxvY2soKS5zZXRUeHMoYmxvY2tUeHMyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXNzZXJ0KGZvdW5kKTsgIC8vIGVhY2ggdHggbXVzdCBoYXZlIG9uZSBhbmQgb25seSBvbmUgbWF0Y2hcbiAgICB9XG4gIH1cbiAgXG4gIHByb3RlY3RlZCBzdGF0aWMgYXN5bmMgdHJhbnNmZXJDYWNoZWRJbmZvKHNyYywgdGd0KSB7XG4gICAgXG4gICAgLy8gZmlsbCBpbiBtaXNzaW5nIGluY29taW5nIHRyYW5zZmVycyB3aGVuIHNlbmRpbmcgZnJvbS90byB0aGUgc2FtZSBhY2NvdW50XG4gICAgaWYgKHNyYy5nZXRJbmNvbWluZ1RyYW5zZmVycygpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvciAobGV0IGluVHJhbnNmZXIgb2Ygc3JjLmdldEluY29taW5nVHJhbnNmZXJzKCkpIHtcbiAgICAgICAgaWYgKGluVHJhbnNmZXIuZ2V0QWNjb3VudEluZGV4KCkgPT09IHNyYy5nZXRPdXRnb2luZ1RyYW5zZmVyKCkuZ2V0QWNjb3VudEluZGV4KCkpIHtcbiAgICAgICAgICB0Z3QuZ2V0SW5jb21pbmdUcmFuc2ZlcnMoKS5wdXNoKGluVHJhbnNmZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBzb3J0IHRyYW5zZmVyc1xuICAgICAgdGd0LmdldEluY29taW5nVHJhbnNmZXJzKCkuc29ydChNb25lcm9XYWxsZXRScGMuY29tcGFyZUluY29taW5nVHJhbnNmZXJzKTtcbiAgICB9XG4gICAgXG4gICAgLy8gdHJhbnNmZXIgaW5mbyB0byBvdXRnb2luZyB0cmFuc2ZlclxuICAgIGlmICh0Z3QuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpID09PSB1bmRlZmluZWQpIHRndC5zZXRPdXRnb2luZ1RyYW5zZmVyKHNyYy5nZXRPdXRnb2luZ1RyYW5zZmVyKCkpO1xuICAgIGVsc2Uge1xuICAgICAgdGd0LmdldE91dGdvaW5nVHJhbnNmZXIoKS5zZXREZXN0aW5hdGlvbnMoc3JjLmdldE91dGdvaW5nVHJhbnNmZXIoKS5nZXREZXN0aW5hdGlvbnMoKSk7XG4gICAgICB0Z3QuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLnNldEFtb3VudChzcmMuZ2V0T3V0Z29pbmdUcmFuc2ZlcigpLmdldEFtb3VudCgpKTtcbiAgICB9XG4gICAgXG4gICAgLy8gdHJhbnNmZXIgcGF5bWVudCBpZCBpZiBvdXRnb2luZyAvLyBUT0RPOiBtb25lcm8td2FsbGV0LXJwYyBkb2VzIG5vdCBwcm92aWRlIHBheW1lbnQgaWQgZm9yIG91dGdvaW5nIHRyYW5zZmVyIHdoZW4gY2FjaGUgbWlzc2luZyBodHRwczovL2dpdGh1Yi5jb20vbW9uZXJvLXByb2plY3QvbW9uZXJvL2lzc3Vlcy84Mzc4XG4gICAgaWYgKHRndC5nZXRPdXRnb2luZ1RyYW5zZmVyKCkgIT09IHVuZGVmaW5lZCkgdGd0LnNldFBheW1lbnRJZChzcmMuZ2V0UGF5bWVudElkKCkpO1xuICB9XG4gIFxuICBwcm90ZWN0ZWQgc3RhdGljIGFzeW5jIHRlc3RUcmFuc2ZlcnNFcXVhbE9uQ2hhaW4odHJhbnNmZXJzMSwgdHJhbnNmZXJzMikge1xuICAgIGFzc2VydC5lcXVhbCh0cmFuc2ZlcnMyLmxlbmd0aCwgdHJhbnNmZXJzMS5sZW5ndGgpO1xuICAgIFxuICAgIC8vIHRlc3QgYW5kIGNvbGxlY3QgdHJhbnNmZXJzIHBlciB0cmFuc2FjdGlvblxuICAgIGxldCB0eHNUcmFuc2ZlcnMxID0ge307XG4gICAgbGV0IHR4c1RyYW5zZmVyczIgPSB7fTtcbiAgICBsZXQgbGFzdEhlaWdodCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdFR4MSA9IHVuZGVmaW5lZDtcbiAgICBsZXQgbGFzdFR4MiA9IHVuZGVmaW5lZDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRyYW5zZmVyczEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCB0cmFuc2ZlcjEgPSB0cmFuc2ZlcnMxW2ldO1xuICAgICAgbGV0IHRyYW5zZmVyMiA9IHRyYW5zZmVyczJbaV07XG4gICAgICBcbiAgICAgIC8vIHRyYW5zZmVycyBtdXN0IGhhdmUgc2FtZSBoZWlnaHQgZXZlbiBpZiB0aGV5IGRvbid0IGJlbG9uZyB0byBzYW1lIHR4IChiZWNhdXNlIHR4IG9yZGVyaW5nIHdpdGhpbiBibG9ja3MgaXMgbm90IGN1cnJlbnRseSBwcm92aWRlZCBieSB3YWxsZXQyKVxuICAgICAgYXNzZXJ0LmVxdWFsKHRyYW5zZmVyMi5nZXRUeCgpLmdldEhlaWdodCgpLCB0cmFuc2ZlcjEuZ2V0VHgoKS5nZXRIZWlnaHQoKSk7XG4gICAgICBcbiAgICAgIC8vIHRyYW5zZmVycyBtdXN0IGJlIGluIGFzY2VuZGluZyBvcmRlciBieSBoZWlnaHRcbiAgICAgIGlmIChsYXN0SGVpZ2h0ID09PSB1bmRlZmluZWQpIGxhc3RIZWlnaHQgPSB0cmFuc2ZlcjEuZ2V0VHgoKS5nZXRIZWlnaHQoKTtcbiAgICAgIGVsc2UgYXNzZXJ0KGxhc3RIZWlnaHQgPD0gdHJhbnNmZXIxLmdldFR4KCkuZ2V0SGVpZ2h0KCkpO1xuICAgICAgXG4gICAgICAvLyB0cmFuc2ZlcnMgbXVzdCBiZSBjb25zZWN1dGl2ZSBwZXIgdHJhbnNhY3Rpb25cbiAgICAgIGlmIChsYXN0VHgxICE9PSB0cmFuc2ZlcjEuZ2V0VHgoKSkge1xuICAgICAgICBhc3NlcnQoIXR4c1RyYW5zZmVyczFbdHJhbnNmZXIxLmdldFR4KCkuZ2V0SGFzaCgpXSk7ICAvLyBjYW5ub3QgYmUgc2VlbiBiZWZvcmVcbiAgICAgICAgbGFzdFR4MSA9IHRyYW5zZmVyMS5nZXRUeCgpO1xuICAgICAgfVxuICAgICAgaWYgKGxhc3RUeDIgIT09IHRyYW5zZmVyMi5nZXRUeCgpKSB7XG4gICAgICAgIGFzc2VydCghdHhzVHJhbnNmZXJzMlt0cmFuc2ZlcjIuZ2V0VHgoKS5nZXRIYXNoKCldKTsgIC8vIGNhbm5vdCBiZSBzZWVuIGJlZm9yZVxuICAgICAgICBsYXN0VHgyID0gdHJhbnNmZXIyLmdldFR4KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIGNvbGxlY3QgdHgxIHRyYW5zZmVyXG4gICAgICBsZXQgdHhUcmFuc2ZlcnMxID0gdHhzVHJhbnNmZXJzMVt0cmFuc2ZlcjEuZ2V0VHgoKS5nZXRIYXNoKCldO1xuICAgICAgaWYgKHR4VHJhbnNmZXJzMSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHR4VHJhbnNmZXJzMSA9IFtdO1xuICAgICAgICB0eHNUcmFuc2ZlcnMxW3RyYW5zZmVyMS5nZXRUeCgpLmdldEhhc2goKV0gPSB0eFRyYW5zZmVyczE7XG4gICAgICB9XG4gICAgICB0eFRyYW5zZmVyczEucHVzaCh0cmFuc2ZlcjEpO1xuICAgICAgXG4gICAgICAvLyBjb2xsZWN0IHR4MiB0cmFuc2ZlclxuICAgICAgbGV0IHR4VHJhbnNmZXJzMiA9IHR4c1RyYW5zZmVyczJbdHJhbnNmZXIyLmdldFR4KCkuZ2V0SGFzaCgpXTtcbiAgICAgIGlmICh0eFRyYW5zZmVyczIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0eFRyYW5zZmVyczIgPSBbXTtcbiAgICAgICAgdHhzVHJhbnNmZXJzMlt0cmFuc2ZlcjIuZ2V0VHgoKS5nZXRIYXNoKCldID0gdHhUcmFuc2ZlcnMyO1xuICAgICAgfVxuICAgICAgdHhUcmFuc2ZlcnMyLnB1c2godHJhbnNmZXIyKTtcbiAgICB9XG4gICAgXG4gICAgLy8gY29tcGFyZSBjb2xsZWN0ZWQgdHJhbnNmZXJzIHBlciB0eCBmb3IgZXF1YWxpdHlcbiAgICBmb3IgKGxldCB0eEhhc2ggb2YgT2JqZWN0LmtleXModHhzVHJhbnNmZXJzMSkpIHtcbiAgICAgIGxldCB0eFRyYW5zZmVyczEgPSB0eHNUcmFuc2ZlcnMxW3R4SGFzaF07XG4gICAgICBsZXQgdHhUcmFuc2ZlcnMyID0gdHhzVHJhbnNmZXJzMlt0eEhhc2hdO1xuICAgICAgYXNzZXJ0LmVxdWFsKHR4VHJhbnNmZXJzMi5sZW5ndGgsIHR4VHJhbnNmZXJzMS5sZW5ndGgpO1xuICAgICAgXG4gICAgICAvLyBub3JtYWxpemUgYW5kIGNvbXBhcmUgdHJhbnNmZXJzXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHR4VHJhbnNmZXJzMS5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgdHJhbnNmZXIxID0gdHhUcmFuc2ZlcnMxW2ldO1xuICAgICAgICBsZXQgdHJhbnNmZXIyID0gdHhUcmFuc2ZlcnMyW2ldO1xuICAgICAgICBcbiAgICAgICAgLy8gbm9ybWFsaXplIG91dGdvaW5nIHRyYW5zZmVyc1xuICAgICAgICBpZiAodHJhbnNmZXIxIGluc3RhbmNlb2YgTW9uZXJvT3V0Z29pbmdUcmFuc2ZlciAmJiB0cmFuc2ZlcjIgaW5zdGFuY2VvZiBNb25lcm9PdXRnb2luZ1RyYW5zZmVyKSB7XG4gICAgICAgICAgbGV0IG90MSA9IHRyYW5zZmVyMTtcbiAgICAgICAgICBsZXQgb3QyID0gdHJhbnNmZXIyO1xuICAgIFxuICAgICAgICAgIC8vIHRyYW5zZmVyIGRlc3RpbmF0aW9uIGluZm8gaWYga25vd24gZm9yIGNvbXBhcmlzb25cbiAgICAgICAgICBpZiAob3QxLmdldERlc3RpbmF0aW9ucygpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmIChvdDIuZ2V0RGVzdGluYXRpb25zKCkgPT09IHVuZGVmaW5lZCkgYXdhaXQgV2FsbGV0RXF1YWxpdHlVdGlscy50cmFuc2ZlckNhY2hlZEluZm8ob3QxLmdldFR4KCksIG90Mi5nZXRUeCgpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG90Mi5nZXREZXN0aW5hdGlvbnMoKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCBXYWxsZXRFcXVhbGl0eVV0aWxzLnRyYW5zZmVyQ2FjaGVkSW5mbyhvdDIuZ2V0VHgoKSwgb3QxLmdldFR4KCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBudWxsaWZ5IG90aGVyIGxvY2FsIHdhbGxldCBkYXRhXG4gICAgICAgICAgb3QxLnNldEFkZHJlc3Nlcyh1bmRlZmluZWQpO1xuICAgICAgICAgIG90Mi5zZXRBZGRyZXNzZXModW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gbm9ybWFsaXplIGluY29taW5nIHRyYW5zZmVyc1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBsZXQgaXQxID0gdHJhbnNmZXIxO1xuICAgICAgICAgIGxldCBpdDIgPSB0cmFuc2ZlcjI7XG4gICAgICAgICAgaXQxLnNldEFkZHJlc3ModW5kZWZpbmVkKTtcbiAgICAgICAgICBpdDIuc2V0QWRkcmVzcyh1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBjb21wYXJlIHRyYW5zZmVyIGVxdWFsaXR5XG4gICAgICAgIGFzc2VydChHZW5VdGlscy5lcXVhbHModHJhbnNmZXIyLnRvSnNvbigpLCB0cmFuc2ZlcjEudG9Kc29uKCkpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIHByb3RlY3RlZCBzdGF0aWMgYXN5bmMgdGVzdE91dHB1dFdhbGxldHNFcXVhbE9uQ2hhaW4ob3V0cHV0czEsIG91dHB1dHMyKSB7XG4gICAgYXNzZXJ0LmVxdWFsKG91dHB1dHMyLmxlbmd0aCwgb3V0cHV0czEubGVuZ3RoKTtcbiAgICBcbiAgICAvLyB0ZXN0IGFuZCBjb2xsZWN0IG91dHB1dHMgcGVyIHRyYW5zYWN0aW9uXG4gICAgbGV0IHR4c091dHB1dHMxID0ge307XG4gICAgbGV0IHR4c091dHB1dHMyID0ge307XG4gICAgbGV0IGxhc3RIZWlnaHQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RUeDEgPSB1bmRlZmluZWQ7XG4gICAgbGV0IGxhc3RUeDIgPSB1bmRlZmluZWQ7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXRzMS5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IG91dHB1dDEgPSBvdXRwdXRzMVtpXTtcbiAgICAgIGxldCBvdXRwdXQyID0gb3V0cHV0czJbaV07XG4gICAgICBcbiAgICAgIC8vIG91dHB1dHMgbXVzdCBoYXZlIHNhbWUgaGVpZ2h0IGV2ZW4gaWYgdGhleSBkb24ndCBiZWxvbmcgdG8gc2FtZSB0eCAoYmVjYXVzZSB0eCBvcmRlcmluZyB3aXRoaW4gYmxvY2tzIGlzIG5vdCBjdXJyZW50bHkgcHJvdmlkZWQgYnkgd2FsbGV0MilcbiAgICAgIGFzc2VydC5lcXVhbChvdXRwdXQyLmdldFR4KCkuZ2V0SGVpZ2h0KCksIG91dHB1dDEuZ2V0VHgoKS5nZXRIZWlnaHQoKSk7XG4gICAgICBcbiAgICAgIC8vIG91dHB1dHMgbXVzdCBiZSBpbiBhc2NlbmRpbmcgb3JkZXIgYnkgaGVpZ2h0XG4gICAgICBpZiAobGFzdEhlaWdodCA9PT0gdW5kZWZpbmVkKSBsYXN0SGVpZ2h0ID0gb3V0cHV0MS5nZXRUeCgpLmdldEhlaWdodCgpO1xuICAgICAgZWxzZSBhc3NlcnQobGFzdEhlaWdodCA8PSBvdXRwdXQxLmdldFR4KCkuZ2V0SGVpZ2h0KCkpO1xuICAgICAgXG4gICAgICAvLyBvdXRwdXRzIG11c3QgYmUgY29uc2VjdXRpdmUgcGVyIHRyYW5zYWN0aW9uXG4gICAgICBpZiAobGFzdFR4MSAhPT0gb3V0cHV0MS5nZXRUeCgpKSB7XG4gICAgICAgIGFzc2VydCghdHhzT3V0cHV0czFbb3V0cHV0MS5nZXRUeCgpLmdldEhhc2goKV0pOyAgLy8gY2Fubm90IGJlIHNlZW4gYmVmb3JlXG4gICAgICAgIGxhc3RUeDEgPSBvdXRwdXQxLmdldFR4KCk7XG4gICAgICB9XG4gICAgICBpZiAobGFzdFR4MiAhPT0gb3V0cHV0Mi5nZXRUeCgpKSB7XG4gICAgICAgIGFzc2VydCghdHhzT3V0cHV0czJbb3V0cHV0Mi5nZXRUeCgpLmdldEhhc2goKV0pOyAgLy8gY2Fubm90IGJlIHNlZW4gYmVmb3JlXG4gICAgICAgIGxhc3RUeDIgPSBvdXRwdXQyLmdldFR4KCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIGNvbGxlY3QgdHgxIG91dHB1dFxuICAgICAgbGV0IHR4T3V0cHV0czEgPSB0eHNPdXRwdXRzMVtvdXRwdXQxLmdldFR4KCkuZ2V0SGFzaCgpXTtcbiAgICAgIGlmICh0eE91dHB1dHMxID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHhPdXRwdXRzMSA9IFtdO1xuICAgICAgICB0eHNPdXRwdXRzMVtvdXRwdXQxLmdldFR4KCkuZ2V0SGFzaCgpXSA9IHR4T3V0cHV0czE7XG4gICAgICB9XG4gICAgICB0eE91dHB1dHMxLnB1c2gob3V0cHV0MSk7XG4gICAgICBcbiAgICAgIC8vIGNvbGxlY3QgdHgyIG91dHB1dFxuICAgICAgbGV0IHR4T3V0cHV0czIgPSB0eHNPdXRwdXRzMltvdXRwdXQyLmdldFR4KCkuZ2V0SGFzaCgpXTtcbiAgICAgIGlmICh0eE91dHB1dHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdHhPdXRwdXRzMiA9IFtdO1xuICAgICAgICB0eHNPdXRwdXRzMltvdXRwdXQyLmdldFR4KCkuZ2V0SGFzaCgpXSA9IHR4T3V0cHV0czI7XG4gICAgICB9XG4gICAgICB0eE91dHB1dHMyLnB1c2gob3V0cHV0Mik7XG4gICAgfVxuICAgIFxuICAgIC8vIGNvbXBhcmUgY29sbGVjdGVkIG91dHB1dHMgcGVyIHR4IGZvciBlcXVhbGl0eVxuICAgIGZvciAobGV0IHR4SGFzaCBvZiBPYmplY3Qua2V5cyh0eHNPdXRwdXRzMSkpIHtcbiAgICAgIGxldCB0eE91dHB1dHMxID0gdHhzT3V0cHV0czFbdHhIYXNoXTtcbiAgICAgIGxldCB0eE91dHB1dHMyID0gdHhzT3V0cHV0czJbdHhIYXNoXTtcbiAgICAgIGFzc2VydC5lcXVhbCh0eE91dHB1dHMyLmxlbmd0aCwgdHhPdXRwdXRzMS5sZW5ndGgpO1xuICAgICAgXG4gICAgICAvLyBub3JtYWxpemUgYW5kIGNvbXBhcmUgb3V0cHV0c1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0eE91dHB1dHMxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBvdXRwdXQxID0gdHhPdXRwdXRzMVtpXTtcbiAgICAgICAgbGV0IG91dHB1dDIgPSB0eE91dHB1dHMyW2ldO1xuICAgICAgICBhc3NlcnQuZXF1YWwob3V0cHV0Mi5nZXRUeCgpLmdldEhhc2goKSwgb3V0cHV0MS5nZXRUeCgpLmdldEhhc2goKSk7XG4gICAgICAgIGFzc2VydChHZW5VdGlscy5lcXVhbHMob3V0cHV0Mi50b0pzb24oKSwgb3V0cHV0MS50b0pzb24oKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4iXSwibWFwcGluZ3MiOiJ5TEFBQSxJQUFBQSxPQUFBLEdBQUFDLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBQyxVQUFBLEdBQUFGLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBRSxNQUFBLEdBQUFGLE9BQUE7Ozs7Ozs7QUFPQTtBQUNBO0FBQ0E7QUFDZSxNQUFNRyxt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