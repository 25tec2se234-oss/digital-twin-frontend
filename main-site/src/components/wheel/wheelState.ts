export interface ClaimedReward {
  id: string;
  rewardId: string;
  rewardLabel: string;
  wonAt: string;
  claimCode?: string;
}

export interface WheelState {
  lastSpinDate: string; // "YYYY-MM-DD"
  spinsToday: number;
  extraSpinsRemaining: number;
  claimedRewards: ClaimedReward[];
}

export function getAuthToken(): string | null {
  try {
    const dtUser = localStorage.getItem("dt_user");
    if (dtUser) {
      const u = JSON.parse(dtUser);
      if (u && u.token) return u.token;
    }
    const session = localStorage.getItem("dtv_student_session");
    if (session) {
      const s = JSON.parse(session);
      if (s && s.token) return s.token;
    }
    const appDataRaw = sessionStorage.getItem("dt_appdata_v3");
    if (appDataRaw) {
      const d = JSON.parse(appDataRaw);
      if (d && d.userData && d.userData.token) return d.userData.token;
    }
  } catch (e) {}
  return null;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWheelState(): WheelState {
  const today = getTodayDateString();
  const defaultState: WheelState = {
    lastSpinDate: today,
    spinsToday: 0,
    extraSpinsRemaining: 0,
    claimedRewards: [],
  };

  try {
    let state: WheelState = { ...defaultState };

    // 1. Check main storage key
    const raw = localStorage.getItem("dt_wheel_spin_state");
    if (raw) {
      const parsed: WheelState = JSON.parse(raw);
      state = { ...defaultState, ...parsed };
    }

    // 2. Cross-check isolated fallback keys
    const lastSpinDateKey = localStorage.getItem("dt_wheel_last_spin_date");
    const spinsTodayKey = localStorage.getItem("dt_wheel_spins_today");

    if (lastSpinDateKey === today && spinsTodayKey) {
      const count = parseInt(spinsTodayKey, 10);
      if (!isNaN(count) && count > state.spinsToday) {
        state.spinsToday = count;
      }
    }

    // 3. Reset spinsToday if date has changed
    if (state.lastSpinDate !== today) {
      state.lastSpinDate = today;
      state.spinsToday = 0;
      saveWheelState(state);
    }

    return state;
  } catch (e) {
    return defaultState;
  }
}

export function saveWheelState(state: WheelState): void {
  try {
    const today = getTodayDateString();
    const cleanState: WheelState = {
      lastSpinDate: state.lastSpinDate || today,
      spinsToday: state.spinsToday || 0,
      extraSpinsRemaining: state.extraSpinsRemaining || 0,
      claimedRewards: state.claimedRewards || [],
    };

    // Save to all persistence layers
    localStorage.setItem("dt_wheel_spin_state", JSON.stringify(cleanState));
    localStorage.setItem("dt_wheel_last_spin_date", cleanState.lastSpinDate);
    localStorage.setItem("dt_wheel_spins_today", String(cleanState.spinsToday));
    sessionStorage.setItem("dt_wheel_spin_state", JSON.stringify(cleanState));

    // Sync into dt_user object in localStorage
    const dtUser = localStorage.getItem("dt_user");
    if (dtUser) {
      const u = JSON.parse(dtUser);
      u.wheelState = cleanState;
      localStorage.setItem("dt_user", JSON.stringify(u));
    }
  } catch (e) {}
}

export function getRemainingSpins(state: WheelState): number {
  const today = getTodayDateString();
  const spinsToday = state.lastSpinDate === today ? state.spinsToday : 0;
  const freeDailyRemaining = Math.max(0, 1 - spinsToday);
  return freeDailyRemaining + (state.extraSpinsRemaining || 0);
}

export function consumeSpin(state: WheelState): WheelState {
  const today = getTodayDateString();
  const spinsToday = state.lastSpinDate === today ? state.spinsToday : 0;

  const newState: WheelState = {
    ...state,
    lastSpinDate: today,
    extraSpinsRemaining: state.extraSpinsRemaining || 0,
    claimedRewards: state.claimedRewards || [],
  };

  if (spinsToday < 1) {
    newState.spinsToday = 1;
  } else if (newState.extraSpinsRemaining > 0) {
    newState.extraSpinsRemaining -= 1;
  }

  saveWheelState(newState);
  return newState;
}

export function recordWin(rewardId: string, rewardLabel: string): { newState: WheelState; claimCode?: string } {
  const state = getWheelState();
  let claimCode: string | undefined = undefined;

  if (rewardId === "extraspin") {
    state.extraSpinsRemaining = (state.extraSpinsRemaining || 0) + 1;
  } else if (rewardId === "mentor1w") {
    claimCode = `DTV-MENTOR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  const winRecord: ClaimedReward = {
    id: `win_${Date.now()}`,
    rewardId,
    rewardLabel,
    wonAt: new Date().toISOString(),
    claimCode,
  };

  state.claimedRewards.push(winRecord);
  saveWheelState(state);

  return { newState: state, claimCode };
}

export function getTimeUntilMidnight(): { hours: number; minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();

  const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    hours,
    minutes,
    seconds,
    formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

export async function syncWheelStateWithBackend(): Promise<WheelState> {
  const token = getAuthToken();
  const localState = getWheelState();
  const today = getTodayDateString();

  if (!token) return localState;

  try {
    const res = await fetch("/api/v1/wheel/state", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        // Intelligently MERGE backend state with local state so spinsToday is NEVER downgraded
        const mergedSpinsToday = data.lastSpinDate === today
          ? Math.max(localState.lastSpinDate === today ? localState.spinsToday : 0, data.spinsToday || 0)
          : (localState.lastSpinDate === today ? localState.spinsToday : 0);

        const mergedExtraSpins = Math.max(localState.extraSpinsRemaining || 0, data.extraSpinsRemaining || 0);

        const mergedState: WheelState = {
          lastSpinDate: today,
          spinsToday: mergedSpinsToday,
          extraSpinsRemaining: mergedExtraSpins,
          claimedRewards: data.claimedRewards && data.claimedRewards.length > 0
            ? data.claimedRewards
            : localState.claimedRewards,
        };

        saveWheelState(mergedState);
        return mergedState;
      }
    }
  } catch (e) {}

  return localState;
}

export async function requestBackendSpin(): Promise<{ chosenIndex?: number; rewardId?: string; claimCode?: string; error?: string }> {
  const token = getAuthToken();
  if (!token) return {};

  try {
    const res = await fetch("/api/v1/wheel/spin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.wheelState) {
        const localState = getWheelState();
        const today = getTodayDateString();

        const mergedState: WheelState = {
          lastSpinDate: today,
          spinsToday: Math.max(localState.spinsToday, data.wheelState.spinsToday || 1),
          extraSpinsRemaining: data.wheelState.extraSpinsRemaining || 0,
          claimedRewards: data.wheelState.claimedRewards || localState.claimedRewards,
        };
        saveWheelState(mergedState);
        return {
          chosenIndex: data.chosenIndex,
          rewardId: data.rewardId,
          claimCode: data.claimCode,
        };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData.error === "DailySpinLimitReached") {
        return { error: "DailySpinLimitReached" };
      }
    }
  } catch (e) {}

  return {};
}
