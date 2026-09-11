"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BackControl } from "@/components/navigation";
import { Button, Input } from "@/components/ui";

type Mode = "user" | "host";
type Action = "sign in" | "sign up";

const sectionStyle: React.CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 18,
  padding: "1.15rem",
  margin: 0,
  display: "grid",
  gap: "1rem",
};

const fieldStyle: React.CSSProperties = { display: "grid", gap: ".45rem", minWidth: 0 };
const labelStyle: React.CSSProperties = { fontSize: ".82rem", fontWeight: 800, color: "var(--cream)" };
const inputStyle: React.CSSProperties = { width: "100%", minHeight: 48, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface-raised)", color: "var(--cream)", padding: ".75rem .85rem" };

export function AuthScreen({ mode, action }: { mode: Mode; action: Action }) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => (supabaseRef.current ??= createClient());
  const isSignUp = action === "sign up";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const detailsComplete = Boolean(legalName.trim() && phone.trim() && dateOfBirth);

  function updatePhoto(index: number, file: File | null) {
    if (file && (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      setMessage("Each photo must be an image smaller than 10 MB.");
      return;
    }
    setPhotoFiles((current) => current.map((item, i) => (i === index ? file : item)));
    setPhotoPreviews((current) => {
      if (current[index]) URL.revokeObjectURL(current[index]!);
      return current.map((item, i) => (i === index ? (file ? URL.createObjectURL(file) : null) : item));
    });
  }

  useEffect(() => () => photoPreviews.forEach((preview) => preview && URL.revokeObjectURL(preview)), [photoPreviews]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!email.trim() || !password) return setMessage("Email and password are required.");
    if (isSignUp && password !== confirmPassword) return setMessage("Passwords do not match.");
    if (isSignUp && mode === "host") {
      if (!detailsComplete) return setMessage("Please complete your Host details first.");
      const dob = new Date(`${dateOfBirth}T00:00:00`);
      if (Number.isNaN(dob.getTime())) return setMessage("Please enter a valid date of birth.");
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) return setMessage("You must be 18 or older to register as a Host.");
      if (photoFiles.some((file) => !file)) return setMessage("All 3 required Host photos must be uploaded.");
      if (!agreementAccepted) return setMessage("You must accept the Ishqiya Host Agreement.");
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const signupData = new FormData();
        signupData.set("email", email.trim().toLowerCase());
        signupData.set("password", password);
        if (mode === "host") {
          signupData.set("legal_name", legalName.trim());
          signupData.set("phone", phone.trim());
          signupData.set("date_of_birth", dateOfBirth);
          signupData.set("agreement_accepted", "true");
          signupData.set("agreement_version", "1.0");
          photoFiles.forEach((file, index) => file && signupData.set(`photo-${index + 1}`, file));
        }
        const response = await fetch(`/api/auth/${mode}/sign-up`, { method: "POST", body: signupData });
        const result = await response.json() as { error?: string; user?: { id: string }; session?: { access_token: string; refresh_token: string } | null };
        if (!response.ok || !result.user) throw new Error(result.error || "Account creation failed.");
        if (result.session) {
          const { error } = await getSupabase().auth.setSession(result.session);
          if (error) throw error;
          router.push(mode === "host" ? "/host/profile" : "/user/discover");
          router.refresh();
          return;
        }
        setMessage(mode === "host" ? "Host account created. Check your email to verify your account. Your 3 photos will require verification before approval." : "User account created. Check your email to verify your account.");
        return;
      }
      const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      if (!data.user) throw new Error("Sign in failed.");
      const { data: profile, error: profileError } = await getSupabase().from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (profileError || !profile || profile.role !== mode) {
        await getSupabase().auth.signOut();
        throw new Error(`This account is not a ${mode} account. Use the correct Ishqiya sign-in page.`);
      }
      router.push(mode === "host" ? "/host/chat" : "/user/discover");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-flow-nav"><BackControl /></div>
      <div className="auth-layout">
        <aside className="auth-aside">
          <div className="brand"><span className="brand-mark">♥</span><span style={{ color: "var(--cream)" }}>ISHQIYA</span></div>
          <h1 className="serif">Every feeling deserves a beginning.</h1>
          <p>{mode === "user" ? "Enter a softer space to discover genuine connection." : "A considered space for Hosts to meet every conversation with presence."}</p>
        </aside>
        <section className="form-card">
          <span className="eyebrow">{mode} access</span>
          <h2>{isSignUp ? "Begin your story" : "Welcome back"}</h2>
          <p className="muted">{isSignUp ? `Create your Ishqiya ${mode} account with your email.` : "Sign in to continue to your Ishqiya space."}</p>
          <form onSubmit={submit}>
            <Input id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input id="password" label="Password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {isSignUp && <Input id="confirm-password" label="Confirm Password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />}

            {isSignUp && mode === "host" && (
              <div style={{ display: "grid", gap: "1rem" }}>
                <fieldset style={sectionStyle}>
                  <legend style={{ padding: "0 .45rem", fontWeight: 800 }}>Host details</legend>
                  <p className="muted" style={{ margin: 0 }}>Enter your legal details exactly as they appear on your verification records.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                    <div style={fieldStyle}><label htmlFor="legal-name" style={labelStyle}>Full legal name</label><input id="legal-name" style={inputStyle} type="text" value={legalName} onChange={(e) => { setLegalName(e.target.value); setAgreementAccepted(false); }} placeholder="Your full legal name" autoComplete="name" required /></div>
                    <div style={fieldStyle}><label htmlFor="date-of-birth" style={labelStyle}>Date of birth</label><input id="date-of-birth" style={inputStyle} type="date" value={dateOfBirth} onChange={(e) => { setDateOfBirth(e.target.value); setAgreementAccepted(false); }} required /><small className="muted">Hosts must be 18 or older.</small></div>
                    <div style={fieldStyle}><label htmlFor="contact-number" style={labelStyle}>Contact number</label><input id="contact-number" style={inputStyle} type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setAgreementAccepted(false); }} placeholder="Your mobile number" autoComplete="tel" required /></div>
                  </div>
                </fieldset>

                {detailsComplete && (
                  <fieldset style={sectionStyle}>
                    <legend style={{ padding: "0 .45rem", fontWeight: 800 }}>Host Agreement &amp; Consent</legend>
                    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--line)", borderRadius: 14, padding: "1rem", lineHeight: 1.65 }}>
                      <h3 style={{ margin: "0 0 .65rem", fontSize: "1rem" }}>Ishqiya Host Partner Agreement</h3>
                      <p style={{ margin: "0 0 .7rem", color: "var(--muted)" }}>I, <strong style={{ color: "var(--cream)" }}>{legalName.trim()}</strong>, confirm that the information and documents submitted by me are true, complete and submitted with my own consent.</p>
                      <p style={{ margin: "0 0 .7rem", color: "var(--muted)" }}>I have read and understood the Ishqiya Host Agreement, Privacy Policy, Terms of Service, Community Guidelines and Host Safety Rules, and voluntarily agree to them.</p>
                      <p style={{ margin: 0, color: "var(--muted)" }}>I understand that false information, fraud, misuse or policy/safety violations may result in suspension, withholding of eligible earnings, blocking or removal, subject to applicable law.</p>
                    </div>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: ".65rem", cursor: "pointer", lineHeight: 1.45 }}><input type="checkbox" checked={agreementAccepted} onChange={(e) => setAgreementAccepted(e.target.checked)} style={{ marginTop: ".2rem", width: 18, height: 18, flex: "0 0 auto" }} /><span>I accept the Ishqiya Host Agreement and related policies.</span></label>
                  </fieldset>
                )}

                <fieldset style={sectionStyle}>
                  <legend style={{ padding: "0 .45rem", fontWeight: 800 }}>Verification photos</legend>
                  <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>Upload 3 real, front-facing full-body photos of yourself, each in different attire. AI-generated, replaced, heavily edited or misleading photos are not accepted.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: ".8rem" }}>
                    {[0, 1, 2].map((index) => (
                      <div key={index} style={{ minWidth: 0 }}>
                        <input className="photo-file-input" id={`host-photo-${index + 1}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => updatePhoto(index, e.target.files?.[0] ?? null)} required={!photoFiles[index]} />
                        <label htmlFor={`host-photo-${index + 1}`} className="photo-placeholder" style={{ minHeight: 210, width: "100%", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- existing remote auth illustration */}
                          {photoPreviews[index] ? <img src={photoPreviews[index]!} alt={`Photo ${index + 1} preview`} className="photo-preview-image" style={{ width: "100%", height: "100%", minHeight: 210, objectFit: "cover" }} /> : <div className="photo-placeholder-content"><span className="photo-plus">+</span><strong>Photo {index + 1}</strong><span>Add photo</span></div>}
                        </label>
                        {photoFiles[index] && <button type="button" className="photo-remove-button" onClick={() => updatePhoto(index, null)} style={{ marginTop: ".45rem" }}>Remove</button>}
                      </div>
                    ))}
                  </div>
                  <p className="muted" style={{ margin: 0, fontSize: ".8rem" }}>Final Host approval requires verification review.</p>
                </fieldset>
              </div>
            )}

            {message && <p role="alert" className="muted">{message}</p>}
            <Button type="submit" disabled={loading || (isSignUp && mode === "host" && (!detailsComplete || !agreementAccepted))}>{loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}</Button>
          </form>
          {!isSignUp && <div className="form-footer"><a href={`/auth/${mode}/forgot-password`}>Forgot password?</a></div>}
        </section>
      </div>
    </main>
  );
}
