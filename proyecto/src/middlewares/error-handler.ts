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
  res.status(500).json({ error: "error_interno" });
}
