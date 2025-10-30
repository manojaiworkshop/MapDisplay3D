#!/bin/bash
# Simple test script without jq dependency

BASE_URL="http://localhost:8088"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}🧪 LLM Provider System - Simple Test${NC}\n"

# Check if backend is running
echo -e "${BLUE}Checking if backend is running...${NC}"
if curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}\n"
else
    echo -e "${RED}✗ Backend is not running!${NC}"
    echo -e "${YELLOW}Start it with: python main.py${NC}\n"
    exit 1
fi

# Test 1: Get providers
echo -e "${BLUE}1. Getting available providers...${NC}"
curl -s "$BASE_URL/api/llm/providers"
echo -e "\n"

# Test 2: Get status
echo -e "${BLUE}2. Getting current status...${NC}"
curl -s "$BASE_URL/api/llm/status"
echo -e "\n"

# Test 3: Switch to Ollama
echo -e "${BLUE}3. Switching to Ollama...${NC}"
curl -s -X POST "$BASE_URL/api/llm/switch-provider" \
  -H "Content-Type: application/json" \
  -d '{"provider": "ollama"}'
echo -e "\n"

# Test 4: Test command
echo -e "${BLUE}4. Testing command interpretation...${NC}"
curl -s -X POST "$BASE_URL/api/interpret-command" \
  -H "Content-Type: application/json" \
  -d '{"text": "zoom to 10x"}'
echo -e "\n"

# Test 5: Switch to OpenAI
echo -e "${BLUE}5. Switching to OpenAI...${NC}"
curl -s -X POST "$BASE_URL/api/llm/switch-provider" \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
echo -e "\n"

# Test 6: Another command
echo -e "${BLUE}6. Testing another command...${NC}"
curl -s -X POST "$BASE_URL/api/interpret-command" \
  -H "Content-Type: application/json" \
  -d '{"text": "goto station Delhi"}'
echo -e "\n"

echo -e "${GREEN}${BOLD}✅ All tests complete!${NC}"
echo -e "Check the JSON responses above for details.\n"
echo -e "Frontend UI: ${BLUE}http://localhost:3000${NC}"
echo -e "Backend API: ${BLUE}http://localhost:8088${NC}\n"
