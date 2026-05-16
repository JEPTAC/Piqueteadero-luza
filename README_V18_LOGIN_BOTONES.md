# Luza POS V18 — Firebase completo con botones de usuario

Esta versión conserva la super app completa y cambia solo el inicio de sesión.

## Login

La pantalla inicial muestra botones con los usuarios activos guardados en Firestore:

`users`

Cada documento debe tener:

```json
{
  "name": "Admin",
  "email": "juanes.1205@hotmail.com",
  "role": "super_admin",
  "isActive": true
}
```

El usuario selecciona el botón y escribe la contraseña creada en Firebase Authentication.

No hay obligación de usar `admin@luza.local`.
Puedes usar cualquier correo real o interno.

## Primer super admin manual

1. Crea un usuario en Firebase Authentication con el correo que quieras.
2. Copia su UID.
3. Crea en Firestore:

`users/UID_DEL_USUARIO`

Ejemplo:

```json
{
  "name": "Admin",
  "email": "juanes.1205@hotmail.com",
  "role": "super_admin",
  "isActive": true
}
```

4. Pega las reglas de `firestore-rules-v18.rules`.
5. Abre la app.
6. Aparecerá el botón Admin.
7. Escribe la contraseña y entra.

## Crear usuarios

El super admin entra a:

Administración > Usuarios

Desde ahí crea usuarios con cualquier correo, contraseña y rol.

## Datos operativos

La operación se guarda en:

`app_state/main`

Esto simplifica reglas y evita tener que pelear con permisos por cada módulo mientras se estabiliza la app.
