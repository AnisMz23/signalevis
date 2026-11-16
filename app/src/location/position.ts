// Position pour le catalogue (KAN-12). Précision « équilibrée » seulement : la haute précision et
// la position du signalement relèvent de KAN-14. Sans autorisation, position de démonstration
// clairement signalée à l'écran (décision PO du 2026-11-16).
import * as Location from 'expo-location';

export type Position = { lat: number; lng: number; source: 'device' | 'demo' };

// Centre de Lévis (secteur Desjardins), à l'intérieur du territoire de démonstration.
export const DEMO_POSITION: Position = { lat: 46.76, lng: -71.18, source: 'demo' };

type LocationApi = Pick<
  typeof Location,
  'requestForegroundPermissionsAsync' | 'getLastKnownPositionAsync' | 'getCurrentPositionAsync' | 'Accuracy'
>;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });

export async function getPosition(api: LocationApi = Location, timeoutMs = 10000): Promise<Position> {
  try {
    const { status } = await api.requestForegroundPermissionsAsync();
    if (status !== 'granted') return DEMO_POSITION;
    const last = await api.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000 });
    const current =
      last ?? (await withTimeout(api.getCurrentPositionAsync({ accuracy: api.Accuracy.Balanced }), timeoutMs));
    return { lat: current.coords.latitude, lng: current.coords.longitude, source: 'device' };
  } catch {
    return DEMO_POSITION;
  }
}
