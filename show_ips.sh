#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Get LAN IP
LAN_IP=$(ifconfig | grep -E "inet.*broadcast" | awk '{print $2}' | head -1)
if [[ -z "$LAN_IP" ]]; then
    LAN_IP=$(ip route get 1 | awk '{print $7}' 2>/dev/null)
fi

# Get Internet IP
INTERNET_IP=$(curl -s https://ipinfo.io/ip 2>/dev/null)
if [[ -z "$INTERNET_IP" ]]; then
    INTERNET_IP=$(curl -s https://ifconfig.me 2>/dev/null)
fi

# Display header
echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${WHITE}           IP ADDRESS INFO            ${PURPLE}║${NC}"
echo -e "${PURPLE}╠══════════════════════════════════════╣${NC}"

# Display LAN IP
echo -e "${PURPLE}║${NC} ${CYAN}🏠 LAN IP Address:${NC}"
if [[ -n "$LAN_IP" ]]; then
    echo -e "${PURPLE}║${NC}   ${GREEN}$LAN_IP${NC}"
else
    echo -e "${PURPLE}║${NC}   ${RED}Unable to detect${NC}"
fi

echo -e "${PURPLE}║${NC}"

# Display Internet IP
echo -e "${PURPLE}║${NC} ${YELLOW}🌐 Internet IP Address:${NC}"
if [[ -n "$INTERNET_IP" ]]; then
    echo -e "${PURPLE}║${NC}   ${GREEN}$INTERNET_IP${NC}"
else
    echo -e "${PURPLE}║${NC}   ${RED}Unable to detect${NC}"
fi

echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"