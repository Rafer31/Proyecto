import { Component, inject, signal, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserStateService } from '../../../../../shared/services/user-state.service';
import { NotificationService } from '../../../../../shared/services/notification.service';

@Component({
  selector: 'app-visitant-home',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div class="mx-auto max-w-6xl">
        <!-- Header de bienvenida -->
        <div class="mb-8 text-center">
          <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            ¡Bienvenido, {{ userName() }}!
          </h1>
          <p class="text-gray-600 text-lg">
            Panel de Visitante - Sistema de Transporte Illapa
          </p>
        </div>

        <!-- Banner de notificaciones -->
        @if (showNotificationBanner()) {
        <mat-card class="!rounded-2xl !shadow-lg !bg-yellow-50 !border !border-yellow-300 mb-8">
          <mat-card-content class="p-4 md:p-6">
            <div class="flex items-start gap-4">
              <mat-icon class="text-yellow-600 flex-shrink-0 !w-10 !h-10 !text-[40px]">notifications_active</mat-icon>
              <div class="flex-1">
                <h3 class="text-lg md:text-xl font-bold text-yellow-900 mb-2">¡Activa las notificaciones!</h3>
                <p class="text-yellow-800 text-sm md:text-base mb-4">
                  Recibe alertas sobre tus viajes y mantente informado.
                </p>
                <button
                  mat-raised-button
                  class="!bg-yellow-600 !text-white hover:!bg-yellow-700"
                  (click)="requestNotificationPermission()">
                  <mat-icon class="mr-2">notifications</mat-icon>
                  Permitir Notificaciones
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        }

        <!-- Grid de cards informativos -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <!-- Card 1: Viajes Disponibles -->
          <mat-card class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
                    (click)="navigateTo('/users/visitant/available-visitant-trips')">
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-blue-600">directions_bus</mat-icon>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">Ver Viajes</h3>
                  <p class="text-gray-600 text-sm">
                    Consulta los viajes disponibles y reserva tu lugar
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Card 2: Información -->
          <mat-card class="!rounded-2xl !shadow-lg">
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-green-600">info</mat-icon>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">Tu Perfil</h3>
                  <p class="text-gray-600 text-sm">
                    Visitante externo autorizado
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Card 3: Ayuda -->
          <mat-card class="!rounded-2xl !shadow-lg">
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 flex-shrink-0">
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-purple-600">help</mat-icon>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">¿Necesitas ayuda?</h3>
                  <p class="text-gray-600 text-sm">
                    Contacta al administrador para asistencia
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Información de uso -->
        <mat-card class="!rounded-2xl !shadow-lg">
          <mat-card-content class="p-6">
            <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4">
              <mat-icon class="align-middle mr-2">lightbulb</mat-icon>
              ¿Qué puedes hacer aquí?
            </h2>
            <div class="grid gap-3 md:gap-4 md:grid-cols-2">
              <div class="flex items-start space-x-2 md:space-x-3">
                 <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Consultar viajes disponibles</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Revisa horarios y disponibilidad de los viajes programados
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                 <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Reservar tu lugar</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Solicita tu reserva en los viajes que necesites
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                 <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Recibir notificaciones</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Mantente informado sobre tus viajes reservados
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                 <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Gestionar tus reservas</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Consulta el estado de tus solicitudes
                  </p>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Botón de acción principal -->
        <div class="mt-8 text-center">
          <button
            mat-raised-button
            color="primary"
            class="!px-8 !py-3 !text-lg"
            (click)="navigateTo('/users/visitant/available-visitant-trips')">
            <mat-icon class="mr-2">search</mat-icon>
            Ver Viajes Disponibles
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export default class VisitantHome implements OnInit {
  private router = inject(Router);
  private userStateService = inject(UserStateService);
  private notificationService = inject(NotificationService);

  userName = this.userStateService.userName;
  showNotificationBanner = signal(false);

  ngOnInit() {
    this.checkNotificationPermission();
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

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
