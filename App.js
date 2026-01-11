import React, { useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import * as Location from 'expo-location'

const Stack = createNativeStackNavigator()

function formatDate(iso) {
	try {
		const d = new Date(iso)
		const yyyy = d.getFullYear()
		const mm = String(d.getMonth() + 1).padStart(2, '0')
		const dd = String(d.getDate()).padStart(2, '0')
		const hh = String(d.getHours()).padStart(2, '0')
		const mi = String(d.getMinutes()).padStart(2, '0')
		return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
	} catch {
		return iso
	}
}

function makeId() {
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function fetchNotesFromApi() {
	const url = 'https://jsonplaceholder.typicode.com/posts?_limit=6'
	const res = await fetch(url)
	if (!res.ok) throw new Error('API error')
	const data = await res.json()
	const now = new Date().toISOString()
	return data.map(p => ({
		id: `api-${p.id}`,
		title: p.title?.slice(0, 60) || 'Bez tytulu',
		body: p.body || '',
		createdAt: now,
		location: null,
		source: 'api',
	}))
}

function PrimaryButton({ label, onPress, disabled }) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole='button'
			accessibilityLabel={label}
			style={({ pressed }) => [styles.btn, disabled && styles.btnDisabled, pressed && !disabled && styles.btnPressed]}
			hitSlop={8}>
			<Text style={styles.btnText}>{label}</Text>
		</Pressable>
	)
}

function SecondaryButton({ label, onPress }) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole='button'
			accessibilityLabel={label}
			style={({ pressed }) => [styles.btn2, pressed && styles.btn2Pressed]}
			hitSlop={8}>
			<Text style={styles.btn2Text}>{label}</Text>
		</Pressable>
	)
}

function NotesListScreen({ navigation, route }) {
	const { notes, onSyncApi } = route.params

	const apiCount = useMemo(() => notes.filter(n => n.source === 'api').length, [notes])

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.headerRow}>
				<Text style={styles.h1}>Field Notes</Text>
				<View style={styles.headerBtns}>
					<SecondaryButton label='O app' onPress={() => navigation.navigate('About')} />
					<SecondaryButton label='Sync API' onPress={onSyncApi} />
					<PrimaryButton label='Dodaj' onPress={() => navigation.navigate('Edit', { mode: 'add' })} />
				</View>
			</View>

			<View style={styles.infoRow}>
				<Text style={styles.infoText}>
					Notatki: {notes.length} (API: {apiCount})
				</Text>
			</View>

			<FlatList
				data={notes}
				keyExtractor={item => item.id}
				contentContainerStyle={styles.list}
				ListEmptyComponent={
					<View style={styles.empty}>
						<Text style={styles.emptyText}>Brak notatek. Kliknij "Dodaj".</Text>
					</View>
				}
				renderItem={({ item }) => {
					const hasLoc = !!item.location
					return (
						<Pressable
							onPress={() => navigation.navigate('Details', { id: item.id })}
							style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
							accessibilityRole='button'
							accessibilityLabel={`Otworz notatke ${item.title}`}
							hitSlop={8}>
							<View style={styles.cardTop}>
								<Text style={styles.cardTitle} numberOfLines={1}>
									{item.title}
								</Text>
								<Text style={styles.badge}>{item.source === 'api' ? 'API' : 'LOCAL'}</Text>
							</View>

							<View style={styles.cardMeta}>
								<Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
								<Text style={styles.cardLoc}>{hasLoc ? '📍' : '—'}</Text>
							</View>
						</Pressable>
					)
				}}
			/>
		</SafeAreaView>
	)
}

