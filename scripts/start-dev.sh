dev:
    cp .env.dev .env
    docker compose -f docker-compose.dev.yml up -d