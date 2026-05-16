# Luza POS — GitHub Pages + Firebase Auth/Firestore

Esta versión publica la app en **GitHub Pages** y usa Firebase como backend.

No usa Firebase Hosting.

Firebase se usa para:

- Firebase Authentication
- Cloud Firestore
- Cloud Functions para crear usuarios internos desde el panel de `super_admin`
- Firestore Rules por rol

## Login con usuario y contraseña

El empleado ve:

```txt
Usuario
Contraseña
```

Internamente la app convierte:

```txt
cajero1 -> cajero1@luza.local
```

Firebase Auth sigue usando email/password, pero el correo queda oculto para el usuario operativo.

## Roles

- `super_admin`: crea usuarios y administra todo.
- `gerente`: administra operación, productos, reportes, costos y pagos.
- `mesero`: crea pedidos, mesas y mueve pedido de mesa.
- `cajero`: cobra, crédito, caja y facturas.
- `cocina`: producción.
- `domicilio`: entregas.

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
export const FUNCTIONS_REGION = "us-central1";
```

## Primer super admin

El primer super admin se crea manualmente una sola vez:

1. En Firebase Authentication crea usuario:
   `admin@luza.local`
2. En Firestore crea:
   `profiles/UID_DEL_USUARIO`
3. Contenido:

```json
{
  "name": "Super Administrador",
  "username": "admin",
  "email": "admin@luza.local",
  "role": "super_admin",
  "isActive": true
}
```

Luego ese super admin ya podrá crear usuarios desde la app en el módulo **Usuarios**.

## Desplegar Cloud Function para crear usuarios

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Esto no publica la app en Firebase Hosting. Solo despliega la función segura para crear usuarios en Firebase Auth.

## Reglas de Firestore

Pega el contenido de:

```txt
database/firestore.rules
```

en Firebase Console → Firestore Database → Rules.

## Publicar app en GitHub Pages

```bash
git init
git add .
git commit -m "Luza POS GitHub Pages Firebase con usuarios internos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/luza-pos.git
git push -u origin main
```

Después activa GitHub Pages desde Settings > Pages.