function NoteDetailsScreen({ navigation, route }) {
	const { id, notes, setNotes } = route.params

	const note = useMemo(() => notes.find(n => n.id === id), [notes, id])

	useEffect(() => {
		if (!note) {
			Alert.alert('Brak notatki', 'Nie znaleziono notatki.')
			navigation.goBack()
		}
	}, [note, navigation])

	if (!note) return null

	const onDelete = () => {
		Alert.alert('Usun notatke', 'Na pewno usunac?', [
			{ text: 'Anuluj', style: 'cancel' },
			{
				text: 'Usun',
				style: 'destructive',
				onPress: () => {
					setNotes(prev => prev.filter(n => n.id !== note.id))
					navigation.goBack()
				},
			},
		])
	}

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.screen}>
				<Text style={styles.h1}>{note.title}</Text>
				<Text style={styles.muted}>
					{formatDate(note.createdAt)} | {note.source === 'api' ? 'z API' : 'lokalna'}
				</Text>

				<View style={styles.section}>
					<Text style={styles.h2}>Opis</Text>
					<Text style={styles.body}>{note.body || 'Brak opisu.'}</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.h2}>Lokalizacja</Text>
					{note.location ? (
						<Text style={styles.body}>
							lat: {note.location.lat.toFixed(6)}
							{'\n'}
							lon: {note.location.lon.toFixed(6)}
						</Text>
					) : (
						<Text style={styles.body}>Brak lokalizacji.</Text>
					)}
				</View>

				<View style={styles.row}>
					<PrimaryButton label='Edytuj' onPress={() => navigation.navigate('Edit', { mode: 'edit', id: note.id })} />
					<SecondaryButton label='Usun' onPress={onDelete} />
				</View>
			</View>
		</SafeAreaView>
	)
}

function NoteEditScreen({ navigation, route }) {
	const { mode, id, notes, setNotes } = route.params

	const existing = useMemo(() => notes.find(n => n.id === id), [notes, id])

	const [title, setTitle] = useState(existing?.title || '')
	const [body, setBody] = useState(existing?.body || '')
	const [loc, setLoc] = useState(existing?.location || null)
	const [loadingLoc, setLoadingLoc] = useState(false)

	useEffect(() => {
		navigation.setOptions({ title: mode === 'edit' ? 'Edytuj' : 'Dodaj' })
	}, [mode, navigation])

	const getLocation = async () => {
		try {
			setLoadingLoc(true)
			const { status } = await Location.requestForegroundPermissionsAsync()
			if (status !== 'granted') {
				Alert.alert('Brak uprawnien', 'Nie udalo sie uzyskac dostepu do lokalizacji.')
				return
			}
			const pos = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			})
			setLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude })
		} catch {
			Alert.alert('Blad', 'Nie udalo sie pobrac lokalizacji.')
		} finally {
			setLoadingLoc(false)
		}
	}

	const onSave = () => {
		const t = title.trim()
		if (!t) {
			Alert.alert('Brak tytulu', 'Wpisz tytul notatki.')
			return
		}

		if (mode === 'edit' && existing) {
			setNotes(prev => prev.map(n => (n.id === existing.id ? { ...n, title: t, body: body.trim(), location: loc } : n)))
			navigation.goBack()
			return
		}

		const newNote = {
			id: makeId(),
			title: t,
			body: body.trim(),
			createdAt: new Date().toISOString(),
			location: loc,
			source: 'local',
		}

		setNotes(prev => [newNote, ...prev])
		navigation.goBack()
	}

	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.screen}>
				<Text style={styles.h1}>{mode === 'edit' ? 'Edytuj notatke' : 'Dodaj notatke'}</Text>

				<View style={styles.field}>
					<Text style={styles.label}>Tytul</Text>
					<TextInput
						value={title}
						onChangeText={setTitle}
						placeholder='np. Spacer po miescie'
						style={styles.input}
						accessibilityLabel='Pole tytul'
					/>
				</View>

				<View style={styles.field}>
					<Text style={styles.label}>Opis</Text>
					<TextInput
						value={body}
						onChangeText={setBody}
						placeholder='Krotki opis...'
						style={[styles.input, styles.textarea]}
						multiline
						accessibilityLabel='Pole opis'
					/>
				</View>

				<View style={styles.section}>
					<Text style={styles.h2}>Natywna funkcja: GPS</Text>
					<Text style={styles.muted}>
						{loc ? `lat: ${loc.lat.toFixed(6)} | lon: ${loc.lon.toFixed(6)}` : 'Brak lokalizacji.'}
					</Text>
					<View style={styles.row}>
						<PrimaryButton
							label={loadingLoc ? 'Pobieram...' : 'Pobierz lokalizacje'}
							onPress={getLocation}
							disabled={loadingLoc}
						/>
						{loc ? <SecondaryButton label='Wyczysc' onPress={() => setLoc(null)} /> : null}
					</View>
				</View>

				<View style={styles.row}>
					<PrimaryButton label='Zapisz' onPress={onSave} />
					<SecondaryButton label='Anuluj' onPress={() => navigation.goBack()} />
				</View>
			</View>
		</SafeAreaView>
	)
}

