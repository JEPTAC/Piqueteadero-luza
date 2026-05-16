# Cloud Function para crear usuarios

Esta función permite que el `super_admin` cree usuarios desde la app.

Despliegue:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Esto no usa Firebase Hosting. La app sigue publicada en GitHub Pages.
