/**
 * Servicio de multas. Solo lectura: las multas se calculan al devolver tarde
 * (RN8) y el pago es presencial, sin endpoint para marcarlas pagadas (D5).
 * Endpoint: GET /multas.
 */
import type { Multa } from "../domain/models";
import { multaRepository } from "../repositories";

/** Filtros de `GET /multas`. */
export interface FiltrosMultas {
  estudiante?: string;
  pagada?: boolean;
}

/** GET /multas — lista de multas, filtrable por estudiante y estado de pago. */
export function listarMultas(filtros: FiltrosMultas): Multa[] {
  let multas = multaRepository.all();
  if (filtros.estudiante !== undefined) {
    multas = multas.filter((m) => m.estudiante_codigo === filtros.estudiante);
  }
  if (filtros.pagada !== undefined) {
    multas = multas.filter((m) => m.pagada === filtros.pagada);
  }
  return multas;
}
