import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserStateService } from '../../../../../shared/services/user-state.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { SupabaseService } from '../../../../../shared/services/supabase.service';

@Component({
  selector: 'app-staff-home',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="bg-gradient-to-br from-green-50 to-teal-100 p-4 md:p-8">
      <div class="mx-auto max-w-6xl">
        <div class="mb-8 text-center">
          <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            ¡Bienvenido, {{ userName() }}!
          </h1>
          <p class="text-gray-600 text-lg">
            Panel de Personal - Sistema de Transporte Illapa
          </p>
        </div>

        @if (showNotificationBanner()) {
        <mat-card
          class="!rounded-2xl !shadow-lg !bg-yellow-50 !border !border-yellow-300 mb-8"
        >
          <mat-card-content class="p-4 md:p-6">
            <div class="flex items-start gap-4">
              <mat-icon
                class="text-yellow-600 flex-shrink-0 !w-10 !h-10 !text-[40px]"
                >notifications_active</mat-icon
              >
              <div class="flex-1">
                <h3 class="text-lg md:text-xl font-bold text-yellow-900 mb-2">
                  ¡Activa las notificaciones!
                </h3>
                <p class="text-yellow-800 text-sm md:text-base mb-4">
                  Recibe alertas 15 minutos antes de cada viaje para que no te
                  pierdas ninguno.
                </p>
                <button
                  mat-raised-button
                  class="!bg-yellow-600 !text-white hover:!bg-yellow-700"
                  (click)="requestNotificationPermission()"
                >
                  <mat-icon class="mr-2">notifications</mat-icon>
                  Permitir Notificaciones
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        }

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <mat-card
            class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
            (click)="navigateTo('/users/staff/available-trips')"
          >
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div
                  class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 flex-shrink-0"
                >
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-blue-600"
                    >directions_bus</mat-icon
                  >
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">
                    Viajes de Salida
                  </h3>
                  <p class="text-gray-600 text-sm">
                    Consulta y reserva viajes de Salida disponibles
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card
            class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
            (click)="navigateTo('/users/staff/available-returns')"
          >
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div
                  class="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 flex-shrink-0"
                >
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-orange-600"
                    >u_turn_left</mat-icon
                  >
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">
                    Retornos
                  </h3>
                  <p class="text-gray-600 text-sm">
                    Consulta y reserva retornos disponibles
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="!rounded-2xl !shadow-lg">
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div
                  class="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 flex-shrink-0"
                >
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-green-600"
                    >badge</mat-icon
                  >
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">
                    Tu Perfil
                  </h3>
                  <p class="text-gray-600 text-sm mb-1">
                    Miembro del personal activo
                  </p>
                  @if (loadingOperation()) {
                  <p class="text-gray-500 text-xs italic">
                    Cargando operación...
                  </p>
                  } @else if (operacion()) {
                  <p class="text-green-700 text-sm font-semibold">
                    <mat-icon class="!w-4 !h-4 !text-base align-middle mr-1"
                      >location_on</mat-icon
                    >
                    Operación: {{ operacion() }}
                  </p>
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="!rounded-2xl !shadow-lg mb-8">
          <mat-card-content class="p-6">
            <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4">
              <mat-icon class="align-middle mr-2">lightbulb</mat-icon>
              ¿Qué puedes hacer aquí?
            </h2>
            <div class="grid gap-3 md:gap-4 md:grid-cols-2">
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon
                  class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6"
                  >check_circle</mat-icon
                >
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">
                    Reservar viajes de Salida
                  </h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Reserva tu lugar en los viajes programados hacia tu destino
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon
                  class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6"
                  >check_circle</mat-icon
                >
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">
                    Solicitar retornos
                  </h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Programa tus viajes de regreso de manera fácil y rápida
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon
                  class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6"
                  >check_circle</mat-icon
                >
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">
                    Recibir notificaciones
                  </h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Alertas 15 minutos antes de cada viaje y recordatorios
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon
                  class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6"
                  >check_circle</mat-icon
                >
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">
                    Calificar tus viajes
                  </h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Comparte tu experiencia para mejorar el servicio
                  </p>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card
          class="!rounded-2xl !shadow-lg !bg-blue-50 !border !border-blue-200"
        >
          <mat-card-content class="p-4 md:p-6">
            <h3
              class="text-lg md:text-xl font-bold text-blue-800 mb-3 flex items-center"
            >
              <mat-icon class="mr-2 !text-xl md:!text-2xl"
                >tips_and_updates</mat-icon
              >
              Consejos importantes
            </h3>
            <ul class="space-y-2 text-blue-900">
              <li class="flex items-start">
                <mat-icon
                  class="mr-2 text-blue-600 flex-shrink-0 !text-base md:!text-xl mt-0.5"
                  >arrow_right</mat-icon
                >
                <span class="text-sm md:text-base"
                  >Reserva tus viajes con anticipación para asegurar tu
                  lugar</span
                >
              </li>
              <li class="flex items-start">
                <mat-icon
                  class="mr-2 text-blue-600 flex-shrink-0 !text-base md:!text-xl mt-0.5"
                  >arrow_right</mat-icon
                >
                <span class="text-sm md:text-base"
                  >Verifica los horarios de salida antes de cada viaje</span
                >
              </li>
              <li class="flex items-start">
                <mat-icon
                  class="mr-2 text-blue-600 flex-shrink-0 !text-base md:!text-xl mt-0.5"
                  >arrow_right</mat-icon
                >
                <span class="text-sm md:text-base"
                  >Mantén activas las notificaciones para no perderte ningún
                  viaje</span
                >
              </li>
            </ul>
          </mat-card-content>
        </mat-card>

        <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            mat-raised-button
            color="primary"
            class="!px-8 !py-3 !text-lg"
            (click)="navigateTo('/users/staff/available-trips')"
          >
            <mat-icon class="mr-2">directions_bus</mat-icon>
            Ver Viajes de Salida
          </button>
          <button
            mat-raised-button
            color="accent"
            class="!px-8 !py-3 !text-lg"
            (click)="navigateTo('/users/staff/available-returns')"
          >
            <mat-icon class="mr-2">u_turn_left</mat-icon>
            Ver Retornos
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export default class StaffHome implements OnInit {
  private router = inject(Router);
  private userStateService = inject(UserStateService);
  private notificationService = inject(NotificationService);
  private supabaseService = inject(SupabaseService);

  userName = this.userStateService.userName;
  currentUser = this.userStateService.currentUser;

  operacion = signal<string | null>(null);
  showNotificationBanner = signal(false);
  loadingOperation = signal(false);

  async ngOnInit() {
    this.checkNotificationPermission();
    await this.loadOperacion();
  }

  checkNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      this.showNotificationBanner.set(true);
    }
  }

  async requestNotificationPermission() {
    const granted = await this.notificationService.requestPermission();
    if (granted) {
      this.showNotificationBanner.set(false);
      await this.notificationService.initializeNotifications();
    }
  }

  async loadOperacion() {
    try {
      this.loadingOperation.set(true);
      const usuario = this.currentUser();

      if (!usuario) return;

      const { data: personal, error: personalError } =
        await this.supabaseService.supabase
          .from('personal')
          .select('operacion')
          .eq('idusuario', usuario.idusuario)
          .maybeSingle();

      if (personalError || !personal) {
        console.error('Error obteniendo personal:', personalError);
        return;
      }

      this.operacion.set(personal.operacion || 'Sin asignar');
    } catch (error) {
      console.error('Error cargando operación:', error);
    } finally {
      this.loadingOperation.set(false);
    }
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
