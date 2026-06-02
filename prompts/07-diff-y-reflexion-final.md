# Prompt #07

**Fecha y hora:** 2026-06-02 16:55

**Propósito en una línea:** Cerrar la entrega con el diff de correcciones (humano vs. IA) y la reflexión final.

**Etapa del taller:** 5

**IA usada:** Claude Code (Opus 4.8)

---

### Prompt enviado

```
Genera el diff de correcciones y la reflexión final. Para el diff: la única
línea que toqué a mano fue el puerto por defecto en env.ts (3000 -> 3010); todo
lo demás, incluidas las correcciones de bugs, salió de prompting. Para la
reflexión: (1) la decisión más difícil fue elegir el stack, porque investigué a
fondo para ajustarlo a las restricciones del proyecto y era lo que más
conocimiento exigía; (2) en vivo no evidencié un caso de la IA plausible pero
incorrecta; (3) igual se necesita human-in-the-loop al crear y al validar: los
agentes hacen el trabajo pesado pero no reemplazan el criterio.
```

---

### Resumen de la respuesta de la IA

Antes de escribir verificó el estado real de `env.ts` (puerto `3010`, cambio ya
commiteado dentro de `554f7bf`). Generó dos documentos en `mi-entrega/`:

- **`diff-de-correcciones.md`**: tabla resumen + el único cambio humano (C1, el
  puerto, con su diff) + cuatro correcciones hechas por la IA vía prompting (IA1
  import sin usar, IA2 trim, IA3 jest.config, IA4 flakiness del test de multa),
  cada una con su diff. Concluye que el rol humano fue de dirección y auditoría.
- **`reflexion-final.md`**: respondió las tres preguntas en mi voz, ampliando mis
  ideas con el detalle del proyecto.

Sobre la pregunta 2 me advirtió de una inconsistencia: yo dije "no lo evidencié",
pero la bitácora documenta H9 (la IA dijo "en verde" sin que compilara) y H1 (la
contradicción RN2/RN6 resuelta en silencio). Para no contradecir mi propia
bitácora que el docente también lee, reformuló la respuesta como "en vivo no lo
detecté; lo evidenció la auditoría posterior" citando esos dos casos. Acepté ese
enfoque.

---

### Mi evaluación

**¿La respuesta cumplió con lo que pedí?**

- [x] Completamente.
- [ ] Parcialmente. Faltó: [...]
- [ ] No, se desvió. Hizo: [...]

**¿La acepté tal cual o la modifiqué?**

- [x] Tal cual. (Acepté el ajuste de la pregunta 2 que la IA propuso para no
  contradecir la bitácora.)
- [ ] La modifiqué a mano. Cambios: [...]
- [ ] Le pedí corrección con un prompt nuevo (ver prompt #08).
- [ ] La rechacé completamente. Razón: [...]

**¿Qué aprendí de esta interacción?**

> Que la IA cruzó mis respuestas con los documentos ya escritos y me avisó de una
> contradicción que yo no había visto (decir "no lo evidencié" cuando mi propia
> bitácora sí lo evidenciaba). Mantener coherencia entre entregables es parte de
> la auditoría, no solo revisar el código.
