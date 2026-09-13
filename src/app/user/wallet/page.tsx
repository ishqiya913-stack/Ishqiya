import { AppShell } from "@/components/app-shell";
import { WalletPanel } from "@/components/wallet-panel";
import { WalletHistory } from "@/components/wallet-history";
import { GooglePlayWallet } from "@/components/google-play-wallet";

export default function WalletPage() {
  return <AppShell mode="user" current="wallet">
    <span className="eyebrow">Your account</span>
    <h1 className="serif">Wallet</h1>
    <p className="muted">Your balance, coin packages, call history and transaction history.</p>
    <GooglePlayWallet />
    <WalletPanel />
    <WalletHistory />
  </AppShell>;
}
