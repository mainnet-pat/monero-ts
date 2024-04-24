import TestMoneroWalletCommon from "./TestMoneroWalletCommon";
import { MoneroWalletKeys } from "../../index";
/**
 * Tests the implementation of MoneroWallet which only manages keys using WebAssembly.
 */
export default class TestMoneroWalletKeys extends TestMoneroWalletCommon {
    constructor(config: any);
    beforeAll(): Promise<void>;
    beforeEach(currentTest: any): Promise<void>;
    afterAll(): Promise<void>;
    afterEach(currentTest: any): Promise<void>;
    getTestWallet(): Promise<MoneroWalletKeys>;
    getTestDaemon(): Promise<import("../main/ts/daemon/MoneroDaemonRpc").default>;
    openWallet(config?: any): Promise<MoneroWalletKeys>;
    createWallet(config: any): Promise<MoneroWalletKeys>;
    closeWallet(wallet: any, save: any): Promise<void>;
    getSeedLanguages(): Promise<string[]>;
    runTests(): void;
    protected testWalletKeys(): void;
}
