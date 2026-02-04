import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Alert, Text, ActivityIndicator, StyleSheet, View, TextInput, ScrollView } from 'react-native';
import { getFirestore, collection, query, where, limit, getDocs, writeBatch, doc, updateDoc } from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext';

type Franja = { abre: string; cierra: string; };
type HorariosPorDia = {
  lunes: Franja[];
  martes: Franja[];
  miercoles: Franja[];
  jueves: Franja[];
  viernes: Franja[];
  sabado: Franja[];
  domingo: Franja[];
};

const dias: (keyof HorariosPorDia)[] = [
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
];

interface Farmacia {
  id: string;
  name: string;
}
const db = getFirestore();

// Función para poner primera letra en mayúscula
const capitalizar = (s: string) =>
  s.length === 0 ? '' : s[0].toUpperCase() + s.slice(1).toLowerCase();

export const BotonActualizarHorariosTodos: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [farmaciaNombre, setFarmaciaNombre] = useState('');
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<Farmacia | null>(null);
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [horarios, setHorarios] = useState<HorariosPorDia>({
    lunes:    [{ abre: "08:00", cierra: "12:30" }, { abre: "16:30", cierra: "20:30" }],
    martes:   [{ abre: "08:00", cierra: "12:30" }, { abre: "16:30", cierra: "20:30" }],
    miercoles:[{ abre: "08:00", cierra: "12:30" }, { abre: "16:30", cierra: "20:30" }],
    jueves:   [{ abre: "08:00", cierra: "12:30" }, { abre: "16:30", cierra: "20:30" }],
    viernes:  [{ abre: "08:00", cierra: "12:30" }, { abre: "16:30", cierra: "20:30" }],
    sabado:   [{ abre: "08:00", cierra: "12:30" }],
    domingo:  []
  });

    const {theme} = useTheme()
    const colors = theme.colors

  // Buscar farmacias por nombre
  const buscarFarmaciasPorNombre = async (busqueda: string) => {
    setFarmaciaSeleccionada(null);
    setFarmacias([]);
    if (busqueda.length < 2) return;
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, 'farmacias'),
          where('name', '>=', busqueda),
          where('name', '<=', busqueda + '\uf8ff'),
          limit(8)
        )
      );
      const resultados: Farmacia[] = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.get('name'),
      }));
      setFarmacias(resultados);
    } catch (e) {
      setFarmacias([]);
    } finally {
      setLoading(false);
    }
  };

  // Autoselección: si solo hay 1 resultado y coincide (sin importar mayúscula)
  useEffect(() => {
    if (
      farmacias.length === 1 &&
      farmacias[0].name.trim().toLowerCase() === farmaciaNombre.trim().toLowerCase()
    ) {
      setFarmaciaSeleccionada(farmacias[0]);
    }
  }, [farmacias, farmaciaNombre]);

  // Función para actualizar una franja específica de un día
  const setFranja = (dia: keyof HorariosPorDia, idx: number, campo: keyof Franja, valor: string) => {
    setHorarios(prev => {
      const newFranjas = prev[dia].map((f, i) => i === idx ? { ...f, [campo]: valor } : f);
      return { ...prev, [dia]: newFranjas };
    });
  };

  // Función para agregar nueva franja a un día
  const addFranja = (dia: keyof HorariosPorDia) => {
    setHorarios(prev => ({
      ...prev,
      [dia]: [...prev[dia], { abre: '', cierra: '' }]
    }));
  };

  // Función para eliminar franja de un día
  const removeFranja = (dia: keyof HorariosPorDia, idx: number) => {
    setHorarios(prev => ({
      ...prev,
      [dia]: prev[dia].filter((_, i) => i !== idx)
    }));
  };

  // Acción para actualizar horarios
  const handleUpdate = async (toAll: boolean) => {
    if (!toAll && !farmaciaSeleccionada) {
      Alert.alert('Error', 'Debes seleccionar una farmacia por nombre.');
      return;
    }
    Alert.alert(
      `¿Actualizar horarios ${toAll ? 'en TODAS las farmacias' : `en ${capitalizar(farmaciaSeleccionada?.name || '')}` }?`,
      toAll ? "Esta acción cambiará los horarios en TODAS las farmacias. ¿Seguro?" : `Esta acción cambiará los horarios solo en "${capitalizar(farmaciaSeleccionada?.name || '')}".`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Actualizar",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              if (toAll) {
                const snap = await getDocs(collection(db, 'farmacias'));
                const batch = writeBatch(db);
                snap.forEach(doc => {
                  batch.update(doc.ref, { horarios });
                });
                await batch.commit();
                Alert.alert("¡Listo!", "Se actualizaron los horarios en todas las farmacias.");
              } else {
                await updateDoc(doc(db, 'farmacias', farmaciaSeleccionada!.id), { horarios });
                Alert.alert("¡Listo!", `Se actualizaron los horarios de "${capitalizar(farmaciaSeleccionada!.name)}".`);
              }
              setFarmaciaNombre('');
              setFarmaciaSeleccionada(null);
              setFarmacias([]);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Ocurrió un error.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

 
  return (
    <ScrollView contentContainerStyle={[{backgroundColor: colors.background},styles.scrollContainer]}>
      <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.titulo, { color: colors.text }]}>Editar horarios para todos o una farmacia específica</Text>
        {/* Buscador por nombre */}
        <TextInput
          style={[styles.inputId, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          placeholder="Buscar farmacia por nombre"
          value={farmaciaNombre}
          onChangeText={text => {
            setFarmaciaNombre(text);
            buscarFarmaciasPorNombre(text);
          }}
          autoCapitalize="words"
          placeholderTextColor={colors.placeholderText}
        />
        {/* Sugerencias */}
       {!loading && farmacias.length > 0 && (
  <View style={{ maxHeight: 140, marginBottom: 12 }}>
    {farmacias.map(item => (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.suggestionItem,
          farmaciaSeleccionada?.id === item.id && styles.suggestionItemActive
        ]}
        onPress={() => setFarmaciaSeleccionada(item)}
      >
        <Text style={{
          color: farmaciaSeleccionada?.id === item.id ? '#fff' : colors.text
        }}>
          {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}

        {loading && <ActivityIndicator style={{ marginVertical: 8 }} />}

        {/* MOSTRAR LA FARMACIA SELECCIONADA */}
        {farmaciaSeleccionada && (
          <Text style={{ color: '#28a745', marginBottom: 10, fontWeight: 'bold', fontSize: 16 }}>
            Seleccionada: {capitalizar(farmaciaSeleccionada.name)}
          </Text>
        )}

        {/* Horarios por día y franja */}
        {dias.map(dia => (
          <View key={dia} style={[{backgroundColor: colors.card },styles.diaSection]}>
            <Text style={[styles.diaTitulo, { color: colors.primary }]}>{capitalizar(dia)}</Text>
            {horarios[dia].map((franja, idx) => (
              <View key={idx} style={styles.franjaRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  placeholder="Abre (hh:mm)"
                  value={franja.abre}
                  onChangeText={text => setFranja(dia, idx, 'abre', text)}
                  keyboardType="numeric"
                  placeholderTextColor={colors.placeholderText}
                />
                <Text style={{ fontWeight: 'bold', marginHorizontal: 4 }}>-</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  placeholder="Cierra (hh:mm)"
                  value={franja.cierra}
                  onChangeText={text => setFranja(dia, idx, 'cierra', text)}
                  keyboardType="numeric"
                  placeholderTextColor={colors.placeholderText}
                />
                <TouchableOpacity
                  onPress={() => removeFranja(dia, idx)}
                  style={styles.deleteBtn}
                  disabled={horarios[dia].length <= 1}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>🗑</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={() => addFranja(dia)}>
              <Text style={{ color: '#2d6cdf', fontWeight: 'bold' }}>+ Agregar franja</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleUpdate(true)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Actualizar en TODAS</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonIndividual, loading && styles.buttonDisabled]}
            onPress={() => handleUpdate(false)}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Actualizar solo esta</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 32
  },
  form: {
    borderRadius: 12,
    margin: 16,
    padding: 16,
    elevation: 2,
    borderWidth: 1,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  diaSection: {
    marginBottom: 16,
   // backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    elevation: 1,
  },
  diaTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d6cdf',
    marginBottom: 4
  },
  franjaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  input: {
    flex: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 2,
    fontSize: 15,
    borderWidth: 1,
  },
  inputId: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    marginVertical: 16,
  },
  suggestionItem: {
    padding: 10,
    backgroundColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  },
  suggestionItemActive: {
    backgroundColor: '#2d6cdf',
  },
  deleteBtn: {
    backgroundColor: '#dc3545',
    borderRadius: 6,
    padding: 6,
    marginLeft: 4,
  },
  addBtn: {
    marginVertical: 4,
    alignSelf: 'flex-start'
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  button: {
    backgroundColor: '#2d6cdf',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    flex: 1,
    minWidth: 120,
  },
  buttonIndividual: {
    backgroundColor: '#28a745'
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center'
  }
});
