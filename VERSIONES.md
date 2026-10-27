# Metamorfosis Líquida — versiones locales

Todos los servidores se sirven desde la carpeta raíz del proyecto.

## Demos principales

- `http://localhost:4175/` — Metamorfosis principal: cámara, shader de agua y variación con degradé.
- `http://localhost:4176/literal.html` — Displacement Map con cámara, degradé acuático violeta, agua animada y rayos fijos.
- `http://localhost:4176/literal1.html` — Variante Liquid Chrome sobre cámara + displacement.
- `http://localhost:4177/` — Demo original `water-caustics` de Ethan Fox.
- `http://localhost:4179/liquid-camera.html` — Liquid Chrome sobre cámara con panel hover/touch.
- `http://localhost:4180/liquid-chrome-camera.html` — Variante Liquid Chrome inspirada en Background Studio.
- `http://localhost:4181/` — Water Ripple Distortion de mouse-effects, usando cámara como textura.
- `http://localhost:4181/mask-cursor` — Cámara base + reveal iridiscente desplazado, máscara pintable y ondas ambientales.
- `http://localhost:4182/iridescence-demo.html` — Iridescence procedural con mouse/touch.
- `http://localhost:4182/iridescence-displacement.html` — Cámara + displacement iridiscente con slider.
- `http://localhost:4183/mask-cursor` — Copia independiente de `mask-cursor` para probarla sin tocar 4181.
- `http://localhost:4184/image-follow-cursor` — Versión local de Iridescence Displacement con cámara.
- Vercel temporal: `https://express-amber-krcrpen.tmp.now/mask-cursor` (vence en aproximadamente 60 minutos).
- Para conservarlo en una cuenta de Vercel: `https://vercel.com/claim-deployment?code=dd7661ef-1316-47a5-a783-46a454b59e03`.
- Último deployment actualizado: `https://snappy-eclipse-8mb4v3v.tmp.now/image-follow-cursor`.
- Claim del deployment actualizado: `https://vercel.com/claim-deployment?code=5437c2e2-acd1-4d72-b538-cbe70aa467de`.

## Controles importantes de `mask-cursor`

- `Subtle Water Waves`: ondas ambientales suaves dentro del reveal.
- `Normal Water Displacement`: deformación del ripple que sigue al mouse.
- `Reveal Displacement`: deformación de la cámara desplazada que aparece al revelar.
- `Paint Duration (s)`: duración aproximada de la pintura/reveal.
- `Decay`: duración del ripple de agua transitorio.

## Servidores

- `4175`, `4176`, `4177`, `4179`, `4180` y `4182` usan el servidor local simple de la raíz.
- `4181` usa Next.js dentro de `mouse-effects-demo`.
- `4183` usa la misma app Next.js, en una instancia separada para pruebas.
