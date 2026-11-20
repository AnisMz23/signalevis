// Barre d'onglets du design (Figma « Barre d'onglets ») : Accueil · « + » · Mes signalements.
import { router, Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, radius, typography, useTheme } from '@/theme';
import { Icon } from '@/ui/Icon';
import type { IconName } from '@/ui/icons';

const TABS: { name: string; label: () => string; icon: IconName }[] = [
  { name: 'index', label: () => t('tabs.home'), icon: 'home' },
  { name: 'mes-signalements', label: () => t('tabs.reports'), icon: 'list' },
];

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  const tab = (def: (typeof TABS)[number]) => {
    const focused = current === def.name;
    const color = focused ? theme.primary : theme.textMuted;
    return (
      <Pressable
        key={def.name}
        testID={`tab-${def.name}`}
        accessibilityRole="tab"
        accessibilityLabel={def.label()}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const route = state.routes.find((r) => r.name === def.name);
          if (route) navigateToTab(route.key);
        }}
        style={styles.tab}
      >
        <Icon name={def.icon} color={color} />
        <Text style={[focused ? typography.captionStrong : typography.caption, { color }]}>{def.label()}</Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + 10 }]}
    >
      {tab(TABS[0])}
      <Pressable
        testID="tab-report"
        accessibilityRole="button"
        accessibilityLabel={t('tabs.report')}
        accessibilityHint={t('home.report.hint')}
        onPress={() => router.push('/signaler/type')}
        style={[styles.fab, { backgroundColor: theme.accent }]}
      >
        <Icon name="plus-fab" color={theme.onAccent} />
      </Pressable>
      {tab(TABS[1])}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="mes-signalements" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  tab: { alignItems: 'center', gap: 4, minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, justifyContent: 'center' },
  fab: { width: 54, height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
