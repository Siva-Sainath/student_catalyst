import React, { useEffect, useState } from "react";
import { ScrollView, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Card } from "../components/Card";
import { theme } from "../theme";

type Props = { title: string; load: () => Promise<any>; render: (data: any) => React.ReactNode };

export function FeatureScreen({ title, load, render }: Props) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    load().then(setData).catch((e) => setErr(e.message));
  }, []);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <Text style={styles.title}>{title}</Text>
      {err && <Card><Text style={styles.err}>{err}</Text></Card>}
      {!data && !err && <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />}
      {data && render(data)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  pad: { padding: 16, paddingBottom: 32 },
  title: { color: theme.text, fontSize: 22, fontWeight: "700", marginBottom: 16 },
  err: { color: theme.danger, fontSize: 13 },
});
