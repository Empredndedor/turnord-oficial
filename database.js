// database.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = 'https://fhequkvqxsbdkmgmoftp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZXF1a3ZxeHNiZGttZ21vZnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTM3NzAsImV4cCI6MjA2OTQ4OTc3MH0.tVXmyBG39oxWJVlmFwHXAaYDBWxakssZ7g-BywmlZEM';
export const supabase = createClient(supabaseUrl, supabaseKey);

