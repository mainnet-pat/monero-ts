import { MoneroWalletListener } from "../../../index";
/**
 * Print sync progress every X blocks.
 */
export default class WalletSyncPrinter extends MoneroWalletListener {
    nextIncrement: number;
    syncResolution: number;
    constructor(syncResolution?: number);
    onSyncProgress(height: any, startHeight: any, endHeight: any, percentDone: any, message: any): Promise<void>;
}
