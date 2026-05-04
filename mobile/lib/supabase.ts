import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://ifrxzmemiihxfdimwvcw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmcnh6bWVtaWloeGZkaW13dmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzYzNDEsImV4cCI6MjA4NzY1MjM0MX0.2_xxH2XZyNrLaRIQBMr2Fr2upn-3CKZuUTf1SVgojvc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
