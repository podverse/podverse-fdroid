#!/bin/bash

DIR='fastlane/metadata/android/en-US/changelogs'  ## EDIT IF NEEDED

if [ "$1" == "--update" -o "$1" == "-u" ] && [ "$2" ]; then
	echo -e "\nHandling changelogs:\n"
	
	num=$(find $DIR/ -type f -iname "$2*.txt" | wc -l)
	
	if [ "$num" -eq 0 ]; then
		echo -e "Root changelog file $2.txt does not exist. Skipping...\n"
	fi
	
	if [ "$num" -gt 1 ]; then
		echo -e "There are already copies for $2.txt\n"
	fi
	
	if [ "$num" -eq 1 ]; then
		echo -e "Creating copies of the root changelog file $2.txt...\n"
		cp $DIR/$2".txt" $DIR/$2"001.txt"
		cp $DIR/$2".txt" $DIR/$2"002.txt"
		cp $DIR/$2".txt" $DIR/$2"003.txt"	
		cp $DIR/$2".txt" $DIR/$2"004.txt"
	fi
fi
