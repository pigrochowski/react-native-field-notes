# React Native - Field Notes

Prosta aplikacja mobilna w Expo/React Native do tworzenia notatek. Aplikacja ma 3 widoki (lista, szczegóły, dodaj/edytuj), korzysta z natywnej funkcji GPS oraz komunikuje się z API (pobieranie danych).

## Funkcje

- Lista notatek: tytuł, data, znacznik lokalizacji (jeśli jest)
- Szczegóły notatki: opis, data, dane lokalizacji (jeśli pobrane)
- Dodaj/Edytuj notatkę: formularz + pobranie lokalizacji GPS
- Obsługa edge case: brak uprawnień do lokalizacji / brak internetu (komunikat w aplikacji)

## Natywna funkcja urządzenia

- Lokalizacja GPS (expo-location)
- Uzasadnienie: notatki mogą być oznaczone miejscem, w którym zostały utworzone (lat/lon).

## API

- Aplikacja wykonuje zapytanie do API (GET) w celu pobrania danych.
- Dane są mapowane do listy notatek w aplikacji.

## Widoki

1. Notes list (lista notatek)
2. Note details (szczegóły notatki)
3. Add/Edit note (dodaj/edytuj)

## Wymagania

- Node.js + npm
- Expo Go na telefonie (Android/iOS)

## Instalacja i uruchomienie

1. Instalacja paczek:

```bash
npm install
```
