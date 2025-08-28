import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavStateService } from '../../../shared/services/nav-state.service';
import { SupabaseService } from '../../../shared/services/supabase.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-user-toolbar',
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './user-toolbar.html',
  styleUrl: './user-toolbar.scss',
})
export class UserToolbar {
  private dialog = inject(MatDialog);
  private readonly nav = inject(NavStateService);
  private supabaseService = inject(SupabaseService);
  appTitle = input<string>('Mi App');
  userName = input<string>('Usuario');
  showNavBtn = input<boolean>(true);

  collapsed = this.nav.collapsed;

  toggleNav() {
    this.nav.toggleCollapsed();
  }

  async confirmSignOut() {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Cerrar sesión',
        message: '¿Estás seguro de que deseas cerrar sesión?',
      },
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
      await this.supabaseService.supabase.auth.signOut();
    }
  }
}
