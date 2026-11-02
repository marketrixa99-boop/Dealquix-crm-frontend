#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_HOME:?Set ANDROID_HOME to Android SDK}"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17+}"
tools="$ANDROID_HOME/build-tools/35.0.0"
platform="$ANDROID_HOME/platforms/android-35/android.jar"
mkdir -p manual-build/classes
"$tools/aapt" package -f -M app/src/main/AndroidManifest.xml -S app/src/main/res -I "$platform" -F manual-build/unsigned.apk
"$JAVA_HOME/bin/javac" -source 8 -target 8 -classpath "$platform" -d manual-build/classes app/src/main/java/com/dealqix/crm/MainActivity.java
mapfile -t classes < <(find manual-build/classes -name '*.class')
"$tools/d8" --min-api 26 --lib "$platform" --output manual-build "${classes[@]}"
python3 - <<'PY'
import zipfile
with zipfile.ZipFile('manual-build/unsigned.apk','a',zipfile.ZIP_DEFLATED) as z:
    z.write('manual-build/classes.dex','classes.dex')
PY
"$tools/zipalign" -f -p 4 manual-build/unsigned.apk manual-build/aligned.apk
echo 'Unsigned aligned APK: manual-build/aligned.apk. Sign with the original release key using apksigner before distribution.'
