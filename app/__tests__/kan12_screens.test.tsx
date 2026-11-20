import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import SelectedTypeScreen from '../src/app/signaler/choisi';
import ChooseTypeScreen from '../src/app/signaler/type';
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
    s('fuite_eau', 'voirie', 'Voirie et travaux publics', "Fuite d'eau sur la voie publique", 'Ville de Lévis — démo'),
    s('lampadaire', 'eclairage', 'Éclairage', 'Lampadaire défectueux', 'Ville de Lévis — démo'),
    s('abribus', 'transport', 'Transport en commun', 'Abribus endommagé', 'STLévis — démo'),
    s('fil_tombe', 'electricite', 'Réseau électrique', 'Fil électrique tombé', 'Hydro — démo', true),
  ],
};
const routes = { 'signaler/type': ChooseTypeScreen, 'signaler/urgence': EmergencyScreen, 'signaler/choisi': SelectedTypeScreen };
const device = { lat: 46.76, lng: -71.18, source: 'device' };

const open = async () => {
  await renderRouter(routes, { initialUrl: '/signaler/type' });
  await waitFor(() => expect(screen.getByTestId('category-voirie')).toBeTruthy());
};

describe('KAN-12 — Type d’anomalie (design Figma 02)', () => {
  beforeEach(() => {
    mockLoad.mockReset().mockResolvedValue({ status: 'online', catalog });
    mockPosition.mockReset().mockResolvedValue(device);
  });

  test('CA1 : en-tête d’étape 1/5 et grille des catégories renvoyées par l’API', async () => {
    await open();
    expect(screen.getByRole('header', { name: "Type d'anomalie" })).toBeTruthy();
    expect(screen.getByLabelText('Étape 1 sur 5')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voirie. Ville de Lévis — démo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Éclairage. Ville de Lévis — démo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Transport. STLévis — démo' })).toBeTruthy();
    // Aucune catégorie figée du design hors catalogue (Parcs, Autre…)
    expect(screen.queryByText('Parcs')).toBeNull();
  });

  test('CA1 : 2 niveaux — la catégorie choisie affiche ses types', async () => {
    await open();
    expect(screen.queryByText('Nid-de-poule')).toBeNull();
    await fireEvent.press(screen.getByTestId('category-voirie'));
    expect(screen.getByTestId('category-voirie').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByText('Types — Voirie')).toBeTruthy();
    expect(screen.getByText('Nid-de-poule')).toBeTruthy();
    expect(screen.getByText("Fuite d'eau sur la voie publique")).toBeTruthy();
    expect(screen.queryByText('Lampadaire défectueux')).toBeNull();
  });

  test('CA2 : la recherche sans accent trouve le type accentué', async () => {
    await open();
    await fireEvent.changeText(screen.getByLabelText('Rechercher un type de signalement'), 'defectueux');
    expect(screen.getByText('Résultats')).toBeTruthy();
    expect(screen.getByText('Lampadaire défectueux')).toBeTruthy();
    expect(screen.queryByText('Nid-de-poule')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Rechercher un type de signalement'), 'zzz');
    expect(screen.getByText('Aucun type ne correspond à votre recherche.')).toBeTruthy();
  });

  test('CA3 : chaque type affiche son destinataire prévu (écran et lecteur d’écran)', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('category-transport'));
    expect(screen.getByText('Destinataire prévu : STLévis — démo')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Abribus endommagé. Destinataire prévu : STLévis — démo' })).toBeTruthy();
  });

  test('CA3 : choisir un type active « Continuer · <type> » et mène à l’étape suivante', async () => {
    await open();
    expect(screen.getByTestId('continue').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('category-transport'));
    await fireEvent.press(screen.getByTestId('service-abribus'));
    expect(screen.getByRole('button', { name: 'Continuer · Abribus endommagé' })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('continue'));
    await waitFor(() => expect(screen).toHavePathname('/signaler/choisi'));
    expect(screen.getByText('Transport › Abribus endommagé')).toBeTruthy();
    expect(screen.getByText('Destinataire prévu : STLévis — démo')).toBeTruthy();
    expect(screen.getByLabelText('Étape 2 sur 5')).toBeTruthy();
  });

  test('CA4 : un type d’urgence mène à l’écran 911 bloquant (design Figma 09)', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await open();
    await fireEvent.press(screen.getByTestId('category-electricite'));
    expect(screen.getByText('Urgence : composez le 911')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('service-fil_tombe'));
    await waitFor(() => expect(screen).toHavePathname('/signaler/urgence'));
    expect(screen.getByRole('header', { name: "Situation d'urgence ?" })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('call-911'));
    expect(openURL).toHaveBeenCalledWith('tel:911');
    // Seules deux actions : appeler le 911, ou « Ce n'est pas une urgence » (retour) — jamais « Continuer ».
    expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel)).toEqual([
      'Appeler le 911',
      "Ce n'est pas une urgence",
    ]);
  });

  test('CA5 : hors ligne → liste enregistrée et mention « Hors ligne »', async () => {
    mockLoad.mockResolvedValue({ status: 'offline', catalog, savedAt: Date.UTC(2026, 10, 16, 15, 0) });
    await open();
    expect(screen.getByText(/^Hors ligne : liste enregistrée le /)).toBeTruthy();
  });

  test('CA5 : ni réseau ni cache → message clair', async () => {
    mockLoad.mockResolvedValue({ status: 'unavailable' });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText('Impossible de charger les services. Vérifiez votre connexion.')).toBeTruthy());
  });

  test('Position refusée → mention de la position de démonstration', async () => {
    mockPosition.mockResolvedValue({ ...device, source: 'demo' });
    await open();
    expect(screen.getByText(/centre de Lévis \(démonstration\)/)).toBeTruthy();
  });

  test('Aucun service à cet endroit → message dédié', async () => {
    mockLoad.mockResolvedValue({ status: 'online', catalog: { catalog_version: 1, services: [] } });
    await renderRouter(routes, { initialUrl: '/signaler/type' });
    await waitFor(() => expect(screen.getByText("Aucun service n'est offert à cet endroit pour le moment.")).toBeTruthy());
  });
});
