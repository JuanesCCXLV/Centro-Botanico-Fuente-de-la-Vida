# Cuentas de administrador

Las cuentas se gestionan desde la terminal con `npm run admin`. Lo hace el desarrollador; el cliente no lo necesita.

Política del Plan de Pruebas (sección 5.4), que el comando aplica:

- Una cuenta por persona, nunca compartida.
- **Máximo 3 administradores activos.**
- Contraseñas de al menos 12 caracteres.
- Cuando alguien deja el negocio, su cuenta se desactiva **ese mismo día**.

Cada acción queda en la tabla `Evento` (`ADMIN_CREADO`, `ADMIN_CLAVE_RESTABLECIDA`, `ADMIN_DESACTIVADO`, `ADMIN_ACTIVADO`).

## Comandos

```bash
npm run admin -- listar
npm run admin -- crear --nombre "Ana Pérez" --correo ana@ejemplo.com
npm run admin -- restablecer-clave --correo ana@ejemplo.com
npm run admin -- desactivar --correo ana@ejemplo.com
npm run admin -- activar --correo ana@ejemplo.com
```

| Comando | Qué hace |
|---|---|
| `listar` | Nombre, correo, estado y último ingreso de cada administrador |
| `crear` | Crea la cuenta con una **contraseña temporal** que se muestra una sola vez |
| `restablecer-clave` | Contraseña olvidada: asigna una temporal, **quita el bloqueo** por intentos fallidos y cierra sus sesiones abiertas |
| `desactivar` | La persona ya no puede ingresar y sus sesiones se cierran de inmediato. No permite desactivar al último administrador activo |
| `activar` | Vuelve a permitir el acceso, si hay cupo |

Las cuentas desactivadas no se borran: así se conserva quién hizo cada cambio en la auditoría.

## Contra la base de producción

Por defecto el comando usa `DATABASE_URL` del `.env` (la base local). Para producción, pásala en el mismo comando; la primera línea que imprime es la base sobre la que va a actuar:

```bash
DATABASE_URL="postgresql://…neon.tech/neondb?sslmode=require" npm run admin -- listar
```

## Entregar una contraseña temporal

- En persona o por llamada; **nunca por WhatsApp, chat o correo**.
- Pide a la persona que ingrese y la cambie de inmediato en **Panel → Mi cuenta**.
- No la guardes: si se pierde, se restablece otra vez.
