import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private supabaseClient = inject(SupabaseService).supabase;
  
  async getConductores() {
    const { data, error } = await this.supabaseClient.from('conductor').select(`
      idconductor,
      idusuario,
      usuario:usuario (
        idusuario,
        nomusuario,
        patusuario,
        matusuario,
        ci
      )
    `);

    if (error) {
      console.error('getConductores error', error);
      throw error;
    }

    return (data || []).map((c: any) => ({
      idconductor: c.idconductor,
      idusuario: c.idusuario,
      nombre: `${c.usuario?.nomusuario ?? ''} ${c.usuario?.patusuario ?? ''} ${
        c.usuario?.matusuario ?? ''
      }`.trim(),
      ci: c.usuario?.ci ?? null,
    }));
  }
  
  async getAllUsers() {
    const { data, count, error } = await this.supabaseClient
      .from('usuario')
      .select(
        `
        idusuario,
        numcelular,
        nomusuario,
        patusuario,
        matusuario,
        ci,
        idrol,
        auth_id,
        estado,
        roles!usuario_idrol_fkey ( idrol, nomrol ),
        personal (
          nroficha,
          operacion,
          asignacion_destino (
            idasignaciondestino,
            fechainicio,
            fechafin,
            observacion,
            nroficha,
            destino ( iddestino, nomdestino )
          )
        ),
        visitante ( idvisitante, informacion ),
        conductor ( idconductor )
      `,
        { count: 'exact' }
      )
      .eq('estado', 'Activo')
      .order('idusuario', { ascending: true });

    if (error) throw error;

    const usuarios = (data || []).map((u: any) => {
      let extraInfo = '-';
      let nroficha = '-';

      const rol = u.roles?.nomrol;

      switch (rol) {
        case 'Personal':
        case 'Administrador':
          nroficha = u.personal ? u.personal.nroficha : '-';
          // Buscar la asignación activa (sin fechafin)
          const asignacionActiva = u.personal?.asignacion_destino?.find(
            (asig: any) => asig.fechafin === null
          );
          extraInfo = asignacionActiva?.observacion || '-';
          break;
        case 'Visitante':
          extraInfo = u.visitante?.informacion ?? '-';
          break;
      }

      return {
        ...u,
        roles: u.roles ? [u.roles] : [],
        extraInfo,
        nroficha,
      };
    });

    return { data: usuarios, count };
  }

  async getUsers(page: number, limit: number) {
    const from = page * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabaseClient
      .from('usuario')
      .select(
        `
  idusuario,
  numcelular,
  nomusuario,
  patusuario,
  matusuario,
  ci,
  idrol,
  auth_id,
  estado,
  roles!usuario_idrol_fkey ( idrol, nomrol ),
  personal (
    nroficha,
    operacion,
    asignacion_destino (
      idasignaciondestino,
      fechainicio,
      fechafin,
      observacion,
      nroficha,
      destino ( iddestino, nomdestino )
    )
  ),
  visitante ( idvisitante, informacion ),
  conductor ( idconductor )
`
      )

      .eq('estado', 'Activo')
      .order('idusuario', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const usuarios = (data || []).map((u: any) => {
      let extraInfo = '-';
      let nroficha = '-';

      const rol = u.roles?.nomrol;

      switch (rol) {
        case 'Personal':
        case 'Administrador':
          nroficha = u.personal ? u.personal.nroficha : '-';
          // Buscar la asignación activa (sin fechafin)
          const asignacionActiva = u.personal?.asignacion_destino?.find(
            (asig: any) => asig.fechafin === null
          );
          extraInfo = asignacionActiva?.observacion || '-';
          break;
        case 'Visitante':
          extraInfo = u.visitante?.informacion ?? '-';
          break;
      }

      return {
        ...u,
        roles: u.roles ? [u.roles] : [],
        extraInfo,
        nroficha,
      };
    });

    return { data: usuarios, count };
  }

  async filterUsersByRole(roleId: number) {
    const { data, error } = await this.supabaseClient
      .from('usuario')
      .select(
        'idusuario, nomusuario, patusuario, matusuario, numcelular, idrol'
      )
      .eq('estado', 'Activo')
      .eq('idrol', roleId);

    if (error) {
      console.error('Error al filtrar usuarios:', error);
      throw error;
    }
    return data;
  }

  async getRoles() {
    const { data, error } = await this.supabaseClient
      .from('roles')
      .select('idrol, nomrol');

    if (error) {
      console.error('Error al obtener roles:', error);
      throw error;
    }
    return data;
  }
  
  async updateObservation(userId: string, observacion: string) {
    const { data, error } = await this.supabaseClient
      .from('asignacion_destino')
      .update({ observacion })
      .eq(
        'nroficha',
        (
          await this.supabaseClient
            .from('personal')
            .select('nroficha')
            .eq('idusuario', userId)
            .maybeSingle()
        ).data?.nroficha || null
      )
      .is('fechafin', null)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}