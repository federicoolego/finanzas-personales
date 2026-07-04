# Calculadora Familiar

App de una sola pantalla: **Ingresos − Gastos Fijos − Reservas = Disponible**.
Cada categoría tiene sus ítems, y podés **agregar, editar y eliminar** cualquiera.

Arranca funcionando de una (guarda en el navegador). Si querés que se **comparta
entre dispositivos**, conectás Supabase siguiendo los pasos de abajo.

---

## Cómo usarla

1. Abrí `index.html` en el navegador (o subila a GitHub Pages).
2. Editá los montos y nombres tocando cada campo.
3. Usá **+ Agregar ítem** para sumar filas y la **✕** para borrarlas.
4. El resultado se recalcula solo.

El cartel arriba a la derecha te dice dónde se está guardando:
- **Local** → solo en este navegador/dispositivo.
- **Nube** → en Supabase, compartido entre todos los dispositivos.

---

## ¿Qué es Supabase?

Supabase es un servicio gratuito que te da una **base de datos en la nube** lista
para usar, sin que tengas que montar un servidor. Es la pieza que le faltaba a tu
proyecto anterior: en vez de guardar los datos en cada navegador por separado
(que es lo que hace `localStorage`, y por eso veías cosas distintas en cada
dispositivo), los guarda en un solo lugar central. Así, abras donde abras,
ves lo mismo.

Para esta app usás dos cosas de Supabase:
- una **tabla** llamada `items` donde viven tus ingresos, gastos y reservas;
- dos credenciales (una **URL** y una **clave anon public**) que la app usa para
  conectarse.

## Cómo crear tu cuenta y conectar (5 pasos)

1. **Creá la cuenta**: entrá a https://supabase.com y registrate (podés usar tu
   cuenta de GitHub). Es gratis; el plan free alcanza de sobra para esto.

2. **Creá un proyecto**: botón *New project*. Ponele un nombre (ej.
   `finanzas-familia`), elegí una contraseña para la base (guardala) y la región
   más cercana (South America / São Paulo). Esperá ~1 minuto a que se arme.

3. **Creá la tabla**: en el menú izquierdo entrá a **SQL Editor** → *New query*,
   pegá TODO el contenido del archivo `supabase.sql` que viene en este proyecto y
   apretá **Run**. Eso crea la tabla `items` con los permisos correctos.

4. **Copiá tus credenciales**: menú izquierdo → **Project Settings** (el
   engranaje) → **API**. Copiá:
   - **Project URL** (algo como `https://xxxx.supabase.co`)
   - la clave **anon public** (un texto largo que empieza con `eyJ...`)

5. **Pegalas en la app**: abrí `js/config.js` y completá:
   ```js
   const SUPABASE_URL  = "https://xxxx.supabase.co";
   const SUPABASE_ANON = "eyJhbGciOiJI...";
   ```
   Guardá y recargá la app. El cartel debería pasar a decir **Nube**.

La primera vez que abrís con Supabase conectado, la app carga sola los datos
iniciales. A partir de ahí, todo lo que edites queda guardado en la nube.

---

## Nota de seguridad

La clave **anon public** está pensada para ir en el navegador, no es secreta. Con
la configuración de `supabase.sql`, cualquiera que tenga tu clave y tu URL puede
leer y escribir la tabla. Para uso familiar privado (y sin datos sensibles como
números de cuenta) está bien. Si más adelante querés que solo entren personas
autorizadas, se agrega login de Supabase y se ajustan las políticas de acceso —
avisame y lo armamos.

## Para tu proyecto anterior (gastos-fijos)

El mismo concepto aplica: para que deje de mostrar cosas distintas en cada
dispositivo hay que reemplazar el `localStorage` por Supabase. Es más trabajo
porque tiene varias tablas (gastos, ingresos, montos por mes), pero el camino es
idéntico: crear las tablas, y cambiar el `store.js` para que lea/escriba de la
base en lugar del navegador. Cuando quieras lo encaramos.
