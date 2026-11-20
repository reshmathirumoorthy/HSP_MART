#!/bin/sh
# Runs the scheduled jobs (the same ones vercel.json lists) against the API, every CRON_INTERVAL_SECONDS.
until curl -fsS -o /dev/null http://api:8000/api/health; do echo "waiting for api"; sleep 5; done
while true; do
  for job in notifications programmes tracking embeddings; do
    curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "http://api:8000/api/cron/${job}" || echo "cron ${job} failed"
    echo
  done
  sleep "${CRON_INTERVAL_SECONDS:-3600}"
done
