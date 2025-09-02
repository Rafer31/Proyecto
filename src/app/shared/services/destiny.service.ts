import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class DestinyService {
  private supabase = inject(SupabaseService).supabase;

  async getDestinos() {
    const { data, error } = await this.supabase
      .from('destino')
      .select('iddestino, nomdestino')
      .order('nomdestino');

    if (error) {
      console.error('Error cargando destinos:', error);
      throw error;
    }

    return data || [];
  }
}
