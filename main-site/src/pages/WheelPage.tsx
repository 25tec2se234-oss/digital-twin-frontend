import { useEffect, useState } from "react";
import SpinWheel from "../components/wheel/SpinWheel";

export function checkUserLoggedIn(): boolean {
  try {
    const dtUser = localStorage.getItem("dt_user");
    if (dtUser) {
      const u = JSON.parse(dtUser);
      if (u && (u.token || u.loggedIn)) return true;
    }
    const session = localStorage.getItem("dtv_student_session");
    if (session) {
      const s = JSON.parse(session);
      if (s && (s.token || s.email)) return true;
    }
    const appDataRaw = sessionStorage.getItem("dt_appdata_v3");
    if (appDataRaw) {
      const d = JSON.parse(appDataRaw);
      if (d && d.userData && d.userData.loggedIn) return true;
    }
  } catch (e) {}
  return false;
}

export default function WheelPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  useEffect(() => {
    const loggedIn = checkUserLoggedIn();
    if (!loggedIn) {
      setIsAuthenticated(false);
      window.location.href = "/login.html?redirect=/wheel";
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090d] flex flex-col items-center justify-center text-white">
        <div className="text-center p-8 bg-[#131926] border border-[#d4af37]/30 rounded-2xl max-w-md shadow-2xl">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-[#f6e6a4] mb-2">Authentication Required</h2>
          <p className="text-gray-400 mb-6 text-sm">Please sign in to access the Daily Spin Wheel and unlock your premium rewards.</p>
          <a
            href="/login.html?redirect=/wheel"
            className="inline-block w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#c9a53d] to-[#f6e6a4] text-black font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-opacity no-underline"
          >
            Sign In to Continue
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-[#07090d] overflow-hidden">
      {/* Floating Back Navigation Pill */}
      <div className="absolute top-5 left-5 z-50">
        <a
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(11,14,20,0.7)] backdrop-blur-md font-body text-xs font-medium uppercase tracking-[0.25em] text-[#C9A53D] transition-all hover:bg-[rgba(212,175,55,0.15)] hover:border-[rgba(246,230,164,0.6)] shadow-lg no-underline"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          DigitalTwin Verse
        </a>
      </div>

      <SpinWheel />
    </div>
  );
}
