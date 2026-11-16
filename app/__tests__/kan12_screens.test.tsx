import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import ChooseTypeScreen from '../src/app/signaler/type';
import SelectedTypeScreen from '../src/app/signaler/choisi';
import EmergencyScreen from '../src/app/signaler/urgence';

const mockLoad = jest.fn();
const mockPosition = jest.fn();
jest.mock('../src/api/catalog', () => ({ loadCatalog: (...a: unknown[]) => mockLoad(...a) }));
jest.mock('../src/location/position', () => ({ getPosition: () => mockPosition() }));

const s = (code: string, domain: string, domain_label: string, label: string, recipient: string, is_emergency = false) => ({
  code, domain, domain_label, category: domain_label, label, label_en: null, icon: 'x', is_emergency,
  default_priority: 'medium', recipient, recipient_is_demo: true,
});
const catalog = {
  catalog_version: 3,
  services: [
    s('nid_de_poule', 'voirie', 'Voirie et travaux publics', 'Nid-de-poule', 'Ville de Lévis — démo'),
    s('lampadaire', 'eclairage', 'Éclairage', 'Lampadaire défectueux', 'Ville de Lévis — démo'),
    s('abribus', 'transport', 'Transport en commun', 'Abribus endommagé', 'STLévis — démo'),
    s('fil_tombe', 'electricite', 'Réseau électrique', 'Fil électrique tombé', 'Hydro — démo', true),
  ],
};
const routes = { 'signaler/type': ChooseTypeScreen, 'signaler/urgence': EmergencyScreen, 'signaler/choisi': SelectedTypeScreen };
const device = { lat: 46.76, lng: -71.18, source: 'device' };

describe('KAN-12 — écran « Choisir le type »', () => {
  beforeEach(() => {
    mockLoad.mockReset();
    mockPosition.mockReset().mockResolvedValue(device);
  });

  test('CA1 : sections par domaine, puis types', async () => {
    mockLoad.mockResolvedValue({ status: 'online', catalog });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText('Voirie et travaux publics')).toBeTruthy());
    expect(screen.getByRole('header', { name: 'Éclairage' })).toBeTruthy();
    expect(screen.getByText('Nid-de-poule')).toBeTruthy();
  });

  test('CA2 : la recherche sans accent filtre la liste', async () => {
    mockLoad.mockResolvedValue({ status: 'online', catalog });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByLabelText('Rechercher un type de signalement')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('Rechercher un type de signalement'), 'eclairage');
    expect(screen.getByText('Lampadaire défectueux')).toBeTruthy();
    expect(screen.queryByText('Nid-de-poule')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Rechercher un type de signalement'), 'zzz');
    expect(screen.getByText('Aucun type ne correspond à votre recherche.')).toBeTruthy();
  });

  test('CA3 : chaque type affiche son destinataire prévu (y compris pour le lecteur d’écran)', async () => {
    mockLoad.mockResolvedValue({ status: 'online', catalog });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText('Destinataire prévu : STLévis — démo')).toBeTruthy());
    expect(screen.getAllByText('Destinataire prévu : Ville de Lévis — démo')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Abribus endommagé. Destinataire prévu : STLévis — démo' })).toBeTruthy();
  });

  test('CA4 : un type d’urgence mène à l’écran 911, sans possibilité de poursuivre', async () => {
    mockLoad.mockResolvedValue({ status: 'online', catalog });
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText('Urgence : composez le 911')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('service-fil_tombe'));
    await waitFor(() => expect(screen).toHavePathname('/signaler/urgence'));
    expect(screen.getByText('Composez le 911')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('call-911'));
    expect(openURL).toHaveBeenCalledWith('tel:911');
    // Seules deux actions : appeler le 911 ou revenir à la liste.
    expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel)).toEqual(['Appeler le 911', 'Revenir à la liste']);
  });

  test('CA4 : un type ordinaire mène à l’étape suivante avec son destinataire', async () => {
    mockLoad.mockResolvedValue({ status: 'online', catalog });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByTestId('service-abribus')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('service-abribus'));
    await waitFor(() => expect(screen).toHavePathname('/signaler/choisi'));
    expect(screen.getByText('Abribus endommagé')).toBeTruthy();
    expect(screen.getByText('Destinataire prévu : STLévis — démo')).toBeTruthy();
  });

  test('CA5 : hors ligne → liste enregistrée et mention « Hors ligne »', async () => {
    mockLoad.mockResolvedValue({ status: 'offline', catalog, savedAt: Date.UTC(2026, 10, 16, 15, 0) });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText(/^Hors ligne : liste enregistrée le /)).toBeTruthy());
    expect(screen.getByText('Nid-de-poule')).toBeTruthy();
  });

  test('CA5 : ni réseau ni cache → message clair', async () => {
    mockLoad.mockResolvedValue({ status: 'unavailable' });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText('Impossible de charger les services. Vérifiez votre connexion.')).toBeTruthy());
  });

  test('Position refusée → mention de la position de démonstration', async () => {
    mockPosition.mockResolvedValue({ ...device, source: 'demo' });
    mockLoad.mockResolvedValue({ status: 'online', catalog });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText(/centre de Lévis \(démonstration\)/)).toBeTruthy());
  });

  test('Aucun service à cet endroit → message dédié', async () => {
    mockLoad.mockResolvedValue({ status: 'online', catalog: { catalog_version: 1, services: [] } });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText("Aucun service n'est offert à cet endroit pour le moment.")).toBeTruthy());
  });
});
