/**
 * Validación de bodies de entrada. Cuando un campo falta o tiene el tipo
 * equivocado se lanza `HttpError(400, "datos_invalidos", ...)` (decisión D7),
 * con detalle de qué campo y por qué.
 */
import { HttpError } from "../middlewares/error-handler";

function invalido(campo: string, motivo: string): never {
  throw new HttpError(400, "datos_invalidos", `Campo "${campo}" ${motivo}`, {
    campo,
    motivo,
  });
}

/** El body debe ser un objeto JSON (no null, no array, no primitivo). */
export function asObjeto(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "datos_invalidos", "El body debe ser un objeto JSON", {
      campo: "body",
      motivo: "no es un objeto",
    });
  }
  return body as Record<string, unknown>;
}

/** Exige un string no vacío. */
export function exigirString(body: Record<string, unknown>, campo: string): string {
  const valor = body[campo];
  if (valor === undefined || valor === null) invalido(campo, "es requerido");
  if (typeof valor !== "string") invalido(campo, "debe ser un string");
  if (valor.trim() === "") invalido(campo, "no puede estar vacío");
  return valor;
}

/** Exige un boolean. */
export function exigirBoolean(body: Record<string, unknown>, campo: string): boolean {
  const valor = body[campo];
  if (valor === undefined || valor === null) invalido(campo, "es requerido");
  if (typeof valor !== "boolean") invalido(campo, "debe ser un boolean");
  return valor;
}

/** Exige un entero `>= min`. */
export function exigirEntero(
  body: Record<string, unknown>,
  campo: string,
  min: number,
): number {
  const valor = body[campo];
  if (valor === undefined || valor === null) invalido(campo, "es requerido");
  if (typeof valor !== "number" || !Number.isInteger(valor)) {
    invalido(campo, "debe ser un entero");
  }
  if ((valor as number) < min) invalido(campo, `debe ser >= ${min}`);
  return valor as number;
}
