import { Component, signal } from '@angular/core';
import { Emptystate } from '../../../../components/emptystate/emptystate';

@Component({
  selector: 'app-trip-planning-page',
  imports: [Emptystate],
  templateUrl: './trip-planning-page.html',
  styleUrl: './trip-planning-page.scss'
})
export class TripPlanningPage {
  data = signal<string|null>(null)
}
