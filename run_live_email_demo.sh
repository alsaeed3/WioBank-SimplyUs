#!/bin/bash
# run_live_email_demo.sh
# This script runs the live email demo for WioBank SimplyUs
# It checks if the server is running and launches the demo

# Check if the server is running on port 3000
function check_server() {
  curl -s http://localhost:3000 > /dev/null
  return $?
}

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================================"
echo -e "           WioBank SimplyUs Email Demo Runner"
echo -e "========================================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run this demo.${NC}"
    exit 1
fi

# Check for required npm packages
echo "Checking required dependencies..."
if ! npm list axios sqlite3 date-fns readline > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing required dependencies...${NC}"
    npm install --quiet axios sqlite3 date-fns readline
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
fi

# Check if the server is running
echo "Checking if WioBank server is running..."
if ! check_server; then
    echo -e "${YELLOW}WioBank server is not running. Starting it in a new terminal...${NC}"
    
    # Try to find the right terminal command
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && node server/index.js; exec bash"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && node server/index.js" &
    else
        echo -e "${RED}Cannot find a suitable terminal emulator. Please start the server manually:${NC}"
        echo -e "   cd $(pwd) && node server/index.js"
        echo ""
        read -p "Press Enter once the server is running to continue..."
    fi
    
    # Wait for server to start
    echo "Waiting for server to start..."
    for i in {1..10}; do
        if check_server; then
            echo -e "${GREEN}Server started successfully!${NC}"
            break
        fi
        if [ $i -eq 10 ]; then
            echo -e "${RED}Server did not start in time. Please make sure the server is running and try again.${NC}"
            exit 1
        fi
        sleep 2
    done
else
    echo -e "${GREEN}WioBank server is already running.${NC}"
fi

# Start the live email demo
echo -e "\n${GREEN}Starting Live Email Demo...${NC}"
node live_email_demo.js
