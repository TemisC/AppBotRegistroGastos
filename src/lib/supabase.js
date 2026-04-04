import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Diagnóstico de Conexión
console.log('--- Diagnóstico Supabase ---');
console.log('URL de Proyecto:', supabaseUrl);
console.log('Longitud de Key:', supabaseAnonKey?.length || 0);
console.log('Clave empieza por:', supabaseAnonKey?.substring(0, 15) + '...');
console.log('---------------------------');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Faltan las llaves de Supabase en el archivo .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
