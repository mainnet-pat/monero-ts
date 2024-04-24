import WalletTxTracker from "./WalletTxTracker";
import { MoneroRpcConnection, MoneroDaemonRpc, MoneroWalletRpc, MoneroWalletFull, MoneroWalletKeys } from "../../../index";
/**
 * Collection of test utilities and configurations.
 */
export default class TestUtils {
    static daemonRpc: MoneroDaemonRpc;
    static walletRpc: MoneroWalletRpc;
    static walletFull: MoneroWalletFull;
    static walletKeys: MoneroWalletKeys;
    static PROXY_TO_WORKER: boolean;
    static MONERO_BINS_DIR: string;
    static SYNC_PERIOD_IN_MS: number;
    static OFFLINE_SERVER_URI: string;
    static AUTO_CONNECT_TIMEOUT_MS: number;
    static NETWORK_TYPE: number;
    static SEED: string;
    static ADDRESS: string;
    static FIRST_RECEIVE_HEIGHT: number;
    static WALLET_NAME: string;
    static WALLET_PASSWORD: string;
    static TEST_WALLETS_DIR: string;
    static WALLET_FULL_PATH: string;
    static WALLET_RPC_PORT_START: number;
    static WALLET_PORT_OFFSETS: {};
    static WALLET_RPC_LOCAL_PATH: string;
    static WALLET_RPC_LOCAL_WALLET_DIR: string;
    static WALLET_RPC_ACCESS_CONTROL_ORIGINS: string;
    static MAX_FEE: bigint;
    static WALLET_TX_TRACKER: WalletTxTracker;
    static WALLET_RPC_CONFIG: {
        uri: string;
        username: string;
        password: string;
        rejectUnauthorized: boolean;
    };
    static DAEMON_LOCAL_PATH: string;
    static DAEMON_RPC_CONFIG: {
        uri: string;
        username: string;
        password: string;
        rejectUnauthorized: boolean;
    };
    /**
     * Get a default file system.  Uses an in-memory file system if running in the browser.
     *
     * @return {any} nodejs-compatible file system
     */
    static getDefaultFs(): Promise<any>;
    /**
     * Get a singleton daemon RPC instance shared among tests.
     *
     * @return {Promise<MoneroDaemonRpc>} a daemon RPC instance
     */
    static getDaemonRpc(): Promise<MoneroDaemonRpc>;
    /**
     * Get a singleton instance of a monerod client.
     */
    static getDaemonRpcConnection(): MoneroRpcConnection;
    /**
     * Get a singleton instance of a monero-wallet-rpc client.
     *
     * @return {Promise<MoneroWalletRpc>} a wallet RPC instance
     */
    static getWalletRpc(): Promise<MoneroWalletRpc>;
    /**
     * Create a monero-wallet-rpc process bound to the next available port.
     *
     * @param {boolean} [offline] - wallet is started in offline mode (default false)
     * @return {Promise<MoneroWalletRpc>} - client connected to an internal monero-wallet-rpc instance
     */
    static startWalletRpcProcess(offline?: boolean): Promise<MoneroWalletRpc>;
    /**
     * Stop a monero-wallet-rpc process and release its port.
     *
     * @param {MoneroWalletRpc} walletRpc - wallet created with internal monero-wallet-rpc process
     */
    static stopWalletRpcProcess(walletRpc: any): Promise<void>;
    /**
     * Get a singleton instance of a wallet supported by WebAssembly bindings to monero-project's wallet2.
     *
     * @return {MoneroWalletFull} a full wallet instance
     */
    static getWalletFull(): Promise<MoneroWalletFull>;
    /**
     * Get a singleton keys-only wallet instance shared among tests.
     *
     * @return {MoneroWalletKeys} a keys-only wallet instance
     */
    static getWalletKeys(): Promise<MoneroWalletKeys>;
    /**
     * Creates a new wallet considered to be "ground truth".
     *
     * @param networkType - ground truth wallet's network type
     * @param seed - ground truth wallet's seed
     * @param startHeight - height to start syncing from
     * @param restoreHeight - ground truth wallet's restore height
     * @return {MoneroWalletFull} the created wallet
     */
    static createWalletGroundTruth(networkType: any, seed: any, startHeight: any, restoreHeight: any): Promise<MoneroWalletFull>;
    static testUnsignedBigInt(num: any, nonZero?: any): void;
    static getExternalWalletAddress(): Promise<string>;
    static txsMergeable(tx1: any, tx2: any): boolean;
}
