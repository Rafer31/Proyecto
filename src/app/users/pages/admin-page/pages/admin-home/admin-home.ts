import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { UserStateService } from '../../../../../shared/services/user-state.service';

@Component({
  selector: 'app-admin-home',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="bg-gradient-to-br from-purple-50 to-pink-100 p-4 md:p-8">
      <div class="mx-auto max-w-7xl">
        <!-- Header de bienvenida -->
        <div class="mb-8 text-center">
          <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            ¡Bienvenido, {{ userName() }}!
          </h1>
          <p class="text-gray-600 text-lg">
            Panel de Administración - Sistema de Transporte Illapa
          </p>
        </div>

        <!-- Grid de cards de acceso rápido -->
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <!-- Card 1: Estadísticas -->
          <mat-card class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
                    (click)="navigateTo('/users/admin/charts')">
            <mat-card-content class="p-6">
              <div class="flex flex-col items-center text-center">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-3">
                  <mat-icon class="!h-10 !w-10 !text-[40px] text-blue-600">bar_chart</mat-icon>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-1">Estadísticas</h3>
                <p class="text-gray-600 text-sm">
                  Consulta métricas y gráficos del sistema
                </p>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Card 2: Empresas & Vehículos -->
          <mat-card class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
                    (click)="navigateTo('/users/admin/bus-company')">
            <mat-card-content class="p-6">
              <div class="flex flex-col items-center text-center">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-3">
                  <mat-icon class="!h-10 !w-10 !text-[40px] text-green-600">directions_bus</mat-icon>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-1">Empresas</h3>
                <p class="text-gray-600 text-sm">
                  Gestiona empresas y vehículos
                </p>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Card 3: Usuarios -->
          <mat-card class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
                    (click)="navigateTo('/users/admin/manage-users')">
            <mat-card-content class="p-6">
              <div class="flex flex-col items-center text-center">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 mb-3">
                  <mat-icon class="!h-10 !w-10 !text-[40px] text-orange-600">people</mat-icon>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-1">Usuarios</h3>
                <p class="text-gray-600 text-sm">
                  Administra usuarios del sistema
                </p>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Card 4: Planificación -->
          <mat-card class="!rounded-2xl !shadow-lg hover:!shadow-xl transition-all cursor-pointer"
                    (click)="navigateTo('/users/admin/trip-planning')">
            <mat-card-content class="p-6">
              <div class="flex flex-col items-center text-center">
                <div class="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 mb-3">
                  <mat-icon class="!h-10 !w-10 !text-[40px] text-purple-600">event_note</mat-icon>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-1">Planificación</h3>
                <p class="text-gray-600 text-sm">
                  Planifica viajes y horarios
                </p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Información de funcionalidades -->
        <mat-card class="!rounded-2xl !shadow-lg mb-8">
          <mat-card-content class="p-6">
            <h2 class="text-xl md:text-2xl font-bold text-gray-800 mb-4">
              <mat-icon class="align-middle mr-2">admin_panel_settings</mat-icon>
              Funcionalidades de Administración
            </h2>
            <div class="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Gestión de usuarios</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Crear, editar y desactivar usuarios del sistema
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Control de empresas</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Administrar empresas de transporte y sus vehículos
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Planificación de viajes</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Crear y gestionar itinerarios de viajes
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Estadísticas y reportes</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Visualizar métricas y generar reportes
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Asignación de roles</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Definir permisos y roles de usuario
                  </p>
                </div>
              </div>
              <div class="flex items-start space-x-2 md:space-x-3">
                <mat-icon class="text-purple-600 flex-shrink-0 !w-6 !h-6 !text-2xl !leading-6">check_circle</mat-icon>
                <div class="min-w-0">
                  <h4 class="font-semibold text-gray-800 text-sm md:text-base">Monitoreo del sistema</h4>
                  <p class="text-xs md:text-sm text-gray-600">
                    Supervisar el funcionamiento general
                  </p>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Acceso rápido a acciones comunes -->
        <div class="grid gap-6 md:grid-cols-3 mb-8">
          <mat-card class="!rounded-2xl !shadow-lg !bg-gradient-to-br !from-blue-500 !to-blue-600 !text-white">
            <mat-card-content class="p-6">
              <h3 class="text-xl font-bold mb-4">Acciones Rápidas</h3>
              <div class="space-y-3">
                <button mat-stroked-button class="w-full !text-white !border-white"
                        (click)="navigateTo('/users/admin/manage-users')">
                  <mat-icon class="mr-2">person_add</mat-icon>
                  Crear Usuario
                </button>
                <button mat-stroked-button class="w-full !text-white !border-white"
                        (click)="navigateTo('/users/admin/trip-planning')">
                  <mat-icon class="mr-2">add_circle</mat-icon>
                  Crear Viaje
                </button>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="!rounded-2xl !shadow-lg !bg-gradient-to-br !from-green-500 !to-green-600 !text-white">
            <mat-card-content class="p-6">
              <h3 class="text-xl font-bold mb-4">Estado del Sistema</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center">
                  <span>Sistema</span>
                  <mat-icon class="text-white">check_circle</mat-icon>
                </div>
                <div class="flex justify-between items-center">
                  <span>Base de Datos</span>
                  <mat-icon class="text-white">check_circle</mat-icon>
                </div>
                <div class="flex justify-between items-center">
                  <span>Notificaciones</span>
                  <mat-icon class="text-white">check_circle</mat-icon>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="!rounded-2xl !shadow-lg !bg-gradient-to-br !from-purple-500 !to-purple-600 !text-white">
            <mat-card-content class="p-6">
              <h3 class="text-xl font-bold mb-4">Panel de Control</h3>
              <p class="text-white text-opacity-90 mb-4">
                Tienes acceso completo a todas las funcionalidades administrativas del sistema.
              </p>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Tips de administración -->
        <mat-card class="!rounded-2xl !shadow-lg !bg-purple-50 !border !border-purple-200">
          <mat-card-content class="p-4 md:p-6">
            <h3 class="text-lg md:text-xl font-bold text-purple-800 mb-3 flex items-center">
              <mat-icon class="mr-2 !text-xl md:!text-2xl">tips_and_updates</mat-icon>
              Consejos de administración
            </h3>
            <ul class="space-y-2 text-purple-900">
              <li class="flex items-start">
                <mat-icon class="mr-2 text-purple-600 flex-shrink-0 !w-5 !h-5 !text-xl !leading-5">arrow_right</mat-icon>
                <span class="text-sm md:text-base">Revisa regularmente las estadísticas para identificar tendencias</span>
              </li>
              <li class="flex items-start">
                <mat-icon class="mr-2 text-purple-600 flex-shrink-0 !w-5 !h-5 !text-xl !leading-5">arrow_right</mat-icon>
                <span class="text-sm md:text-base">Mantén actualizados los datos de empresas y vehículos</span>
              </li>
              <li class="flex items-start">
                <mat-icon class="mr-2 text-purple-600 flex-shrink-0 !w-5 !h-5 !text-xl !leading-5">arrow_right</mat-icon>
                <span class="text-sm md:text-base">Planifica los viajes con anticipación para mejor organización</span>
              </li>
              <li class="flex items-start">
                <mat-icon class="mr-2 text-purple-600 flex-shrink-0 !w-5 !h-5 !text-xl !leading-5">arrow_right</mat-icon>
                <span class="text-sm md:text-base">Monitorea el estado de los usuarios y sus actividades</span>
              </li>
            </ul>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export default class AdminHome {
  private router = inject(Router);
  private userStateService = inject(UserStateService);

  userName = this.userStateService.userName;

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}
