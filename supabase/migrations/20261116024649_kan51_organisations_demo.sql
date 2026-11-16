-- KAN-51 / KAN-46 — Organisations de DÉMONSTRATION pour le pitch (ADR-002 : mode démo).
-- Territoires APPROXIMATIFS, à remplacer par les données officielles (spike KAN-25) :
--   * Lévis : polygone simplifié (~511 km², superficie réelle ~497 km²) ;
--   * MTMD : bandes de 30 m autour de tracés simplifiés de l'A-20 et de la route 132.
-- Aucune cible de livraison (demo_target) : les boîtes de démonstration viennent avec KAN-46.
-- Aucune autorité n'est présentée comme partenaire : noms suffixés « — démo », statut demo.

insert into public.organization (name, slug, status, default_territory) values
  ('Ville de Lévis — démo', 'ville-levis-demo', 'demo', extensions.st_geomfromtext(
    'MULTIPOLYGON(((-71.42 46.58,-71.30 46.60,-71.12 46.68,-70.98 46.74,-70.97 46.80,-71.10 46.835,-71.20 46.80,-71.30 46.75,-71.40 46.70,-71.45 46.64,-71.42 46.58)))', 4326)),
  ('MTMD — démo', 'mtmd-demo', 'demo', extensions.st_multi(extensions.st_buffer(extensions.st_geogfromtext(
    'MULTILINESTRING((-71.40 46.66,-71.28 46.71,-71.17 46.74,-71.05 46.78),(-71.30 46.74,-71.20 46.79,-71.17 46.81,-71.10 46.82,-71.00 46.795))'), 30)::extensions.geometry)),
  ('STLévis — démo', 'stlevis-demo', 'demo', extensions.st_geomfromtext(
    'MULTIPOLYGON(((-71.42 46.58,-71.30 46.60,-71.12 46.68,-70.98 46.74,-70.97 46.80,-71.10 46.835,-71.20 46.80,-71.30 46.75,-71.40 46.70,-71.45 46.64,-71.42 46.58)))', 4326));

insert into public.org_domain (org_id, domain_id)
select o.id, d.id
from (values
  ('ville-levis-demo', 'voirie'), ('ville-levis-demo', 'eclairage'), ('ville-levis-demo', 'proprete'),
  ('mtmd-demo', 'voirie'), ('mtmd-demo', 'routier_provincial'),
  ('stlevis-demo', 'transport')
) as x(slug, domain_code)
join public.organization o on o.slug = x.slug
join public.domain d on d.code = x.domain_code;

insert into public.org_service (org_id, service_template_id)
select o.id, st.id
from (values
  ('ville-levis-demo', 'nid_de_poule'), ('ville-levis-demo', 'affaissement_chaussee'),
  ('ville-levis-demo', 'signalisation'), ('ville-levis-demo', 'trottoir'), ('ville-levis-demo', 'fuite_eau'),
  ('ville-levis-demo', 'lampadaire'), ('ville-levis-demo', 'depot_sauvage'), ('ville-levis-demo', 'graffiti'),
  ('ville-levis-demo', 'poubelle_pleine'),
  ('mtmd-demo', 'nid_de_poule'), ('mtmd-demo', 'affaissement_chaussee'), ('mtmd-demo', 'signalisation'),
  ('mtmd-demo', 'glissiere'),
  ('stlevis-demo', 'abribus'), ('stlevis-demo', 'arret_bus')
) as x(slug, service_code)
join public.organization o on o.slug = x.slug
join public.service_template st on st.code = x.service_code;
