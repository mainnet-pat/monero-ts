/**
 * Utilities to deep compare wallets.
 */
export default class WalletEqualityUtils {
    /**
     * Compare the keys of two wallets.
     */
    static testWalletEqualityKeys(w1: any, w2: any): Promise<void>;
    /**
     * Compares two wallets for equality using only on-chain data.
     *
     * This test will sync the two wallets until their height is equal to guarantee equal state.
     *
     * @param w1 a wallet to compare
     * @param w2 a wallet to compare
     */
    static testWalletEqualityOnChain(w1: any, w2: any): Promise<void>;
    protected static testAccountsEqualOnChain(accounts1: any, accounts2: any): Promise<void>;
    protected static testAccountEqualOnChain(account1: any, account2: any): Promise<void>;
    protected static testSubaddressesEqualOnChainAux(subaddresses1: any, subaddresses2: any): Promise<void>;
    static testSubaddressesEqualOnChain(subaddress1: any, subaddress2: any): Promise<void>;
    protected static testTxWalletsEqualOnChain(txs1: any, txs2: any): Promise<void>;
    protected static transferCachedInfo(src: any, tgt: any): Promise<void>;
    protected static testTransfersEqualOnChain(transfers1: any, transfers2: any): Promise<void>;
    protected static testOutputWalletsEqualOnChain(outputs1: any, outputs2: any): Promise<void>;
}
