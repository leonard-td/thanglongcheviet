#!/bin/bash

# Quick backup script - Export database dump with minimal options

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Quick Database Backup${NC}"

# Run the full backup script
cd "$PROJECT_ROOT"
./scripts/db-backup.sh export-gz

echo ""
echo -e "${GREEN}✓ Backup hoàn tất!${NC}"
echo -e "${BLUE}Files được lưu trong: $PROJECT_ROOT/backups/${NC}"
