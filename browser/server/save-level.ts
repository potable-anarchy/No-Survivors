import { Plugin } from 'vite';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export function saveLevelPlugin(): Plugin {
  return {
    name: 'save-level',
    configureServer(server) {
      server.middlewares.use('/api/save-level', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { name, data } = JSON.parse(body);
            if (!name || !data) {
              res.statusCode = 400;
              res.end('Missing name or data');
              return;
            }

            // Sanitize filename
            const safe = name.replace(/[^a-zA-Z0-9 _-]/g, '');
            const outPath = resolve(__dirname, '..', 'public', 'assets', 'levels', `${safe}.json`);
            const compact = JSON.stringify(data, null, 0).replace(/,"/g, ',"');
            writeFileSync(outPath, JSON.stringify(data));

            console.log(`Saved level: ${outPath}`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: outPath }));
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });
      });
    },
  };
}
