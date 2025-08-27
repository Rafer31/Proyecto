import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  SuccessDialog,
  SuccessDialogData,
} from '../components/success-dialog/success-dialog';
import { LoadingDialog } from '../components/loading-dialog/loading-dialog';
import { ErrorDialog, ErrorDialogData } from '../components/error-dialog/error-dialog';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private dialog = inject(MatDialog);
  private loadingDialogRef: MatDialogRef<LoadingDialog> | null = null;

  showSuccessDialog(message: string, title: string) {
    return this.dialog.open(SuccessDialog, {
      data: {
        message,
        title,
        icon: 'check_circle',
        buttonText: 'Aceptar',
      } as SuccessDialogData,
      width: '360px',
      panelClass: 'rounded-xl',
    });
  }

  showLoadingDialog() {
    if (this.loadingDialogRef) {
      return this.loadingDialogRef;
    }

    this.loadingDialogRef = this.dialog.open(LoadingDialog, {
      disableClose: true,
      panelClass: 'rounded-xl',
    });
    this.loadingDialogRef.afterClosed().subscribe(() => {
      this.loadingDialogRef = null;
    });

    return this.loadingDialogRef;
  }

  showErrorDialog(message: string, title?: string) {
    return this.dialog.open(ErrorDialog, {
      data: { message, title } as ErrorDialogData,
      width: '350px',
      panelClass: 'rounded-xl',
    });
  }

  closeAll() {
    this.dialog.closeAll();
    this.loadingDialogRef = null;
  }

  closeLoadingDialog() {
    if (this.loadingDialogRef) {
      this.loadingDialogRef.close();
      this.loadingDialogRef = null;
    }
  }
}
