// KAN-12 CA1 / CA2 — regroupement et recherche du catalogue, côté app (raffinement v2 :
// catalogue < 100 types, normalisation NFD sans accents, pas besoin d'unaccent en base).
import type { Service } from '@/api/catalog';

/** Minuscules, sans accents ni espaces superflus : « Éclairage » → « eclairage ». */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Chaque mot de la requête doit apparaître dans le libellé, la catégorie ou le domaine. */
export function filterServices(services: Service[], query: string): Service[] {
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return services;
  return services.filter((s) => {
    const haystack = normalize(`${s.label} ${s.category} ${s.domain_label}`);
    return tokens.every((token) => haystack.includes(token));
  });
}

export type ServiceSection = { domain: string; title: string; data: Service[] };

/** Liste à 2 niveaux (domaine > type), dans l'ordre reçu de l'API. */
export function groupByDomain(services: Service[]): ServiceSection[] {
  const sections: ServiceSection[] = [];
  for (const service of services) {
    let section = sections.find((s) => s.domain === service.domain);
    if (!section) {
      section = { domain: service.domain, title: service.domain_label, data: [] };
      sections.push(section);
    }
    section.data.push(service);
  }
  return sections;
}
