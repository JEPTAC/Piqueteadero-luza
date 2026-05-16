# Luza POS V19 — Paquete completo

Esta versión mantiene Firebase y la lógica de login solicitada:

- En el inicio aparecen botones con usuarios de Firestore `/users`.
- Cada usuario puede tener cualquier correo real o interno.
- Al presionar el botón solo se escribe la contraseña de Firebase Auth.
- El rol guardado en `/users` define el módulo al que entra.
- El primer usuario se crea manualmente como `super_admin`.
- El super admin crea el resto desde Administración > Usuarios.

## Primer super admin

1. Firebase Authentication: crea el usuario con el correo que quieras.
2. Copia el UID.
3. Firestore: crea `users/UID`.
4. Campos mínimos:

```json
{
  "name": "Admin",
  "email": "tu-correo@dominio.com",
  "role": "super_admin",
  "isActive": true
}
```

## Reglas

Pega `database/firestore.rules` en Firestore Rules.

## Publicación

Sube todo el contenido del ZIP a GitHub Pages.
