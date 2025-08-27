import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface SuccessDialogData {
  message: string;
  title?: string;
  icon?: string;
  buttonText: string | null;
}

@Component({
  selector: 'app-success-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './success-dialog.html',
  styleUrl: './success-dialog.scss',
})
export class SuccessDialog {
  private dialogRef = inject(MatDialogRef<SuccessDialog>);
  readonly data = inject<SuccessDialogData>(MAT_DIALOG_DATA);

  close() {
    this.dialogRef.close();
  }
}
