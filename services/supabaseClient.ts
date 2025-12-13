import { createClient } from '@supabase/supabase-js';

// Dán URL của bạn vào đây
const supabaseUrl = 'https://twcnucauiokokdwgrhjx.supabase.co'; 
// Dán 'anon public' key của bạn vào đây
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3Y251Y2F1aW9rb2tkd2dyaGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTg5NTYsImV4cCI6MjA3OTU3NDk1Nn0.ndNtl_oa-t3h87r-FhkSafHJupIcgdHD5zeaSRhj4rI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);