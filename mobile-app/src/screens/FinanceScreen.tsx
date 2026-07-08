import React, { useState, useCallback } from "react";
import {
  ScrollView, View, Text, StyleSheet,
  ActivityIndicator, RefreshControl, Pressable,
  Modal, TextInput, Alert, Linking
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getFinance, addTransaction, updateBudget, deleteTransaction, updateTransaction } from "../api";
import { theme } from "../theme";

const CATEGORY_COLORS: Record<string, string> = {
  "Food":          "#f59e0b",
  "Transport":     "#3b82f6",
  "Books & Notes": "#8b5cf6",
  "Entertainment": "#ec4899",
  "Miscellaneous": "#6b7280",
};

export function FinanceScreen() {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [category, setCategory]                 = useState("Food");
  const [amount, setAmount]                     = useState("");
  const [desc, setDesc]                         = useState("");

  // Edit Expense State
  const [editingTx, setEditingTx]     = useState<any>(null);
  const [editCategory, setEditCategory] = useState("Food");
  const [editAmount, setEditAmount]     = useState("");
  const [editDesc, setEditDesc]         = useState("");

  // UPI Modal State
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiId, setUpiId]               = useState("merchant@upi");
  const [upiName, setUpiName]           = useState("College Bookstore");
  const [upiAmount, setUpiAmount]       = useState("");
  const [upiNote, setUpiNote]           = useState("Books Payment");

  // Budget Customize State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newBudget, setNewBudget]             = useState("");

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      const resData = await getFinance();
      setData(resData);
      setNewBudget(resData.budget?.toString() ?? "7000");
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const handleUpdateBudget = async () => {
    const numBudget = parseFloat(newBudget);
    if (isNaN(numBudget) || numBudget <= 0) {
      Alert.alert("Error", "Please enter a valid budget limit.");
      return;
    }
    try {
      await updateBudget(numBudget);
      setShowBudgetModal(false);
      await load(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update budget limit.");
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    Alert.alert(
      "Delete Log",
      "Are you sure you want to delete this expense record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(id);
              await load(true);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete log.");
            }
          }
        }
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAddExpense = async () => {
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    try {
      await addTransaction(category, numAmt, desc.trim());
      setAmount("");
      setDesc("");
      setShowExpenseModal(false);
      await load(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to log transaction.");
    }
  };

  const handleEditTransaction = (tx: any) => {
    setEditingTx(tx);
    setEditCategory(tx.category);
    setEditAmount(tx.amount.toString());
    setEditDesc(tx.description || "");
  };

  const handleSaveEditExpense = async () => {
    const numAmt = parseFloat(editAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    try {
      await updateTransaction(editingTx.id, editCategory, numAmt, editDesc.trim());
      setEditingTx(null);
      await load(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update transaction.");
    }
  };

  const handleUpiPay = async () => {
    const numAmt = parseFloat(upiAmount);
    if (isNaN(numAmt) || numAmt <= 0 || !upiId.includes("@")) {
      Alert.alert("Error", "Please enter a valid amount and UPI ID.");
      return;
    }
    
    // Construct UPI Deep Link
    // upi://pay?pa=address&pn=name&am=amount&tn=note&cu=INR
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${upiAmount}&tn=${encodeURIComponent(upiNote)}&cu=INR`;
    
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
        
        // Prompt to log this transaction in SQLite database
        Alert.alert(
          "Confirm Payment",
          "Would you like to log this UPI payment in your finance tracker?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log Expense",
              onPress: async () => {
                try {
                  await addTransaction("Miscellaneous", numAmt, `UPI: ${upiName} (${upiNote})`);
                  setUpiAmount("");
                  setShowUpiModal(false);
                  await load(true);
                } catch (e) {
                  Alert.alert("Error", "Failed to log UPI transaction.");
                }
              }
            }
          ]
        );
      } else {
        // Fallback if no UPI app installed (or in simulator)
        Alert.alert(
          "Simulator Mode",
          `UPI payment request generated for ₹${upiAmount} to ${upiId}. Log this simulated payment now?`,
          [
            { text: "No", style: "cancel" },
            {
              text: "Yes, Log It",
              onPress: async () => {
                await addTransaction("Miscellaneous", numAmt, `UPI Sim: ${upiName}`);
                setUpiAmount("");
                setShowUpiModal(false);
                await load(true);
              }
            }
          ]
        );
      }
    } catch (err) {
      Alert.alert("UPI Error", "Could not trigger UPI payment app.");
    }
  };

  if (loading) return <Center />;

  const budget_pct = Math.round((data.total_spent / data.budget) * 100);
  const budget_color = budget_pct > 90 ? theme.danger : budget_pct > 75 ? theme.warn : theme.success;

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Finance Portal</Text>
          <Text style={styles.headerSub}>Budget & expense audits</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.upiBtn} onPress={() => setShowUpiModal(true)}>
            <Text style={styles.upiBtnText}>💸 UPI Pay</Text>
          </Pressable>
          <Pressable style={styles.addBtn} onPress={() => setShowExpenseModal(true)}>
            <Text style={styles.addBtnText}>+ Log Spend</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.month}>{data.month}</Text>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.total}>₹{data.total_spent.toLocaleString("en-IN")}</Text>

          {/* Budget progress */}
          <Pressable
            onPress={() => {
              setNewBudget(data.budget.toString());
              setShowBudgetModal(true);
            }}
            style={({ pressed }) => [
              styles.budgetRow,
              pressed && { opacity: 0.7 }
            ]}
          >
            <Text style={styles.budgetLabel}>Budget Limit: ₹{data.budget.toLocaleString("en-IN")} ✏️</Text>
            <Text style={[styles.budgetPct, { color: budget_color }]}>{budget_pct}%</Text>
          </Pressable>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${Math.min(budget_pct, 100)}%`, backgroundColor: budget_color }]} />
          </View>

          <View style={styles.statsRow}>
            <StatItem label="Daily Avg" value={`₹${data.daily_average.toFixed(0)}`} />
            <View style={styles.divider} />
            <StatItem label="Budget Left" value={`₹${data.budget_remaining.toLocaleString("en-IN")}`} color={budget_color} />
          </View>
        </View>

        <Text style={styles.section}>CATEGORY BREAKDOWN</Text>
        {data.breakdown.map((item: any) => (
          <ExpenseRow key={item.category} item={item} />
        ))}

        <Text style={[styles.section, { marginTop: 12 }]}>TRANSACTION HISTORY</Text>
        {data.transactions && data.transactions.length > 0 ? (
          data.transactions.map((tx: any) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDesc}>{tx.description || tx.category}</Text>
                <Text style={styles.txMeta}>{tx.category} · {new Date(tx.date).toLocaleDateString("en-IN")}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={styles.txAmount}>₹{tx.amount}</Text>
                <Pressable onPress={() => handleEditTransaction(tx)} hitSlop={8}>
                  <Text style={{ fontSize: 14 }}>✏️</Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteTransaction(tx.id)} hitSlop={8}>
                  <Text style={{ fontSize: 14 }}>🗑️</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No transaction records logged.</Text>
        )}
      </ScrollView>

      {/* Edit Expense Modal */}
      <Modal visible={editingTx !== null} transparent animationType="slide" onRequestClose={() => setEditingTx(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Expense Record</Text>
              <Pressable onPress={() => setEditingTx(null)}>
                <Text style={styles.closeBtn}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {["Food", "Transport", "Books & Notes", "Entertainment", "Miscellaneous"].map(c => {
                const selected = editCategory === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.catChip, selected && styles.catChipSelected]}
                    onPress={() => setEditCategory(c)}
                  >
                    <Text style={[styles.catChipText, selected && { color: "#fff" }]}>{c}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>AMOUNT (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 150"
              placeholderTextColor={theme.faint}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
            />

            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lunch at food court"
              placeholderTextColor={theme.faint}
              value={editDesc}
              onChangeText={setEditDesc}
            />

            <Pressable style={styles.submitBtn} onPress={handleSaveEditExpense}>
              <Text style={styles.submitBtnText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Manual Expense Modal */}
      <Modal visible={showExpenseModal} transparent animationType="slide" onRequestClose={() => setShowExpenseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Expense</Text>
              <Pressable onPress={() => setShowExpenseModal(false)}>
                <Text style={styles.closeBtn}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {["Food", "Transport", "Books & Notes", "Entertainment", "Miscellaneous"].map(c => {
                const selected = category === c;
                return (
                  <Pressable
                    key={c}
                    style={[styles.catChip, selected && styles.catChipSelected]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.catChipText, selected && { color: "#fff" }]}>{c}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>AMOUNT (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 150"
              placeholderTextColor={theme.faint}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lunch at food court"
              placeholderTextColor={theme.faint}
              value={desc}
              onChangeText={setDesc}
            />

            <Pressable style={styles.submitBtn} onPress={handleAddExpense}>
              <Text style={styles.submitBtnText}>Add Expense</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* UPI Pay Modal */}
      <Modal visible={showUpiModal} transparent animationType="slide" onRequestClose={() => setShowUpiModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick UPI Pay</Text>
              <Pressable onPress={() => setShowUpiModal(false)}>
                <Text style={styles.closeBtn}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>MERCHANT UPI ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. bookshop@okhdfcbank"
              placeholderTextColor={theme.faint}
              value={upiId}
              onChangeText={setUpiId}
            />

            <Text style={styles.label}>RECIPIENT NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. College Bookstore"
              placeholderTextColor={theme.faint}
              value={upiName}
              onChangeText={setUpiName}
            />

            <Text style={styles.label}>AMOUNT (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 450"
              placeholderTextColor={theme.faint}
              keyboardType="numeric"
              value={upiAmount}
              onChangeText={setUpiAmount}
            />

            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lab manual record books"
              placeholderTextColor={theme.faint}
              value={upiNote}
              onChangeText={setUpiNote}
            />

            <Pressable style={[styles.submitBtn, { backgroundColor: theme.success }]} onPress={handleUpiPay}>
              <Text style={styles.submitBtnText}>Launch UPI Pay App</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Budget Customize Modal */}
      <Modal visible={showBudgetModal} transparent animationType="slide" onRequestClose={() => setShowBudgetModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Monthly Budget</Text>
              <Pressable onPress={() => setShowBudgetModal(false)}>
                <Text style={styles.closeBtn}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>BUDGET LIMIT (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 7000"
              placeholderTextColor={theme.faint}
              keyboardType="numeric"
              value={newBudget}
              onChangeText={setNewBudget}
            />

            <Pressable style={styles.submitBtn} onPress={handleUpdateBudget}>
              <Text style={styles.submitBtnText}>Update Budget</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ExpenseRow({ item }: { item: any }) {
  const color = CATEGORY_COLORS[item.category] ?? theme.muted;
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.catName}>{item.category}</Text>
          <Text style={styles.catAmount}>₹{item.amount.toLocaleString("en-IN")}</Text>
        </View>
        <View style={styles.barBg2}>
          <View style={[styles.barFill2, { width: `${item.percentage}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={styles.pct}>{item.percentage}%</Text>
    </View>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={[styles.statVal, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Center() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  page:         { flex: 1, backgroundColor: theme.bg },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle:  { color: theme.text, fontSize: 20, fontWeight: "700" },
  headerSub:    { color: theme.muted, fontSize: 12, marginTop: 2 },
  actionRow:     { flexDirection: "row", gap: 8 },
  upiBtn:        { backgroundColor: theme.success + "20", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: theme.success },
  upiBtnText:    { color: theme.success, fontSize: 12, fontWeight: "600" },
  addBtn:        { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  addBtnText:    { color: "#fff", fontSize: 12, fontWeight: "600" },
  pad:           { padding: 16, paddingBottom: 40 },
  summaryCard:  { backgroundColor: theme.surface, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.border },
  month:        { color: theme.muted, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  totalLabel:   { color: theme.muted, fontSize: 12 },
  total:        { color: theme.text, fontSize: 40, fontWeight: "700", marginBottom: 16 },
  budgetRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  budgetLabel:  { color: theme.muted, fontSize: 12 },
  budgetPct:    { fontSize: 12, fontWeight: "700" },
  barBg:        { height: 6, backgroundColor: theme.surface3, borderRadius: 3, marginBottom: 16 },
  barFill:      { height: 6, borderRadius: 3 },
  statsRow:     { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  divider:      { width: 1, height: 28, backgroundColor: theme.border },
  statVal:      { color: theme.text, fontSize: 18, fontWeight: "700" },
  statLabel:    { color: theme.muted, fontSize: 11, marginTop: 2 },
  section:      { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 12 },
  row:          { flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.border, gap: 12 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  rowTop:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  catName:      { color: theme.text, fontSize: 13, fontWeight: "500" },
  catAmount:    { color: theme.text, fontSize: 13, fontWeight: "600" },
  barBg2:       { height: 3, backgroundColor: theme.surface3, borderRadius: 2 },
  barFill2:     { height: 3, borderRadius: 2 },
  pct:          { color: theme.muted, fontSize: 11, width: 32, textAlign: "right" },
  emptyText:     { color: theme.muted, fontSize: 13, textAlign: "center", marginVertical: 12 },
  
  txCard:       { flexDirection: "row", backgroundColor: theme.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.border, alignItems: "center" },
  txDesc:       { color: theme.text, fontSize: 14, fontWeight: "500" },
  txMeta:       { color: theme.muted, fontSize: 11, marginTop: 4 },
  txAmount:     { color: theme.text, fontSize: 15, fontWeight: "700" },

  // Modal
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent:  { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: theme.border },
  modalHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle:    { color: theme.text, fontSize: 18, fontWeight: "700" },
  closeBtn:      { color: theme.muted, fontSize: 24, fontWeight: "300" },
  label:         { color: theme.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  input:         { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.text, padding: 12, fontSize: 14, marginBottom: 8 },
  categoryPicker:{ flexDirection: "row", marginVertical: 4 },
  catChip:       { backgroundColor: theme.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: theme.border },
  catChipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  catChipText:   { color: theme.muted, fontSize: 12 },
  submitBtn:     { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
