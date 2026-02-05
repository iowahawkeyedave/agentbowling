#!/bin/bash
echo "Testing API Connectivity..."
echo "--------------------------------"

echo "1. Testing Health Endpoint (http://127.0.0.1:3001/api/health)..."
HEALTH_CODE=$(curl -s -o /dev/stderr -w "%{http_code}" http://127.0.0.1:3001/api/health)
echo "HTTP Status: $HEALTH_CODE"

echo "--------------------------------"

echo "2. Testing Agents Endpoint (http://127.0.0.1:3001/api/agents)..."
AGENTS_CODE=$(curl -s -o /dev/stderr -w "%{http_code}" http://127.0.0.1:3001/api/agents)
echo "HTTP Status: $AGENTS_CODE"

echo "--------------------------------"
echo "Done."
