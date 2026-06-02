import type { Request, Response } from "express";
import {
  crearPrestamo,
  devolverPrestamo,
  listarPrestamos,
  listarVencidos,
  renovarPrestamo,
  solicitarEspera,
} from "../services/prestamo.service";
import { leerBoolean, leerString } from "../utils/query";

export function postPrestamo(req: Request, res: Response): void {
  const prestamo = crearPrestamo(req.body);
  res.status(201).json(prestamo);
}

export function postDevolucion(req: Request, res: Response): void {
  res.status(200).json(devolverPrestamo(req.params.id));
}

export function postRenovacion(req: Request, res: Response): void {
  res.status(200).json(renovarPrestamo(req.params.id));
}

export function postSolicitudEspera(req: Request, res: Response): void {
  res.status(200).json(solicitarEspera(req.params.id, req.body));
}

export function getPrestamos(req: Request, res: Response): void {
  const prestamos = listarPrestamos({
    estudiante: leerString(req.query.estudiante),
    vencidos: leerBoolean(req.query.vencidos, "vencidos"),
  });
  res.status(200).json(prestamos);
}

export function getVencidos(_req: Request, res: Response): void {
  res.status(200).json(listarVencidos());
}
