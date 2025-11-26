import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-completed-trip-card',
    imports: [MatCardModule, MatIconModule, MatChipsModule, MatButtonModule],
    templateUrl: './completed-trip-card.html',
    styleUrl: './completed-trip-card.scss',
})
export class CompletedTripCardComponent {
    viaje = input.required<any>();
    exportar = output<string>();

    formatearHora(hora: string | null): string {
        if (!hora) return 'No registrada';
        return hora.substring(0, 5);
    }

    onExportar() {
        this.exportar.emit(this.viaje().idplanificacion);
    }

    getConductorNombre(): string {
        const cve = Array.isArray(this.viaje().conductor_vehiculo_empresa)
            ? this.viaje().conductor_vehiculo_empresa[0]
            : this.viaje().conductor_vehiculo_empresa;

        const conductor = Array.isArray(cve?.conductor)
            ? cve?.conductor[0]
            : cve?.conductor;

        const usuario = Array.isArray(conductor?.usuario)
            ? conductor?.usuario[0]
            : conductor?.usuario;

        if (!usuario) return 'Sin asignar';

        return `${usuario.nomusuario} ${usuario.patusuario}`;
    }

    getVehiculoInfo(): string {
        const cve = Array.isArray(this.viaje().conductor_vehiculo_empresa)
            ? this.viaje().conductor_vehiculo_empresa[0]
            : this.viaje().conductor_vehiculo_empresa;

        const vehiculo = Array.isArray(cve?.vehiculo)
            ? cve?.vehiculo[0]
            : cve?.vehiculo;

        if (!vehiculo) return 'Sin asignar';

        return `${vehiculo.nroplaca} - ${vehiculo.tipovehiculo}`;
    }

    getDestinoNombre(): string {
        const destino = Array.isArray(this.viaje().destino)
            ? this.viaje().destino[0]
            : this.viaje().destino;

        return destino?.nomdestino || 'Sin destino';
    }
}
