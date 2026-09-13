/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Loading } from "@/components/ui";
import { CoinPurchaseFlow } from "@/components/coin-purchase-flow";
import { GooglePlayWallet } from "@/components/google-play-wallet";

type Profile={host_id:string;display_name:string;headline:string|null;bio:string|null;city:string|null;age:number|null;avatar_path:string|null};
export function DiscoverBrowser(){
 const router=useRouter();const [profiles,setProfiles]=useState<Profile[]>([]);const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [paymentHost,setPaymentHost]=useState<Profile|null>(null);const [processing,setProcessing]=useState(false);
 async function load(){setLoading(true);setMessage("");try{const r=await fetch("/api/discover?limit=20&offset=0",{cache:"no-store"});const x=await r.json();if(!r.ok)setMessage(x.error||"Discovery could not be loaded.");setProfiles(x.profiles||[])}catch{setProfiles([]);setMessage("Discovery could not reach the server.")}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function startCall(hostId:string){setProcessing(true);try{const r=await fetch("/api/video/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hostId})});const x=await r.json();if(!r.ok||!x.matchId)throw new Error(x.error||"Video call could not be started.");setPaymentHost(null);router.push(`/user/match/${x.matchId}`)}catch(e){setMessage(e instanceof Error?e.message:"Video call could not be started.")}finally{setProcessing(false)}}
 async function act(targetId:string,action:"like"|"pass"){const r=await fetch("/api/discover/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({targetId,action})});const x=await r.json();if(!r.ok){setMessage(x.error||"That action could not be saved.");return}setProfiles(c=>c.filter(p=>p.host_id!==targetId))}
 if(loading&&profiles.length===0)return <Loading label="Loading Hosts"/>;
 if(!loading&&profiles.length===0)return <EmptyState title="No Hosts are available yet" message="Approved, active Hosts will appear here when they are ready to meet."/>;
 return <>
   <GooglePlayWallet/>
   {message&&<p role="status" className="muted" style={{textAlign:"center",marginBottom:"1rem"}}>{message}</p>}
   <div className="discover-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),360px))",justifyContent:"center",gap:"1rem",width:"100%"}}>
    {profiles.map(profile=><article className="discover-card" key={profile.host_id} style={{width:"100%",maxWidth:360,margin:0,overflow:"hidden",borderRadius:24,background:"var(--surface)",border:"1px solid var(--line)"}}>
      <div className="discover-photo" role="img" aria-label={`${profile.display_name} profile photo`} style={{aspectRatio:"4 / 5",width:"100%",maxHeight:460,overflow:"hidden",position:"relative",background:"var(--blush)",display:"grid",placeItems:"center"}}>{profile.avatar_path?<img src={profile.avatar_path} alt={`${profile.display_name} profile`} loading="lazy" onError={e=>{e.currentTarget.style.display="none"}} style={{display:"block",width:"100%",height:"100%",objectFit:"contain",objectPosition:"center"}}/>:<div className="photo-placeholder" style={{height:"100%",minHeight:0}}>Profile photo</div>}</div>
      <div className="discover-info" style={{padding:"1.05rem 1.1rem 1.15rem"}}><div style={{alignItems:"flex-start",display:"flex",justifyContent:"space-between",gap:".8rem"}}><div style={{minWidth:0}}><h2 style={{margin:0,fontSize:"1.15rem"}}>{profile.display_name}{profile.age?`, ${profile.age}`:""}</h2>{profile.city&&<p style={{margin:".3rem 0 0",color:"var(--muted)"}}>{profile.city}</p>}</div><span aria-label="Available" title="Available" style={{width:9,height:9,marginTop:7,borderRadius:"50%",background:"#62c58a",flex:"0 0 auto"}}/></div><p style={{color:"var(--muted)",lineHeight:1.5,margin:".65rem 0 .9rem",minHeight:"2.5rem"}}>{profile.headline||profile.bio||"A great conversation awaits."}</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".55rem",marginBottom:".55rem"}}><Button type="button" variant="danger" onClick={()=>void act(profile.host_id,"pass")}>✕ Pass</Button><Button type="button" onClick={()=>void act(profile.host_id,"like")}>♥ Like</Button></div><Button type="button" onClick={()=>setPaymentHost(profile)} style={{width:"100%"}}>◉ Video Call</Button></div>
    </article>)}
   </div>
   {paymentHost&&<CoinPurchaseFlow hostId={paymentHost.host_id} hostName={paymentHost.display_name} onClose={()=>setPaymentHost(null)} onVerified={()=>void startCall(paymentHost.host_id)}/>} 
   {processing&&<p className="muted" role="status" style={{textAlign:"center"}}>Starting your call…</p>}
 </>;
}
