import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://zlzastjpvbboniybyvjv.supabase.co';

const supabaseAnonKey = 'sb_publishable_Fn0wUeIUskON-kTpl8kDFw_B1Exp0EP';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});