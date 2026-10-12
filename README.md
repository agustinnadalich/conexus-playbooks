# Conexus · Plan de juego — paquete para publicar

Contenido: `index.html` (la app), `guia.html` (guía ES/IT), `data/` (planes publicados opcionales), `.nojekyll`.

## Claves
| Clave | Espacio | Permiso |
|---|---|---|
| `SanLuis` | San Luis | solo lectura (jugadores) |
| `SanLuisEdit` | San Luis | edición (entrenadores) |
| `PescaraRugby` | Pescara Rugby | solo lectura |
| `PescaraRugbyEdit` | Pescara Rugby | edición |

(No distingue mayúsculas ni espacios.) Mientras no haya base de datos, es un filtro del navegador: **no es seguridad real**. Con Supabase (ver `GUIA-SUPABASE.md`) la restricción pasa a ser real en el servidor.

## Publicar gratis en GitHub Pages (recomendado)
1. Creá cuenta en github.com → **New repository** → nombre `conexus-play` → **Public** → Create.
2. **Add file → Upload files**: arrastrá *el contenido* de esta carpeta (incluí `.nojekyll` y `data/`). Commit.
3. **Settings → Pages → Branch: main / (root) → Save**.
4. En 1–2 minutos queda en `https://TUUSUARIO.github.io/conexus-play/`.
5. Pasales ese link y las claves a cada staff.

Alternativas gratuitas: **Cloudflare Pages** o **Netlify** (arrastrar la carpeta). Con Cloudflare Access se puede tener login real por email.

## Cambiar las claves
La clave se guarda como hash SHA-256 de `conexus-play|<clave en minúsculas, sin espacios>`. Para generar uno nuevo:
```
python3 -c "import hashlib;print(hashlib.sha256(b'conexus-play|nuevaclave').hexdigest())"
```
Reemplazá el valor `hash:'…'` de esa clave en `index.html` (buscar `ACCESS`).

## Publicar un plan oficial por espacio
1. En la app: **Guardar / compartir → Descargar** (archivo `.json`).
2. Guardalo como `data/sanluis.json` o `data/pescara.json`.
3. Subilo al repo. Quien entre por primera vez (sin plan local) lo carga solo; los demás usan **↻ Cargar plan publicado**.
Atención: esos archivos son públicos en internet.

## Cosas a tener en cuenta
- Los datos editados viven en el navegador de cada persona (no hay servidor). Para pasarse planes: Descargar / Cargar.
- Si abrís `index.html` con doble clic (file://), algunos videos de YouTube no se incrustan; publicado sí funciona.
- Idiomas: Español e Italiano. Los textos escritos por los usuarios no se traducen.

## Estructura del repositorio
- `src/app.html` — la aplicación (archivo fuente de trabajo).
- `src/gate.js` — idioma (ES/IT), login por clave y roles.
- `src/tour.js` — tutorial interactivo.
- `src/it_table.txt` — diccionario español → italiano.
- `src/build.py` — arma `docs/index.html` (publicable): `python3 src/build.py`.
- `docs/` — lo que se publica en GitHub Pages (Settings → Pages → Branch main, carpeta **/docs**).
- `supabase/` — `schema.sql` y la guía para crear la base.
- `private/` — datos propios (ignorada por git, no se sube).
