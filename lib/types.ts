// lib/types.ts
export interface ClinicalCenter {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  zip_code: string;
  contact_name_1: string;
  email_1: string;
  phone_1: string;
  contact_name_2: string;
  email_2: string;
  phone_2: string;
  contact_name_3: string;
  email_3: string;
  phone_3: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;

  // NUEVO (si hoy no lo vas a usar en la tabla, puede ser opcional)
  type_of_ed?: string | null;

  // NUEVOS CAMPOS (null = ANY)
  age_from?: number | null;
  age_to?: number | null;

  // NUEVO: si el centro ofrece MONITOR
  monitor?: string | null;
}