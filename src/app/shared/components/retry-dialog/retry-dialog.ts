import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface RetryDialogData {
  title: string;
  message: string;
  showRetry?: boolean;
}

@Component({
  selector: 'app-retry-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="flex flex-col items-center p-6">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
        <mat-icon class="!h-10 !w-10 !text-[40px] text-orange-500">wifi_off</mat-icon>
      </div>

      <h2 mat-dialog-title class="!mb-2 !text-xl !font-semibold text-gray-800">
        {{ dialogRef.componentInstance['data']?.title || 'Problemas de conexión' }}
      </h2>

      <mat-dialog-content class="!mb-4 text-center text-gray-600">
        {{ dialogRef.componentInstance['data']?.message || 'No se pudo conectar con el servidor. Por favor verifica tu conexión a internet.' }}
      </mat-dialog-content>

      <mat-dialog-actions class="!flex !gap-3">
        <button mat-button (click)="dialogRef.close(false)" class="!text-gray-600">
          Cancelar
        </button>
        @if (dialogRef.componentInstance['data']?.showRetry !== false) {
          <button mat-raised-button color="primary" (click)="dialogRef.close(true)" class="!px-6">
            Reintentar
          </button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class RetryDialog {
  dialogRef = inject(MatDialogRef<RetryDialog>);
}
