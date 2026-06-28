# reader-md-api

Free URL-to-markdown API. Prefix any URL to get clean markdown.

```
https://md.reader.dev/https://example.com
```

## Usage

```bash
curl https://md.reader.dev/https://example.com
```

Returns raw markdown content. No API key needed.

## Self-hosting

```bash
npm install
npm run build
READER_ENGINE_URL=http://localhost:6003 npm start
```

Requires a running [reader](https://github.com/vakra-dev/reader) daemon.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 6008 | Server port |
| `READER_ENGINE_URL` | `http://localhost:6003` | Reader daemon URL |
| `ENGINE_TIMEOUT` | 30000 | Scrape timeout (ms) |
| `RATE_LIMIT_RPM` | 30 | Max requests per minute per IP |
| `LOG_LEVEL` | info | Pino log level |

## License

Apache-2.0
