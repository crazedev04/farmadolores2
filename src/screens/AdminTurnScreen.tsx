import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { getFirestore, collection, query, orderBy, limit, startAfter, where, getDocs, updateDoc, doc } from '@react-native-firebase/firestore';
import PickerTurno from '../components/PikerTurno'; // Cambia ruta si es necesario
import { useTheme } from '../context/ThemeContext';
const db = getFirestore();

interface Farmacia {
  id: string;
  name: string;
  turn?: Date[] | null;
}

const AdminCambiarTurnoFarmacia: React.FC = () => {
  const [busqueda, setBusqueda] = useState('');
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [farmaciasListado, setFarmaciasListado] = useState<Farmacia[]>([]);
  const [lastFarmaciaDoc, setLastFarmaciaDoc] = useState<any>(null);
  const [loadingListado, setLoadingListado] = useState(false);
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<Farmacia | null>(null);
  const [turnos, setTurnos] = useState<(Date | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [turnoFilter, setTurnoFilter] = useState<'all' | 'future' | 'past'>('future');
  const { theme } = useTheme();
  const colors = theme.colors;

  useEffect(() => {
    fetchFarmaciasListado(true);
  }, []);

  // Listado inicial de farmacias
  const fetchFarmaciasListado = async (reset = false) => {
    if (loadingListado) return;
    setLoadingListado(true);
    try {
      let farmaciasQuery = query(collection(db, 'farmacias'), orderBy('name'), limit(12));
      if (!reset && lastFarmaciaDoc) {
        farmaciasQuery = query(collection(db, 'farmacias'), orderBy('name'), startAfter(lastFarmaciaDoc), limit(12));
      }
      const snap = await getDocs(farmaciasQuery);
      const results: Farmacia[] = snap.docs.map(doc => {
        const data = doc.data();
        let turnArr: (Date | null)[] = [];
        if (Array.isArray(data.turn)) {
          turnArr = data.turn.map((t: any) =>
            t && typeof t.toDate === 'function'
              ? t.toDate()
              : (t instanceof Date ? t : null)
          );
        }
        return {
          id: doc.id,
          name: data.name,
          turn: turnArr
        };
      });
      setLastFarmaciaDoc(snap.docs[snap.docs.length - 1] ?? null);
      setFarmaciasListado(prev => (reset ? results : [...prev, ...results]));
    } catch {
      if (reset) setFarmaciasListado([]);
    } finally {
      setLoadingListado(false);
    }
  };

  // Buscar farmacias por nombre (mayúscula)
  const buscarFarmaciasPorNombre = async (nombre: string) => {
    setFarmaciaSeleccionada(null);
    setTurnos([]);
    setFarmacias([]);
    if (nombre.length < 2) return;
    setLoading(true);
    try {
      const inicio = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      const fin = inicio + '\uf8ff';
      const snap = await getDocs(
        query(
          collection(db, 'farmacias'),
          where('name', '>=', inicio),
          where('name', '<=', fin),
          limit(8)
        )
      );
      const results: Farmacia[] = snap.docs.map(doc => {
        const data = doc.data();
        // Convierte los turnos a array de Date o null
        let turnArr: (Date | null)[] = [];
        if (Array.isArray(data.turn)) {
          turnArr = data.turn.map((t: any) =>
            t && typeof t.toDate === 'function'
              ? t.toDate()
              : (t instanceof Date ? t : null)
          );
        }
        return {
          id: doc.id,
          name: data.name,
          turn: turnArr
        };
      });
      setFarmacias(results);
    } catch (e) {
      setFarmacias([]);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar una farmacia y cargar los turnos
  const handleSelectFarmacia = (farmacia: Farmacia) => {
    setFarmaciaSeleccionada(farmacia);
    setTurnos(farmacia.turn && farmacia.turn.length > 0 ? farmacia.turn : []);
  };

  // Acciones sobre turnos
  const addTurno = () => setTurnos(prev => [...prev, null]);
  const setTurno = (idx: number, fecha: Date) =>
    setTurnos(prev => prev.map((t, i) => i === idx ? fecha : t));
  const removeTurno = (idx: number) =>
    setTurnos(prev => prev.filter((_, i) => i !== idx));

  const now = new Date();
  const filteredTurnos = useMemo(() => {
    const normalized = turnos.filter(Boolean) as Date[];
    const sorted = normalized.sort((a, b) => a.getTime() - b.getTime());
    if (turnoFilter === 'future') {
      return sorted.filter(t => t.getTime() >= now.getTime());
    }
    if (turnoFilter === 'past') {
      return sorted.filter(t => t.getTime() < now.getTime());
    }
    return sorted;
  }, [turnos, turnoFilter, now]);

  // Guardar todos los turnos en Firebase
  const guardarTurnos = async () => {
    if (!farmaciaSeleccionada) {
      Alert.alert('Selecciona una farmacia');
      return;
    }
    if (turnos.some(t => !t)) {
      Alert.alert('Error', 'Todos los turnos deben tener fecha y hora.');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'farmacias', farmaciaSeleccionada.id), { turn: turnos }); // Firebase convierte Date[] a Timestamp[]
      Alert.alert('¡Listo!', `Turnos actualizados para "${farmaciaSeleccionada.name}"`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[{ backgroundColor: colors.background }, styles.scrollContainer]}>
      <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.titulo, { color: colors.text }]}>Editar turnos de una farmacia</Text>
        <Text style={[styles.subTitle, { color: colors.mutedText || colors.placeholderText }]}>
          Buscá por nombre y ajustá los turnos. Podés filtrar futuros o pasados.
        </Text>

        <TextInput
          style={[styles.inputId, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          placeholder="Buscar farmacia por nombre"
          value={busqueda}
          onChangeText={text => {
            setBusqueda(text);
            buscarFarmaciasPorNombre(text);
          }}
          autoCapitalize="words"
          placeholderTextColor={colors.placeholderText}
        />

        {!loading && busqueda.length >= 2 && farmacias.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>
            No hay resultados.
          </Text>
        )}

        {!loading && busqueda.length >= 2 && farmacias.length > 0 && (
          <View style={styles.suggestions}>
            {farmacias.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.suggestionItem,
                  { borderColor: colors.border, backgroundColor: colors.inputBackground },
                  farmaciaSeleccionada?.id === item.id && styles.suggestionItemActive
                ]}
                onPress={() => handleSelectFarmacia(item)}
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

        {farmaciaSeleccionada && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.selected, { color: colors.success }]}>
              Farmacia seleccionada: {farmaciaSeleccionada.name.charAt(0).toUpperCase() + farmaciaSeleccionada.name.slice(1)}
            </Text>

            <View style={styles.filterRow}>
              {(['all', 'future', 'past'] as const).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    turnoFilter === option && { backgroundColor: colors.buttonBackground },
                  ]}
                  onPress={() => setTurnoFilter(option)}
                >
                  <Text style={[
                    styles.filterText,
                    { color: turnoFilter === option ? colors.buttonText : colors.text }
                  ]}>
                    {option === 'all' ? 'Todos' : option === 'future' ? 'Futuros' : 'Pasados'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Turnos</Text>
            {filteredTurnos.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>
                No hay turnos para mostrar con este filtro.
              </Text>
            )}

            {filteredTurnos.map((fecha, idx) => (
              <View key={`${fecha.toISOString()}-${idx}`} style={styles.turnoRow}>
                <PickerTurno
                  value={fecha}
                  onChange={date => {
                    const originalIndex = turnos.findIndex(t => t?.getTime?.() === fecha.getTime());
                    if (originalIndex >= 0) {
                      setTurno(originalIndex, date);
                    }
                  }}
                  label="Seleccionar fecha y hora"
                />
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    const originalIndex = turnos.findIndex(t => t?.getTime?.() === fecha.getTime());
                    if (originalIndex >= 0) {
                      removeTurno(originalIndex);
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>🗑</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={addTurno}>
              <Text style={{ color: colors.buttonBackground, fontWeight: 'bold' }}>+ Agregar turno</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.buttonBackground }, loading && styles.buttonDisabled]}
              onPress={guardarTurnos}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Guardar turnos</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.listadoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Listado de farmacias</Text>
        <Text style={[styles.subTitle, { color: colors.mutedText || colors.placeholderText }]}>
          Tocá una farmacia para editar sus turnos o usá el buscador.
        </Text>
        {farmaciasListado.length === 0 && !loadingListado && (
          <Text style={[styles.emptyText, { color: colors.mutedText || colors.placeholderText }]}>
            No hay farmacias para mostrar.
          </Text>
        )}
        <ScrollView
          style={styles.listadoScroll}
          contentContainerStyle={styles.listadoContent}
          nestedScrollEnabled
        >
          {farmaciasListado.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.suggestionItem,
                { borderColor: colors.border, backgroundColor: colors.inputBackground },
                farmaciaSeleccionada?.id === item.id && styles.suggestionItemActive
              ]}
              onPress={() => handleSelectFarmacia(item)}
            >
              <Text style={{
                color: farmaciaSeleccionada?.id === item.id ? '#fff' : colors.text
              }}>
                {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {loadingListado && <ActivityIndicator style={{ marginVertical: 8 }} />}
        {!loadingListado && lastFarmaciaDoc && (
          <TouchableOpacity style={styles.addBtn} onPress={() => fetchFarmaciasListado(false)}>
            <Text style={{ color: colors.buttonBackground, fontWeight: 'bold' }}>Ver más</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { paddingBottom: 32 },
  form: {
    borderRadius: 12,
    margin: 16,
    padding: 16,
    elevation: 2,
    borderWidth: 1,
  },
  listadoCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    elevation: 2,
    borderWidth: 1,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    color: '#333',
  },
  subTitle: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 12,
  },
  inputId: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    marginVertical: 16,
  },
  suggestions: {
    maxHeight: 160,
    marginBottom: 12,
    gap: 8,
  },
  listadoScroll: {
    maxHeight: 320,
    marginBottom: 12,
  },
  listadoContent: {
    gap: 8,
    paddingBottom: 2,
  },
  listadoContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  suggestionItem: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  suggestionItemActive: {
    backgroundColor: '#2d6cdf',
  },
  selected: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  turnoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteBtn: {
    backgroundColor: '#dc3545',
    borderRadius: 6,
    padding: 6,
    marginLeft: 4,
  },
  addBtn: {
    marginVertical: 8,
    alignSelf: 'flex-start'
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    minWidth: 120,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center'
  }
});

export default AdminCambiarTurnoFarmacia;
