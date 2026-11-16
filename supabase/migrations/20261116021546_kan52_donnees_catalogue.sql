-- KAN-52 CA1 / CA2 — Données d'amorçage du catalogue (domaines et services types).
-- Livrées en migration (et non dans supabase/seed/, réservé aux bases locales) pour s'appliquer
-- à l'identique sur staging et prod. Correspondance avec la matrice de l'ADR-002.
-- is_emergency = true uniquement en cas de danger immédiat (écran 911, KAN-18). Les urgences
-- municipales (fuite, affaissement) relèvent du 311 / SPVL : priorité élevée, pas de 911.

insert into public.domain (code, label_fr, label_en, sort_order) values
  ('voirie',             'Voirie et travaux publics',       'Roads and public works',     10),
  ('eclairage',          'Éclairage',                       'Street lighting',            20),
  ('proprete',           'Propreté et environnement',       'Cleanliness and environment', 30),
  ('securite',           'Sécurité publique (non urgent)',  'Public safety (non-urgent)', 40),
  ('transport',          'Transport en commun',             'Public transit',             50),
  ('electricite',        'Réseau électrique',               'Power grid',                 60),
  ('routier_provincial', 'Réseau routier provincial',       'Provincial road network',    70);

insert into public.service_template
  (domain_id, code, category, label_fr, label_en, icon, default_priority, default_sla_hours, is_emergency, sort_order)
select d.id, s.code, s.category, s.label_fr, s.label_en, s.icon, s.prio, s.sla, s.urgence, s.ordre
from (values
  ('voirie',             'nid_de_poule',           'Voirie',      'Nid-de-poule',                      'Pothole',                       'road-variant',          'medium', 72,  false, 10),
  ('voirie',             'affaissement_chaussee',  'Voirie',      'Affaissement de la chaussée',       'Road subsidence',               'alert-octagon-outline', 'high',   24,  false, 20),
  ('voirie',             'signalisation',          'Voirie',      'Panneau de signalisation endommagé','Damaged road sign',             'sign-caution',          'medium', 72,  false, 30),
  ('voirie',             'trottoir',               'Voirie',      'Trottoir endommagé',                'Damaged sidewalk',              'walk',                  'low',    168, false, 40),
  ('voirie',             'fuite_eau',              'Aqueduc',     'Fuite d''eau sur la voie publique', 'Water leak on public property', 'water-alert-outline',   'high',   12,  false, 50),
  ('eclairage',          'lampadaire',             'Éclairage',   'Lampadaire défectueux',             'Faulty streetlight',            'lightbulb-off-outline', 'medium', 168, false, 10),
  ('proprete',           'depot_sauvage',          'Propreté',    'Dépôt sauvage de déchets',          'Illegal dumping',               'delete-alert-outline',  'low',    168, false, 10),
  ('proprete',           'graffiti',               'Propreté',    'Graffiti',                          'Graffiti',                      'spray',                 'low',    336, false, 20),
  ('proprete',           'poubelle_pleine',        'Propreté',    'Poubelle publique pleine',          'Full public garbage bin',       'trash-can-outline',     'low',    72,  false, 30),
  ('securite',           'vehicule_abandonne',     'Sécurité',    'Véhicule abandonné',                'Abandoned vehicle',             'car-off',               'low',    168, false, 10),
  ('transport',          'abribus',                'Transport',   'Abribus endommagé',                 'Damaged bus shelter',           'bus-stop-covered',      'medium', 72,  false, 10),
  ('transport',          'arret_bus',              'Transport',   'Poteau d''arrêt d''autobus endommagé','Damaged bus stop sign',      'bus-stop',              'medium', 72,  false, 20),
  ('electricite',        'fil_tombe',              'Électricité', 'Fil électrique tombé',              'Downed power line',             'flash-alert',           'high',   1,   true,  10),
  ('electricite',        'poteau_electrique',      'Électricité', 'Poteau électrique endommagé',       'Damaged utility pole',          'transmission-tower',    'high',   24,  false, 20),
  ('routier_provincial', 'glissiere',              'Route',       'Glissière de sécurité endommagée',  'Damaged guardrail',             'highway',               'high',   24,  false, 10)
) as s(domain_code, code, category, label_fr, label_en, icon, prio, sla, urgence, ordre)
join public.domain d on d.code = s.domain_code;
