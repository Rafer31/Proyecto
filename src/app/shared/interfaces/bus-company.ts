export interface BusCompany {
  idempresa: number;
  nomempresa: string;
  nomcontacto: string;
  celcontacto: string;
  estado: string;
  imageUrl?: string;
}

export interface CreateBusCompany {
  nomempresa: string;
  nomcontacto: string;
  celcontacto: string;
  estado: string;
  imageUrl?: string;
}

export interface UpdateBusCompany {
  nomempresa?: string;
  nomcontacto?: string;
  celcontacto?: string;
  imageUrl?: string;
}
