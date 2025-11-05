import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ScheduledNotification {
  id: string;
  type: 'pre-trip' | 'post-trip';
  idplanificacion: string;
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

      if (options?.data) {
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }

  async schedulePreTripNotification(
    idplanificacion: string,
    fechapartida: string,
    horapartida: string,
    destino: string
  ): Promise<void> {
    try {
      const [hora, minuto] = horapartida.split(':').map(Number);
      const departureDate = new Date(fechapartida);
      departureDate.setHours(hora, minuto, 0, 0);

      const notificationTime = new Date(departureDate.getTime() - 15 * 60 * 1000);
      const now = new Date();

      if (notificationTime <= now) {
        console.log('La hora de notificación ya pasó, no se programa');
        return;
      }

      const delay = notificationTime.getTime() - now.getTime();
      const notificationId = `pre-trip-${idplanificacion}`;

      this.cancelScheduledNotification(notificationId);

      if (delay <= 24 * 60 * 60 * 1000) {
        const timeoutId = setTimeout(() => {
          this.showNotification('¡Tu viaje está próximo!', {
            body: `Tu viaje a ${destino} parte en 15 minutos`,
            tag: notificationId,
            requireInteraction: true,
            data: { idplanificacion, type: 'pre-trip' },
          });
          this.markNotificationAsSent(notificationId);
        }, delay);

        this.scheduledTimeouts.set(notificationId, timeoutId);
        console.log(`Notificación programada para ${notificationTime.toLocaleString()}`);
      }

      await this.saveScheduledNotification({
        id: notificationId,
        type: 'pre-trip',
        idplanificacion,
        scheduledTime: notificationTime.toISOString(),
        title: '¡Tu viaje está próximo!',
        body: `Tu viaje a ${destino} parte en 15 minutos`,
        data: { idplanificacion, type: 'pre-trip', destino },
      });
    } catch (error) {
      console.error('Error programando notificación pre-viaje:', error);
    }
  }

  async schedulePostTripNotification(
    idplanificacion: string,
    destino: string
  ): Promise<void> {
    try {
      await this.showNotification('¡Viaje completado!', {
        body: `¿Cómo fue tu experiencia viajando a ${destino}? Califica el servicio`,
        tag: `post-trip-${idplanificacion}`,
        requireInteraction: true,
        data: { idplanificacion, type: 'post-trip', destino },
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
      console.log(`Notificación ${notificationId} cancelada`);
    }
  }

  private async saveScheduledNotification(
    notification: ScheduledNotification
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notificacion_programada')
        .upsert(
          {
            id: notification.id,
            tipo: notification.type,
            idplanificacion: notification.idplanificacion,
            fechahora_programada: notification.scheduledTime,
            titulo: notification.title,
            mensaje: notification.body,
            datos: notification.data,
            estado: 'pendiente',
            createdat: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Error guardando notificación programada:', error);
      }
    } catch (error) {
      console.error('Error en saveScheduledNotification:', error);
    }
  }

  /**
   * Marca notificación como enviada
   */
  private async markNotificationAsSent(notificationId: string): Promise<void> {
    try {
      await this.supabase
        .from('notificacion_programada')
        .update({ estado: 'enviada', updatedat: new Date().toISOString() })
        .eq('id', notificationId);

      this.scheduledTimeouts.delete(notificationId);
    } catch (error) {
      console.error('Error actualizando notificación:', error);
    }
  }

  /**
   * Carga notificaciones pendientes desde la base de datos
   * NO BLOQUEA - se ejecuta en background
   */
  async loadPendingNotifications(): Promise<void> {
    try {
      // Timeout para evitar bloqueos
      const loadPromise = this.supabase
        .from('notificacion_programada')
        .select('*')
        .eq('estado', 'pendiente')
        .gte('fechahora_programada', new Date().toISOString());

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.LOAD_TIMEOUT)
      );

      const { data, error } = await Promise.race([
        loadPromise,
        timeoutPromise,
      ]) as any;

      if (error) {
        console.error('Error cargando notificaciones pendientes:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('No hay notificaciones pendientes');
        return;
      }

      const now = new Date();
      const expiredIds: string[] = [];
      const toSchedule: any[] = [];

      for (const notif of data) {
        const scheduledTime = new Date(notif.fechahora_programada);
        const delay = scheduledTime.getTime() - now.getTime();

        // Si ya pasó, marcar como expirada
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

      console.log(`${toSchedule.length} notificaciones programadas, ${expiredIds.length} expiradas`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Timeout') {
        console.warn('Timeout cargando notificaciones - continuando sin bloquear');
      } else {
        console.error('Error en loadPendingNotifications:', error);
      }
    }
  }

  async initializeNotifications(): Promise<void> {
    if (this.isInitialized) {
      console.log('Notificaciones ya inicializadas');
      return;
    }

    try {
      if (this.hasPermission()) {
        console.log('Permisos de notificación concedidos, cargando pendientes...');
        this.loadPendingNotifications().catch(err =>
          console.error('Error cargando notificaciones en background:', err)
        );
      } else {
        console.log('No hay permisos de notificación. Solicítalos desde la UI.');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error inicializando notificaciones:', error);
    }
  }

  ngOnDestroy(): void {
    this.scheduledTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.scheduledTimeouts.clear();
  }
}
