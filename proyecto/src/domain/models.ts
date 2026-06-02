/**
 * Modelos del dominio — Sistema de Préstamo de Libros (Biblioteca UCaldas).
 *
 * Estos tipos reflejan literalmente el modelo de datos de la especificación
 * (`mi-entrega/especificacion.md`, sección 3). No contienen lógica: solo
 * describen la forma de los datos que viven en memoria.
 */

/** Estado físico de un ejemplar (RN5). */
export type EstadoEjemplar = "disponible" | "prestado";

/** Tipo de estudiante; determina el cupo de préstamos (RN1) y RN10. */
export type TipoEstudiante = "pregrado" | "posgrado";

/** Estado persistido de un préstamo. "vencido" NO es un estado: se calcula al vuelo (RN12, D4). */
export type EstadoPrestamo = "activo" | "devuelto";

/** Un título del catálogo. Puede tener varios ejemplares físicos. */
export interface Libro {
  /** ID único del libro (UUID generado por la API). */
  id: string;
  titulo: string;
  autor: string;
  /** Sala donde se ubica. */
  sala: string;
  /** `true` si es de sala de reserva → plazo de 3 días (RN2). */
  alta_demanda: boolean;
}

/** Ejemplar físico de un libro. La "llave" real del préstamo es su código de inventario. */
export interface Ejemplar {
  /** Código del ejemplar físico (identificador único). */
  codigo_inventario: string;
  /** A qué libro pertenece. */
  libro_id: string;
  estado: EstadoEjemplar;
  /** `true` si otro estudiante ya pidió este ejemplar; bloquea renovar (RN6, D3). */
  solicitado_por_otro: boolean;
}

/** Estudiante de pregrado o posgrado. */
export interface Estudiante {
  /** Código institucional (identificador único). */
  codigo: string;
  nombre: string;
  programa: string;
  /** Semestre actual (≥ 1). */
  semestre: number;
  tipo: TipoEstudiante;
}

/** Un préstamo de un ejemplar a un estudiante. */
export interface Prestamo {
  /** ID único del préstamo (UUID). */
  id: string;
  estudiante_codigo: string;
  ejemplar_codigo: string;
  /** Cuándo se prestó (ISO 8601 UTC). */
  fecha_prestamo: string;
  /** Cuándo lo tiene que devolver (ISO 8601 UTC). */
  fecha_devolucion_esperada: string;
  /** Cuándo lo devolvió de verdad. `null` mientras esté activo. */
  fecha_devolucion_real: string | null;
  estado: EstadoPrestamo;
  /** Cuántas veces se renovó (arranca en 0). */
  renovaciones: number;
}

/** Multa generada al devolver tarde (RN8). Solo se calcula; el pago es presencial (D5). */
export interface Multa {
  /** ID único (UUID). */
  id: string;
  estudiante_codigo: string;
  prestamo_id: string;
  /** Días de retraso (calendario, redondeados hacia arriba — D1). */
  dias_retraso: number;
  /** `dias_retraso * TARIFA_MULTA_DIA_COP`. */
  monto_cop: number;
  /** `false` al crearla; no hay endpoint para marcarla pagada (D5). */
  pagada: boolean;
  /** Cuándo se generó (ISO 8601 UTC). */
  fecha_generacion: string;
}
