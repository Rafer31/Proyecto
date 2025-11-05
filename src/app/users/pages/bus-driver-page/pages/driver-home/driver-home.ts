import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserStateService } from '../../../../../shared/services/user-state.service';

@Component({
  selector: 'app-driver-home',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="bg-gradient-to-br from-amber-50 to-orange-100 p-4 md:p-8">
      <div class="mx-auto max-w-6xl">
        <!-- Header de bienvenida -->
        <div class="mb-8 text-center">
          <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            ¡Bienvenido, {{ userName() }}!
          </h1>
          <p class="text-gray-600 text-lg">
            Panel de Conductor - Sistema de Transporte Illapa
          </p>
        </div>

        <!-- Grid de cards de acceso rápido -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <!-- Card 1: Viajes Asignados -->
          <mat-card class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
                    (click)="navigateTo('/users/bus-driver/assigned-trips')">
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-blue-600">assignment</mat-icon>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">Viajes Asignados</h3>
                  <p class="text-gray-600 text-sm">
                    Consulta tus viajes de salida programados
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Card 2: Retornos Asignados -->
          <mat-card class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
                    (click)="navigateTo('/users/bus-driver/assigned-returns')">
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 flex-shrink-0">
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-orange-600">assignment_return</mat-icon>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">Retornos Asignados</h3>
                  <p class="text-gray-600 text-sm">
                    Consulta tus retornos programados
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Card 3: Tu Información -->
          <mat-card class="!rounded-2xl !shadow-lg">
            <mat-card-content class="p-6">
              <div class="flex items-start space-x-4">
                <div class="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                  <mat-icon class="!h-8 !w-8 !text-[32px] text-green-600">person</mat-icon>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-800 mb-2">Tu Perfil</h3>
                  <p class="text-gray-600 text-sm">
                    Conductor activo
                  </p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Información de uso -->
        <mat-card class="!rounded-2xl !shadow-lg mb-8">
          <mat-card-content class="p-6">
            <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4">
              <mat-icon class="align-middle mr-2">lightbulb</mat-icon>
              ¿Qué puedes hacer aquí?
            </h2>
            <div class="grid gap-3 md:gap-4 md:grid-cols-2">
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Ver viajes asignados</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Consulta todos los viajes que tienes programados
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                 <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Gestionar retornos</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Administra tus retornos asignados y completa los viajes
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                 <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Ver lista de pasajeros</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Consulta quiénes viajarán contigo en cada viaje
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                 <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Actualizar estado de viajes</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Marca los viajes como completados al finalizar
                  </p>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Responsabilidades importantes -->
        <mat-card class="!rounded-2xl !shadow-lg !bg-amber-50 !border !border-amber-200">
          <mat-card-content class="p-4 md:p-6">
            <h3 class="text-lg md:text-xl font-bold text-amber-800 mb-3 flex items-center">
              <mat-icon class="mr-2 !text-xl md:!text-2xl">verified_user</mat-icon>
              Responsabilidades importantes
            </h3>
            <ul class="space-y-2 text-amber-900">
              <li class="flex items-start">
                <mat-icon class="mr-2 text-amber-600 flex-shrink-0 !text-base md:!text-xl mt-0.5">arrow_right</mat-icon>
                <span class="text-sm md:text-base">Verifica la lista de pasajeros antes de cada salida</span>
              </li>
              <li class="flex items-start">
                <mat-icon class="mr-2 text-amber-600 flex-shrink-0 !text-base md:!text-xl mt-0.5">arrow_right</mat-icon>
                <span class="text-sm md:text-base">Respeta los horarios programados de salida y llegada</span>
              </li>
              <li class="flex items-start">
                <mat-icon class="mr-2 text-amber-600 flex-shrink-0 !text-base md:!text-xl mt-0.5">arrow_right</mat-icon>
                <span class="text-sm md:text-base">Actualiza el estado del viaje al completarlo</span>
              </li>
              <li class="flex items-start">
                <mat-icon class="mr-2 text-amber-600 flex-shrink-0 !text-base md:!text-xl mt-0.5">arrow_right</mat-icon>
                <span class="text-sm md:text-base">Mantén la seguridad de todos los pasajeros durante el viaje</span>
              </li>
            </ul>
          </mat-card-content>
        </mat-card>

        <!-- Botones de acción principal -->
        <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            mat-raised-button
            color="primary"
            class="!px-8 !py-3 !text-lg"
            (click)="navigateTo('/users/bus-driver/assigned-trips')">
            <mat-icon class="mr-2">assignment</mat-icon>
            Ver Viajes Asignados
          </button>
          <button
            mat-raised-button
            color="accent"
            class="!px-8 !py-3 !text-lg"
            (click)="navigateTo('/users/bus-driver/assigned-returns')">
            <mat-icon class="mr-2">assignment_return</mat-icon>
            Ver Retornos Asignados
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
export default class DriverHome {
  private router = inject(Router);
  private userStateService = inject(UserStateService);

  userName = this.userStateService.userName;

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
