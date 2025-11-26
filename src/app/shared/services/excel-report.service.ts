import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import * as XLSX from 'xlsx';

@Injectable({ providedIn: 'root' })
export class ExcelReportService {
  private supabase = inject(SupabaseService).supabase;
  async generateTripReport(idplanificacion: string): Promise<void> {
    try {
      const { data: viaje, error: viajeError } = await this.supabase
        .from('planificacion_viaje')
        .select(
          `
          idplanificacion,
          fechapartida,
          fechallegada,
          horapartida,
          horarealllegada,
          destino:destino(iddestino, nomdestino),
          conductor_vehiculo_empresa!inner(
            idconductorvehiculoempresa,
            cantdisponibleasientos,
            vehiculo:vehiculo(nroplaca, tipovehiculo, nroasientos),
            empresa:empresa_contratista(nomempresa),
            conductor:conductor(
              idconductor,
              usuario:usuario(nomusuario, patusuario, matusuario, ci, numcelular)
            )
          )
        `
        )
        .eq('idplanificacion', idplanificacion)
        .single();

      if (viajeError) throw viajeError;
      if (!viaje) throw new Error('Viaje no encontrado');

      const { data: asientosPersonal, error: errorPersonal } =
        await this.supabase
          .from('asignaciondestino_planificacionviaje')
          .select(
            `
          nroasiento,
          estado,
          asignacion_destino!inner(
            idasignaciondestino,
            fechainicio,
            personal!inner(
              nroficha,
              operacion,
              usuario:usuario(
                idusuario,
                nomusuario,
                patusuario,
                matusuario,
                ci,
                numcelular
              )
            )
          )
        `
          )
          .eq('idplanificacion', idplanificacion);

      const { data: asientosVisitantes, error: errorVisitantes } =
        await this.supabase
          .from('visitante_planificacionviaje')
          .select(
            `
          nroasiento,
          estado,
          visitante!inner(
            idvisitante,
            informacion,
            usuario:usuario(
              idusuario,
              nomusuario,
              patusuario,
              matusuario,
              ci,
              numcelular
            )
          )
        `
          )
          .eq('idplanificacion', idplanificacion);

      if (errorPersonal && errorVisitantes) {
        throw new Error('Error obteniendo asientos');
      }

      const reservas = [
        ...(asientosPersonal || []).map((a: any) => ({
          nroasiento: a.nroasiento,
          estado: a.estado,
          usuario: a.asignacion_destino?.personal?.usuario,
          tipo: 'Personal',
          operacion: a.asignacion_destino?.personal?.operacion,
        })),
        ...(asientosVisitantes || []).map((v: any) => ({
          nroasiento: v.nroasiento,
          estado: v.estado,
          usuario: v.visitante?.usuario,
          tipo: 'Visitante',
          informacion: v.visitante?.informacion,
        })),
      ];

      const wb = XLSX.utils.book_new();

      this.addTripInfoSheet(wb, viaje);

      this.addPassengersSheet(wb, reservas || []);

      const vehiculo = Array.isArray(
        viaje.conductor_vehiculo_empresa[0]?.vehiculo
      )
        ? viaje.conductor_vehiculo_empresa[0]?.vehiculo[0]
        : viaje.conductor_vehiculo_empresa[0]?.vehiculo;

      const destino = Array.isArray(viaje.destino)
        ? viaje.destino[0]
        : viaje.destino;

      this.addSeatsDistributionSheet(
        wb,
        reservas || [],
        vehiculo?.nroasientos || 0
      );

      const fileName = `Reporte_Viaje_${destino?.nomdestino || 'Destino'}_${viaje.fechapartida
        }.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error generando reporte de viaje:', error);
      throw error;
    }
  }

  async generateUsersReport(): Promise<void> {
    try {
      const { data: personal, error: personalError } = await this.supabase
        .from('personal')
        .select(
          `
          nroficha,
          operacion,
          usuario:usuario(
            idusuario,
            nomusuario,
            patusuario,
            matusuario,
            ci,
            numcelular,
            estado
          )
        `
        );

      if (personalError) throw personalError;

      const { data: conductores, error: conductoresError } = await this.supabase
        .from('conductor')
        .select(
          `
          idconductor,
          usuario:usuario(
            idusuario,
            nomusuario,
            patusuario,
            matusuario,
            ci,
            numcelular,
            estado
          )
        `
        );

      if (conductoresError) throw conductoresError;

      const { data: visitantes, error: visitantesError } = await this.supabase
        .from('visitante')
        .select(
          `
          idvisitante,
          informacion,
          usuario:usuario(
            idusuario,
            nomusuario,
            patusuario,
            matusuario,
            ci,
            numcelular,
            estado
          )
        `
        );

      if (visitantesError) throw visitantesError;

      const wb = XLSX.utils.book_new();

      this.addPersonalSheet(wb, personal || []);

      this.addConductoresSheet(wb, conductores || []);

      this.addVisitantesSheet(wb, visitantes || []);

      const fileName = `Reporte_Usuarios_${new Date().toISOString().split('T')[0]
        }.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error generando reporte de usuarios:', error);
      throw error;
    }
  }

