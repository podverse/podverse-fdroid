#!/usr/bin/env bash
set -e

pwd

echo "======= Browserstack upload start ======="

APP_URL="helloworld"

jsonval() {
    temp=`echo $APP_URL | sed 's/\\\\\//\//g' | sed 's/[{}]//g' | awk -v k="text" '{n=split($0,a,","); for (i=1; i<=n; i++) print a[i]}' | sed 's/\"\:\"/\|/g' | sed 's/[\,]/ /g' | sed 's/\"//g' | grep -w "app_url"| cut -d":" -f1- | sed -e 's/^ *//g' -e 's/ *$//g'`
    echo ${temp##*|}
}

APP_ID=jsonval

echo $APP_ID
echo Ok

echo "======= Browserstack TESTS REQUEST END ======="

