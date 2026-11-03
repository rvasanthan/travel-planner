# Wayfarer

A lightweight Android trip planner for keeping destinations and travel dates together.

## Build

Open the project in Android Studio, or build a debug APK from the repository root:

```sh
./gradlew assembleDebug
```

The APK is written to `app/build/outputs/apk/debug/app-debug.apk`. Trips are stored locally on the device.

## App icon

The launcher icon pairs a map pin and route with a small plane, using deep teal and coral. The source SVG is at `app/src/main/assets/travel-planner-icon.svg`; Android adaptive and legacy launcher resources are in `app/src/main/res`.
