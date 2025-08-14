import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL!;
const anonymousKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonymousKey);