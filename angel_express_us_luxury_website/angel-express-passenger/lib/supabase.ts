import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlzastjpvbboniybyvjv.supabase.co';

const supabaseAnonKey = 'sb_publishable_Fn0wUeIUskON-kTpl8kDFw_B1Exp0EP';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);