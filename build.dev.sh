#!/usr/bin/env bash
docker compose down
docker rm -f tl_che_viet_web tl_che_viet_app tl_che_viet_db tl_che_viet_redis tl_che_viet_nginx
docker compose -f docker-compose.yml up -d --build

docker logs -ft tl_che_viet_app
# skill task in cd.auto.sh after running
# ./cd.auto.sh

# ./cd.auto.sh stop
# ./cd.auto.sh
