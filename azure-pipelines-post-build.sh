#!/usr/bin/env bash
set -e

pwd

echo "======= Browserstack upload start ======="

cp "$APPCENTER_OUTPUT_DIRECTORY/metadata/com.podverse.fdroid.yml" "$APPCENTER_OUTPUT_DIRECTORY/metadata/build-$APPCENTER_BUILD_ID.yml"
OUTPUT_PATH="$APPCENTER_OUTPUT_DIRECTORY/build-$APPCENTER_BUILD_ID.apk"

echo "Path is $OUTPUT_PATH"


