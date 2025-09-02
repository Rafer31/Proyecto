export interface Rol {
  idrol: string;
  nomrol: string;
}
export interface AsignacionDestino{
  idasignaciondestino: string,
  fechainicio: Date,
  fechafin: Date,
  observacion: string,
  nroficha: string,
  iddestino: string
}
export interface Personal {
  nroficha: string;
  idusuario: string;
  operacion: string;
}

export interface Visitante {
  idvisitante: string;
  idusuario: string;
  informacion: string;
}

export interface Conductor {
  idconductor: string;
  idusuario: string;
}

export interface Usuario {
  idusuario: string;
  numcelular: string;
  nomusuario: string;
  patusuario: string;
  matusuario: string;
  ci: string;
  idrol: string;
  auth_id: string;
  estado?: string;
  roles: Rol[];
  personal?: Personal | null;
  visitante?: Visitante | null;
  conductor?: Conductor | null;
  asignacion_destino?: AsignacionDestino|null
  extraInfo?: string; // campo calculado para mostrar en UI
}
