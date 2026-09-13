"use client";
import { useEffect, useRef, useState } from "react";

type GooglePlayTransaction={products?:Array<{id?:string;productId?:string}>;purchaseToken?:string;transaction?:{purchaseToken?:string;receipt?:string};finish:()=>void};
type GooglePlayProduct={id:string;coins:number};
export const GOOGLE_PLAY_PRODUCTS:GooglePlayProduct[]=[{id:"coins_100",coins:100},{id:"coins_500",coins:500},{id:"coins_1000",coins:1000},{id:"coins_5000",coins:5000},{id:"coins_10000",coins:10000},{id:"coins_50000",coins:50000},{id:"coins_100000",coins:100000}];

export function GooglePlayWallet(){
 const [message,setMessage]=useState("");
 const buyRef=useRef<((productId:string)=>Promise<void>)|null>(null);
 const queueRef=useRef<{productId:string;hostId?:string;hostName?:string}|null>(null);
 useEffect(()=>{let mounted=true;async function setup(){try{const {Capacitor}=await import("@capacitor/core");if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=="android")return;const {store,ProductType,Platform}=await import("capacitor-plugin-cdv-purchase");GOOGLE_PLAY_PRODUCTS.forEach(p=>store.register({id:p.id,type:ProductType.CONSUMABLE,platform:Platform.GOOGLE_PLAY}));
 async function buy(productId:string){const product=store.get(productId);if(!product)throw new Error("This Google Play product is not available.");const offer=product.getOffer();if(!offer)throw new Error("This product is temporarily unavailable.");if(mounted)setMessage("Opening Google Play…");const error=await offer.order();if(error)throw new Error(error.message||"Purchase could not be started.");}
 buyRef.current=buy;
 store.when().approved(async(transaction:GooglePlayTransaction)=>{try{const productId=transaction.products?.[0]?.id??transaction.products?.[0]?.productId;let token:string|undefined;const td=transaction.transaction;if(typeof transaction.purchaseToken==="string")token=transaction.purchaseToken;else if(typeof td?.purchaseToken==="string")token=td.purchaseToken;else if(typeof td?.receipt==="string"){try{const parsed=JSON.parse(td.receipt);if(typeof parsed?.purchaseToken==="string")token=parsed.purchaseToken}catch{}}
 if(!productId||!token)throw new Error("Google Play purchase token was not found.");const response=await fetch("/api/google-play/purchase",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,purchaseToken:token})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Purchase verification failed.");const queued=queueRef.current;queueRef.current=null;if(mounted){window.dispatchEvent(new CustomEvent("ishqiya-wallet-refresh"));window.dispatchEvent(new CustomEvent("ishqiya-purchase-complete",{detail:{productId,coins:Number(result.coins||0),hostId:queued?.hostId,hostName:queued?.hostName}}));setMessage("");}transaction.finish()}catch(error){console.error(error);if(mounted)setMessage(error instanceof Error?error.message:"Purchase verification failed.")}});
 await store.initialize();const queued=queueRef.current;if(queued){queueRef.current=null;await buy(queued.productId)}}catch(error){console.error("Google Play billing unavailable:",error);if(mounted)setMessage("Google Play billing could not be initialized on this Android device.")}}
 function handle(event:Event){const d=(event as CustomEvent<{productId?:string;hostId?:string;hostName?:string}>).detail;if(!d?.productId)return;if(buyRef.current){queueRef.current={productId:d.productId,hostId:d.hostId,hostName:d.hostName};void buyRef.current(d.productId).catch(error=>mounted&&setMessage(error instanceof Error?error.message:"Google Play purchase failed."))}else{queueRef.current={productId:d.productId,hostId:d.hostId,hostName:d.hostName};setMessage("Preparing Google Play…")}}
 window.addEventListener("ishqiya-buy-coins",handle);void setup();return()=>{mounted=false;buyRef.current=null;queueRef.current=null;window.removeEventListener("ishqiya-buy-coins",handle)}} ,[]);
 return message?<p className="muted" role="status">{message}</p>:null;
}
