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
    return (
      'Notification' in window &&
      Notification.permission !== 'granted' &&
      Notification.permission !== 'denied'
    );
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

  async schedulePreTripNotificationForUser(
    idusuario: string,
    idplanificacion: string,
    fechapartida: string,
    horapartida: string,
    destino: string,
    idreserva: string
  ): Promise<void> {
    try {
      const [year, month, day] = fechapartida.split('-').map(Number);
      const [hora, minuto] = horapartida.split(':').map(Number);

      const departureDate = new Date(year, month - 1, day, hora, minuto, 0, 0);

      const notificationTime = new Date(
        departureDate.getTime() - 20 * 60 * 1000
      );
      const now = new Date();

      const diffMinutes = (notificationTime.getTime() - now.getTime()) / 60000;

      const notificationId = `pre-trip-${idplanificacion}-${idusuario}`;

      if (notificationTime <= now) {
        if (departureDate > now) {
          const minutosRestantes = Math.round(
            (departureDate.getTime() - now.getTime()) / 60000
          );

          await this.showNotification('¡Tu viaje está próximo!', {
            body: `Tu viaje a ${destino} parte en ${minutosRestantes} minutos`,
            tag: notificationId,
            requireInteraction: true,
            data: {
              idplanificacion,
              idusuario,
              idreserva,
              type: 'pre-trip',
              url: `/users/traveler/my-trips`,
            },
          });

          await this.saveScheduledNotification(
            {
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
                destino,
              },
            },
            'enviada'
          );

          return;
        } else {
          return;
        }
      }

      const delay = notificationTime.getTime() - now.getTime();

      this.cancelScheduledNotification(notificationId);

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
              url: `/users/traveler/my-trips`,
            },
          });
          this.markNotificationAsSent(notificationId);
        }, delay);

        this.scheduledTimeouts.set(notificationId, timeoutId);
      }

      await this.saveScheduledNotification(
        {
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
            destino,
          },
        },
        'pendiente'
      );
    } catch (error) {
      console.error('❌ Error programando notificación pre-viaje:', error);
    }
  }

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
          url: `/users/traveler/rate-trip/${idplanificacion}`,
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
    }
  }

  async cancelUserTripNotifications(
    idusuario: string,
    idplanificacion: string
  ): Promise<void> {
    const notificationId = `pre-trip-${idplanificacion}-${idusuario}`;

    this.cancelScheduledNotification(notificationId);

    try {
      const { error } = await this.supabase
        .from('notificacion_programada')
        .delete()
        .eq('id', notificationId);
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
        .update({ estado: 'enviada', updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      this.scheduledTimeouts.delete(notificationId);
    } catch (error) {
      console.error('❌ Error actualizando notificación:', error);
    }
  }

  async loadPendingNotifications(idusuario?: string): Promise<void> {
    try {
      let query = this.supabase
        .from('notificacion_programada')
        .select('*')
        .eq('estado', 'pendiente')
        .gte('fechahora_programada', new Date().toISOString());

      if (idusuario) {
        query = query.eq('idusuario', idusuario);
      }

      const loadPromise = query;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.LOAD_TIMEOUT)
      );

      const { data, error } = (await Promise.race([
        loadPromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        console.error('❌ Error cargando notificaciones pendientes:', error);
        return;
      }



      if (!data || data.length === 0) {

        return;
      }



      const now = new Date();
      const expiredIds: string[] = [];
      const toSchedule: any[] = [];

      for (const notif of data) {
        const scheduledTime = new Date(notif.fechahora_programada);
        const delay = scheduledTime.getTime() - now.getTime();
        const minutesUntil = Math.round(delay / 1000 / 60);


        if (delay <= 0) {

          expiredIds.push(notif.id);
          continue;
        }

        // Programar si falta menos de 24 horas
        if (delay <= 24 * 60 * 60 * 1000) {
          toSchedule.push({ notif, delay });
        }
      }

      // Marcar expiradas
      if (expiredIds.length > 0) {

        const { error: updateError } = await this.supabase
          .from('notificacion_programada')
          .update({ estado: 'expirada' })
          .in('id', expiredIds);

        if (updateError) {
          console.error('❌ Error marcando como expiradas:', updateError);
        }
      }

      // Programar las pendientes
      for (const { notif, delay } of toSchedule) {
        const minutesUntil = Math.round(delay / 1000 / 60);


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


    } catch (error) {
      if (error instanceof Error && error.message === 'Timeout') {
        console.warn(
          '⚠️ Timeout cargando notificaciones - continuando sin bloquear'
        );
      } else {
        console.error('❌ Error en loadPendingNotifications:', error);
      }
    }
  }

  async initializeNotifications(idusuario?: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {

      this.isInitialized = true;

      // Cargar notificaciones pendientes
      await this.loadPendingNotifications(idusuario);

      // Verificar cada minuto por notificaciones pendientes
      setInterval(() => {
        this.loadPendingNotifications(idusuario);
      }, 60000); // cada 60 segundos

    } catch (error) {
      console.error('❌ Error inicializando notificaciones:', error);
      throw error;
    }
  }

  ngOnDestroy(): void {
    this.scheduledTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.scheduledTimeouts.clear();
  }
}
