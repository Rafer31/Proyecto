import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-emptystate',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './emptystate.html',
  styleUrl: './emptystate.scss'
})
export class Emptystate {
  imageSrc = input('no-data.svg')
  title = input('No hay información disponible')
  description = input('Aún no se han registrado datos en esta sección')
}
