# Jungle Quest 3D — Android APK Generation Guide

This project is pre-configured for Android packaging using **Capacitor** (`capacitor.config.ts`), full-bleed mobile safe areas (`viewport-fit=cover`), WebGL battery throttling on background pause, and selectable **Low / Medium / High** graphics presets.

## Prerequisites

- **Node.js 18+** and `npm`
- **Android Studio** (with Android SDK Platform 34+ & Build Tools)
- **Java JDK 17** (bundled with recent Android Studio releases)

## 1. Build the Web Bundle

```bash
npm install
npm run build
```

This generates the production web bundle inside `dist/`.

## 2. Add Capacitor & Android Platform

```bash
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap add android
npx cap sync android
```

> Every time you update the game code, run `npm run build && npx cap sync android` before rebuilding the APK.

## 3. Configure Orientation & Fullscreen (Optional Polish)

In `android/app/src/main/AndroidManifest.xml`, you can lock orientation on the main `<activity>` if desired:

```xml
android:screenOrientation="portrait"
android:hardwareAccelerated="true"
```

## 4. Generate a Debug APK (Quick Test on Phone)

### Via Command Line (Gradle)

```bash
cd android
./gradlew assembleDebug
```

Output APK location:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Via Android Studio

```bash
npx cap open android
```

Then choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## 5. Generate a Signed Release APK (Distribution / Play Store)

1. Generate a signing keystore (once):
   ```bash
   keytool -genkey -v -keystore jungle-quest-release.keystore \
     -alias junglequest -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Open the project in Android Studio (`npx cap open android`).
3. Choose **Build → Generate Signed Bundle / APK → APK** (or **Android App Bundle** for Google Play).
4. Select your keystore, choose the `release` build variant, and build.

## Mobile Performance Notes

- On phones with 4 or fewer CPU cores, Jungle Quest 3D automatically starts in **Medium** graphics quality.
- Players can switch between **Low**, **Medium**, and **High** quality at any time from the top HUD bar, Main Menu, or Pause overlay.
- **Low** mode disables real-time shadow maps and CSS backdrop blur, caps pixel ratio at `1.15`, and reduces canopy/vegetation density to prevent overheating and conserve battery.
