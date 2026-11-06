#!/usr/bin/env bash
# Start the backend in the background and wait until it answers.
cd "$(dirname "$0")/.." || exit 1
source ../venv/bin/activate
fuser -k 8000/tcp 2>/dev/null
nohup uvicorn app.main:app --port 8000 > server.log 2>&1 &
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/health > /dev/null; then echo "server ready"; exit 0; fi
  sleep 1
done
echo "server did not start; last log lines:"
tail -n 20 server.log
exit 1
