import { screen, waitFor, fireEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import TabsLayout from '../src/app/(tabs)/_layout';
import HomeScreen from '../src/app/(tabs)/index';
import MyReportsScreen from '../src/app/(tabs)/mes-signalements';
import AboutScreen from '../src/app/a-propos';

const mockFetch = jest.fn();
jest.mock('../src/api/client', () => ({
  fetchHealth: () => mockFetch(),
}));

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeScreen,
  '(tabs)/mes-signalements': MyReportsScreen,
  'a-propos': AboutScreen,
  'signaler/type': () => null,
};

describe('CA2 — accueil (design Figma 01), onglets, à propos', () => {
  beforeEach(() => mockFetch.mockReset().mockResolvedValue({ status: 'ok', version: '0.3.0', postgres: '17.11', postgis: '3.3.7' }));

  test('CA2 : accueil en français, conforme au design (salutation, bannière 911, appel à l’action)', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByRole('header', { name: 'Bonjour' })).toBeTruthy();
    expect(screen.getByText("Signalez une anomalie à Lévis en moins d'une minute.")).toBeTruthy();
    expect(screen.getByText('Danger immédiat ?')).toBeTruthy();
    expect(screen.getByText('Photo, position précise et acheminement vers le bon destinataire.')).toBeTruthy();
    expect(screen.getByText("Aucun signalement pour l'instant. Vos signalements apparaîtront ici.")).toBeTruthy();
  });

  test('CA2 / KAN-18 CA1 : la bannière 911 appelle le 911', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByRole('button', { name: 'Appeler le 911' }));
    expect(openURL).toHaveBeenCalledWith('tel:911');
  });

  test('CA2 : « Signaler une anomalie » (carte et bouton +) ouvre le choix du type', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByTestId('report-button'));
    await waitFor(() => expect(screen).toHavePathname('/signaler/type'));
  });

  test('CA2 : barre d’onglets accessible (Accueil, +, Mes signalements)', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByRole('tab', { name: 'Accueil' }).props.accessibilityState).toEqual({ selected: true });
    // Bouton « + » central de la barre (et bouton de la carte verte) : même action, même libellé.
    expect(screen.getAllByRole('button', { name: 'Signaler une anomalie' })).toHaveLength(2);
    expect(screen.getByTestId('tab-report')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Mes signalements' }));
    await waitFor(() => expect(screen).toHavePathname('/mes-signalements'));
    expect(screen.getByRole('header', { name: 'Mes signalements' })).toBeTruthy();
  });

  test('CA2 : « À propos » affiche « Service opérationnel » quand l’API répond', async () => {
    await renderRouter(routes, { initialUrl: '/a-propos' });
    await waitFor(() => expect(screen.getByText('Service opérationnel')).toBeTruthy());
    expect(screen.getByLabelText('Service opérationnel')).toBeTruthy();
    expect(screen.getByText('Données hébergées au Québec (Montréal).')).toBeTruthy();
  });

  test('CA2 : en cas de panne, message clair et bouton « Réessayer » accessible', async () => {
    mockFetch.mockResolvedValue({ status: 'degraded' });
    await renderRouter(routes, { initialUrl: '/a-propos' });
    await waitFor(() => expect(screen.getByText('Service momentanément indisponible')).toBeTruthy());
    const retry = screen.getByRole('button', { name: 'Réessayer' });
    expect(retry.props.accessibilityHint).toBe("Relance la vérification de l'état du service");
  });
});
