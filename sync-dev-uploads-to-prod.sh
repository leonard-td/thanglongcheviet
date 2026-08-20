#!/bin/bash

# backup static files from .medusa/server/static, then replace them with the ones in apps/backend/static, then copy the backup back to .medusa/server/static
  
sudo cp -r apps/backend/.medusa/server/static/ apps/backend/static_bk
sudo rm -rf apps/backend/.medusa/server/static
sudo mkdir -p apps/backend/.medusa/server/static
sudo cp -r apps/backend/static_bk/* apps/backend/.medusa/server/static
sudo cp -r apps/backend/static/* apps/backend/.medusa/server/static