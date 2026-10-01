#!/bin/bash
# usage: shot.sh name "query" budget_ms   -> tools/name.png + prints title & errors
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
timeout 45 "$EDGE" --headless=new --disable-gpu --hide-scrollbars --window-size=1280,720 --virtual-time-budget=$3 --screenshot="F:/Dev/Claude/VeexingForce/tools/$1.png" "file:///F:/Dev/Claude/VeexingForce/index.html?$2" >/dev/null 2>&1
