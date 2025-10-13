import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
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
  private swPush = inject(SwPush);
  private supabase = inject(SupabaseService).supabase;
  private scheduledTimeouts = new Map<string, any>();

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
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
      if (this.swPush.isEnabled) {
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          ...options,
        });
      } else {
        new Notification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          ...options,
        });
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
    const [hora, minuto] = horapartida.split(':').map(Number);
    const departureDate = new Date(fechapartida);
    departureDate.setHours(hora, minuto, 0, 0);

    const notificationTime = new Date(departureDate.getTime() - 15 * 60 * 1000);
    const now = new Date();

    if (notificationTime <= now) {
      return;
    }

    const delay = notificationTime.getTime() - now.getTime();

    if (delay <= 24 * 60 * 60 * 1000) {
      const timeoutId = setTimeout(() => {
        this.showNotification('¡Tu viaje está próximo!', {
          body: `Tu viaje a ${destino} parte en 15 minutos`,
          tag: `pre-trip-${idplanificacion}`,
          requireInteraction: true,
          data: { idplanificacion, type: 'pre-trip' },
        });
        this.removeScheduledNotification(`pre-trip-${idplanificacion}`);
      }, delay);

      this.scheduledTimeouts.set(`pre-trip-${idplanificacion}`, timeoutId);
    }

    await this.saveScheduledNotification({
      id: `pre-trip-${idplanificacion}`,
      type: 'pre-trip',
      idplanificacion,
      scheduledTime: notificationTime.toISOString(),
      title: '¡Tu viaje está próximo!',
      body: `Tu viaje a ${destino} parte en 15 minutos`,
      data: { idplanificacion, type: 'pre-trip' },
    });
  }

  async schedulePostTripNotification(
    idplanificacion: string,
    destino: string
  ): Promise<void> {
    this.showNotification('¡Viaje completado!', {
      body: `¿Cómo fue tu experiencia viajando a ${destino}? Califica el servicio`,
      tag: `post-trip-${idplanificacion}`,
      requireInteraction: true,
      data: { idplanificacion, type: 'post-trip' },
    });
  }

  cancelScheduledNotification(notificationId: string): void {
    const timeoutId = this.scheduledTimeouts.get(notificationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledTimeouts.delete(notificationId);
    }
    this.removeScheduledNotification(notificationId);
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
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Error guardando notificación programada:', error);
      }
    } catch (error) {
      console.error('Error guardando notificación:', error);
    }
  }

  private async removeScheduledNotification(
    notificationId: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('notificacion_programada')
        .update({ estado: 'enviada' })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error actualizando notificación:', error);
    }
  }

  async loadPendingNotifications(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('notificacion_programada')
        .select('*')
        .eq('estado', 'pendiente');

      if (error) {
        console.error('Error cargando notificaciones pendientes:', error);
        return;
      }

      const now = new Date();

      for (const notif of data || []) {
        const scheduledTime = new Date(notif.fechahora_programada);
        const delay = scheduledTime.getTime() - now.getTime();

        if (delay <= 0) {
          await this.supabase
            .from('notificacion_programada')
            .update({ estado: 'expirada' })
            .eq('id', notif.id);
          continue;
        }

        if (delay <= 24 * 60 * 60 * 1000) {
          const timeoutId = setTimeout(() => {
            this.showNotification(notif.titulo, {
              body: notif.mensaje,
              tag: notif.id,
              requireInteraction: true,
              data: notif.datos,
            });
            this.removeScheduledNotification(notif.id);
          }, delay);

          this.scheduledTimeouts.set(notif.id, timeoutId);
        }
      }
    } catch (error) {
      console.error('Error cargando notificaciones pendientes:', error);
    }
  }

  async initializeNotifications(): Promise<void> {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      await this.loadPendingNotifications();
    }
  }
}
