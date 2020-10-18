#!/usr/bin/env bash
set -e

pwd

echo "======= Browserstack upload start ======="

OUTPUT_PATH="$APPCENTER_OUTPUT_DIRECTORY/app_build/podverse-fdroid.signed.release.apk"

echo "Path is $OUTPUT_PATH"

APP_URL=$(curl -u "$BS_USERNAME:$BS_KEY" -X POST "https://api-cloud.browserstack.com/app-automate/upload" -F "file=@$OUTPUT_PATH")

jsonval() {
    temp=`echo $APP_URL | sed 's/\\\\\//\//g' | sed 's/[{}]//g' | awk -v k="text" '{n=split($0,a,","); for (i=1; i<=n; i++) print a[i]}' | sed 's/\"\:\"/\|/g' | sed 's/[\,]/ /g' | sed 's/\"//g' | grep -w "app_url"| cut -d":" -f1- | sed -e 's/^ *//g' -e 's/ *$//g'`
    echo ${temp##*|}
}

APP_ID=`jsonval`

echo "APP_ID: $APP_ID"

echo "======= Browserstack TESTS REQUEST START ======="

RUN_TESTS=$(curl -X GET "https://us-central1-podverse-staging-tests.cloudfunctions.net/runTests?APP_URL=$APP_ID&DEVICE_TYPE=$PLATFORM" -H "x-api-key: $FB_API_KEY")

echo "======= Browserstack TESTS REQUEST END ======="

echo "azure-pipelines-post-build script finished"