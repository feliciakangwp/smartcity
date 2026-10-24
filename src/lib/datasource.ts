// Decides where landscape data lives. Without Supabase credentials the app runs
// in Demo Mode: seed data plus this browser's storage, never shared.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigured = Boolean(url && anonKey);

/** Public (anon) client only. Privileged keys never belong in the frontend. */
export const supabase: SupabaseClient | null = supabaseConfigured ? createClient(url!, anonKey!) : null;

/**
 * Phase 1 always reads and writes the demo store. The Supabase adapter
 * (Phase 4) will switch this to 'supabase' when credentials are present.
 */
export const dataMode: 'demo' | 'supabase' = 'demo';

export const DEMO_STORAGE_KEY = 'port-nexus.demo.v1';
