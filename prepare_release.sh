#!/bin/bash

# Get the version from package.json and create NEW_VERSION variable
PACKAGE_VERSION=$(grep -o '"version": *"[^"]*"' package.json | sed 's/"version": "//; s/"//')
NEW_VERSION="${PACKAGE_VERSION}-$1"

# Replace FDROID_VERSION in .env with NEW_VERSION
sed -i '' "s/FDROID_VERSION=.*/FDROID_VERSION='${NEW_VERSION}'/" .env

# Find the lines between "versionName:" and "ndk:" in fdroid/com.podverse.fdroid.yml
START_LINE=$(grep -n "versionName:" fdroid/com.podverse.fdroid.yml | tail -n1 | cut -d: -f1)
END_LINE=$(grep -n "ndk:" fdroid/com.podverse.fdroid.yml | tail -n1 | cut -d: -f1)

echo $START_LINE
echo $END_LINE

# Check if both "versionName:" and "ndk:" are found in the file
if [ -n "$START_LINE" ] && [ -n "$END_LINE" ]; then
  # Extract the block of lines between "- versionName" and "ndk:"
  touch temp_block.txt
  echo >> temp_block.txt
  sed -n "${START_LINE},${END_LINE}p" fdroid/com.podverse.fdroid.yml >> temp_block.txt

# ==========

  # Get the versionCode from ./android/app/build.gradle
  VERSION_CODE=$(grep -m 1 "versionCode" android/app/build.gradle | awk '{print $2}')


  # Replace the last "versionName" and "commit" properties in the block with the NEW_VERSION
  sed -i '' "s/\(.*\)versionName: .*/\1versionName: ${NEW_VERSION}/; s/\(.*\)commit: .*/\1commit: ${NEW_VERSION}/" temp_block.txt

  # Replace the "versionCode" in the block with the VERSION_CODE
  sed -i '' "s/\(.*\)versionCode: .*/\1versionCode: ${VERSION_CODE}/" temp_block.txt

  # Insert the modified block right before the line with the word "AutoUpdateMode"
  sed -i '' "${END_LINE} r temp_block.txt" fdroid/com.podverse.fdroid.yml

  rm -f temp_block.txt
else
  echo "Error: 'versionName:' or 'ndk:' not found in fdroid/com.podverse.fdroid.yml"
  exit 1
fi

# Replace "CurrentVersion" and "CurrentVersionCode" in the rest of fdroid/com.podverse.fdroid.yml
sed -i '' "s/CurrentVersion:.*/CurrentVersion: ${NEW_VERSION}/; s/CurrentVersionCode:.*/CurrentVersionCode: ${VERSION_CODE}/" fdroid/com.podverse.fdroid.yml

# # Commit changes
git add .env fdroid/com.podverse.fdroid.yml
git commit -m "Prepare release for ${NEW_VERSION}"

# # Tag and push to the repository
# git tag "${NEW_VERSION}"
# git push origin "${NEW_VERSION}"

# # Push to the current branch
# CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
# git push origin "${CURRENT_BRANCH}"

# # Create a PR from the current branch to the develop branch
# gh pr create --base develop --head "${CURRENT_BRANCH}" --title "${CURRENT_BRANCH}"
