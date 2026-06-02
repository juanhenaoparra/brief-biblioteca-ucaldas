/**
 * Utilidades de fecha. Todas las fechas se manejan en ISO 8601 UTC (decisión D2).
 * Los días de retraso son días calendario redondeados hacia arriba (decisión D1).
 */

const MS_POR_DIA = 86_400_000;

/** Instante actual en ISO 8601 UTC. */
export function ahora(): string {
  return new Date().toISOString();
}

/** Suma `dias` a una fecha ISO conservando la hora. Útil para los plazos (RN2). */
export function sumarDias(iso: string, dias: number): string {
  const fecha = new Date(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString();
}

/**
 * Días de retraso entre la fecha esperada y la real (RN8, D1).
 * Días calendario redondeados hacia arriba; 0 si no hubo retraso.
 */
export function diasRetraso(esperadaIso: string, realIso: string): number {
  const diffMs = new Date(realIso).getTime() - new Date(esperadaIso).getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / MS_POR_DIA);
}

/**
 * `true` si la fecha esperada ya pasó respecto a la referencia (por defecto, ahora).
 * No mira el estado del préstamo; eso lo decide quien la llama (RN12).
 */
export function fechaYaPaso(esperadaIso: string, referenciaIso: string = ahora()): boolean {
  return new Date(esperadaIso).getTime() < new Date(referenciaIso).getTime();
}
