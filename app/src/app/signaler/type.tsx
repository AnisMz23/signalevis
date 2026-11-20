// KAN-12 — Type d'anomalie (Figma 02). Étape 1/5.
// Grille de catégories (données de l'API, pas de liste figée) → types de la catégorie choisie
// (CA1, 2 niveaux), recherche sans accents (CA2), destinataire prévu (CA3), urgence 911 (CA4),
// cache hors ligne (CA5).
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadCatalog, type CatalogResult, type Service } from '@/api/catalog';
import { t, type MessageKey } from '@/i18n';
import { filterServices, groupByDomain, type ServiceSection } from '@/lib/search';
import { getPosition, type Position } from '@/location/position';
import { MIN_TOUCH_TARGET, radius, spacing, typography, useTheme } from '@/theme';
import { Button } from '@/ui/Button';
import { CategoryTile } from '@/ui/CategoryTile';
import { domainIcon } from '@/ui/Icon';
import { SearchField } from '@/ui/SearchField';
import { StepHeader } from '@/ui/StepHeader';

type State = { position: Position; result: CatalogResult } | null;

// Libellé court de catégorie (tuiles du design) ; repli sur le libellé du domaine renvoyé par l'API.
const domainLabel = (section: Pick<ServiceSection, 'domain' | 'title'>) => {
  const key = `domain.${section.domain}` as MessageKey;
  const label = t(key);
  return label === key || !label ? section.title : label;
};

const sectionRecipient = (section: ServiceSection) => {
  const names = [...new Set(section.data.map((s) => s.recipient))];
  return names.length === 1 ? names[0] : t('type.recipient.many');
};

export default function ChooseTypeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>(null);
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<string | null>(null);
  const [selected, setSelected] = useState<Service | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const position = await getPosition();
      const result = await loadCatalog(position);
      if (active) setState({ position, result });
    })();
    return () => {
      active = false;
    };
  }, []);

  const services = useMemo(
    () => (state && state.result.status !== 'unavailable' ? state.result.catalog.services : []),
    [state],
  );
  const sections = useMemo(() => groupByDomain(services), [services]);
  const searching = query.trim().length > 0;
  const results = useMemo(() => filterServices(services, query), [services, query]);
  const currentSection = sections.find((s) => s.domain === domain) ?? null;
  const visibleTypes = searching ? results : (currentSection?.data ?? []);

  const chooseType = (service: Service) => {
    if (service.is_emergency) {
      router.push('/signaler/urgence');
      return;
    }
    setSelected(service);
  };

  const proceed = () => {
    if (!selected) return;
    const section = sections.find((s) => s.domain === selected.domain);
    router.push({
      pathname: '/signaler/choisi',
      params: {
        code: selected.code,
        label: selected.label,
        recipient: selected.recipient,
        domain: selected.domain,
        domainLabel: section ? domainLabel(section) : selected.domain_label,
      },
    });
  };

  const notices: string[] = [];
  if (state?.position.source === 'demo') notices.push(t('type.position.demo'));
  if (state?.result.status === 'offline') {
    notices.push(t('type.offline', { date: new Date(state.result.savedAt).toLocaleString('fr-CA') }));
  }

  let body: React.ReactNode;
  if (!state) {
    body = (
      <View style={styles.center} accessible accessibilityLiveRegion="polite" accessibilityLabel={t('type.loading')}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[typography.body, { color: theme.textMuted }]}>{t('type.loading')}</Text>
      </View>
    );
  } else if (state.result.status === 'unavailable') {
    body = (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={[typography.body, styles.centerText, { color: theme.danger }]}>
          {t('type.unavailable')}
        </Text>
      </View>
    );
  } else {
    body = (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {notices.map((notice) => (
          <Text key={notice} style={[typography.caption, styles.notice, { color: theme.text, backgroundColor: theme.neutralSoft }]}>
            {notice}
          </Text>
        ))}
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('type.search.placeholder')}
          accessibilityLabel={t('type.search.label')}
        />

        {services.length === 0 ? (
          <Text style={[typography.body, { color: theme.textMuted }]}>{t('type.none')}</Text>
        ) : !searching ? (
          <>
            <Text accessibilityRole="header" style={[typography.captionStrong, { color: theme.textMuted }]}>
              {t('type.categories')}
            </Text>
            <View style={styles.grid}>
              {sections.map((section) => (
                <CategoryTile
                  key={section.domain}
                  testID={`category-${section.domain}`}
                  label={domainLabel(section)}
                  subtitle={sectionRecipient(section)}
                  icon={domainIcon(section.domain)}
                  selected={section.domain === domain}
                  accessibilityHint={t('type.category.hint')}
                  onPress={() => {
                    setDomain(section.domain);
                    if (selected?.domain !== section.domain) setSelected(null);
                  }}
                />
              ))}
            </View>
          </>
        ) : null}

        {(searching || currentSection) && services.length > 0 && (
          <>
            <Text accessibilityRole="header" style={[typography.captionStrong, { color: theme.textMuted }]}>
              {searching ? t('type.results') : t('type.types', { category: domainLabel(currentSection!) })}
            </Text>
            {visibleTypes.length === 0 ? (
              <Text style={[typography.body, { color: theme.textMuted }]}>{t('type.empty')}</Text>
            ) : (
              visibleTypes.map((item) => {
                const isSelected = selected?.code === item.code;
                const detail = item.is_emergency ? t('type.emergency') : t('type.recipient', { name: item.recipient });
                return (
                  <Pressable
                    key={item.code}
                    testID={`service-${item.code}`}
                    accessibilityRole="radio"
                    accessibilityLabel={`${item.label}. ${detail}`}
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => chooseType(item)}
                    style={({ pressed }) => [
                      styles.type,
                      {
                        backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.border,
                        borderWidth: isSelected ? 2 : 1,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[typography.bodyStrong, { color: theme.text }]}>{item.label}</Text>
                    <Text style={[typography.caption, { color: item.is_emergency ? theme.danger : theme.textMuted }]}>
                      {detail}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <StepHeader title={t('type.title')} step={1} />
      <View style={styles.body}>{body}</View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background }]}>
        <Button
          testID="continue"
          label={selected ? t('type.continue', { label: selected.label }) : t('type.continue.disabled')}
          disabled={!selected}
          onPress={proceed}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  center: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  centerText: { textAlign: 'center' },
  notice: { padding: 12, borderRadius: radius.field, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  type: { minHeight: MIN_TOUCH_TARGET, borderRadius: radius.card, padding: spacing.md, gap: 2 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 12 },
});
