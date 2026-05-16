# Luza POS — GitHub Pages + Firebase

Esta versión **NO usa Firebase Hosting**.

La app se publica en **GitHub Pages** y usa Firebase únicamente como backend:

- Firebase Authentication para usuarios.
- Cloud Firestore para base de datos.
- Firestore Realtime para pedidos, caja, producción y notificaciones.
- Firestore Rules para permisos por rol.

## Roles

- `super_admin`
- `gerente`
- `mesero`
- `cajero`
- `cocina`
- `domicilio`

## Configurar Firebase

Edita `firebase-config.js`:

```js
export const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

export const DEMO_MODE = false;
```

## Crear primer usuario

1. Crea el usuario en Firebase Authentication.
2. Copia el UID.
3. Crea en Firestore:

`profiles/UID_DEL_USUARIO`

```json
{
  "name": "Gerente principal",
  "email": "correo@restaurante.com",
  "role": "gerente",
  "isActive": true
}
```

## Subir a GitHub

```bash
git init
git add .
git commit -m "Luza POS GitHub Pages Firebase"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/luza-pos.git
git push -u origin main
```

## Activar GitHub Pages

En GitHub:

Settings > Pages > Build and deployment

Elige una de estas opciones:

1. **Deploy from a branch**: rama `main`, carpeta `/root`.
2. **GitHub Actions**: usa `.github/workflows/pages.yml`.

## Importante

No ejecutes `firebase deploy` para publicar la app, porque la publicación será por GitHub Pages.
Firebase queda solo para Auth + Firestore.
