/**
 * Servicio de préstamos: el corazón de las reglas de negocio.
 * Endpoints: POST /prestamos, POST /prestamos/:id/devolucion, .../renovacion,
 * .../solicitud-espera, GET /prestamos, GET /prestamos/vencidos.
 */
import { randomUUID } from "crypto";
import { LIMITE_PRESTAMOS, PLAZO_ALTA_DEMANDA_DIAS, PLAZO_NORMAL_DIAS } from "../domain/constants";
import type { Ejemplar, Libro, Multa, Prestamo } from "../domain/models";
import { HttpError } from "../middlewares/error-handler";
import {
  ejemplarRepository,
  estudianteRepository,
  libroRepository,
  multaRepository,
  prestamoRepository,
} from "../repositories";
import { ahora, diasRetraso, fechaYaPaso, sumarDias } from "../utils/fechas";
import { TARIFA_MULTA_DIA_COP } from "../domain/constants";
import { asObjeto, exigirString } from "../utils/validacion";

/** Préstamo enriquecido con el flag `vencido` calculado al vuelo (RN12, D4). */
export interface PrestamoConVencido extends Prestamo {
  vencido: boolean;
}

/** Filtros de `GET /prestamos`. */
export interface FiltrosPrestamos {
  estudiante?: string;
  vencidos?: boolean;
}

/** Días de plazo según el tipo de libro (RN2). */
function plazoDias(libro: Libro): number {
  return libro.alta_demanda ? PLAZO_ALTA_DEMANDA_DIAS : PLAZO_NORMAL_DIAS;
}

/** Un préstamo está vencido si está activo y su fecha esperada ya pasó (RN12). */
function esVencido(prestamo: Prestamo, referenciaIso: string): boolean {
  return prestamo.estado === "activo" && fechaYaPaso(prestamo.fecha_devolucion_esperada, referenciaIso);
}

function conVencido(prestamo: Prestamo, referenciaIso: string = ahora()): PrestamoConVencido {
  return { ...prestamo, vencido: esVencido(prestamo, referenciaIso) };
}

function libroDeEjemplar(ejemplar: Ejemplar): Libro {
  const libro = libroRepository.get(ejemplar.libro_id);
  if (!libro) {
    // No debería pasar: un ejemplar siempre apunta a un libro existente.
    throw new HttpError(500, "libro_de_ejemplar_no_encontrado");
  }
  return libro;
}

/**
 * POST /prestamos — presta un ejemplar a un estudiante.
 * Orden de validación: existencia (404) → ejemplar disponible (RN5) →
 * cupo (RN1) → sin vencidos (RN3) → sin multas pendientes (RN4).
 */
export function crearPrestamo(body: unknown): Prestamo {
  const datos = asObjeto(body);
  const estudianteCodigo = exigirString(datos, "estudiante_codigo");
  const ejemplarCodigo = exigirString(datos, "ejemplar_codigo");

  const estudiante = estudianteRepository.get(estudianteCodigo);
  if (!estudiante) {
    throw new HttpError(404, "estudiante_no_encontrado", undefined, { codigo: estudianteCodigo });
  }
  const ejemplar = ejemplarRepository.get(ejemplarCodigo);
  if (!ejemplar) {
    throw new HttpError(404, "ejemplar_no_encontrado", undefined, { codigo_inventario: ejemplarCodigo });
  }

  // RN5 — un ejemplar no se presta dos veces a la vez.
  if (ejemplar.estado !== "disponible") {
    throw new HttpError(409, "ejemplar_no_disponible");
  }

  // RN1 — cupo de préstamos activos según el tipo de estudiante.
  const activos = prestamoRepository.activosByEstudiante(estudianteCodigo);
  const limite = LIMITE_PRESTAMOS[estudiante.tipo];
  if (activos.length >= limite) {
    throw new HttpError(409, "limite_prestamos_alcanzado", undefined, {
      limite,
      actuales: activos.length,
    });
  }

  // RN3 — bloqueado si tiene préstamos vencidos.
  const referencia = ahora();
  const vencidos = activos.filter((p) => esVencido(p, referencia));
  if (vencidos.length > 0) {
    throw new HttpError(409, "tiene_prestamos_vencidos", undefined, {
      prestamos_vencidos: vencidos.map((p) => p.id),
    });
  }

  // RN4 — bloqueado si tiene multas sin pagar.
  const multasPendientes = multaRepository.pendientesByEstudiante(estudianteCodigo);
  if (multasPendientes.length > 0) {
    const montoTotal = multasPendientes.reduce((acc, m) => acc + m.monto_cop, 0);
    throw new HttpError(409, "tiene_multas_pendientes", undefined, { monto_total: montoTotal });
  }

  // Pasó todo: se crea el préstamo y se marca el ejemplar como prestado.
  const libro = libroDeEjemplar(ejemplar);
  const fechaPrestamo = ahora();
  const prestamo: Prestamo = {
    id: randomUUID(),
    estudiante_codigo: estudianteCodigo,
    ejemplar_codigo: ejemplarCodigo,
    fecha_prestamo: fechaPrestamo,
    fecha_devolucion_esperada: sumarDias(fechaPrestamo, plazoDias(libro)), // RN2
    fecha_devolucion_real: null,
    estado: "activo",
    renovaciones: 0,
  };

  ejemplar.estado = "prestado";
  ejemplarRepository.save(ejemplar);
  return prestamoRepository.save(prestamo);
}

