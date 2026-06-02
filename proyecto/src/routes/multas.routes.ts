import { Router } from "express";
import { getMultas } from "../controllers/multa.controller";

export const multasRouter = Router();

multasRouter.get("/multas", getMultas);