function AboutScreen() {
	return (
		<SafeAreaView style={styles.safe}>
			<View style={styles.screen}>
				<Text style={styles.h1}>O aplikacji</Text>
				<Text style={styles.body}>
					Field Notes to prosta aplikacja do notatek.
					{'\n\n'}
					Natywna funkcja: pobieranie lokalizacji GPS (expo-location).
					{'\n'}
					API: pobieranie przykladowych danych z JSONPlaceholder.
				</Text>

				<View style={styles.section}>
					<Text style={styles.h2}>Dostepnosc</Text>
					<Text style={styles.body}>
						Przyciski maja duze pola dotyku, a elementy maja etykiety dla czytnikow ekranu.
					</Text>
				</View>
			</View>
		</SafeAreaView>
	)
}

export default function App() {
	const [notes, setNotes] = useState([])

	const syncApi = async () => {
		try {
			const apiNotes = await fetchNotesFromApi()
			setNotes(prev => {
				const localOnly = prev.filter(n => n.source !== 'api')
				return [...apiNotes, ...localOnly]
			})
			Alert.alert('OK', 'Pobrano notatki z API.')
		} catch {
			Alert.alert('Brak internetu', 'Nie udalo sie pobrac danych z API.')
		}
	}

	useEffect(() => {
		syncApi()
	}, [])

	return (
		<NavigationContainer>
			<Stack.Navigator>
				<Stack.Screen
					name='List'
					component={NotesListScreen}
					options={{ title: 'Notatki' }}
					initialParams={{ notes, onSyncApi: syncApi }}
				/>
				<Stack.Screen
					name='Details'
					component={NoteDetailsScreen}
					options={{ title: 'Szczegoly' }}
					initialParams={{ notes, setNotes }}
				/>
				<Stack.Screen
					name='Edit'
					component={NoteEditScreen}
					options={{ title: 'Dodaj' }}
					initialParams={{ notes, setNotes }}
				/>
				<Stack.Screen name='About' component={AboutScreen} options={{ title: 'O aplikacji' }} />
			</Stack.Navigator>
			<SyncBridge notes={notes} setNotes={setNotes} />
		</NavigationContainer>
	)
}

function SyncBridge({ notes, setNotes }) {
	return <StackParamSync notes={notes} setNotes={setNotes} />
}

function StackParamSync({ notes, setNotes }) {
	return null
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#0f1115' },
	screen: { flex: 1, padding: 16, gap: 12 },
	headerRow: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
	headerBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
	infoRow: { paddingHorizontal: 16, paddingBottom: 8 },
	infoText: { color: '#b8bcc8', fontSize: 14 },
	h1: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
	h2: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
	muted: { color: '#b8bcc8', fontSize: 13 },
	body: { color: '#e6e8ef', fontSize: 15, lineHeight: 22 },
	list: { padding: 16, gap: 10 },
	card: {
		backgroundColor: '#171a21',
		padding: 14,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#222636',
	},
	cardPressed: { opacity: 0.85 },
	cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
	cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', flex: 1 },
	badge: {
		color: '#0f1115',
		backgroundColor: '#e6e8ef',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		fontSize: 12,
		fontWeight: '700',
		alignSelf: 'flex-start',
	},
	cardMeta: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
	cardDate: { color: '#b8bcc8', fontSize: 12 },
	cardLoc: { color: '#b8bcc8', fontSize: 14 },
	empty: { padding: 20 },
	emptyText: { color: '#b8bcc8', fontSize: 14 },
	field: { gap: 6 },
	label: { color: '#b8bcc8', fontSize: 13 },
	input: {
		backgroundColor: '#171a21',
		color: '#ffffff',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: Platform.OS === 'ios' ? 12 : 10,
		borderWidth: 1,
		borderColor: '#222636',
		fontSize: 15,
		minHeight: 44,
	},
	textarea: { minHeight: 110, textAlignVertical: 'top' },
	section: {
		backgroundColor: '#171a21',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#222636',
		padding: 14,
		gap: 8,
	},
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
	btn: {
		backgroundColor: '#ffffff',
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 12,
		minHeight: 44,
		justifyContent: 'center',
	},
	btnPressed: { opacity: 0.85 },
	btnDisabled: { opacity: 0.6 },
	btnText: { color: '#0f1115', fontSize: 14, fontWeight: '800' },
	btn2: {
		backgroundColor: '#171a21',
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 12,
		minHeight: 44,
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#2b3146',
	},
	btn2Pressed: { opacity: 0.85 },
	btn2Text: { color: '#e6e8ef', fontSize: 14, fontWeight: '700' },
})
