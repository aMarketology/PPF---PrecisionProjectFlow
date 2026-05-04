import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/lib/theme';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.gradientStart }}>
        <ActivityIndicator color={colors.primaryLight} size="large" />
      </View>
    );
  }

  return authed ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/welcome" />;
}
