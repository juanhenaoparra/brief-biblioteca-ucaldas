/**
 * Constantes de negocio — valores fijos que la especificación define como reglas
 * (`mi-entrega/especificacion.md`, sección 5). Centralizadas aquí para que las
 * reglas vivan en un solo sitio y los servicios no usen "números mágicos".
 */

import type { TipoEstudiante } from "./models";

/** RN2 — plazo en días para un libro normal. */
export const PLAZO_NORMAL_DIAS = 15;

/** RN2 — plazo en días para un libro de alta demanda (sala de reserva). */
export const PLAZO_ALTA_DEMANDA_DIAS = 3;

/** RN1 — cupo de préstamos activos según el tipo de estudiante. */
export const LIMITE_PRESTAMOS: Record<TipoEstudiante, number> = {
  pregrado: 3,
  posgrado: 5,
};

/** RN8 — tarifa de multa por día calendario de retraso (COP). */
export const TARIFA_MULTA_DIA_COP = 2000;

/** Tipos de estudiante soportados (RN10). */
export const TIPOS_ESTUDIANTE: readonly TipoEstudiante[] = ["pregrado", "posgrado"];
