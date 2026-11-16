// KAN-12 — Choisir le type de signalement (liste à 2 niveaux, recherche, destinataire prévu,
// urgences 911, cache hors ligne).
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { loadCatalog, type CatalogResult, type Service } from '@/api/catalog';
import { t } from '@/i18n';
import { filterServices, groupByDomain } from '@/lib/search';
import { getPosition, type Position } from '@/location/position';
import { MIN_TOUCH_TARGET, spacing, useTheme } from '@/theme';

type State = { position: Position; result: CatalogResult } | null;

export default function ChooseTypeScreen() {
  const theme = useTheme();
  const [state, setState] = useState<State>(null);
  const [query, setQuery] = useState('');

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

  const services = useMemo(() => (state && state.result.status !== 'unavailable' ? state.result.catalog.services : []), [state]);
  const sections = useMemo(() => groupByDomain(filterServices(services, query)), [services, query]);

  const choose = (service: Service) => {
    if (service.is_emergency) {
      router.push('/signaler/urgence');
      return;
    }
    router.push({
      pathname: '/signaler/choisi',
      params: { code: service.code, label: service.label, recipient: service.recipient },
    });
  };

  if (!state) {
    return (
      <View style={styles.center} accessible accessibilityLiveRegion="polite" accessibilityLabel={t('type.loading')}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.body, { color: theme.textMuted }]}>{t('type.loading')}</Text>
      </View>
    );
  }

  if (state.result.status === 'unavailable') {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert" style={[styles.body, { color: theme.danger }]}>
          {t('type.unavailable')}
        </Text>
      </View>
    );
  }

  const notices: string[] = [];
  if (state.position.source === 'demo') notices.push(t('type.position.demo'));
  if (state.result.status === 'offline') {
    notices.push(t('type.offline', { date: new Date(state.result.savedAt).toLocaleString('fr-CA') }));
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.code}
      stickySectionHeadersEnabled={false}
      initialNumToRender={100} // catalogue < 100 types : tout est rendu (lecteur d'écran, recherche)
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          {notices.map((notice) => (
            <Text key={notice} style={[styles.notice, { color: theme.textMuted, backgroundColor: theme.surface }]}>
              {notice}
            </Text>
          ))}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('type.search.placeholder')}
            placeholderTextColor={theme.textMuted}
            accessibilityLabel={t('type.search.label')}
            autoCorrect={false}
            clearButtonMode="while-editing"
            style={[styles.search, { color: theme.text, borderColor: theme.textMuted, backgroundColor: theme.background }]}
          />
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.body, { color: theme.textMuted }]}>
          {services.length === 0 ? t('type.none') : t('type.empty')}
        </Text>
      }
      renderSectionHeader={({ section }) => (
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => {
        const recipient = t('type.recipient', { name: item.recipient });
        const detail = item.is_emergency ? t('type.emergency') : recipient;
        return (
          <Pressable
            testID={`service-${item.code}`}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}. ${detail}`}
            accessibilityHint={t('type.item.hint')}
            onPress={() => choose(item)}
            style={({ pressed }) => [styles.item, { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.itemLabel, { color: theme.text }]}>{item.label}</Text>
            <Text style={[styles.itemDetail, { color: item.is_emergency ? theme.danger : theme.textMuted }]}>
              {detail}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  center: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  notice: { padding: spacing.md, borderRadius: 12, fontSize: 15, lineHeight: 21 },
  search: { minHeight: MIN_TOUCH_TARGET, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.md, fontSize: 17 },
  sectionTitle: { fontSize: 19, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  item: { minHeight: MIN_TOUCH_TARGET, borderRadius: 12, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  itemLabel: { fontSize: 17, fontWeight: '600' },
  itemDetail: { fontSize: 15 },
  body: { fontSize: 17, lineHeight: 24, textAlign: 'center' },
});
