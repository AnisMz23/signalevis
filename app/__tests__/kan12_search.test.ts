import type { Service } from '../src/api/catalog';
import { filterServices, groupByDomain, normalize } from '../src/lib/search';

const svc = (code: string, domain: string, domain_label: string, category: string, label: string, extra: Partial<Service> = {}): Service => ({
  code, domain, domain_label, category, label, label_en: null, icon: 'x', is_emergency: false,
  default_priority: 'medium', recipient: 'Ville de Lévis — démo', recipient_is_demo: true, ...extra,
});

const catalog: Service[] = [
  svc('nid_de_poule', 'voirie', 'Voirie et travaux publics', 'Voirie', 'Nid-de-poule'),
  svc('fuite_eau', 'voirie', 'Voirie et travaux publics', 'Aqueduc', "Fuite d'eau sur la voie publique"),
  svc('lampadaire', 'eclairage', 'Éclairage', 'Éclairage', 'Lampadaire défectueux'),
  svc('abribus', 'transport', 'Transport en commun', 'Transport', 'Abribus endommagé', { recipient: 'STLévis — démo' }),
];

describe('KAN-12 CA1 — liste à 2 niveaux', () => {
  test('CA1 : regroupement par domaine, dans l’ordre de l’API', () => {
    const sections = groupByDomain(catalog);
    expect(sections.map((s) => s.title)).toEqual(['Voirie et travaux publics', 'Éclairage', 'Transport en commun']);
    expect(sections[0].data.map((s) => s.code)).toEqual(['nid_de_poule', 'fuite_eau']);
  });

  test('CA1 : liste vide → aucune section', () => {
    expect(groupByDomain([])).toEqual([]);
  });
});

describe('KAN-12 CA2 — recherche FR insensible aux accents', () => {
  test('CA2 : normalisation (accents, casse, espaces)', () => {
    expect(normalize('  Éclairage   DÉFECTUEUX ')).toBe('eclairage defectueux');
  });

  test('CA2 : sans accent, la recherche trouve le libellé accentué', () => {
    expect(filterServices(catalog, 'eclairage').map((s) => s.code)).toEqual(['lampadaire']);
    expect(filterServices(catalog, 'defect').map((s) => s.code)).toEqual(['lampadaire']);
  });

  test('CA2 : plusieurs mots, insensible à la casse, recherche dans la catégorie', () => {
    expect(filterServices(catalog, 'LAMPADAIRE défect').map((s) => s.code)).toEqual(['lampadaire']);
    expect(filterServices(catalog, 'aqueduc').map((s) => s.code)).toEqual(['fuite_eau']);
    expect(filterServices(catalog, 'EAU').map((s) => s.code)).toEqual(['fuite_eau']);
  });

  test('CA2 : requête vide → tout ; requête sans résultat → rien', () => {
    expect(filterServices(catalog, '   ')).toHaveLength(4);
    expect(filterServices(catalog, 'deneigement')).toEqual([]);
  });
});
