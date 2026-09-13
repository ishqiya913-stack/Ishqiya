"use client";
import { useEffect, useState } from "react";
import { Loading } from "@/components/ui";
import { CoinPurchaseFlow } from "@/components/coin-purchase-flow";

type Package={id:string;coins:number;price_rupees:number};
export function WalletPanel(){
 const [balance,setBalance]=useState(0),[packages,setPackages]=useState<Package[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[open,setOpen]=useState(false),[initialPackageId,setInitialPackageId]=useState<string|undefined>();
 useEffect(()=>{let mounted=true;async function load(){try{const r=await fetch("/api/wallet",{cache:"no-store"});const x=await r.json();if(!mounted)return;if(!r.ok)throw new Error(x.error||"Wallet unavailable.");setBalance(Number(x.balance||0));setPackages(x.packages||[])}catch(e){if(mounted)setError(e instanceof Error?e.message:"Wallet unavailable.")}finally{if(mounted)setLoading(false)}}void load();const refresh=()=>void load();window.addEventListener("ishqiya-wallet-refresh",refresh);return()=>{mounted=false;window.removeEventListener("ishqiya-wallet-refresh",refresh)}},[]);
 if(loading)return <Loading label="Loading wallet"/>;
 if(error)return <p className="muted" role="alert">{error}</p>;
 return <div className="wallet-panel" style={{display:"grid",gap:"1rem"}}>
  <section className="choice-card" style={{textAlign:"center"}}><span className="eyebrow">Available coins</span><strong style={{display:"block",fontSize:"2.2rem",marginTop:".25rem"}}>{balance.toLocaleString("en-IN")}</strong><p className="muted">Your current verified coin balance.</p></section>
  <section><span className="eyebrow">Coin packages</span><h2 className="serif" style={{margin:".25rem 0 1rem"}}>Buy Coins</h2><div className="choice-grid">{packages.map(p=><button key={p.id} type="button" className="choice-card" onClick={()=>{setInitialPackageId(p.id);setOpen(true)}} style={{textAlign:"center"}}><strong>{p.coins.toLocaleString("en-IN")} coins</strong><p>₹{p.price_rupees.toLocaleString("en-IN")}</p></button>)}</div></section>
  <CoinPurchaseFlow open={open} initialPackageId={initialPackageId} onClose={()=>setOpen(false)} />
 </div>;
}
