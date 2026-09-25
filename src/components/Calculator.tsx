import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { calculateRemotely } from '@/lib/api';
import { type Operation, prepareRequest } from '@/lib/calculator-input';

const operations: { value: Operation; symbol: string; label: string }[] = [
  { value: 'add', symbol: '+', label: 'Add' },
  { value: 'subtract', symbol: '−', label: 'Subtract' },
  { value: 'multiply', symbol: '×', label: 'Multiply' },
  { value: 'divide', symbol: '÷', label: 'Divide' },
];
type Status = { kind: 'idle' | 'loading' } | { kind: 'error'; message: string } | { kind: 'success'; result: number };

export default function Calculator() {
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [operation, setOperation] = useState<Operation>('add');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const activeRequest = useRef<AbortController | null>(null);
  const loading = status.kind === 'loading';

  useEffect(() => () => activeRequest.current?.abort(), []);

  function edit(update: () => void) {
    update();
    activeRequest.current?.abort();
    activeRequest.current = null;
    setStatus({ kind: 'idle' });
  }

  async function submit() {
    if (activeRequest.current) return;
    let input;
    try {
      input = prepareRequest(first, second, operation);
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
      return;
    }
    Keyboard.dismiss();
    const controller = new AbortController();
    activeRequest.current = controller;
    setStatus({ kind: 'loading' });
    try {
      const result = await calculateRemotely(input, { signal: controller.signal, allowHttp: __DEV__ });
      if (!controller.signal.aborted) setStatus({ kind: 'success', result });
    } catch (error) {
      if (!controller.signal.aborted) setStatus({ kind: 'error', message: (error as Error).message });
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  function operand(label: string, value: string, update: (text: string) => void) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={(text) => edit(() => update(text))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#6b7280"
            editable={!loading}
            maxLength={320}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change sign of ${label.toLowerCase()}`}
            accessibilityState={{ disabled: loading }}
            disabled={loading}
            style={styles.signButton}
            onPress={() => edit(() => update(value.startsWith('-') ? value.slice(1) : `-${value}`))}>
            <Text style={styles.signText}>+/−</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>MOBILE + API</Text>
            <Text accessibilityRole="header" style={styles.title}>Calculator</Text>
            <Text style={styles.description}>Enter two numbers. Your backend does the math.</Text>
            {operand('First number', first, setFirst)}
            <View style={styles.operations}>
              {operations.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: operation === item.value, disabled: loading }}
                  disabled={loading}
                  onPress={() => edit(() => setOperation(item.value))}
                  style={[styles.operation, operation === item.value && styles.selected]}>
                  <Text style={[styles.symbol, operation === item.value && styles.white]}>{item.symbol}</Text>
                  <Text style={[styles.operationLabel, operation === item.value && styles.white]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            {operand('Second number', second, setSecond)}
            <Text style={styles.hint}>Use a dot or comma for decimals. Use +/− for negative numbers.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}
              disabled={loading}
              onPress={submit}
              style={({ pressed }) => [styles.submit, (pressed || loading) && styles.dimmed]}>
              <Text style={styles.submitText}>{loading ? 'Calculating…' : 'Calculate'}</Text>
            </Pressable>
            <View accessibilityLiveRegion="polite" style={styles.feedback}>
              {status.kind === 'idle' && <Text style={styles.hint}>The result will appear here.</Text>}
              {loading && <ActivityIndicator size="large" color="#1d4ed8" accessibilityLabel="Waiting for the backend" />}
              {status.kind === 'success' && <>
                <Text style={styles.label}>Result from API</Text>
                <Text selectable style={styles.result}>{String(status.result)}</Text>
              </>}
              {status.kind === 'error' && <Text accessibilityRole="alert" style={styles.error}>{status.message}</Text>}
            </View>
            <Text style={styles.footer}>No connection? No local calculation. Start the API and try again.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#ffffff', borderRadius: 24, padding: 24, gap: 20 },
  eyebrow: { color: '#1d4ed8', fontWeight: '700', letterSpacing: 2, fontSize: 12 },
  title: { color: '#0f172a', fontWeight: '800', fontSize: 34 },
  description: { color: '#475569', fontSize: 16, lineHeight: 24 },
  field: { gap: 8 },
  label: { color: '#334155', fontSize: 16, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 12, padding: 14, fontSize: 24, color: '#0f172a' },
  signButton: { minWidth: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#e2e8f0' },
  signText: { fontSize: 22, color: '#0f172a' },
  operations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  operation: { flexGrow: 1, flexBasis: '40%', minHeight: 60, alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 12, backgroundColor: '#eff6ff' },
  selected: { backgroundColor: '#1d4ed8' },
  symbol: { fontSize: 28, color: '#1d4ed8', fontWeight: '600' },
  operationLabel: { color: '#1d4ed8', fontSize: 14 },
  white: { color: '#ffffff' },
  hint: { color: '#475569', fontSize: 14, lineHeight: 21 },
  submit: { minHeight: 54, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#1d4ed8' },
  submitText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  dimmed: { opacity: 0.65 },
  feedback: { minHeight: 88, gap: 8, justifyContent: 'center' },
  result: { fontSize: 32, color: '#0f172a', fontWeight: '700' },
  error: { color: '#b91c1c', fontSize: 16, lineHeight: 24 },
  footer: { color: '#475569', fontSize: 12, lineHeight: 18 },
});
