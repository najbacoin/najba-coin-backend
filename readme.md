Simple typescript nodejs postgres serverless starter, build based on my experience with serverless, AWS Lambda and related tech.

prerequisites:
- node 12.xx
- npm 6.xx
- docker 19.xx
- docker-compose 1.25.x

run locally:
1. Clone repo
2. Install dependencies`npm install`
3. Run services in separate terminal (dockerized postgres) `npm run start:services`
4. Run express server `npm run start`
5. Test health check, e.g `curl 127.0.0.1:8083/health`

run tests:
- todo

deploy:
- todo
