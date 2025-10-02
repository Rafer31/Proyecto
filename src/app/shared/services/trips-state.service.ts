import { Injectable, signal, computed } from '@angular/core';

export interface Viaje {
  idviaje: string;
  fechaPartida: string;
  fechaLlegada: string;
  horaPartida: string;
  horaLlegada: string;
  destino: string;
  asientosDisponibles: number;
}

@Injectable({ providedIn: 'root' })
export class TripsStateService {
  private readonly _trips = signal<Viaje[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _userDestination = signal<string | null>(null);

  // Señales públicas de solo lectura
  readonly trips = computed(() => this._trips());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());
  readonly userDestination = computed(() => this._userDestination());
  readonly hasTrips = computed(() => this._trips().length > 0);

  // Métodos para actualizar el estado
  setTrips(trips: Viaje[]) {
    this._trips.set(trips);
    this._error.set(null);
  }

  setLoading(loading: boolean) {
    this._isLoading.set(loading);
  }

  setError(error: string | null) {
    this._error.set(error);
    this._isLoading.set(false);
  }

  setUserDestination(destination: string | null) {
    this._userDestination.set(destination);
  }

  clearTrips() {
    this._trips.set([]);
    this._error.set(null);
    this._isLoading.set(false);
    this._userDestination.set(null);
  }

  // Método para filtrar viajes por destino
  getTripsByDestination(destination: string) {
    return computed(() =>
      this._trips().filter(trip =>
        trip.destino.toLowerCase().includes(destination.toLowerCase())
      )
    );
  }
}

