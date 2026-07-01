#!/usr/bin/env bash

# mkdir -p ~/projects
# cp -r /mnt/d/01.WORKS/WWW/Thang_long_che_viet_project ~/projects/
# cd ~/projects/Thang_long_che_viet_project

docker compose down
docker rm -f $(docker ps -aq)
docker compose -f docker-compose.yml up -d --build

# skill task in cd.auto.sh after running
# ./cd.auto.sh

# ./cd.auto.sh stop
# ./cd.auto.sh
