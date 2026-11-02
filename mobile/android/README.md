# Dealqix CRM Android 1.0.0

Internal Android client for https://www.dealqix.com/login. Android 8+ and internet required. Existing CRM accounts and backend authorization remain in use. Website updates load without replacing the APK. This is an Android WebView client, not an offline CRM.

Features: persistent web storage/cookies, mobile viewport, refresh, back navigation, Android file picker, microphone access for WebRTC, location access for attendance. Microphone/location permissions are limited to the exact HTTPS Dealqix origins and requested through Android. External HTTPS, telephone and email links open outside the app. Other schemes are blocked. Cleartext traffic and backups are disabled; no JavaScript native bridge is exposed.

Validation: Java compilation, DEX conversion, Android resources, APK alignment and release signature verified. No Android emulator/device was available; actual login, file selection, attendance and Stringee calling require a device acceptance test. Background/screen-locked calls and push notifications are not implemented. Blob downloads are not handled by this initial client.

Install: download APK on Android, open it and allow installation from that source when prompted. Log in using the existing Dealqix account. Grant microphone/location only when the relevant feature requests it. Keep Android System WebView updated. A phone app does not bypass an unassigned or disabled dialer line.

Build: install JDK 17+, Android platform 35 and build-tools 35.0.0, set JAVA_HOME and ANDROID_HOME, then run `bash build.sh`. Sign `manual-build/aligned.apk` using the original private release key and `apksigner`. Keep the key private; future updates require the same application ID and signing key, and an increased versionCode. Never commit signing material.
