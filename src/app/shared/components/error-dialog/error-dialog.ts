import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
export interface ErrorDialogData {
  title?: string;
  message: string;
}
@Component({
  selector: 'app-error-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './error-dialog.html',
  styleUrl: './error-dialog.scss',
})
export class ErrorDialog {
  readonly dialogRef = inject(MatDialogRef<ErrorDialog>);
  readonly data = inject<ErrorDialogData>(MAT_DIALOG_DATA);

  close() {
    this.dialogRef.close();
  }
}
