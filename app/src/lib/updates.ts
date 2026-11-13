import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState } from 'react-native';

let checking = false;

/** Download and switch to a newer version right away, instead of on the next launch. */
async function applyLatest() {
  if (__DEV__ || !Updates.isEnabled || checking) return;
  checking = true;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) await Updates.reloadAsync();
  } catch {
    // No connection or no update server: keep running the current version.
  } finally {
    checking = false;
  }
}

/** Check on launch and whenever the app comes back to the foreground. */
export function useAutoUpdate() {
  useEffect(() => {
    applyLatest();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') applyLatest();
    });
    return () => sub.remove();
  }, []);
}

/** A short description of the running version, for Settings. */
export function versionLabel(): string {
  if (!Updates.isEnabled) return 'Expo Go';
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return 'Installed version (no updates yet)';
  return `Updated ${Updates.createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}
