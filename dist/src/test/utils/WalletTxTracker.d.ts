/**
 * Tracks wallets which are in sync with the tx pool and therefore whose txs in the pool
 * do not need to be waited on for up-to-date pool information e.g. to create txs.
 *
 * This is only necessary because txs relayed outside wallets are not fully incorporated
 * into the wallet state until confirmed.
 *
 * TODO monero-project: sync txs relayed outside wallet so this class is unecessary
 */
export default class WalletTxTracker {
    clearedWallets: Set<any>;
    constructor();
    reset(): void;
    /**
     * Waits for transactions in the pool belonging to the given wallets to clear.
     *
     * @param wallets have transactions to wait on if in the pool
     */
    waitForWalletTxsToClearPool(wallets: any): Promise<void>;
    waitForUnlockedBalance(wallet: any, accountIndex: any, subaddressIndex: any, minAmount: any): Promise<any>;
}
