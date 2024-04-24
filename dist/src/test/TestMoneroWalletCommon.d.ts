import { MoneroDaemonRpc, MoneroWallet, MoneroWalletConfig, MoneroMultisigInfo, MoneroTxQuery, MoneroTransfer, MoneroTransferQuery, MoneroOutputQuery, MoneroOutputWallet, MoneroTxWallet } from "../../index";
/**
 * Test a wallet for common functionality.
 */
export default class TestMoneroWalletCommon {
    testConfig: any;
    wallet: MoneroWallet;
    daemon: MoneroDaemonRpc;
    /**
     * Construct the tester.
     *
     * @param {object} testConfig - test configuration
     */
    constructor(testConfig: any);
    /**
     * Called before all wallet tests.
     */
    beforeAll(): Promise<void>;
    /**
     * Called before each wallet test.
     *
     @param {object} currentTest - invoked with Mocha current test
     */
    beforeEach(currentTest: any): Promise<void>;
    /**
     * Called after all wallet tests.
     */
    afterAll(): Promise<void>;
    /**
     * Called after each wallet test.
     *
     @param {object} currentTest - invoked with Mocha current test
     */
    afterEach(currentTest: any): Promise<void>;
    /**
     * Get the daemon to test.
     *
     * @return the daemon to test
     */
    getTestDaemon(): Promise<MoneroDaemonRpc>;
    /**
     * Get the main wallet to test.
     *
     * @return {Promise<MoneroWallet>} the wallet to test
     */
    getTestWallet(): Promise<MoneroWallet>;
    /**
     * Open a test wallet with default configuration for each wallet type.
     *
     * @param config - configures the wallet to open
     * @return MoneroWallet is the opened wallet
     */
    openWallet(config: any): Promise<MoneroWallet>;
    /**
     * Create a test wallet with default configuration for each wallet type.
     *
     * @param [config] - configures the wallet to create
     * @return {Promise<MoneroWallet>} is the created wallet
     */
    createWallet(config?: Partial<MoneroWalletConfig>): Promise<MoneroWallet>;
    /**
     * Close a test wallet with customization for each wallet type.
     *
     * @param {MoneroWallet} wallet - the wallet to close
     * @param {boolean} [save] - whether or not to save the wallet
     * @return {Promise<void>}
     */
    closeWallet(wallet: any, save?: any): Promise<void>;
    /**
     * Get the wallet's supported languages for the seed phrase.  This is an
     * instance method for wallet rpc and a static utility for other wallets.
     *
     * @return {Promise<string[]>} the wallet's supported languages
     */
    getSeedLanguages(): Promise<string[]>;
    runCommonTests(testConfig?: any): void;
    getSubaddressesWithBalance(): Promise<any[]>;
    getSubaddressesWithUnlockedBalance(): Promise<any[]>;
    protected testGetSubaddressAddressOutOfRange(): Promise<void>;
    /**
     * Fetches and tests transactions according to the given query.
     *
     * TODO: convert query to query object and ensure each tx passes filter, same with getAndTestTransfer, getAndTestOutputs
     */
    protected getAndTestTxs(wallet: any, query: Partial<MoneroTxQuery> | undefined, isExpected?: any): Promise<MoneroTxWallet[]>;
    /**
     * Fetches and tests transfers according to the given query.
     */
    protected getAndTestTransfers(wallet: MoneroWallet, query: Partial<MoneroTransferQuery>, isExpected?: any): Promise<MoneroTransfer[]>;
    /**
     * Fetches and tests outputs according to the given query.
     */
    protected getAndTestOutputs(wallet: MoneroWallet, query: Partial<MoneroOutputQuery>, isExpected?: any): Promise<MoneroOutputWallet[]>;
    protected testTxsWallet(txs: MoneroTxWallet[], ctx: any): Promise<void>;
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
    protected testTxWallet(tx: MoneroTxWallet, ctx?: any): Promise<void>;
    protected testTxWalletCopy(tx: any, ctx: any): Promise<void>;
    protected testMultisig(M: any, N: any, testTx: any): Promise<void>;
    protected testMultisigParticipants(participants: any, M: any, N: any, testTx: any): Promise<void>;
    protected synchronizeMultisigParticipants(wallets: any): Promise<void>;
    protected testMultisigInfo(info: MoneroMultisigInfo, M: any, N: any): Promise<void>;
    protected testViewOnlyAndOfflineWallets(viewOnlyWallet: MoneroWallet, offlineWallet: MoneroWallet): Promise<void>;
    protected testInvalidAddressError(err: any): void;
    protected testInvalidTxHashError(err: any): void;
    protected testInvalidTxKeyError(err: any): void;
    protected testInvalidSignatureError(err: any): void;
    protected testNoSubaddressError(err: any): void;
    protected testSignatureHeaderCheckError(err: any): void;
}
