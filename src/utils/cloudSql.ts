import { auth } from './firebase';
import { AppStateData } from '../types';

export async function saveAppStateToCloudSQL(state: AppStateData, namaApotek?: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Pengguna belum login.');
  }
  const token = await user.getIdToken();
  const res = await fetch('/api/cloudsql/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      namaApotek: namaApotek || state.settings.namaApotek,
      stateData: state,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal menyimpan ke Cloud SQL' }));
    throw new Error(err.error || 'Gagal menyimpan ke Cloud SQL');
  }

  return true;
}

export async function loadAppStateFromCloudSQL(): Promise<{ state: AppStateData; updatedAt?: string } | null> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Pengguna belum login.');
  }
  const token = await user.getIdToken();
  const res = await fetch('/api/cloudsql/load', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal memuat dari Cloud SQL' }));
    throw new Error(err.error || 'Gagal memuat dari Cloud SQL');
  }

  const json = await res.json();
  if (!json.data) return null;
  return { state: json.data, updatedAt: json.updatedAt };
}
