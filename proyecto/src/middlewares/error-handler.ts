import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message ?? code);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "ruta_no_encontrada" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, ...err.details });
    return;
  }
  // JSON malformado en el body: body-parser lanza un error con type
  // "entity.parse.failed". Es culpa del cliente (400), no del servidor (500).
  if (err instanceof Error && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({ error: "json_invalido" });
    return;
  }
  // Un error no controlado (no HttpError) es un fallo del servidor: lo registramos
  // para poder diagnosticarlo en vez de tragarlo en silencio.
  console.error("[error_interno]", err);
  res.status(500).json({ error: "error_interno" });
}
