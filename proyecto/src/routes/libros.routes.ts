import { Router } from "express";
import {
  getLibro,
  getLibros,
  postEjemplar,
  postLibro,
} from "../controllers/libro.controller";

export const librosRouter = Router();

librosRouter.get("/libros", getLibros);
librosRouter.post("/libros", postLibro);
librosRouter.get("/libros/:id", getLibro);
librosRouter.post("/libros/:id/ejemplares", postEjemplar);
