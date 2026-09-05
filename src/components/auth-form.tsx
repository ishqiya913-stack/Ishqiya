"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Loading } from "./ui";
import { BackControl } from "./navigation";

export function AuthForm({ mode, action }: { mode: "user" | "host"; action: "sign in" | "sign up" }) {
  const [values, setValues] = useState({ email: "", password: "", confirm: "" });
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(["", "", ""]);
  const previewUrlsRef = useRef<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (!values.email || !values.password || (action === "sign up" && !values.confirm)) { setError("Please complete every required field."); return; }
    if (action === "sign up" && values.password !== values.confirm) { setError("Passwords do not match."); return; }
    if (mode === "host" && action === "sign up" && photos.some((photo) => !photo)) { setError("Upload all 3 verification photos to continue."); return; }
    setLoading(true); window.setTimeout(() => setLoading(false), 700);
  };
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [key]: event.target.value });
  const setPhoto = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Each verification photo must be an image file."); return; }
    setPhotos((current) => current.map((photo, photoIndex) => photoIndex === index ? file : photo));
    setPhotoPreviews((current) => {
      if (current[index]) URL.revokeObjectURL(current[index]);
      const next = current.map((preview, previewIndex) => previewIndex === index ? URL.createObjectURL(file) : preview);
      previewUrlsRef.current = next;
      return next;
    });
    setError("");
  };
  const removePhoto = (index: number) => {
    setPhotos((current) => current.map((photo, photoIndex) => photoIndex === index ? null : photo));
    setPhotoPreviews((current) => {
      if (current[index]) URL.revokeObjectURL(current[index]);
      const next = current.map((preview, previewIndex) => previewIndex === index ? "" : preview);
      previewUrlsRef.current = next;
      return next;
    });
  };
  useEffect(() => () => previewUrlsRef.current.forEach((preview) => preview && URL.revokeObjectURL(preview)), []);
  const base = mode === "user" ? "/auth/user" : "/auth/host";
  return <form onSubmit={submit} noValidate>
    <Input id="email" label="Email" type="email" autoComplete="email" value={values.email} onChange={set("email")} />
    <Input id="password" label="Password" type="password" autoComplete={action === "sign in" ? "current-password" : "new-password"} value={values.password} onChange={set("password")} />
    {action === "sign up" && <Input id="confirm-password" label="Confirm password" type="password" autoComplete="new-password" value={values.confirm} onChange={set("confirm")} />}
    {mode === "host" && action === "sign up" && <PhotoVerification photos={photos} previews={photoPreviews} onChange={setPhoto} onRemove={removePhoto} />}
    {action === "sign in" && <Link className="form-footer" href={`${base}/forgot-password`}>Forgot password?</Link>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <Button type="submit" disabled={loading}>{loading ? <Loading label="Submitting" /> : `${action[0].toUpperCase()}${action.slice(1)}`}</Button>
    {action === "sign up" && <p className="form-footer">Already have an account? <Link href={`${base}/sign-in`}>Sign in</Link></p>}
  </form>;
}

function PhotoVerification({ photos, previews, onChange, onRemove }: { photos: (File | null)[]; previews: string[]; onChange: (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => void; onRemove: (index: number) => void }) {
  return <fieldset className="photo-verification">
    <legend>Real photo verification <span>Required</span></legend>
    <p className="photo-verification-intro">Upload 3 recent photos of yourself. Each must be front-facing, show your full body, and feature different attire.</p>
    <div className="photo-guidance"><span aria-hidden="true">✓</span><p>Use clear, well-lit photos of the person registering. AI-generated, AI-replaced, heavily edited, fake, or misleading photos are not accepted.</p></div>
    <div className="photo-grid">
      {photos.map((photo, index) => <div className="photo-slot" key={index}>
        <div className="photo-slot-heading"><span>Photo {index + 1}</span><b>Required</b></div>
        {photo ? <div className="photo-preview">
          <Image src={previews[index]} alt={`Verification preview ${index + 1}`} fill unoptimized sizes="(max-width: 700px) 80vw, 220px" />
          <div className="photo-preview-actions">
            <label htmlFor={`photo-${index}`}>Replace<input id={`photo-${index}`} type="file" accept="image/*" onChange={onChange(index)} /></label>
            <button type="button" onClick={() => onRemove(index)}>Remove</button>
          </div>
        </div> : <label className="photo-upload" htmlFor={`photo-${index}`}>
          <span className="photo-upload-mark" aria-hidden="true">＋</span>
          <strong>Add photo</strong>
          <small>Front-facing · full body</small>
          <input id={`photo-${index}`} type="file" accept="image/*" onChange={onChange(index)} />
        </label>}
      </div>)}
    </div>
    <p className="photo-verification-note">Photos are collected for verification review. Final approval requires authoritative verification and cannot be guaranteed by this form.</p>
  </fieldset>;
}

export function AuthScreen({ mode, action }: { mode: "user" | "host"; action: "sign in" | "sign up" }) {
  return <main className="auth-page"><div className="auth-flow-nav"><BackControl /></div><div className="auth-layout"><aside className="auth-aside"><div className="brand"><span className="brand-mark">I</span><span style={{ color: "var(--cream)" }}>ISHQIYA</span></div><h1 className="serif">Every feeling deserves a beginning.</h1><p>{mode === "user" ? "Enter a softer space to discover connection at your own pace." : "A considered space for hosts to meet every conversation with presence."}</p></aside><section className="form-card"><span className="eyebrow">{mode} access</span><h2>{action === "sign in" ? "Welcome back" : "Begin your story"}</h2><p className="muted">{action === "sign in" ? "Sign in to continue to your space." : "Create your Ishqiya account with your email."}</p><AuthForm mode={mode} action={action} /></section></div></main>;
}