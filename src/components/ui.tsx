import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger"; href?: string };

export function Button({ variant = "primary", href, children, className = "", ...props }: ButtonProps) {
  const classes = `button button-${variant} ${className}`;
  if (href) return <a className={classes} href={href}>{children}</a>;
  return <button className={classes} {...props}>{children}</button>;
}

export function Input({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <div className="field"><label htmlFor={props.id}>{label}</label><input {...props} aria-invalid={Boolean(error)} />{error && <span className="field-error">{error}</span>}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`choice-card ${className}`}>{children}</section>; }
export function Avatar({ label = "I", size = "medium" }: { label?: string; size?: "small" | "medium" | "large" }) { return <span className={`avatar avatar-${size}`} aria-label="Profile avatar">{label.slice(0, 1).toUpperCase()}</span>; }
export function Modal({ title, children, closeLabel = "Close", onClose }: { title: string; children: ReactNode; closeLabel?: string; onClose?: () => void }) { return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal"><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="modal-close" type="button" aria-label={closeLabel} onClick={onClose}>×</button></div>{children}</div></div>; }
export function Toast({ children, tone = "success" }: { children: ReactNode; tone?: "success" | "error" }) { return <div className={`toast toast-${tone}`} role="status">{children}</div>; }
export function Loading({ label = "Loading" }: { label?: string }) { return <span className="loading" role="status" aria-label={label}>•••</span>; }
export function EmptyState({ title, message }: { title: string; message: string }) { return <div className="empty-panel"><span className="icon-tile" aria-hidden="true">✦</span><h2>{title}</h2><p>{message}</p></div>; }
export function ErrorState({ message = "Something went wrong. Please try again." }: { message?: string }) { return <div className="empty-panel"><span className="icon-tile" aria-hidden="true">!</span><h2>We could not load this</h2><p>{message}</p></div>; }