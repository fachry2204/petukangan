export interface MapVisibilitySettings {
  loggedIn: boolean;
  checkedIn: boolean;
  onBreak: boolean;
  checkedOut: boolean;
}

// Match the monitoring behavior before this setting existed.
export const DEFAULT_MAP_VISIBILITY: MapVisibilitySettings = {
  loggedIn: true,
  checkedIn: true,
  onBreak: true,
  checkedOut: false,
};

export function normalizeMapVisibility(value: unknown): MapVisibilitySettings {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = null; }
  }
  const config = parsed && typeof parsed === 'object' ? parsed as Partial<MapVisibilitySettings> : {};
  return {
    loggedIn: typeof config.loggedIn === 'boolean' ? config.loggedIn : DEFAULT_MAP_VISIBILITY.loggedIn,
    checkedIn: typeof config.checkedIn === 'boolean' ? config.checkedIn : DEFAULT_MAP_VISIBILITY.checkedIn,
    onBreak: typeof config.onBreak === 'boolean' ? config.onBreak : DEFAULT_MAP_VISIBILITY.onBreak,
    checkedOut: typeof config.checkedOut === 'boolean' ? config.checkedOut : DEFAULT_MAP_VISIBILITY.checkedOut,
  };
}

export function isOfficerVisibleOnMap(
  status: string | null | undefined,
  visibility: MapVisibilitySettings,
  isSOS = false,
): boolean {
  if (isSOS) return true;
  const normalized = (status || 'Online').trim().toLowerCase();
  if (/pulang|check.?out|\bout\b/.test(normalized)) return visibility.checkedOut;
  if (/selesai istirahat|kembali bekerja|selesai break/.test(normalized)) return visibility.checkedIn;
  if (/istirahat|break/.test(normalized)) return visibility.onBreak;
  if (/masuk|check.?in|sudah absen/.test(normalized)) return visibility.checkedIn;
  return visibility.loggedIn;
}
