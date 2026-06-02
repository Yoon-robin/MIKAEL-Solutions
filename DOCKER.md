# MIKAEL Solutions — Docker 배포 가이드

## 빠른 시작

```bash
git clone https://github.com/Yoon-robin/MIKAEL-Solutions.git
cd MIKAEL-Solutions
docker build -t mikael:local .
docker run -d --name mikael --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  mikael:local
```

## 서버 운영 배포 (Nginx 리버스 프록시)

```bash
docker build -t osiris:local .
docker stop osiris 2>/dev/null || true
docker rm   osiris 2>/dev/null || true
docker run -d --name osiris --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -e NODE_ENV=production -e PORT=3000 -e HOSTNAME=0.0.0.0 \
  --add-host=host.docker.internal:host-gateway \
  osiris:local
```

> 서버 내부 컨테이너명은 `osiris`로 유지 (운영 식별자).

## 환경 변수 (선택)

```env
FIRMS_API_KEY=          # NASA FIRMS
OPENSKY_CLIENT_ID=      # OpenSky OAuth2
OPENSKY_CLIENT_SECRET=
N2YO_API_KEY=           # N2YO 위성
AIS_API_KEY=            # AISStream 해상
```

## 헬스 체크

```bash
docker ps --filter name=osiris
curl -f http://localhost:3000/api/health
docker logs osiris --tail 50
```
