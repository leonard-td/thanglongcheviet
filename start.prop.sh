#!/usr/bin/env bash
docker compose down
docker rm -f tl_che_viet
docker compose -f docker-compose.yml up -d --build

# skill task in cd.auto.sh after running
# ./cd.auto.sh

./cd.auto.sh stop
./cd.auto.sh
