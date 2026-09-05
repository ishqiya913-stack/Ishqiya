import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-page">
      <div className="landing-shell">
        <header className="landing-header">
          <Link href="/" className="landing-brand" aria-label="Ishqiya home">
            <span className="landing-brand-mark" aria-hidden="true">♥</span>
            <span>
              <span className="landing-wordmark">ISHQIYA</span>
              <span className="landing-tagline">TERE ISHQ KA JUNOON</span>
            </span>
          </Link>

          <Link href="/auth/user/sign-in" className="landing-sign-in">
            Sign In
          </Link>
        </header>

        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">A little closer to something real</p>
            <h1>Find someone who feels like <em>home.</em></h1>
            <p className="landing-intro">
              Meet people who make conversation feel effortless, and let a
              meaningful connection unfold at its own pace.
            </p>

            <div className="landing-points" aria-label="Ishqiya highlights">
              <p><span aria-hidden="true">♥</span> Enjoy 1-on-1 video chat with ❤️ Girls.</p>
              <p><span aria-hidden="true">✦</span> Join as a Host &amp; start earning.</p>
            </div>

            <div className="landing-actions">
              <Link href="/auth/user/sign-up" className="landing-button landing-button-primary">
                Join as a User
                <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/auth/host/sign-up" className="landing-button landing-button-secondary">
                Join as a Host
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>

          <div className="landing-hero-art">
            <div className="landing-image-frame">
              <Image
                src="/images/landing-model.png"
                alt="Ishqiya connections"
                fill
                priority
                sizes="(max-width: 700px) 88vw, (max-width: 1100px) 43vw, 500px"
                className="object-contain object-center"
              />
            </div>
            <p className="landing-image-note"><span>ISHQIYA</span> / connection, with intention</p>
          </div>
        </section>

        <section className="landing-features" aria-label="Ways to connect">
          <article className="landing-feature-card">
            <div className="landing-feature-topline"><span>01</span><span>FOR YOU</span></div>
            <h2>Discover your kind of connection</h2>
            <p>Enjoy 1-on-1 video chat with ❤️ Girls.</p>
            <span className="landing-feature-mark" aria-hidden="true">↗</span>
          </article>
          <article className="landing-feature-card landing-feature-card-dark">
            <div className="landing-feature-topline"><span>02</span><span>FOR HOSTS</span></div>
            <h2>Be someone worth talking to</h2>
            <p>Join as a Host &amp; start earning.</p>
            <span className="landing-feature-mark" aria-hidden="true">↗</span>
          </article>
        </section>

        <footer className="landing-footer">
          <span>ISHQIYA</span>
          <span>TERE ISHQ KA JUNOON</span>
          <span>Made for meaningful conversations</span>
        </footer>
      </div>
    </main>
  );
}
