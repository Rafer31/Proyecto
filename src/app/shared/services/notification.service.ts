import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ScheduledNotification {
  id: string;
  type: 'pre-trip' | 'post-trip';
  idplanificacion: string;
  idusuario?: string;
  scheduledTime: string;
  title: string;
  body: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private supabase = inject(SupabaseService).supabase;
  private scheduledTimeouts = new Map<string, any>();
  private readonly LOAD_TIMEOUT = 5000;
  private isInitialized = false;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Error solicitando permisos:', error);
        return false;
      }
    }

    return false;
  }

  hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  needsPermission(): boolean {
    return 'Notification' in window &&
           Notification.permission !== 'granted' &&
           Notification.permission !== 'denied';
  }

  isPermissionDenied(): boolean {
    return 'Notification' in window && Notification.permission === 'denied';
  }

  async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if (!this.hasPermission()) {
      console.warn('No hay permisos para mostrar notificaciones');
      return;
    }

    try {
      const notificationOptions = {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options,
      };

      const notification = new Notification(title, notificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }

  /**
   * Programa notificación pre-viaje para un usuario que reservó
   * Se llama cuando un usuario hace una reserva de asiento
   */
  async schedulePreTripNotificationForUser(
    idusuario: string,
    idplanificacion: string,
    fechapartida: string,
    horapartida: string,
    destino: string,
    idreserva: string
  ): Promise<void> {
    try {
      // Parsear fecha y hora en zona horaria local
      const [year, month, day] = fechapartida.split('-').map(Number);
      const [hora, minuto] = horapartida.split(':').map(Number);

      // Crear fecha de partida usando Date local (sin conversión UTC)
      const departureDate = new Date(year, month - 1, day, hora, minuto, 0, 0);

      console.log('📅 Fecha partida (local):', departureDate.toString());

      // Calcular tiempo de notificación (20 minutos antes)
      const notificationTime = new Date(departureDate.getTime() - 20 * 60 * 1000);
      const now = new Date();

      console.log('🔔 Tiempo notificación:', notificationTime.toString());
      console.log('⏰ Hora actual:', now.toString());

      const diffMinutes = (notificationTime.getTime() - now.getTime()) / 60000;
      console.log('⏱️ Diferencia en minutos:', diffMinutes.toFixed(2));

      const notificationId = `pre-trip-${idplanificacion}-${idusuario}`;

      // Si ya pasó la hora de notificación
      if (notificationTime <= now) {
        // Verificar si el viaje aún no ha partido
        if (departureDate > now) {
          const minutosRestantes = Math.round((departureDate.getTime() - now.getTime()) / 60000);

          console.log(`⚠️ Viaje parte en ${minutosRestantes} minutos. Enviando notificación inmediata.`);

          // Enviar notificación inmediatamente
          await this.showNotification('¡Tu viaje está próximo!', {
            body: `Tu viaje a ${destino} parte en ${minutosRestantes} minutos`,
            tag: notificationId,
            requireInteraction: true,
            data: {
              idplanificacion,
              idusuario,
              idreserva,
              type: 'pre-trip',
              url: `/users/traveler/my-trips`
            },
          });

          // Guardar en BD como enviada
          await this.saveScheduledNotification({
            id: notificationId,
            type: 'pre-trip',
            idplanificacion,
            idusuario,
            scheduledTime: notificationTime.toISOString(),
            title: '¡Tu viaje está próximo!',
            body: `Tu viaje a ${destino} parte en ${minutosRestantes} minutos`,
            data: {
              idplanificacion,
              idusuario,
              idreserva,
              type: 'pre-trip',
              destino
            },
          }, 'enviada'); // Estado enviada

          return;
        } else {
          console.log('❌ El viaje ya partió, no se envía notificación');
          return;
        }
      }

      const delay = notificationTime.getTime() - now.getTime();

      // Cancelar notificación anterior si existe
      this.cancelScheduledNotification(notificationId);

      // Solo programa en memoria si es dentro de 24 horas
      if (delay <= 24 * 60 * 60 * 1000) {
        const timeoutId = setTimeout(() => {
          this.showNotification('¡Tu viaje está próximo!', {
            body: `Tu viaje a ${destino} parte en 20 minutos`,
            tag: notificationId,
            requireInteraction: true,
            data: {
              idplanificacion,
              idusuario,
              idreserva,
              type: 'pre-trip',
              url: `/users/traveler/my-trips`
            },
          });
          this.markNotificationAsSent(notificationId);
        }, delay);

        this.scheduledTimeouts.set(notificationId, timeoutId);
        console.log(`✅ Notificación en memoria programada para ${notificationTime.toLocaleString()}`);
      }

      // Guardar en base de datos SIEMPRE como pendiente
      await this.saveScheduledNotification({
        id: notificationId,
        type: 'pre-trip',
        idplanificacion,
        idusuario,
        scheduledTime: notificationTime.toISOString(),
        title: '¡Tu viaje está próximo!',
        body: `Tu viaje a ${destino} parte en 20 minutos`,
        data: {
          idplanificacion,
          idusuario,
          idreserva,
          type: 'pre-trip',
          destino
        },
      }, 'pendiente');

      console.log(`✅ Notificación guardada en BD para ${notificationTime.toLocaleString()}`);
    } catch (error) {
      console.error('❌ Error programando notificación pre-viaje:', error);
    }
  }

  /**
   * Programa notificación post-viaje para un usuario
   * Se muestra inmediatamente después de completar el viaje
   */
  async schedulePostTripNotification(
    idusuario: string,
    idplanificacion: string,
    destino?: string
  ): Promise<void> {
    try {
      await this.showNotification('¡Viaje completado!', {
        body: `¿Cómo fue tu experiencia viajando a ${destino}? Califica el servicio`,
        tag: `post-trip-${idplanificacion}-${idusuario}`,
        requireInteraction: true,
        data: {
          idplanificacion,
          idusuario,
          type: 'post-trip',
          destino,
          url: `/users/traveler/rate-trip/${idplanificacion}`
        },
      });
    } catch (error) {
      console.error('Error mostrando notificación post-viaje:', error);
    }
  }

  cancelScheduledNotification(notificationId: string): void {
    const timeoutId = this.scheduledTimeouts.get(notificationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledTimeouts.delete(notificationId);
      console.log(`✅ Notificación ${notificationId} cancelada de memoria`);
    }
  }

  /**
   * Cancela todas las notificaciones de un usuario para un viaje
   */
  async cancelUserTripNotifications(
    idusuario: string,
    idplanificacion: string
  ): Promise<void> {
    const notificationId = `pre-trip-${idplanificacion}-${idusuario}`;

    // Cancelar de memoria
    this.cancelScheduledNotification(notificationId);

    try {
      // ELIMINAR de la base de datos en lugar de actualizar
      const { error } = await this.supabase
        .from('notificacion_programada')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error eliminando notificación en BD:', error);
      } else {
        console.log(`✅ Notificación ${notificationId} eliminada de BD`);
      }
    } catch (error) {
      console.error('❌ Error cancelando notificación en BD:', error);
    }
  }

  private async saveScheduledNotification(
    notification: ScheduledNotification,
    estado: 'pendiente' | 'enviada' = 'pendiente'
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notificacion_programada')
        .upsert(
          {
            id: notification.id,
            tipo: notification.type,
            idplanificacion: notification.idplanificacion,
            idusuario: notification.idusuario,
            fechahora_programada: notification.scheduledTime,
            titulo: notification.title,
            mensaje: notification.body,
            datos: notification.data,
            estado: estado,
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('❌ Error guardando notificación programada:', error);
      }
    } catch (error) {
      console.error('❌ Error en saveScheduledNotification:', error);
    }
  }

  private async markNotificationAsSent(notificationId: string): Promise<void> {
    try {
      await this.supabase
        .from('notificacion_programada')
        .update({ estado: 'enviada', updatedat: new Date().toISOString() })
        .eq('id', notificationId);

      this.scheduledTimeouts.delete(notificationId);
    } catch (error) {
      console.error('❌ Error actualizando notificación:', error);
    }
  }

  /**
   * Carga notificaciones pendientes para el usuario actual
   * Filtra solo las notificaciones del usuario
   */
  async loadPendingNotifications(idusuario?: string): Promise<void> {
    try {
      const loadPromise = this.supabase
        .from('notificacion_programada')
        .select('*')
        .eq('estado', 'pendiente')
        .gte('fechahora_programada', new Date().toISOString())
        .then(result => {
          // Si hay idusuario, filtrar por usuario
          if (idusuario && result.data) {
            result.data = result.data.filter(n => n.idusuario === idusuario);
          }
          return result;
        });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.LOAD_TIMEOUT)
      );

      const { data, error } = await Promise.race([
        loadPromise,
        timeoutPromise,
      ]) as any;

      if (error) {
        console.error('❌ Error cargando notificaciones pendientes:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('ℹ️ No hay notificaciones pendientes');
        return;
      }

      const now = new Date();
      const expiredIds: string[] = [];
      const toSchedule: any[] = [];

      for (const notif of data) {
        const scheduledTime = new Date(notif.fechahora_programada);
        const delay = scheduledTime.getTime() - now.getTime();

        if (delay <= 0) {
          expiredIds.push(notif.id);
          continue;
        }

        // Solo programa si es dentro de 24 horas
        if (delay <= 24 * 60 * 60 * 1000) {
          toSchedule.push({ notif, delay });
        }
      }

      // Marca expiradas en batch
      if (expiredIds.length > 0) {
        await this.supabase
          .from('notificacion_programada')
          .update({ estado: 'expirada' })
          .in('id', expiredIds);
      }

      // Programa las notificaciones válidas
      for (const { notif, delay } of toSchedule) {
        const timeoutId = setTimeout(() => {
          this.showNotification(notif.titulo, {
            body: notif.mensaje,
            tag: notif.id,
            requireInteraction: true,
            data: notif.datos,
          });
          this.markNotificationAsSent(notif.id);
        }, delay);

        this.scheduledTimeouts.set(notif.id, timeoutId);
      }

      console.log(`✅ ${toSchedule.length} notificaciones programadas, ${expiredIds.length} expiradas`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Timeout') {
        console.warn('⚠️ Timeout cargando notificaciones - continuando sin bloquear');
      } else {
        console.error('❌ Error en loadPendingNotifications:', error);
      }
    }
  }

  /**
   * Inicializa notificaciones para un usuario específico
   */
  async initializeNotifications(idusuario?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('ℹ️ Notificaciones ya inicializadas');
      return;
    }

    try {
      if (this.hasPermission()) {
        console.log('✅ Permisos de notificación concedidos, cargando pendientes...');
        this.loadPendingNotifications(idusuario).catch(err =>
          console.error('❌ Error cargando notificaciones en background:', err)
        );
      } else {
        console.log('ℹ️ No hay permisos de notificación.');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error inicializando notificaciones:', error);
    }
  }

  ngOnDestroy(): void {
    this.scheduledTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.scheduledTimeouts.clear();
  }
}
