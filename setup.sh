#!/usr/bin/env bash

# mkdir -p ~/projects
# cp -r /mnt/d/01.WORKS/WWW/Thang_long_che_viet_project ~/projects/
# cd ~/projects/Thang_long_che_viet_project

# clear all cache data
docker compose down
# remove all volumes in docker compose
docker compose rm -v
# remove all containers in docker compose
docker compose rm -f
# remove all images in docker compose
# docker rmi -f $(docker images -q) 
docker compose -f docker-compose.yml up -d --build
docker compose exec app sh docker-init.sh
docker compose exec app sh -c '
  mkdir -p storage/fonts storage/app storage/framework/cache && \
  chmod -R 775 storage bootstrap/cache && \
  chown -R www-data:www-data storage bootstrap/cache
'


# skill task in cd.auto.sh after running
# ./cd.auto.sh

# ./cd.auto.sh stop
# ./cd.auto.sh
