import { MoneroWallet, MoneroDaemon } from "../../index";
/**
 * Tests a Monero daemon.
 */
export default class TestMoneroDaemonRpc {
    static readonly MAX_REQ_SIZE = "3000000";
    static readonly DEFAULT_ID = "0000000000000000000000000000000000000000000000000000000000000000";
    static readonly NUM_HEADERS_PER_REQ = 750;
    testConfig: any;
    wallet: MoneroWallet;
    daemon: MoneroDaemon;
    constructor(testConfig: any);
    /**
     * Run all tests.
     */
    runTests(): void;
}
