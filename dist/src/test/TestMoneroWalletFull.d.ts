import TestMoneroWalletCommon from "./TestMoneroWalletCommon";
import { MoneroWalletConfig, MoneroWalletFull } from "../../index";
/**
 * Tests a Monero wallet using WebAssembly to bridge to monero-project's wallet2.
 */
export default class TestMoneroWalletFull extends TestMoneroWalletCommon {
    static FULL_TESTS_RUN: boolean;
    constructor(testConfig: any);
    beforeAll(): Promise<void>;
    beforeEach(currentTest: any): Promise<void>;
    afterAll(): Promise<void>;
    afterEach(currentTest: any): Promise<void>;
    getTestWallet(): Promise<MoneroWalletFull>;
    getTestDaemon(): Promise<import("../main/ts/daemon/MoneroDaemonRpc").default>;
    openWallet(config: Partial<MoneroWalletConfig>, startSyncing?: any): Promise<MoneroWalletFull>;
    createWallet(config?: Partial<MoneroWalletConfig>, startSyncing?: any): Promise<MoneroWalletFull>;
    closeWallet(wallet: any, save?: any): Promise<void>;
    getSeedLanguages(): Promise<string[]>;
    runTests(): void;
    protected testWalletFull(): void;
    protected static getRandomWalletPath(): string;
    protected static testWalletEqualityOnChain(wallet1: any, wallet2: any): Promise<void>;
}
