---
name: spec-impl-game
description: Implementa una spec aprobada de un juego del Arcade Vault siguiendo exactamente /spec-impl (validación de estado, rama spec-NN-slug, pasos con pausa) y, al terminar, lanza en serie el subagente skin-designer y después el subagente mobile-porter sobre ese juego.
disable-model-invocation: true
argument-hint: <NN-juego-id>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(grep:*)
---

# /spec-impl-game — /spec-impl + skins + móvil

## Session context

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Configuración de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, sin archivo de config)"`

Juegos implementados hoy:
!`grep -n "IMPLEMENTED_GAME_IDS" -A6 lib/games.ts 2>/dev/null || echo "(no se encontró IMPLEMENTED_GAME_IDS)"`

---

## Qué hace este comando

Es `/spec-impl` con un final añadido para specs de juegos. **No reescribe `/spec-impl`: lo usa como fuente.** Las fases 1–4 son las suyas, sin cambios; la fase 5 es nueva y encadena dos subagentes del proyecto, uno detrás del otro:

1. `skin-designer` — las tres skins del juego y su selector.
2. `mobile-porter` — el layout táctil de la SPEC 10 y la verificación con Playwright.

Van **en serie, nunca en paralelo**: los dos tocan el player del juego (`components/games/<id>-player.tsx`) y las props de `PlayerShell`, y el segundo tiene que ver ya el selector de skin del primero.

Tus respuestas van en el mismo idioma que el prompt del usuario.

---

## Fases 1–4 — las de /spec-impl

Lee `.claude/skills/spec-impl/SKILL.md` con la tool Read y sigue sus fases 1, 2, 3 y 4 **exactamente**, con `$ARGUMENTS` como argumento. El contexto de sesión que ese archivo inyecta con `!` ya lo tienes arriba: úsalo en su lugar.

Todas sus reglas siguen vigentes: bloqueo si el estado no significa "Aprobado", comprobación del working tree, rama `spec-NN-slug` según `AutoCreateBranch`, resumen de la spec antes de empezar, pausa tras cada paso, nada fuera de alcance, ambigüedades consultadas y **nunca commit automático**.

Un único añadido, al final de la fase 2 (con el estado ya validado):

- Extrae el **id del juego** de la spec: la entrada de catálogo (`id: "<id>"`), la sección `Decisiones` o el id que la spec añade a `IMPLEMENTED_GAME_IDS`.
- Si la spec no es de un juego (no hay id), avisa de que la fase 5 no aplicará y pregunta si seguir como un `/spec-impl` normal. Espera la respuesta.
- Muestra el id junto al bloque `✅ Ready to implement` de la fase 3 (`Juego: <id>`).

---

## Fase 5 — Skins y móvil

Empieza solo cuando la fase 4 haya terminado el último paso del plan y hayas mostrado su mensaje de cierre.

1. **Comprueba que el juego existe de verdad.** El id debe estar en `IMPLEMENTED_GAME_IDS` (`lib/games.ts`) y en el mapa `PLAYERS` (`app/jugar/[id]/page.tsx`), y debe existir `components/games/<id>-player.tsx`. Si falta algo, para y díselo al usuario: los agentes necesitan el player real.

2. **Pide confirmación**, como en cada paso de `/spec-impl`:

   ```
   Implementación terminada. Ahora lanzo, uno detrás del otro:
     1. skin-designer  → skins clasico / neon / retro para <id>
     2. mobile-porter  → layout táctil SPEC 10 para <id>
   ¿Empiezo con skin-designer?
   ```

   Espera un sí explícito.

3. **5a — `skin-designer`.** Lánzalo con la tool Agent (`subagent_type: "skin-designer"`), en primer plano, y espera a que termine. Prompt:

   ```
   Aplica las skins al juego `<id>`.
   Contexto: se acaba de implementar specs/<NN-juego-id>.md en la rama <rama>.
   Trabaja solo sobre <id>. No hagas commit ni cambies de rama.
   ```

   Resume su informe al usuario (archivos tocados, fila en `references/games-with-skins.md`, resultado de `tsc` y `lint`).

   Si el agente falla, no termina o reporta `tsc`/`lint` en rojo: **para**. Muestra el problema y pregunta si corregirlo antes de seguir. No lances `mobile-porter` sobre un árbol roto.

4. **5b — `mobile-porter`.** Solo cuando 5a haya terminado bien, lánzalo con la tool Agent (`subagent_type: "mobile-porter"`), en primer plano. Prompt:

   ```
   Adapta el juego `<id>` al layout táctil de la SPEC 10 (modo juego).
   Contexto: se acaba de implementar specs/<NN-juego-id>.md y skin-designer ya
   le añadió el selector de skin. Rama <rama>.
   Trabaja solo sobre <id>. No hagas commit ni cambies de rama.
   ```

   Resume su informe (archivos tocados, fila en `references/games-mobile-ready.md`, capturas, y si la verificación táctil quedó pendiente).

---

## Cierre

```
✅ Juego <id> implementado, con skins y listo para móvil.

- Spec:   specs/<NN-juego-id>.md
- Skins:  references/games-with-skins.md
- Móvil:  references/games-mobile-ready.md

Siguiente paso: verifica los criterios de aceptación uno a uno. Si pasan,
cambia el estado de la spec a "Implementado" y haz tú el commit final
antes de mergear la rama.
```

---

## Resumen del comportamiento esperado

```
/spec-impl-game 12-juego-frogger   (estado: Aprobado)

  Fases 1–4  →  las de /spec-impl: rama spec-12-juego-frogger, pasos con pausa
                id del juego detectado: frogger
  Fase 5     →  confirma → skin-designer (espera) → mobile-porter (espera)
  Cierre     →  recuerda verificar criterios; el commit lo hace el usuario

/spec-impl-game 09   (estado: Implementado)

  Fase 2     →  ❌ para con el mensaje de error de /spec-impl
                no crea rama, no toca código, no lanza agentes
```