/**
 * POST /prestamos/:id/devolucion — devuelve un préstamo activo y, si llega tarde,
 * genera la multa (RN8, RN9).
 */
export function devolverPrestamo(id: string): { prestamo: Prestamo; multa: Multa | null } {
  const prestamo = prestamoRepository.get(id);
  if (!prestamo) {
    throw new HttpError(404, "prestamo_no_encontrado");
  }

  // RN9 — solo se devuelve un préstamo activo.
  if (prestamo.estado !== "activo") {
    throw new HttpError(409, "prestamo_ya_devuelto_o_invalido", undefined, {
      estado_actual: prestamo.estado,
    });
  }

  const fechaReal = ahora();
  prestamo.estado = "devuelto";
  prestamo.fecha_devolucion_real = fechaReal;
  prestamoRepository.save(prestamo);

  // Liberar el ejemplar y apagar la bandera de lista de espera (D3).
  const ejemplar = ejemplarRepository.get(prestamo.ejemplar_codigo);
  if (ejemplar) {
    ejemplar.estado = "disponible";
    ejemplar.solicitado_por_otro = false;
    ejemplarRepository.save(ejemplar);
  }

  // RN8 — multa si se devolvió tarde.
  let multa: Multa | null = null;
  const retraso = diasRetraso(prestamo.fecha_devolucion_esperada, fechaReal);
  if (retraso > 0) {
    multa = multaRepository.save({
      id: randomUUID(),
      estudiante_codigo: prestamo.estudiante_codigo,
      prestamo_id: prestamo.id,
      dias_retraso: retraso,
      monto_cop: retraso * TARIFA_MULTA_DIA_COP,
      pagada: false,
      fecha_generacion: fechaReal,
    });
  }

  return { prestamo, multa };
}

/**
 * POST /prestamos/:id/renovacion — renueva un préstamo activo si nadie más espera.
 * RN6 suma el plazo a la fecha esperada actual (no desde hoy).
 */
export function renovarPrestamo(id: string): Prestamo {
  const prestamo = prestamoRepository.get(id);
  if (!prestamo) {
    throw new HttpError(404, "prestamo_no_encontrado");
  }

  // RN7 — solo se renuevan préstamos activos.
  if (prestamo.estado !== "activo") {
    throw new HttpError(409, "prestamo_no_renovable_estado", undefined, {
      estado_actual: prestamo.estado,
    });
  }

  const ejemplar = ejemplarRepository.get(prestamo.ejemplar_codigo);
  // RN6 — no se puede renovar si otro estudiante está esperando.
  if (ejemplar?.solicitado_por_otro === true) {
    throw new HttpError(409, "no_renovable_lista_espera");
  }

  const libro = ejemplar ? libroDeEjemplar(ejemplar) : undefined;
  const plazo = libro ? plazoDias(libro) : PLAZO_NORMAL_DIAS;
  prestamo.fecha_devolucion_esperada = sumarDias(prestamo.fecha_devolucion_esperada, plazo); // RN2/RN6
  prestamo.renovaciones += 1;
  return prestamoRepository.save(prestamo);
}

/**
 * POST /prestamos/:id/solicitud-espera — marca que otro estudiante espera el ejemplar (RN11, D3).
 */
export function solicitarEspera(id: string, body: unknown): Prestamo {
  const prestamo = prestamoRepository.get(id);
  if (!prestamo) {
    throw new HttpError(404, "prestamo_no_encontrado");
  }
  const datos = asObjeto(body);
  const solicitante = exigirString(datos, "estudiante_codigo");

  if (!estudianteRepository.has(solicitante)) {
    throw new HttpError(404, "estudiante_no_encontrado", undefined, { codigo: solicitante });
  }

  // RN11 — el préstamo debe estar activo y el solicitante ser distinto al titular.
  if (prestamo.estado !== "activo") {
    throw new HttpError(409, "prestamo_no_activo", undefined, { estado_actual: prestamo.estado });
  }
  if (solicitante === prestamo.estudiante_codigo) {
    throw new HttpError(409, "solicitante_es_titular");
  }

  const ejemplar = ejemplarRepository.get(prestamo.ejemplar_codigo);
  if (ejemplar) {
    ejemplar.solicitado_por_otro = true;
    ejemplarRepository.save(ejemplar);
  }
  return prestamo;
}

/** GET /prestamos — préstamos activos (filtrables), con `vencido` calculado (RN12). */
export function listarPrestamos(filtros: FiltrosPrestamos): PrestamoConVencido[] {
  const referencia = ahora();
  let activos = prestamoRepository.activos();
  if (filtros.estudiante !== undefined) {
    activos = activos.filter((p) => p.estudiante_codigo === filtros.estudiante);
  }
  let resultado = activos.map((p) => conVencido(p, referencia));
  if (filtros.vencidos === true) {
    resultado = resultado.filter((p) => p.vencido);
  }
  return resultado;
}

/** GET /prestamos/vencidos — solo los préstamos activos ya vencidos (RN12). */
export function listarVencidos(): PrestamoConVencido[] {
  const referencia = ahora();
  return prestamoRepository
    .activos()
    .filter((p) => esVencido(p, referencia))
    .map((p) => conVencido(p, referencia));
}
