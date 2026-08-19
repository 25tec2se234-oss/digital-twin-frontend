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
