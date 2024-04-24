import TestMoneroWalletCommon from "./TestMoneroWalletCommon";
import { MoneroWalletConfig, MoneroWalletRpc } from "../../index";
/**
 * Tests the Monero Wallet RPC client and server.
 */
export default class TestMoneroWalletRpc extends TestMoneroWalletCommon {
    constructor(testConfig: any);
    beforeAll(): Promise<void>;
    beforeEach(currentTest: any): Promise<void>;
    afterAll(): Promise<void>;
    afterEach(currentTest: any): Promise<void>;
    getTestWallet(): Promise<MoneroWalletRpc>;
    getTestDaemon(): Promise<import("../main/ts/daemon/MoneroDaemonRpc").default>;
    openWallet(config: any): Promise<MoneroWalletRpc>;
    createWallet(config: Partial<MoneroWalletConfig>): Promise<MoneroWalletRpc>;
    closeWallet(wallet: any, save?: any): Promise<void>;
    getSeedLanguages(): Promise<string[]>;
    runTests(): void;
    testTxWallet(tx: any, ctx: any): Promise<void>;
    testGetSubaddressAddressOutOfRange(): Promise<void>;
    testInvalidAddressError(err: any): void;
    testInvalidTxHashError(err: any): void;
    testInvalidTxKeyError(err: any): void;
    testInvalidSignatureError(err: any): void;
    testNoSubaddressError(err: any): void;
    testSignatureHeaderCheckError(err: any): void;
    protected testWalletRpc(testConfig: any): void;
}
