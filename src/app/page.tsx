import Image from "next/image";
import Link from "next/link";
import { FastLoginButton } from "@/components/fast-login-button";
import { getSiteContent } from "@/lib/admin-content";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getSiteContent();
  return <main className="landing-page"><div className="landing-shell"><header className="landing-header"><Link href="/" className="landing-brand" aria-label="Ishqiya home"><span className="landing-brand-mark" aria-hidden="true">♥</span><span><span className="landing-wordmark">ISHQIYA</span><span className="landing-tagline">{content.brand_tagline}</span></span></Link><Link href="/auth/host/sign-up" className="landing-sign-in">Join as Host</Link></header>
    <section className="landing-hero"><div className="landing-hero-copy"><p className="landing-eyebrow">{content.hero_eyebrow}</p><h1>{content.hero_title}</h1><p className="landing-intro">{content.hero_intro}</p><div className="landing-points" aria-label="Ishqiya highlights"><p><span aria-hidden="true">♥</span> {content.hero_feature_1}</p><p><span aria-hidden="true">✦</span> {content.hero_feature_2}</p></div><div className="landing-actions"><FastLoginButton /></div></div><div className="landing-hero-art"><div className="landing-image-frame"><Image src="/images/landing-model.png" alt="Ishqiya connections" fill priority sizes="(max-width: 700px) 88vw, (max-width: 1100px) 43vw, 500px" className="object-contain object-center" /></div><p className="landing-image-note"><span>ISHQIYA</span> / connection, with intention</p></div></section>
    <section className="landing-features" aria-label="Ways to connect"><article className="landing-feature-card"><div className="landing-feature-topline"><span>01</span><span>FOR YOU</span></div><h2>Discover your kind of connection</h2><p>{content.hero_feature_1}</p><span className="landing-feature-mark" aria-hidden="true">↗</span></article><article className="landing-feature-card landing-feature-card-dark"><div className="landing-feature-topline"><span>02</span><span>FOR HOSTS</span></div><h2>Be someone worth talking to</h2><p>{content.hero_feature_2}</p><span className="landing-feature-mark" aria-hidden="true">↗</span></article></section>
    <footer className="landing-footer"><span>ISHQIYA</span><span>{content.brand_tagline}</span><span>Made for meaningful conversations</span></footer>
  </div></main>;
}
