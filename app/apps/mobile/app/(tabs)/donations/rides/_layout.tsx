// Rides stack within Donations tab — FR-RIDE-001.
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@kc/ui';
import { nativeStackHeaderLeftIconOnly } from '../../../../src/navigation/nativeHeaderIconOnly';

export default function RidesLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const detailHeader = {
    headerShown: true,
    ...nativeStackHeaderLeftIconOnly(colors.primary),
    headerBackVisible: false,
    headerTintColor: colors.primary,
    headerStyle: { backgroundColor: colors.background },
  } as const;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
          flex: 1,
          width: '100%',
          minWidth: '100%',
          alignSelf: 'stretch',
        },
        animation: 'fade',
        animationDuration: 220,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ ...detailHeader, headerTitle: t('donations.categories.transport.title') }}
      />
      <Stack.Screen
        name="[id]"
        options={{ ...detailHeader, headerTitle: t('donations.rides.detailTitle') }}
      />
      <Stack.Screen
        name="handoffs"
        options={{ ...detailHeader, headerTitle: t('givingHandoff.myHandoffs') }}
      />
    </Stack>
  );
}
