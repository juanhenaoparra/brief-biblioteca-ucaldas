# Prompt #02

**Fecha y hora:** 2026-05-12 17:05

**Propósito en una línea:** Crear el scaffolding del proyecto (Express + TypeScript) y dejar el setup de testing listo dentro de `proyecto/`.

**Etapa del taller:** 2

**IA usada:** Claude Code (Opus 4.7)

---

### Prompt enviado (literal)

```
si enfocate en el scaffolding del proyecto, enfocate en crear la estructura principal y en hacer setup de los paquetes para testing

hazlo dentro de la carpeta proyecto en la raiz
```

---

### Resumen de la respuesta de la IA

Creó la carpeta `proyecto/` con estructura por capas: `src/{config,domain,repositories,services,controllers,routes,middlewares,utils}` + `tests/{unit,integration}`. Generó `package.json` con Express 4, scripts `dev` (tsx watch), `build`, `start`, `test`, `test:watch`, `test:coverage` y `typecheck`; devDependencies para Jest 29, ts-jest, Supertest, tsx y TypeScript 5. Agregó `tsconfig.json` estricto, `.gitignore`, código base mínimo (`app.ts`, `index.ts`, `config/env.ts`, `routes/health.ts`, `middlewares/error-handler.ts` con `HttpError`, `notFoundHandler` y `errorHandler`) y un smoke test en `tests/integration/health.test.ts` que valida `GET /health` (200) y 404 en rutas inexistentes. Primer intento usó `jest.config.ts`, falló porque Jest pide `ts-node`; lo cambió por `jest.config.js` para no agregar otra dependencia. Corrió `npm install` (388 paquetes), `npm test` (2/2 verdes) y `npm run typecheck` (limpio). Tomó decisiones que no le pedí: usó Express 4 (no 5), agregó middleware `HttpError` para anticipar el manejo de reglas de negocio, y dejó `.gitkeep` en las carpetas vacías para preservar la estructura en git.

---

### Mi evaluación

**¿La respuesta cumplió con lo que pedí?**

- [x] Completamente.
- [ ] Parcialmente. Faltó: [...]
- [ ] No, se desvió. Hizo: [...]

**¿La acepté tal cual o la modifiqué?**

- [x] Tal cual.
- [ ] La modifiqué a mano. Cambios: [...]
- [ ] Le pedí corrección con un prompt nuevo (ver prompt #03).
- [ ] La rechacé completamente. Razón: [...]

**¿Qué aprendí de esta interacción?**

> Jest 29 no parsea `jest.config.ts` sin `ts-node` aunque ya esté `ts-jest` instalado: son piezas distintas (`ts-jest` transforma los tests, `ts-node` carga el config). Para no inflar devDependencies, el config se queda en `.js`. También que la IA tiende a anticipar abstracciones (caso `HttpError`) aun cuando el prompt era solo de scaffolding — útil acá porque la especificación ya define muchos errores con código, pero conviene revisarlo en otros casos donde quizá no se necesite.
