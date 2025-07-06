const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ikhvppldbdljgwrdnapc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraHZwcGxkYmRsamd3cmRuYXBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc2NjYwNCwiZXhwIjoyMDY2MzQyNjA0fQ.HYeGhUM8IBUHtxs-FCevaZHj14WCCs1QmaH0Pmaz5nQ';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('supabaseKey:', supabaseKey);

module.exports = { supabase }; 