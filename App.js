import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, Button, FlatList } from "react-native";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot } from "firebase/firestore";
import { OpenAI } from "openai";

// ---------- FIREBASE CONFIG ----------
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- OPENAI CONFIG ----------
const client = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_KEY,
  dangerouslyAllowBrowser: true
});

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [aiTip, setAiTip] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "expenses"), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, []);

  const addExpense = async () => {
    if (!amount) return;
    await addDoc(collection(db, "expenses"), {
      amount: parseFloat(amount),
      note,
      createdAt: new Date()
    });
    setAmount("");
    setNote("");
    generateAiTip();
  };

  const generateAiTip = async () => {
    try {
      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const prompt = `A student spent $${totalSpent.toFixed(2)} this month. Suggest a short, motivational saving tip.`;
      const res = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      });
      setAiTip(res.choices[0].message.content);
    } catch {
      setAiTip("AI tip unavailable. Try again later!");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐻 Bearcat Budget</Text>

      <TextInput
        style={styles.input}
        placeholder="Amount (USD)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TextInput
        style={styles.input}
        placeholder="Note"
        value={note}
        onChangeText={setNote}
      />
      <Button title="Add Expense" onPress={addExpense} />

      <FlatList
        data={expenses}
        renderItem={({ item }) => <Text>{`$${item.amount} — ${item.note}`}</Text>}
        keyExtractor={(item) => item.id}
      />

      <Text style={styles.tipTitle}>💡 AI Saving Tip:</Text>
      <Text style={styles.tip}>{aiTip}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20, marginTop: 50 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8, marginBottom: 10
  },
  tipTitle: { fontWeight: "bold", marginTop: 20 },
  tip: { fontStyle: "italic", marginTop: 5 }
});
