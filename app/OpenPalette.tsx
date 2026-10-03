"use client";
export default function OpenPalette() {
  return (<button className="search" aria-label="Open search" onClick={() => window.dispatchEvent(new Event("open-palette"))}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
    <span className="kbd">⌘K</span></button>);
}
