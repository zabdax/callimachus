@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.12.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "FIRESTORE_EMULATOR_HOST=127.0.0.1:8080"
set "GCLOUD_PROJECT=demo-hsc-tracker"
cd /d %~dp0
call npx firebase emulators:exec --only firestore "npx vitest run --config vitest.rules.config.ts"
