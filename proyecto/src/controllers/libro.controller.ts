import type { Request, Response } from "express";
import {
  agregarEjemplar,
  crearLibro,
  listarLibros,
  obtenerLibro,
} from "../services/catalogo.service";
import { leerBoolean, leerString } from "../utils/query";

export function postLibro(req: Request, res: Response): void {
  const libro = crearLibro(req.body);
  res.status(201).json(libro);
}

export function getLibros(req: Request, res: Response): void {
  const libros = listarLibros({
    disponibles: leerBoolean(req.query.disponibles, "disponibles"),
    sala: leerString(req.query.sala),
  });
  res.status(200).json(libros);
}

export function getLibro(req: Request, res: Response): void {
  res.status(200).json(obtenerLibro(req.params.id));
}

export function postEjemplar(req: Request, res: Response): void {
  const ejemplar = agregarEjemplar(req.params.id, req.body);
  res.status(201).json(ejemplar);
}
