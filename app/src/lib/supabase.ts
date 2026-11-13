import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// These two values are designed to ship inside the app. The publishable key only
// allows what the database's access rules allow (members can see their own board).
// Never put the secret / service_role key here.
export const SUPABASE_URL = 'https://ohmjmcjxpqdjjwxnsckq.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WvuCfPAl0lz712gemLZNLw_5HNU3A7H';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Keep the sign-in fresh only while the app is open.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
