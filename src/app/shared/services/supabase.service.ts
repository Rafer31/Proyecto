import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private _client: SupabaseClient | null = null;
  private _isInitialized = false;

  get supabase() {
    if (!this._isInitialized) {
      this.initializeClient();
    }
    return this._client!;
  }

  get isConnected() {
    return this._isInitialized;
  }

  private initializeClient() {
    this._client = createClient(
      environment.supabaseURL,
      environment.supabaseKey
    );
    this._isInitialized = true;
  }
}
