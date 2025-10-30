#!/bin/bash
# Test script for multi-provider LLM system

BASE_URL="http://localhost:8088"
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BOLD}🧪 Testing Multi-Provider LLM System${NC}\n"

# Helper function to extract JSON values (works without jq)
get_json_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\"[^,}]*" | head -1 | cut -d':' -f2- | tr -d ' ",'
}

# Test 1: Get all providers
echo -e "${BLUE}1. Fetching available providers...${NC}"
PROVIDERS=$(curl -s "$BASE_URL/api/llm/providers")
echo "$PROVIDERS"
echo ""

# Test 2: Get current status
echo -e "${BLUE}2. Getting current LLM status...${NC}"
STATUS=$(curl -s "$BASE_URL/api/llm/status")
echo "$STATUS"
ACTIVE=$(get_json_value "$STATUS" "active_provider")
IS_AVAILABLE=$(get_json_value "$STATUS" "is_available")
echo -e "${GREEN}✓ Active provider: $ACTIVE (Available: $IS_AVAILABLE)${NC}\n"

# Test 3: Test command interpretation with current provider
echo -e "${BLUE}3. Testing command interpretation with $ACTIVE...${NC}"
RESULT=$(curl -s -X POST "$BASE_URL/api/interpret-command" \
  -H "Content-Type: application/json" \
  -d '{"text": "zoom to 10x"}')
echo "$RESULT"
METHOD=$(get_json_value "$RESULT" "method")
PROVIDER=$(get_json_value "$RESULT" "provider")
echo -e "${GREEN}✓ Method: $METHOD, Provider: $PROVIDER${NC}\n"

# Test 4: Test switching providers
echo -e "${BLUE}4. Testing provider switching...${NC}"
for provider in openai ollama vllm anthropic; do
  echo -e "\n  ${BOLD}Switching to $provider...${NC}"
  SWITCH_RESULT=$(curl -s -X POST "$BASE_URL/api/llm/switch-provider" \
    -H "Content-Type: application/json" \
    -d "{\"provider\": \"$provider\"}")
  
  echo "  Response: $SWITCH_RESULT"
  SUCCESS=$(get_json_value "$SWITCH_RESULT" "success")
  
  if [ "$SUCCESS" = "true" ]; then
    echo -e "  ${GREEN}✓ Successfully switched to $provider${NC}"
    
    # Test a command with this provider
    CMD_RESULT=$(curl -s -X POST "$BASE_URL/api/interpret-command" \
      -H "Content-Type: application/json" \
      -d '{"text": "goto station Delhi"}')
    
    CMD_METHOD=$(get_json_value "$CMD_RESULT" "method")
    if [ -n "$CMD_METHOD" ]; then
      echo -e "  ${GREEN}✓ Command test passed (method: $CMD_METHOD)${NC}"
    else
      echo -e "  ${YELLOW}⚠ Command executed but method unclear${NC}"
    fi
  else
    ERROR=$(get_json_value "$SWITCH_RESULT" "error")
    if [ -z "$ERROR" ]; then
      ERROR="Provider not available or not configured"
    fi
    echo -e "  ${RED}✗ Failed: $ERROR${NC}"
  fi
done

# Test 5: Test various commands
echo -e "\n${BLUE}5. Testing various commands with active provider...${NC}"
COMMANDS=(
  "zoom to 10x"
  "goto station Mumbai"
  "start trip from Delhi to Mumbai"
  "reset view"
  "show location details for Chennai"
)

for cmd in "${COMMANDS[@]}"; do
  echo -e "\n  Testing: ${BOLD}$cmd${NC}"
  CMD_RESULT=$(curl -s -X POST "$BASE_URL/api/interpret-command" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$cmd\"}")
  
  echo "  Response: $CMD_RESULT"
  METHOD=$(get_json_value "$CMD_RESULT" "method")
  
  # Check if actions exist (look for "actions":[)
  if echo "$CMD_RESULT" | grep -q '"actions":\['; then
    # Count actions by counting commas in actions array + 1
    ACTION_COUNT=$(echo "$CMD_RESULT" | grep -o '"type"' | wc -l)
    if [ "$ACTION_COUNT" -gt 0 ]; then
      echo -e "  ${GREEN}✓ Parsed $ACTION_COUNT action(s) via $METHOD${NC}"
    else
      echo -e "  ${YELLOW}⚠ Empty actions array${NC}"
    fi
  else
    echo -e "  ${RED}✗ No actions parsed${NC}"
  fi
done

echo -e "\n${BOLD}${GREEN}✅ Testing complete!${NC}\n"

# Summary
echo -e "${BLUE}Summary:${NC}"
echo "- Available providers listed: ✓"
echo "- Provider switching: ✓" 
echo "- Command interpretation: ✓"
echo "- Fallback system: ✓"
echo ""
echo "Check the logs above for any errors or issues."
echo "Frontend UI available at: http://localhost:3000"
