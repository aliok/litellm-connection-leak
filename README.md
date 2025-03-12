## Summary

Reproducer for https://github.com/BerriAI/litellm/issues/9178

LiteLLM does not close the proxy connections to the backing LLM server, even if the requests are cancelled by the
client.

## Step 1: Build and run the fake server

```shell
cd fake-model-serving
npm install
node index.js
```

This is a simple Node.js server that tracks the number of active requests. It listens on port 5001 and has a single
endpoint `/v1/chat/completions` that simulates a chat completion request. It will respond after 1 hour.

## Step 2: Verify that fake server can track active requests

```shell
# Call the fake server directly to verify that it can track active requests
TARGET="http://localhost:5001/v1/chat/completions" ./load.sh
```

The fake server shows that the connections are tracked correctly, even if the requests are cancelled by the client.
The requests are made with short timeouts on the client side (1 second), and since the server waits for 1 hour
to respond, the `curl` command will cancel the requests after 1 second.

The output looks like this:

```text
[2025-03-12T21:29:17.432Z] Request to 'POST /v1/chat/completions' started. Active requests: 1
[2025-03-12T21:29:17.433Z] Request to 'POST /v1/chat/completions' started. Active requests: 2
[2025-03-12T21:29:17.434Z] Request to 'POST /v1/chat/completions' started. Active requests: 3
[2025-03-12T21:29:17.434Z] Request to 'POST /v1/chat/completions' started. Active requests: 4
[2025-03-12T21:29:17.434Z] Request to 'POST /v1/chat/completions' started. Active requests: 5
[2025-03-12T21:29:17.434Z] Request to 'POST /v1/chat/completions' started. Active requests: 6
[2025-03-12T21:29:17.435Z] Request to 'POST /v1/chat/completions' started. Active requests: 7
[2025-03-12T21:29:17.435Z] Request to 'POST /v1/chat/completions' started. Active requests: 8
[2025-03-12T21:29:17.435Z] Request to 'POST /v1/chat/completions' started. Active requests: 9
[2025-03-12T21:29:17.436Z] Request to 'POST /v1/chat/completions' started. Active requests: 10
[2025-03-12T21:29:17.757Z] Active requests: 10
[2025-03-12T21:29:18.423Z] Request to 'POST /v1/chat/completions' closed after 991ms. Active requests: 9
[2025-03-12T21:29:18.423Z] Request to 'POST /v1/chat/completions' closed after 990ms. Active requests: 8
[2025-03-12T21:29:18.427Z] Request to 'POST /v1/chat/completions' closed after 993ms. Active requests: 7
[2025-03-12T21:29:18.427Z] Request to 'POST /v1/chat/completions' closed after 991ms. Active requests: 6
[2025-03-12T21:29:18.428Z] Request to 'POST /v1/chat/completions' closed after 994ms. Active requests: 5
[2025-03-12T21:29:18.428Z] Request to 'POST /v1/chat/completions' closed after 994ms. Active requests: 4
[2025-03-12T21:29:18.428Z] Request to 'POST /v1/chat/completions' closed after 994ms. Active requests: 3
[2025-03-12T21:29:18.428Z] Request to 'POST /v1/chat/completions' closed after 993ms. Active requests: 2
[2025-03-12T21:29:18.431Z] Request to 'POST /v1/chat/completions' closed after 996ms. Active requests: 1
[2025-03-12T21:29:18.433Z] Request to 'POST /v1/chat/completions' closed after 998ms. Active requests: 0
[2025-03-12T21:29:19.758Z] Active requests: 0
[2025-03-12T21:29:21.757Z] Active requests: 0
[2025-03-12T21:29:23.758Z] Active requests: 0
```

Notice 1 second after `2025-03-12T21:29:17.757Z`, the active requests start dropping, indicating that the requests are
cancelled by the client.

## Step 3: Start LiteLLM proxy, targeting the fake server

```shell
docker run --rm -p 4000:4000 -v "$(pwd)/config.yaml:/config.yaml" ghcr.io/berriai/litellm:litellm_stable_release_branch-v1.61.20-stable --config /config.yaml --detailed_debug
```

## Step 4: Send requests to LiteLLM proxy with short timeout

```shell
# Target LiteLLM proxy
TARGET="http://localhost:4000/v1/chat/completions" ./load.sh
```

```text
[2025-03-12T22:05:39.791Z] Active requests: 0
[2025-03-12T22:05:41.259Z] Request to 'POST /v1/chat/completions' started. Active requests: 1
[2025-03-12T22:05:41.260Z] Request to 'POST /v1/chat/completions' started. Active requests: 2
[2025-03-12T22:05:41.260Z] Request to 'POST /v1/chat/completions' started. Active requests: 3
[2025-03-12T22:05:41.260Z] Request to 'POST /v1/chat/completions' started. Active requests: 4
[2025-03-12T22:05:41.261Z] Request to 'POST /v1/chat/completions' started. Active requests: 5
[2025-03-12T22:05:41.261Z] Request to 'POST /v1/chat/completions' started. Active requests: 6
[2025-03-12T22:05:41.261Z] Request to 'POST /v1/chat/completions' started. Active requests: 7
[2025-03-12T22:05:41.261Z] Request to 'POST /v1/chat/completions' started. Active requests: 8
[2025-03-12T22:05:41.261Z] Request to 'POST /v1/chat/completions' started. Active requests: 9
[2025-03-12T22:05:41.262Z] Request to 'POST /v1/chat/completions' started. Active requests: 10
[2025-03-12T22:05:41.792Z] Active requests: 10
[2025-03-12T22:05:43.793Z] Active requests: 10
[2025-03-12T22:05:45.794Z] Active requests: 10
[2025-03-12T22:05:45.794Z] Active requests: 10
...
```

Notice that the fake server shows that the connections are still open, even when the original requests are cancelled 
by `curl` due to short timeout.

LiteLLM does not close the proxy connections to the fake server, even if the requests are cancelled by the client.
