FROM deno:alpine

WORKDIR /app

COPY . .

RUN deno cache index.ts

CMD ["deno", "run", "--allow-net", "--allow-env", "index.ts"]