# Luza POS V10 — Producción con GitHub Pages + Firebase

Esta versión ya no usa modo demo ni botones para entrar por rol.

## Publicación

- La app se publica en **GitHub Pages**.
- Firebase se usa solo para:
  - Firebase Auth
  - Cloud Firestore
  - Cloud Functions para crear usuarios internos
  - Reglas de seguridad por rol

No usa Firebase Hosting.

## Login

El usuario operativo ve:

```txt
Código de usuario
PIN / contraseña
```

La app convierte internamente:

```txt
admin -> admin@luza.local
cajero1 -> cajero1@luza.local
mesero1 -> mesero1@luza.local
```

## Configuración obligatoria

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
export const FUNCTIONS_REGION = "us-central1";
```

## Primer super admin

1. En Firebase Auth crea `admin@luza.local`.
2. Copia el UID.
3. En Firestore crea `profiles/UID_DEL_USUARIO`.
4. Agrega:

```json
{
  "name": "Super Administrador",
  "username": "admin",
  "email": "admin@luza.local",
  "role": "super_admin",
  "isActive": true
}
```

5. Entra a la app con:

```txt
Código de usuario: admin
PIN: la contraseña que creaste
```

## Crear usuarios desde la app

El módulo **Usuarios** aparece solo para `super_admin`.

Desde allí se crean meseros, cajeros, cocina, domiciliarios, gerentes y otros super admin.

## Cloud Functions

Para que el super admin pueda crear usuarios reales en Firebase Auth:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Esto no publica la app en Firebase Hosting; solo despliega la función segura.

## GitHub Pages

```bash
git init
git add .
git commit -m "Luza POS V10 producción Firebase"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/luza-pos.git
git push -u origin main
```

Luego activa GitHub Pages en Settings > Pages.
