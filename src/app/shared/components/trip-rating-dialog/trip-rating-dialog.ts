import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface TripRatingDialogData {
  idplanificacion: string;
  destino: string;
  fecha: string;
}

export interface TripRatingDialogResult {
  calificacion: number;
  comentario?: string;
}

@Component({
  selector: 'app-trip-rating-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './trip-rating-dialog.html',
  styleUrl: './trip-rating-dialog.scss',
})
export class TripRatingDialog {
  private dialogRef = inject(MatDialogRef<TripRatingDialog>);
  public data = inject(MAT_DIALOG_DATA) as TripRatingDialogData;

  selectedRating = 0;
  hoveredRating = 0;
  comentario = '';

  stars = [1, 2, 3, 4, 5];

  onStarClick(rating: number) {
    this.selectedRating = rating;
  }

  onStarHover(rating: number) {
    this.hoveredRating = rating;
  }

  onStarLeave() {
    this.hoveredRating = 0;
  }

  getStarIcon(star: number): string {
    const displayRating = this.hoveredRating || this.selectedRating;
    return star <= displayRating ? 'star' : 'star_border';
  }

  getStarColor(star: number): string {
    const displayRating = this.hoveredRating || this.selectedRating;
    if (star <= displayRating) {
      return 'warn';
    }
    return '';
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onSubmit() {
    if (this.selectedRating === 0) {
      return;
    }

    const result: TripRatingDialogResult = {
      calificacion: this.selectedRating,
      comentario: this.comentario.trim() || undefined,
    };

    this.dialogRef.close(result);
  }

  get isValid(): boolean {
    return this.selectedRating > 0;
  }
}
