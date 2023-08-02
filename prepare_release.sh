#!/bin/bash

#####################################################################
# Call this script with the appropriate argument (eg. qa.1 or beta.1)
#
# If argument is "qa", first merge with original podverse-rn repo, resolve potential conflicts and remove any
# files that need removing due to fdroid opensource policy.
# Then checkout a new branch with the name "merge/{newVersion}" and run script
#
# If argument is "beta", no extra steps necessary
#
#####################################################################

# Get the version from package.json and create NEW_VERSION variable
PACKAGE_VERSION=$(grep -o '"version": *"[^"]*"' package.json | sed 's/"version": "//; s/"//')
NEW_VERSION="${PACKAGE_VERSION}-$1"

echo "Updating .env..."
# Replace FDROID_VERSION in .env with NEW_VERSION
sed -i '' "s/FDROID_VERSION=.*/FDROID_VERSION='${NEW_VERSION}'/" .env

if [[ "$1" == *"beta"* ]]
then
    echo "Looking for 'versionName' and 'commit' properties in com.podverse.fdroid.yml..."
    # Grab last occurence of "versionName" and "commit" and replace them with NEW_VERSION in com.podverse.fdroid.yml
    last_version_name_line=$(grep -n "versionName:" fdroid/com.podverse.fdroid.yml | tail -n1 | cut -d: -f1)
    last_commit_line=$(grep -n "commit:" fdroid/com.podverse.fdroid.yml | tail -n1 | cut -d: -f1)

    # Check if both "versionName:" and "commit:" are found in the file
    if [ -n "$last_version_name_line" ] && [ -n "$last_commit_line" ]; then
        # Replace the value of "versionName:" and "commit:" with the NEW_VERSION
        echo "Updating 'versionName' and 'commit' properties in com.podverse.fdroid.yml..."
        sed -i '' "${last_version_name_line}s/:.*/: ${NEW_VERSION}/" fdroid/com.podverse.fdroid.yml
        sed -i '' "${last_commit_line}s/:.*/: ${NEW_VERSION}/" fdroid/com.podverse.fdroid.yml
    else
        echo "Error: 'versionName:' or 'commit:' not found in fdroid/com.podverse.fdroid.yml"
        exit 1
    fi
    # push tag and then push to master-beta
    # Replace "CurrentVersion" and "CurrentVersionCode" in the rest of fdroid/com.podverse.fdroid.yml
    echo "Updating 'CurrentVersion' in com.podverse.fdroid.yml..."
    sed -i '' "s/CurrentVersion:.*/CurrentVersion: ${NEW_VERSION}/" fdroid/com.podverse.fdroid.yml

    # Commit changes
    # git add .env fdroid/com.podverse.fdroid.yml
    # git commit -m "Prepare BETA release for ${NEW_VERSION}"
elif [[ "$1" == *"qa"* ]]
then
    echo "Creating new version submission block in com.podverse.fdroid.yml..."
    # Find the lines between "versionName:" and "ndk:" in fdroid/com.podverse.fdroid.yml
    START_LINE=$(grep -n "versionName:" fdroid/com.podverse.fdroid.yml | tail -n1 | cut -d: -f1)
    END_LINE=$(grep -n "ndk:" fdroid/com.podverse.fdroid.yml | tail -n1 | cut -d: -f1)

    # Check if both "versionName:" and "ndk:" are found in the file
    if [ -n "$START_LINE" ] && [ -n "$END_LINE" ]; then
        # Extract the block of lines between "- versionName" and "ndk:"
        touch temp_block.txt
        echo >> temp_block.txt
        sed -n "${START_LINE},${END_LINE}p" fdroid/com.podverse.fdroid.yml >> temp_block.txt

        # Get the versionCode from ./android/app/build.gradle
        VERSION_CODE=$(grep -m 1 "versionCode" android/app/build.gradle | awk '{print $2}')

        # Replace the last "versionName" and "commit" properties in the block with the NEW_VERSION
        sed -i '' "s/\(.*\)versionName: .*/\1versionName: ${NEW_VERSION}/; s/\(.*\)commit: .*/\1commit: ${NEW_VERSION}/" temp_block.txt

        # Replace the "versionCode" in the block with the VERSION_CODE
        sed -i '' "s/\(.*\)versionCode: .*/\1versionCode: ${VERSION_CODE}/" temp_block.txt

        # Insert the modified block right after the last line of the previous version block
        sed -i '' "${END_LINE} r temp_block.txt" fdroid/com.podverse.fdroid.yml

        rm -f temp_block.txt
    else
        echo "Error: 'versionName:' or 'ndk:' not found in fdroid/com.podverse.fdroid.yml"
        exit 1
    fi

    echo "Updating 'CurrentVersion' and 'CurrentVersionCode' properties in com.podverse.fdroid.yml..."
    # Replace "CurrentVersion" and "CurrentVersionCode" in the rest of fdroid/com.podverse.fdroid.yml
    sed -i '' "s/CurrentVersion:.*/CurrentVersion: ${NEW_VERSION}/; s/CurrentVersionCode:.*/CurrentVersionCode: ${VERSION_CODE}/" fdroid/com.podverse.fdroid.yml

    # # Commit changes
    git add .env fdroid/com.podverse.fdroid.yml
    git commit -m "Prepare QA release for ${NEW_VERSION}"
else
    echo "Invalid second argument. Usage is './prepare_release.sh qa.<<number>>' (or beta.<<number>>)"
    exit 1
fi

echo "Creating git tag for '${NEW_VERSION}'"
# Tag and push to the repository
git tag "${NEW_VERSION}"
git push origin "${NEW_VERSION}"

# Push to the current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Pushing to '${CURRENT_BRANCH}'"
git push origin "${CURRENT_BRANCH}"

# # Create a PR from the current branch to the develop branch
# gh pr create --base develop --head "${CURRENT_BRANCH}" --title "${CURRENT_BRANCH}"
