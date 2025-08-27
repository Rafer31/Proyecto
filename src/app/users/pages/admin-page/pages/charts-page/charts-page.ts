import { Component, signal } from '@angular/core';
import { Emptystate } from '../../../../components/emptystate/emptystate';

@Component({
  selector: 'app-charts-page',
  imports: [Emptystate],
  templateUrl: './charts-page.html',
  styleUrl: './charts-page.scss'
})
export class ChartsPage {
  data = signal<string|null>(null)
}
