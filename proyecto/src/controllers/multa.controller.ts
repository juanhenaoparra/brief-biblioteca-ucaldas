import type { Request, Response } from "express";
import { listarMultas } from "../services/multa.service";
import { leerBoolean, leerString } from "../utils/query";

export function getMultas(req: Request, res: Response): void {
  const multas = listarMultas({
    estudiante: leerString(req.query.estudiante),
    pagada: leerBoolean(req.query.pagada, "pagada"),
  });
  res.status(200).json(multas);
}
