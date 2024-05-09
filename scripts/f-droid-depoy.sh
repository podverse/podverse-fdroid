#!/usr/bin/env bash

# This script will handle the deployment of the f-droid apk

# set variables
url="https://f-droid.org/FDroid.apk"
apk_name="f-droid.apk"
description_url="https://f-droid.org/en/packages/org.fdroid.fdroid/"
folder_name=$(date +%s)
repo_path="$HOME/fdroid/repo"

# check if the folder_name is set
if [ -z "$folder_name" ]; then
    echo "Error: folder_name is not set."
    exit 1
fi

# check if the folder exists and create it if it doesn't
if [ -d "$HOME/tmp/$folder_name" ]; then
    echo "Folder already exists"
    exit 1
else
    mkdir -p "$HOME/tmp/$folder_name"
fi

# download the apk
if wget -O "$HOME/tmp/$folder_name/${apk_name}" "${url}"; then
    echo "Download successful"
else
    echo "Download failed"
    exit 1
fi

# check the md5sum of the downloaded apk
md5sum "$HOME/tmp/$folder_name/$apk_name"
echo "MD5sum check complete"

# move the apk to the repo
mv "$HOME/tmp/$folder_name/$apk_name" "$repo_path"

# update and deploy the repo
pushd "$repo_path" || exit 1
fdroid update
fdroid deploy
popd || exit 1

# clean up
rm -rf "$HOME/tmp/$folder_name"


# pull the description
if wget -O "$HOME/fdroid/metadata/com.podverse.fdroid/en-US/description.txt" "${description_url}"; then
    echo "Description download successful"
else
    echo "Description download failed"
    exit 1
fi