  private addTripInfoSheet(wb: XLSX.WorkBook, viaje: any): void {
    const cve = Array.isArray(viaje.conductor_vehiculo_empresa)
      ? viaje.conductor_vehiculo_empresa[0]
      : viaje.conductor_vehiculo_empresa;

    const vehiculo = Array.isArray(cve?.vehiculo)
      ? cve?.vehiculo[0]
      : cve?.vehiculo;

    const empresa = Array.isArray(cve?.empresa)
      ? cve?.empresa[0]
      : cve?.empresa;

    const conductor = Array.isArray(cve?.conductor)
      ? cve?.conductor[0]
      : cve?.conductor;

    const usuarioConductor = Array.isArray(conductor?.usuario)
      ? conductor?.usuario[0]
      : conductor?.usuario;

    const info = [
      ['REPORTE DE VIAJE'],
      [''],
      ['Información del Viaje'],
      ['Destino:', viaje.destino.nomdestino],
      ['Fecha Partida:', viaje.fechapartida],
      ['Hora Partida:', viaje.horapartida],
      ['Fecha Llegada:', viaje.fechallegada],
      [
        'Hora Real Llegada:',
        viaje.horarealllegada || 'Viaje en curso o no iniciado',
      ],
      [''],
      ['Información del Vehículo'],
      ['Placa:', vehiculo?.nroplaca],
      ['Tipo:', vehiculo?.tipovehiculo],
      ['Total Asientos:', vehiculo?.nroasientos],
      ['Asientos Disponibles:', cve?.cantdisponibleasientos],
      [''],
      ['Información del Conductor'],
      [
        'Nombre:',
        `${usuarioConductor?.nomusuario} ${usuarioConductor?.patusuario} ${usuarioConductor?.matusuario}`,
      ],
      ['CI:', usuarioConductor?.ci],
      ['Celular:', usuarioConductor?.numcelular],
      [''],
      ['Empresa Contratista'],
      ['Nombre:', empresa?.nomempresa],
    ];

    const ws = XLSX.utils.aoa_to_sheet(info);

    ws['!cols'] = [{ wch: 25 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Información del Viaje');
  }

  private addPassengersSheet(wb: XLSX.WorkBook, reservas: any[]): void {
    const pasajeros = reservas.map((r, index) => {
      const usuario = r.usuario;
      return {
        '#': index + 1,
        'Nro Asiento': r.nroasiento,
        Tipo: r.tipo,
        Nombre: usuario?.nomusuario || '',
        'Apellido Paterno': usuario?.patusuario || '',
        'Apellido Materno': usuario?.matusuario || '',
        CI: usuario?.ci || '',
        Celular: usuario?.numcelular || '',
        Estado: r.estado || '',
        Observaciones: r.operacion || r.informacion || '',
      };
    });

    if (pasajeros.length === 0) {
      pasajeros.push({
        '#': 0,
        'Nro Asiento': 0,
        Tipo: '',
        Nombre: 'No hay pasajeros registrados',
        'Apellido Paterno': '',
        'Apellido Materno': '',
        CI: '',
        Celular: '',
        Estado: '',
        Observaciones: '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(pasajeros);

    ws['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 30 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Pasajeros');
  }

  private addSeatsDistributionSheet(
    wb: XLSX.WorkBook,
    reservas: any[],
    totalAsientos: number
  ): void {
    const data: any[][] = [
      ['DISTRIBUCIÓN DE ASIENTOS DEL BUS'],
      [''],
      ['Leyenda: [X] = Ocupado, [ ] = Libre'],
      [''],
    ];

    const asientosMap = new Map();
    reservas.forEach((r) => {
      const usuario = r.usuario;
      const nombre = usuario
        ? `${usuario.nomusuario} ${usuario.patusuario}`.trim()
        : 'Desconocido';
      const tipo = r.tipo || '';
      asientosMap.set(r.nroasiento, { nombre, tipo, estado: r.estado });
    });

    data.push(['', 'IZQ 1', 'IZQ 2', '  PASILLO  ', 'DER 1', 'DER 2', '']);
    data.push(['', '------', '------', '----------', '------', '------', '']);

    const asientosPorFila = 4;
    const numFilas = Math.ceil(totalAsientos / asientosPorFila);

    for (let fila = 0; fila < numFilas; fila++) {
      const asientoBase = fila * asientosPorFila + 1;

      const filaData = [`Fila ${fila + 1}`];

      for (let col = 0; col < 2; col++) {
        const nroAsiento = asientoBase + col;
        if (nroAsiento <= totalAsientos) {
          const asiento = asientosMap.get(nroAsiento);
          filaData.push(asiento ? '[X]' : '[ ]');
        } else {
          filaData.push('');
        }
      }

      filaData.push('');

      for (let col = 2; col < 4; col++) {
        const nroAsiento = asientoBase + col;
        if (nroAsiento <= totalAsientos) {
          const asiento = asientosMap.get(nroAsiento);
          filaData.push(asiento ? '[X]' : '[ ]');
        } else {
          filaData.push('');
        }
      }

      filaData.push('');
      data.push(filaData);
    }

    data.push(['', '------', '------', '----------', '------', '------', '']);
    data.push(['']);
    data.push(['']);

    data.push(['DETALLE DE PASAJEROS']);
    data.push(['']);
    data.push(['Asiento', 'Tipo', 'Nombre Completo', 'Estado']);

    for (let i = 1; i <= totalAsientos; i++) {
      const asiento = asientosMap.get(i);
      if (asiento) {
        data.push([
          i.toString(),
          asiento.tipo,
          asiento.nombre,
          asiento.estado || 'Ocupado',
        ]);
      } else {
        data.push([i.toString(), '-', 'LIBRE', 'Disponible']);
      }
    }

    data.push(['']);
    data.push(['RESUMEN']);
    data.push(['Total de Asientos:', totalAsientos.toString()]);
    data.push(['Asientos Ocupados:', reservas.length.toString()]);
    data.push([
      'Asientos Libres:',
      (totalAsientos - reservas.length).toString(),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    ws['!cols'] = [
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Distribución de Asientos');
  }

  private addPersonalSheet(wb: XLSX.WorkBook, personal: any[]): void {
    const data = personal.map((p, index) => {
      const usuario = p.usuario;
      return {
        '#': index + 1,
        'Nro Ficha': p.nroficha || '',
        Nombre: usuario?.nomusuario || '',
        'Apellido Paterno': usuario?.patusuario || '',
        'Apellido Materno': usuario?.matusuario || '',
        CI: usuario?.ci || '',
        Celular: usuario?.numcelular || '',
        Operación: p.operacion || '',
        Estado: usuario?.estado || '',
      };
    });

    if (data.length === 0) {
      data.push({
        '#': 0,
        'Nro Ficha': '',
        Nombre: 'No hay personal registrado',
        'Apellido Paterno': '',
        'Apellido Materno': '',
        CI: '',
        Celular: '',
        Operación: '',
        Estado: '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Personal');
  }

  private addConductoresSheet(wb: XLSX.WorkBook, conductores: any[]): void {
    const data = conductores.map((c, index) => {
      const usuario = c.usuario;
      return {
        '#': index + 1,
        'ID Conductor': c.idconductor || '',
        Nombre: usuario?.nomusuario || '',
        'Apellido Paterno': usuario?.patusuario || '',
        'Apellido Materno': usuario?.matusuario || '',
        CI: usuario?.ci || '',
        Celular: usuario?.numcelular || '',
        Estado: usuario?.estado || '',
      };
    });

    if (data.length === 0) {
      data.push({
        '#': 0,
        'ID Conductor': '',
        Nombre: 'No hay conductores registrados',
        'Apellido Paterno': '',
        'Apellido Materno': '',
        CI: '',
        Celular: '',
        Estado: '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 5 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Conductores');
  }

  private addVisitantesSheet(wb: XLSX.WorkBook, visitantes: any[]): void {
    const data = visitantes.map((v, index) => {
      const usuario = v.usuario;
      return {
        '#': index + 1,
        Nombre: usuario?.nomusuario || '',
        'Apellido Paterno': usuario?.patusuario || '',
        'Apellido Materno': usuario?.matusuario || '',
        CI: usuario?.ci || '',
        Celular: usuario?.numcelular || '',
        Información: v.informacion || '',
        Estado: usuario?.estado || '',
      };
    });

    if (data.length === 0) {
      data.push({
        '#': 0,
        Nombre: 'No hay visitantes registrados',
        'Apellido Paterno': '',
        'Apellido Materno': '',
        CI: '',
        Celular: '',
        Información: '',
        Estado: '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 5 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 35 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Visitantes');
  }

  async generateCompletedTripsReport(viajes: any[]): Promise<void> {
    try {
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen de viajes completados
      this.addCompletedTripsSummarySheet(wb, viajes);

      // Hoja 2: Detalles de pasajeros por viaje
      await this.addCompletedTripsPassengersSheet(wb, viajes);

      const fileName = `Reporte_Viajes_Completados_${new Date().toISOString().split('T')[0]
        }.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error generando reporte de viajes completados:', error);
      throw error;
    }
  }

  private addCompletedTripsSummarySheet(
    wb: XLSX.WorkBook,
    viajes: any[]
  ): void {
    const data = viajes.map((viaje, index) => {
      const cve = Array.isArray(viaje.conductor_vehiculo_empresa)
        ? viaje.conductor_vehiculo_empresa[0]
        : viaje.conductor_vehiculo_empresa;

      const vehiculo = Array.isArray(cve?.vehiculo)
        ? cve?.vehiculo[0]
        : cve?.vehiculo;

      const conductor = Array.isArray(cve?.conductor)
        ? cve?.conductor[0]
        : cve?.conductor;

      const usuarioConductor = Array.isArray(conductor?.usuario)
        ? conductor?.usuario[0]
        : conductor?.usuario;

      const destino = Array.isArray(viaje.destino)
        ? viaje.destino[0]
        : viaje.destino;

      return {
        '#': index + 1,
        Destino: destino?.nomdestino || 'Sin destino',
        'Fecha Partida': viaje.fechapartida,
        'Hora Planificada': viaje.horapartida,
        'Hora Real Partida': viaje.horarealpartida || 'No registrada',
        'Hora Real Llegada': viaje.horarealllegada || 'No registrada',
        Conductor: usuarioConductor
          ? `${usuarioConductor.nomusuario} ${usuarioConductor.patusuario}`
          : 'Sin asignar',
        Vehículo: vehiculo?.nroplaca || 'Sin asignar',
        'Tipo Vehículo': vehiculo?.tipovehiculo || '',
        Pasajeros: viaje.totalPasajeros || 0,
      };
    });

    if (data.length === 0) {
      data.push({
        '#': 0,
        Destino: 'No hay viajes completados',
        'Fecha Partida': '',
        'Hora Planificada': '',
        'Hora Real Partida': '',
        'Hora Real Llegada': '',
        Conductor: '',
        Vehículo: '',
        'Tipo Vehículo': '',
        Pasajeros: 0,
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 5 }, // #
      { wch: 25 }, // Destino
      { wch: 15 }, // Fecha Partida
      { wch: 15 }, // Hora Planificada
      { wch: 18 }, // Hora Real Partida
      { wch: 18 }, // Hora Real Llegada
      { wch: 30 }, // Conductor
      { wch: 12 }, // Vehículo
      { wch: 15 }, // Tipo Vehículo
      { wch: 10 }, // Pasajeros
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Resumen de Viajes');
  }

  private async addCompletedTripsPassengersSheet(
    wb: XLSX.WorkBook,
    viajes: any[]
  ): Promise<void> {
    const allPassengers: any[] = [];

    for (const viaje of viajes) {
      const { data: asientosPersonal } = await this.supabase
        .from('asignaciondestino_planificacionviaje')
        .select(
          `
        nroasiento,
        estado,
        asignacion_destino!inner(
          personal!inner(
            nroficha,
            operacion,
            usuario:usuario(
              nomusuario,
              patusuario,
              matusuario,
              ci,
              numcelular
            )
          )
        )
      `
        )
        .eq('idplanificacion', viaje.idplanificacion);

      const { data: asientosVisitantes } = await this.supabase
        .from('visitante_planificacionviaje')
        .select(
          `
        nroasiento,
        estado,
        visitante!inner(
          informacion,
          usuario:usuario(
            nomusuario,
            patusuario,
            matusuario,
            ci,
            numcelular
          )
        )
      `
        )
        .eq('idplanificacion', viaje.idplanificacion);

      const destino = Array.isArray(viaje.destino)
        ? viaje.destino[0]
        : viaje.destino;

      (asientosPersonal || []).forEach((a: any) => {
        const usuario = a.asignacion_destino?.personal?.usuario;
        allPassengers.push({
          Viaje: `${destino?.nomdestino || 'Sin destino'} - ${viaje.fechapartida
            }`,
          'Nro Asiento': a.nroasiento,
          Tipo: 'Personal',
          Nombre: usuario?.nomusuario || '',
          'Apellido Paterno': usuario?.patusuario || '',
          'Apellido Materno': usuario?.matusuario || '',
          CI: usuario?.ci || '',
          Celular: usuario?.numcelular || '',
          Estado: a.estado || '',
        });
      });

      (asientosVisitantes || []).forEach((v: any) => {
        const usuario = v.visitante?.usuario;
        allPassengers.push({
          Viaje: `${destino?.nomdestino || 'Sin destino'} - ${viaje.fechapartida
            }`,
          'Nro Asiento': v.nroasiento,
          Tipo: 'Visitante',
          Nombre: usuario?.nomusuario || '',
          'Apellido Paterno': usuario?.patusuario || '',
          'Apellido Materno': usuario?.matusuario || '',
          CI: usuario?.ci || '',
          Celular: usuario?.numcelular || '',
          Estado: v.estado || '',
        });
      });
    }

    if (allPassengers.length === 0) {
      allPassengers.push({
        Viaje: 'No hay pasajeros registrados',
        'Nro Asiento': 0,
        Tipo: '',
        Nombre: '',
        'Apellido Paterno': '',
        'Apellido Materno': '',
        CI: '',
        Celular: '',
        Estado: '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(allPassengers);

    ws['!cols'] = [
      { wch: 35 }, // Viaje
      { wch: 12 }, // Nro Asiento
      { wch: 12 }, // Tipo
      { wch: 20 }, // Nombre
      { wch: 20 }, // Apellido Paterno
      { wch: 20 }, // Apellido Materno
      { wch: 12 }, // CI
      { wch: 15 }, // Celular
      { wch: 12 }, // Estado
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Detalle de Pasajeros');
  }
}
