import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../../../shared/services/supabase.service';

export interface TripTemplate {
  idplantilla: string;
  nombreplantilla: string;
  descripcion?: string;
  idconductor: string;
  nroplaca: string;
  idempresa: string;
  iddestino: string;
  horapartida_default?: string;
  duracion_dias_default: number;
  creadopor: string;
  fechacreacion: string;
  fechamodificacion: string;
  activo: boolean;
  vecesusado: number;

  conductor?: {
    idconductor: string;
    usuario: {
      nomusuario: string;
      patusuario: string;
      matusuario: string;
    };
  };
  vehiculo?: {
    nroplaca: string;
    nroasientos: number;
    tipovehiculo: string;
  };
  empresa?: {
    idempresa: string;
    nomempresa: string;
  };
  destino?: {
    iddestino: string;
    nomdestino: string;
  };
}

@Injectable({ providedIn: 'root' })
export class TripTemplateService {
  private supabase = inject(SupabaseService).supabase;


  async getMyTemplates(idusuario: string): Promise<TripTemplate[]> {
    const { data, error } = await this.supabase
      .from('plantilla_viaje')
      .select(
        `
        *,
        conductor:conductor(
          idconductor,
          usuario:usuario(nomusuario, patusuario, matusuario)
        ),
        vehiculo:vehiculo(nroplaca, nroasientos, tipovehiculo),
        empresa:empresa_contratista(idempresa, nomempresa),
        destino:destino(iddestino, nomdestino)
      `
      )
      .eq('creadopor', idusuario)
      .eq('activo', true)
      .order('vecesusado', { ascending: false });

    if (error) {
      console.error('Error obteniendo plantillas:', error);
      throw error;
    }

    return data || [];
  }


  async getTemplateById(idplantilla: string): Promise<TripTemplate | null> {
    const { data, error } = await this.supabase
      .from('plantilla_viaje')
      .select(
        `
        *,
        conductor:conductor(
          idconductor,
          usuario:usuario(nomusuario, patusuario, matusuario)
        ),
        vehiculo:vehiculo(nroplaca, nroasientos, tipovehiculo),
        empresa:empresa_contratista(idempresa, nomempresa),
        destino:destino(iddestino, nomdestino)
      `
      )
      .eq('idplantilla', idplantilla)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo plantilla:', error);
      throw error;
    }

    return data;
  }


  async createTemplate(template: {
    nombreplantilla: string;
    descripcion?: string;
    idconductor: string;
    nroplaca: string;
    idempresa: string;
    iddestino: string;
    horapartida_default?: string;
    duracion_dias_default?: number;
    creadopor: string;
  }): Promise<TripTemplate> {
    const { data, error } = await this.supabase
      .from('plantilla_viaje')
      .insert({
        nombreplantilla: template.nombreplantilla,
        descripcion: template.descripcion,
        idconductor: template.idconductor,
        nroplaca: template.nroplaca,
        idempresa: template.idempresa,
        iddestino: template.iddestino,
        horapartida_default: template.horapartida_default,
        duracion_dias_default: template.duracion_dias_default || 1,
        creadopor: template.creadopor,
        activo: true,
        vecesusado: 0,
      })
      .select(
        `
        *,
        conductor:conductor(
          idconductor,
          usuario:usuario(nomusuario, patusuario, matusuario)
        ),
        vehiculo:vehiculo(nroplaca, nroasientos, tipovehiculo),
        empresa:empresa_contratista(idempresa, nomempresa),
        destino:destino(iddestino, nomdestino)
      `
      )
      .single();

    if (error) {
      console.error('Error creando plantilla:', error);
      if (error.code === '23505') {
        throw new Error('Ya existe una plantilla con ese nombre');
      }
      throw error;
    }

    return data;
  }


  async updateTemplate(
    idplantilla: string,
    updates: {
      nombreplantilla?: string;
      descripcion?: string;
      idconductor?: string;
      nroplaca?: string;
      idempresa?: string;
      iddestino?: string;
      horapartida_default?: string;
      duracion_dias_default?: number;
    }
  ): Promise<TripTemplate> {
    const { data, error } = await this.supabase
      .from('plantilla_viaje')
      .update(updates)
      .eq('idplantilla', idplantilla)
      .select(
        `
        *,
        conductor:conductor(
          idconductor,
          usuario:usuario(nomusuario, patusuario, matusuario)
        ),
        vehiculo:vehiculo(nroplaca, nroasientos, tipovehiculo),
        empresa:empresa_contratista(idempresa, nomempresa),
        destino:destino(iddestino, nomdestino)
      `
      )
      .single();

    if (error) {
      console.error('Error actualizando plantilla:', error);
      throw error;
    }

    return data;
  }


  async deactivateTemplate(idplantilla: string): Promise<void> {
    const { error } = await this.supabase
      .from('plantilla_viaje')
      .update({ activo: false })
      .eq('idplantilla', idplantilla);

    if (error) {
      console.error('Error desactivando plantilla:', error);
      throw error;
    }
  }


  async deleteTemplate(idplantilla: string): Promise<void> {
    const { error } = await this.supabase
      .from('plantilla_viaje')
      .delete()
      .eq('idplantilla', idplantilla);

    if (error) {
      console.error('Error eliminando plantilla:', error);
      throw error;
    }
  }


  async incrementUsage(idplantilla: string): Promise<void> {
    const { error } = await this.supabase.rpc('incrementar_uso_plantilla', {
      p_idplantilla: idplantilla,
    });

    if (error) {
      console.error('Error incrementando uso de plantilla:', error);
      throw error;
    }
  }


  async getPopularTemplates(limit: number = 10): Promise<TripTemplate[]> {
    const { data, error } = await this.supabase
      .from('plantilla_viaje')
      .select(
        `
        *,
        conductor:conductor(
          idconductor,
          usuario:usuario(nomusuario, patusuario, matusuario)
        ),
        vehiculo:vehiculo(nroplaca, nroasientos, tipovehiculo),
        empresa:empresa_contratista(idempresa, nomempresa),
        destino:destino(iddestino, nomdestino)
      `
      )
      .eq('activo', true)
      .order('vecesusado', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error obteniendo plantillas populares:', error);
      throw error;
    }

    return data || [];
  }


  async searchTemplates(
    searchTerm: string,
    idusuario: string
  ): Promise<TripTemplate[]> {
    const { data, error } = await this.supabase
      .from('plantilla_viaje')
      .select(
        `
        *,
        conductor:conductor(
          idconductor,
          usuario:usuario(nomusuario, patusuario, matusuario)
        ),
        vehiculo:vehiculo(nroplaca, nroasientos, tipovehiculo),
        empresa:empresa_contratista(idempresa, nomempresa),
        destino:destino(iddestino, nomdestino)
      `
      )
      .eq('creadopor', idusuario)
      .eq('activo', true)
      .ilike('nombreplantilla', `%${searchTerm}%`)
      .order('vecesusado', { ascending: false });

    if (error) {
      console.error('Error buscando plantillas:', error);
      throw error;
    }

    return data || [];
  }
}
