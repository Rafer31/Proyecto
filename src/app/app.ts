import { Component, inject, OnInit, ApplicationRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './shared/services/notification.service';
import { AuthService } from './auth/services/auth.service';
import { SupabaseService } from './shared/services/supabase.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private appRef = inject(ApplicationRef);

  async ngOnInit() {
    this.appRef.isStable
      .pipe(first(stable => stable === true))
      .subscribe(async () => {
        await this.initializeApp();
      });
  }

  private async initializeApp() {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));


      // 1. Solicitar permisos de notificación
      const hasPermission = await this.notificationService.requestPermission();

      if (!hasPermission) {
        console.warn('⚠️ No se otorgaron permisos de notificación');
      }

      // 2. Obtener sesión actual
      const { data: { session }, error: sessionError } = await this.authService.getSession();

      if (sessionError) {
        console.error('❌ Error obteniendo sesión:', sessionError);
        return;
      }

      if (!session?.user) {
        return;
      }


      // 3. Obtener el idusuario usando auth_id
      const { data: userData, error: userError } = await this.supabaseService.supabase
        .from('usuario')
        .select('idusuario')
        .eq('auth_id', session.user.id) // ✅ Usa auth_id
        .single();

      if (userError) {
        console.error('❌ Error obteniendo datos de usuario:', userError);
        return;
      }

      if (!userData?.idusuario) {
        console.warn('⚠️ Usuario sin idusuario en la base de datos');
        return;
      }

      // 4. Inicializar notificaciones
      if (hasPermission) {
        await this.notificationService.initializeNotifications(userData.idusuario);
      }

    } catch (error) {
      console.error('❌ Error inicializando la aplicación:', error);
    }
  }
}
