# Guía Supabase — paso a paso (sin saber nada previo)

**Qué es Supabase:** un servicio gratuito que guarda los planes en internet para que todo el staff vea y edite lo mismo. La página sigue en GitHub; Supabase es solo la "caja" donde viven los datos.
**Tiempo:** ~15 minutos. **Costo:** $0 (plan Free, sin tarjeta).
**Lo que me tenés que pasar al final:** dos textos (la *Project URL* y la clave *anon / publishable*). **No** me pases la contraseña de la base de datos.

---
## PARTE 1 — Crear la cuenta
1. Abrí **https://supabase.com** y tocá **Start your project** (arriba a la derecha).
2. Elegí **Continue with GitHub** (más simple, ya tenés cuenta). Si te pide autorizar, tocá **Authorize supabase**.
3. Si te pregunta por una "organization": dejá la que aparece (se llama como tu usuario) o tocá **New organization**, escribí `Conexus`, tipo **Personal**, plan **Free** y **Create organization**.

## PARTE 2 — Crear el proyecto
1. Tocá **New project**.
2. Completá:
   - **Name:** `conexus-play`
   - **Database Password:** tocá **Generate a password** y **guardala en un lugar seguro** (gestor de contraseñas o notas). No la vamos a usar en la app, pero Supabase la exige.
   - **Region:** elegí **South America (São Paulo)** (si no aparece, **East US**). Para el staff de Italia también anda bien.
   - Plan: **Free**.
3. Tocá **Create new project**. Va a decir "Setting up your project": esperá 1–2 minutos hasta que cargue el panel.

## PARTE 3 — Crear las tablas (copiar y pegar)
1. En el menú de la izquierda, tocá el ícono **SQL Editor** (parece `>_` o una hoja con código).
2. Tocá **+ New query** (o "New SQL snippet").
3. Abrí el archivo **`schema.sql`** (viene al lado de esta guía), seleccioná **todo** (Cmd/Ctrl + A), copiá (Cmd/Ctrl + C).
4. Pegalo en el editor de Supabase (Cmd/Ctrl + V).
5. Tocá el botón verde **Run** (abajo a la derecha; o Cmd/Ctrl + Enter).
6. Abajo debe decir **Success. No rows returned**. Si aparece un cartel que pregunta por "destructive operation"/"RLS", tocá **Run this query** igualmente (es normal).
7. Verificá: menú izquierdo **Table Editor** → deberías ver tres tablas: `access`, `plans`, `presence`. En `access` hay 4 filas (las 4 claves, guardadas como hash, no en texto).

## PARTE 4 — Copiar los dos datos que necesito
1. Menú izquierdo, abajo: **Project Settings** (ícono de engranaje).
2. Entrá a **Data API** (o **API**). Vas a ver:
   - **Project URL** → algo como `https://abcdefghijkl.supabase.co` → copiala.
   - **Project API keys** → la que dice **anon** `public` (o **publishable**). Tocá **Copy**. *(No uses la que dice `service_role` / `secret`: esa NUNCA se comparte.)*
3. Pegame en el chat esas dos cosas.

> Si los nombres difieren un poco (Supabase cambia la pantalla de tanto en tanto), mandame una captura y te indico dónde tocar.

## Qué es seguro compartir
- La **anon/publishable key** es pública por diseño (va dentro de la página). Qué puede hacer lo controla el `schema.sql`: las tablas están bloqueadas y solo se accede con las funciones que verifican la clave del espacio (SanLuis, SanLuisEdit, …). Una clave de solo lectura **no puede escribir**, aunque alguien intente saltarse la página.
- La **service_role key** y la **Database Password**: no las compartas nunca.

## Límites del plan gratuito (importante)
- Se **pausa tras 7 días sin actividad**. Se reactiva con un clic en el panel ("Restore"). Para evitarlo, con que alguien abra la app una vez por semana alcanza.
- 500 MB de datos: sobra (un plan completo pesa unos cientos de KB).

## Después de que me pases los datos (lo hago yo)
- Conecto la app: lee/guarda el plan de cada espacio en Supabase, avisa "Fulano está editando esta escena" y detecta conflictos si dos personas guardan a la vez.
- Subo tu plan actual de Pescara (que descargues desde la app) a la base.
- Probamos con dos pestañas/dos personas antes de publicar.
