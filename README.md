# FinZen
Small little web app for low stim baby entertainment

## Usage

### Quick and Easy
```bash
docker pull ghcr.io/sapper177/finzen:latest
docker run -p 8080:80 -d ghcr.io/sapper177/finzen:latest
```

Navigate to the http://localhost:8080 and you are up!

### Add to a docker compose
```yaml
  finzen:
    image: ghcr.io/sapper177/finzen:latest
    ports:
      - 8080:80
```

