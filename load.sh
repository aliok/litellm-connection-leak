#!/bin/bash

# Check if TARGET is set, otherwise exit with an error
if [ -z "$TARGET" ]; then
    echo "Error: TARGET environment variable is not set."
    exit 1
fi

echo "Using TARGET: $TARGET"

NUM_REQUESTS=10  # Number of concurrent requests
TIMEOUT=1        # Client timeout in seconds

echo "Starting load test with $NUM_REQUESTS requests..."

for i in $(seq 1 $NUM_REQUESTS); do
    (
        echo "Sending request $i..."
        curl --max-time $TIMEOUT -X POST "$TARGET" \
            -H "Content-Type: application/json" \
            -d '{
                "model": "gpt-4o",
                  "messages": [
                    {
                      "role": "system",
                      "content": "You are a helpful assistant."
                    },
                    {
                      "role": "user",
                      "content": "Hello!"
                    }
                  ]
                }' &
    )
done
