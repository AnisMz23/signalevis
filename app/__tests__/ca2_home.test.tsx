import { screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import AboutScreen from '../src/app/a-propos';
import HomeScreen from '../src/app/index';

const mockFetch = jest.fn();
jest.mock('../src/api/client', () => ({
  fetchHealth: () => mockFetch(),
}));

const routes = { index: HomeScreen, 'a-propos': AboutScreen };

describe('CA2 — écran d\'accueil (navigation, FR, accessibilité)', () => {
  beforeEach(() => mockFetch.mockReset());

  test('CA2 : affiche « Service opérationnel » quand l\'API répond', async () => {
    mockFetch.mockResolvedValue({ status: 'ok', version: '0.1.0', postgres: '17.11', postgis: '3.3.7' });
    await renderRouter(routes, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByText('Service opérationnel')).toBeTruthy());
    expect(screen.getByLabelText('Service opérationnel')).toBeTruthy();
  });

  test('CA2 : en cas de panne, message clair et bouton « Réessayer » accessible', async () => {
    mockFetch.mockResolvedValue({ status: 'degraded' });
    await renderRouter(routes, { initialUrl: '/' });
    await waitFor(() => expect(screen.getByText('Service momentanément indisponible')).toBeTruthy());
    const retry = screen.getByRole('button', { name: 'Réessayer' });
    expect(retry.props.accessibilityHint).toBe("Relance la vérification de l'état du service");
  });

  test('CA2 : le lien « À propos » est accessible et mène à la page', async () => {
    mockFetch.mockResolvedValue({ status: 'ok', version: '0.1.0', postgres: '17.11', postgis: '3.3.7' });
    await renderRouter(routes, { initialUrl: '/a-propos' });
    expect(screen).toHavePathname('/a-propos');
    expect(screen.getByText('Données hébergées au Québec (Montréal).')).toBeTruthy();
  });
});
