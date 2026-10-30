# Mundo Alitas — MVP de registro y canje

Aplicación web responsive para registrar participantes, entregarles un QR único y validar/canjear su premio desde un panel de operador.

## 1. Requisitos

- Node.js 20.9 o superior.
- Visual Studio Code (recomendado).
- Proyecto de Supabase.
- Navegador con permiso para usar cámara.

## 2. Instalar

Abre una terminal dentro de esta carpeta y ejecuta:

```bash
npm install
```

Copia `.env.example` y crea un archivo llamado `.env.local` en la raíz del proyecto.

Completa estas variables desde Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`: Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` del proyecto. Solo se utiliza en el servidor. Nunca la publiques ni la pongas en código del navegador.
- `ADMIN_PASSWORD`: contraseña privada para el operador.
- `ADMIN_SESSION_SECRET`: secreto aleatorio de mínimo 32 caracteres.

Para generar un secreto aleatorio puedes ejecutar:

```bash
openssl rand -base64 32
```

En Windows PowerShell, si no tienes OpenSSL, puedes generar uno con Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Crear la base de datos

1. Entra a Supabase y abre el proyecto.
2. Ve a SQL Editor.
3. Crea una consulta nueva.
4. Copia y ejecuta todo el contenido de `supabase/setup.sql`.
5. Revisa que se haya creado `public.participants` y la función `redeem_participant`.

La tabla no tiene políticas de lectura pública. El navegador llama a rutas del servidor; la clave privilegiada se mantiene exclusivamente en el backend.

## 4. Ejecutar localmente

```bash
npm run dev
```

Abre http://localhost:3000.

- Página inicial: `/`
- Registro: `/registro`
- Panel de canje: `/canje`

## 5. Flujo de uso

1. El participante entra a `/registro`.
2. Completa nombre, WhatsApp, Instagram y elige uno de los tres regalos.
3. El servidor valida los datos, crea un UUID aleatorio y guarda el participante.
4. Se muestra un QR que contiene únicamente ese UUID (no contiene datos personales).
5. El operador entra a `/canje` con la contraseña configurada en `ADMIN_PASSWORD`.
6. Activa la cámara y escanea el QR.
7. La función SQL realiza una actualización atómica: solo el primer canje cambia `redeemed_at` de vacío a una fecha. Los siguientes intentos reciben `already_redeemed`.

## 6. Cámara y despliegue

Los navegadores normalmente exigen HTTPS para permitir el uso de la cámara. En `localhost` funciona para pruebas. Para usarlo desde celulares en el evento, despliega la aplicación en un servicio con HTTPS (por ejemplo Vercel) y configura las mismas variables de entorno en el panel de despliegue.

No uses la clave `service_role` como variable `NEXT_PUBLIC_...`. No la incluyas en capturas ni la compartas.

## 7. Antes del evento: pruebas obligatorias

- Registra un participante de prueba.
- Comprueba que se guardó en Supabase.
- Escanea el QR desde otro dispositivo.
- Comprueba que el premio correcto aparece.
- Escanea el mismo QR otra vez y confirma que aparece “Este premio ya fue entregado”.
- Prueba un QR inventado y confirma que se rechaza.
- Comprueba permisos de cámara y conexión a internet en el lugar del evento.

## 8. Personalización de marca

El diseño inicial usa negro, dorado plano y blanco cálido, con tipografía de sistema y recursos CSS. Para añadir el logo oficial, coloca el archivo en `public/images/logo-mundo-alitas.png` y después podremos integrarlo en el encabezado. No se ha inventado ni reconstruido un archivo de logo.

## Alcance de esta primera versión

Esta entrega es una base MVP. Incluye registro, QR, autenticación simple de operador mediante contraseña de entorno y canje atómico. Antes de usarla en un evento real, recomendamos desplegarla, probarla en los dispositivos que se usarán y añadir límites de frecuencia (rate limiting) y monitoreo según el volumen esperado.
