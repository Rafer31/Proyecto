import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  supabase: SupabaseClient;
  constructor() {
    this.supabase = createClient(
      environment.supabaseURL,
      environment.supabaseKey
    );
  }
}
