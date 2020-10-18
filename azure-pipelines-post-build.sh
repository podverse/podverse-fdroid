#!/usr/bin/env bash
set -e

pwd

echo "======= Browserstack upload start ======="

APP_URL=$(curl -u "$BS_USERNAME:$BS_KEY" -X POST "https://api-cloud.browserstack.com/app-automate/upload" -F "file=@$OUTPUT_PATH")

jsonval() {
    temp=`echo $APP_URL | sed 's/\\\\\//\//g' | sed 's/[{}]//g' | awk -v k="text" '{n=split($0,a,","); for (i=1; i<=n; i++) print a[i]}' | sed 's/\"\:\"/\|/g' | sed 's/[\,]/ /g' | sed 's/\"//g' | grep -w "app_url"| cut -d":" -f1- | sed -e 's/^ *//g' -e 's/ *$//g'`
    echo ${temp##*|}
}

APP_ID=`jsonval`

echo "======= Browserstack TESTS REQUEST END ======="

