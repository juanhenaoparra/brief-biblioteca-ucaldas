import type { Request, Response } from "express";
import {
  historialEstudiante,
  obtenerEstudiante,
  registrarEstudiante,
} from "../services/estudiante.service";

export function postEstudiante(req: Request, res: Response): void {
  const estudiante = registrarEstudiante(req.body);
  res.status(201).json(estudiante);
}

export function getEstudiante(req: Request, res: Response): void {
  res.status(200).json(obtenerEstudiante(req.params.codigo));
}

export function getHistorial(req: Request, res: Response): void {
  res.status(200).json(historialEstudiante(req.params.codigo));
}
