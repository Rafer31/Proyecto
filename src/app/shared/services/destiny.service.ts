import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class DestinyService {
  private supabase = inject(SupabaseService).supabase;

  async getAllDestinos() {
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

  async getDestinosParaViajes() {
    const { data, error } = await this.supabase
      .from('destino')
      .select('iddestino, nomdestino')
      .neq('nomdestino', 'Bolivar')
      .order('nomdestino');

    if (error) {
      console.error('Error cargando destinos:', error);
      throw error;
    }
    return data || [];
  }

  async getDestinoBolivar() {
    const { data, error } = await this.supabase
      .from('destino')
      .select('iddestino, nomdestino')
      .eq('nomdestino', 'Bolivar')
      .single();

    if (error) {
      console.error('Error cargando destino Bolivar:', error);
      throw error;
    }
    return data;
  }

}
