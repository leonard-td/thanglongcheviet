#!/usr/bin/env bash

# mkdir -p ~/projects
# cp -r /mnt/d/01.WORKS/WWW/Thang_long_che_viet_project ~/projects/
# cd ~/projects/Thang_long_che_viet_project

# clear all cache data
docker compose down
# # remove all volumes
# docker volume rm $(docker volume ls -q)
# # remove all containers
# docker rm -f $(docker ps -aq)
# # remove all images
# docker rmi -f $(docker images -q) 
docker compose -f docker-compose.yml up -d --build
# docker compose exec app sh docker-init.sh

# skill task in cd.auto.sh after running
# ./cd.auto.sh

# ./cd.auto.sh stop
# ./cd.auto.sh
