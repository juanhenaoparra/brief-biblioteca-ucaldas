La especificacion principal del proyecto esta en @mi-entrega/especificacion.md

# Proceso

Cada vez que el usuario pida algo a la IA, guardas el prompt en un archivo Markdown numerado:

```
prompts/
├── 01-generacion-inicial.md
├── 02-correccion-validacion-fechas.md
├── 03-tests-reglas-negocio.md
├── 04-correccion-bug-cupo.md
└── ...
```

Cada archivo debe tener:

- **Fecha y hora** del prompt.
- **Propósito** en una línea.
- **Prompt completo** que enviaste.
- **Resumen de la respuesta** de la IA (no la respuesta completa, solo qué hizo).
- **Tu evaluación:** ¿la respuesta fue útil? ¿la aceptaste tal cual? ¿la modificaste?


Plantilla en `02-tu-trabajo/plantilla-prompts.md`.