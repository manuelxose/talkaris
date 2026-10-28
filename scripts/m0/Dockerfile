FROM node:22.23.2-bookworm@sha256:dd5847a04b0deee391fa145f1f4c6d214196668b6bcc7988ebed67249f226844
WORKDIR /work
COPY deps/ /work/
RUN npm ci --no-audit --no-fund && npm ci --prefix scripts/m0/tools --no-audit --no-fund && scripts/m0/tools/node_modules/.bin/playwright install --with-deps chromium
COPY tree/ /work/
CMD ["sleep", "infinity"]
