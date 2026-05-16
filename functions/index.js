import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();

function usernameToEmail(username) {
  return String(username || '').trim().toLowerCase().replace(/\s+/g, '') + '@luza.local';
}

async function requireSuperAdmin(uid) {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) return false;
  const profile = snap.data();
  return profile?.isActive === true && profile?.role === 'super_admin';
}

export const createInternalUser = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }

  const allowed = await requireSuperAdmin(request.auth.uid);
  if (!allowed) {
    throw new HttpsError('permission-denied', 'Solo el super admin puede crear usuarios.');
  }

  const { name, username, password, role } = request.data || {};
  const cleanUsername = String(username || '').trim().toLowerCase().replace(/\s+/g, '');
  const validRoles = ['super_admin', 'gerente', 'mesero', 'cajero', 'cocina', 'domicilio'];

  if (!name || !cleanUsername || !password || !validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', 'Datos incompletos o rol inválido.');
  }

  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener mínimo 6 caracteres.');
  }

  const email = usernameToEmail(cleanUsername);

  const userRecord = await getAuth().createUser({
    email,
    password,
    displayName: name,
    emailVerified: true,
    disabled: false
  });

  await db.collection('users').doc(userRecord.uid).set({
    name,
    username: cleanUsername,
    email,
    role,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid
  });

  return {
    uid: userRecord.uid,
    username: cleanUsername,
    email,
    role
  };
});
