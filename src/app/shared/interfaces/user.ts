export interface Rol {
  idrol: string;
  nomrol: string;
}
export interface AsignacionDestino {
  idasignaciondestino: string;
  fechainicio: Date | null;
  fechafin: Date | null;
  observacion: string | null;
  nroficha: string;
  destino?: {
    iddestino: string;
    nomdestino: string;
  } | null;
}

export interface Personal {
  nroficha: string;
  idusuario: string;
  operacion: string;
  asignacion_destino: AsignacionDestino[];
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
  extraInfo?: string; // campo calculado para mostrar en UI
}
