import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

interface ConfirmDialogData {
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.scss'],
})
export class ConfirmDialog {
  private dialogRef = inject(MatDialogRef<ConfirmDialog>);
  public data = inject(MAT_DIALOG_DATA) as ConfirmDialogData;

  public cancelText = this.data.cancelText ?? 'Cancelar';
  public confirmText = this.data.confirmText ?? 'Aceptar';

  onConfirm() {
    this.dialogRef.close(true);
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
