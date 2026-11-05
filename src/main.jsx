import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Compass, LayoutDashboard, LogOut, Menu, Plus, ShieldCheck, X } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import "./index.css";
import { auth, isAdminUser, signOutUser } from "./firebase";
import { getAccessProfile } from "./store";
import Dashboard from "./pages/Dashboard";
import Planner from "./pages/Planner";
import ItineraryPage from "./pages/ItineraryPage";
import AccessPage from "./pages/AccessPage";
import AdminPage from "./pages/AdminPage";
import TravelBackdrop from "./components/TravelBackdrop";

const navCls = ({ isActive }) =>
  `inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
    isActive ? "bg-teal-50 text-teal-900" : "text-slate-700 hover:bg-slate-100"
  }`;

function Shell() {
  const { pathname } = useLocation();
  const main = useRef(null);
  const first = useRef(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshProfile = async () => {
    if (!user || isAdminUser(user)) return;
    setProfileLoading(true);
    try { setProfile(await getAccessProfile(user.uid)); setAuthError(""); }
    catch (e) { setAuthError(e.message); }
    finally { setProfileLoading(false); }
  };

  useEffect(() => onAuthStateChanged(auth, async (current) => {
    setUser(current);
    setProfile(null);
    setAuthError("");
    if (!current || isAdminUser(current)) {
      setAuthLoading(false);
      setProfileLoading(false);
      return;
    }
    setAuthLoading(false);
    setProfileLoading(true);
    try { setProfile(await getAccessProfile(current.uid)); }
    catch (e) { setAuthError(e.message); }
    finally { setProfileLoading(false); }
  }), []);

  // Move focus to the content on route change so screen-reader users hear the new page.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setMenuOpen(false);
    main.current?.focus();
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const admin = isAdminUser(user);
  const approved = admin || (profile?.status === "approved" && profile?.role === "general");

  return (
    <>
      <TravelBackdrop />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-teal-900 focus:shadow-lg">
        Skip to main content
      </a>
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5 font-display text-xl font-semibold text-slate-900">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-700 text-white transition group-hover:rotate-12" aria-hidden="true"><Compass className="h-5 w-5" /></span>
            Wanderly
          </Link>
          {approved && (
            <>
            <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
              <NavLink to="/" end className={navCls}><LayoutDashboard className="h-4 w-4" aria-hidden="true" /><span>Dashboard</span></NavLink>
              <NavLink to="/new" className={navCls}><Plus className="h-4 w-4" aria-hidden="true" /><span>Plan a trip</span></NavLink>
              {admin && <NavLink to="/admin" className={navCls}><ShieldCheck className="h-4 w-4" aria-hidden="true" /><span>Admin</span></NavLink>}
              <button type="button" className="btn-secondary !min-h-10 !px-3" onClick={signOutUser} aria-label={`Sign out ${user?.displayName || user?.email}`}><LogOut className="h-4 w-4" aria-hidden="true" /><span>Sign out</span></button>
            </nav>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-teal-700 hover:bg-teal-50 focus-visible:outline-teal-700 sm:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              title={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
            {menuOpen && (
              <div id="mobile-navigation" className="absolute right-4 top-[calc(100%-0.25rem)] z-30 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:hidden">
                <nav aria-label="Mobile" className="space-y-1">
                  <NavLink to="/" end className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? "bg-teal-50 text-teal-900" : "text-slate-800 hover:bg-slate-50"}`}>
                    <LayoutDashboard className="h-5 w-5" aria-hidden="true" />Dashboard
                  </NavLink>
                  <NavLink to="/new" className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? "bg-teal-50 text-teal-900" : "text-slate-800 hover:bg-slate-50"}`}>
                    <Plus className="h-5 w-5" aria-hidden="true" />Plan a trip
                  </NavLink>
                  {admin && <NavLink to="/admin" className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? "bg-teal-50 text-teal-900" : "text-slate-800 hover:bg-slate-50"}`}>
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />Admin
                  </NavLink>}
                </nav>
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <button type="button" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-50" onClick={signOutUser}>
                    <LogOut className="h-5 w-5" aria-hidden="true" />Sign out
                  </button>
                </div>
              </div>
            )}
            </>
          )}
          {user && !approved && <button type="button" className="btn-secondary !min-h-10 !px-3" onClick={signOutUser}><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button>}
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1} className="mx-auto max-w-6xl px-4 py-10 outline-none sm:px-6">
        {authLoading ? <p role="status" className="text-center text-slate-700">Checking sign-in...</p> : !user || !approved ? (
          <AccessPage user={user} profile={profile} loading={profileLoading} authError={authError} onRefresh={refreshProfile} />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<Planner />} />
            <Route path="/itinerary/:id" element={<ItineraryPage />} />
            <Route path="/admin" element={admin ? <AdminPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <footer className="no-print pb-10 text-center text-sm text-slate-700">Wander more. Plan less.</footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter><Shell /></BrowserRouter>
);
