import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class DriverReportsService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabaseURL,
            environment.supabaseKey
        );
    }

    async getDriverTrips(
        idConductor: string,
        fechaDesde?: string,
        fechaHasta?: string
    ) {
        try {
            // Primero obtener los conductor_vehiculo_empresa del conductor
            const { data: cveData, error: cveError } = await this.supabase
                .from('conductor_vehiculo_empresa')
                .select('idconductorvehiculoempresa')
                .eq('idconductor', idConductor);

            if (cveError) {
                console.error('Error obteniendo CVE:', cveError);
                throw cveError;
            }

            if (!cveData || cveData.length === 0) {
                return [];
            }

            // Extraer los IDs
            const cveIds = cveData.map((item) => item.idconductorvehiculoempresa);

            // Ahora obtener los viajes con esos IDs
            let query = this.supabase
                .from('planificacion_viaje')
                .select(
                    `
          idplan ificacion,
          fechapartida,
          fechallegada,
          horapartida,
          horarealpartida,
          horarealllegada,
          destino:destino(iddestino, nomdestino),
          conductor_vehiculo_empresa!inner(
            idconductorvehiculoempresa,
            conductor:conductor(idconductor),
            vehiculo:vehiculo(nroplaca, tipovehiculo, nroasientos),
            empresa:empresa_contratista(nomempresa)
          )
        `
                )
                .in('idconductorvehiculoempresa', cveIds)
                .order('fechapartida', { ascending: false });

            // Aplicar filtros de fecha si existen
            if (fechaDesde) {
                query = query.gte('fechapartida', fechaDesde);
            }

            if (fechaHasta) {
                query = query.lte('fechapartida', fechaHasta);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error obteniendo viajes del conductor:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error en getDriverTrips:', error);
            throw error;
        }
    }

    async getDriverInfo(idConductor: string) {
        try {
            const { data, error } = await this.supabase
                .from('conductor')
                .select(
                    `
          idconductor,
          usuario:usuario(
            idusuario,
            ci,
            nomusuario,
            patusuario,
            matusuario,
            numcelular
          )
        `
                )
                .eq('idconductor', idConductor)
                .single();

            if (error) {
                console.error('Error obteniendo información del conductor:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error en getDriverInfo:', error);
            throw error;
        }
    }
}
