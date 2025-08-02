// ✅ database.js
// Usamos el cliente Supabase desde CDN compatible con navegador
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fhequkvqxsbdkmgmoftp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZXF1a3ZxeHNiZGttZ21vZnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTM3NzAsImV4cCI6MjA2OTQ4OTc3MH0.tVXmyBG39oxWJVlmFwHXAaYDBWxakssZ7g-BywmlZEM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);