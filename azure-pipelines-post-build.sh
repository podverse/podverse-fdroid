#!/usr/bin/env bash
set -e

pwd

echo "======= Browserstack upload start ======="

echo 'Hello'
echo $(Agent.BuildDirectory)
echo $(System.ArtifactsDirectory)
echo 'Goodbye!'
