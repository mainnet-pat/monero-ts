// npm run test -- --grep "Axios"

import { createWalletFull, MoneroNetworkType, MoneroWalletListener } from "../..";
import { connectToWalletRpc } from "../..";

describe("Axios", function() {
  it("can connect to wallet rpc", async function() {
    try {
      let walletFull = await createWalletFull({
        password: "supersecretpassword123",
        proxyToWorker: false,
        networkType: MoneroNetworkType.TESTNET,
        seed: "pawnshop eccentric governing onward towel launching river selfish nucleus axis guarded cactus glide humid irate decay jaded womanly italics industrial estate neither huge jewels guarded",
        restoreHeight: 150,
        server: {
          uri: "http://localhost:28081",
          username: "superuser",
          password: "abctesting123"
        }
      });
      await walletFull.sync(new class extends MoneroWalletListener {
        async onSyncProgress(height: number, startHeight: number, endHeight: number, percentDone: number, message: string) {
          // feed a progress bar?
        }
      });

      // synchronize in the background
      await walletFull.startSyncing(5000);

      let walletRpc = await connectToWalletRpc({
        server: {
          uri: "http://localhost:28084",
          username: "rpc_user",
          password: "abc123"

          // username: "",
          // password: "abc123"
        }
      }, "rpc_user", "abc123");
      await walletRpc.openWallet("test_wallet_1", "supersecretpassword123");
      await walletRpc.sync();
      await walletRpc.getBalance();
    } catch (e) {
      console.trace(e)
    }
  });
});
