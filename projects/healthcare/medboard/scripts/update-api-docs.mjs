import fs from 'fs';
import path from 'path';

const API_DIR = 'src/app/api';
const OUTPUT_FILE = 'mintlify-docs/openapi.json';
const API_ROOT = path.resolve(API_DIR);

const openapi = {
  openapi: '3.0.0',
  info: {
    title: 'AADI API Reference',
    description: 'AI-Assisted Diagnosis Interface — Clinical & Crew API Reference',
    version: '1.0.0',
  },
  servers: [
    { url: 'https://puskesmasbalowerti.com/api', description: 'Production Server' },
    { url: 'http://localhost:3000/api', description: 'Local Development' },
  ],
  paths: {},
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'session' },
      crewAccessToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Crew-Access-Token',
      },
    },
  },
};

function getFiles(dir) {
  const absDir = path.resolve(dir);
  if (!absDir.startsWith(API_ROOT)) {
    return [];
  }
  const dirents = fs.readdirSync(absDir, { withFileTypes: true });
  const files = dirents.map((dirent) => {
    const res = path.resolve(absDir, dirent.name);
    if (!res.startsWith(API_ROOT)) {
      return [];
    }
    return dirent.isDirectory() ? getFiles(res) : res;
  });
  return Array.prototype.concat(...files);
}

function mapType(type) {
  const t = type?.toLowerCase() || 'string';
  if (t === 'string') return { type: 'string' };
  if (t === 'number') return { type: 'number' };
  if (t === 'boolean') return { type: 'boolean' };
  if (t === 'object') return { type: 'object' };
  if (t === 'array') return { type: 'array', items: { type: 'string' } };
  return { type: 'string' };
}

function parseRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(path.resolve(API_DIR), filePath);
  const routePath = '/' + relativePath.replace(/\\/g, '/').replace(/\/route\.ts$/, '').replace(/\[(\w+)\]/g, '{$1}');
  
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const jsdocByMethod = {};
  const jsdocMatches = [
    ...content.matchAll(/\/\*\*([\s\S]*?)\*\/\s*export async function (GET|POST|PUT|PATCH|DELETE)\(/g),
  ];
  jsdocMatches.forEach((match) => {
    jsdocByMethod[match[2]] = match[1];
  });
  
  methods.forEach((method) => {
    if (!content.includes(`export async function ${method}(`)) {
      return;
    }
    if (!openapi.paths[routePath]) openapi.paths[routePath] = {};
      const jsdoc = jsdocByMethod[method];
      
      let summary = `${method} ${routePath}`;
      let description = '';
      let parameters = [];
      let requestBody = undefined;
      let responses = {
        200: { description: 'Successful response', content: { 'application/json': { schema: { type: 'object' } } } },
        401: { description: 'Unauthorized' },
        500: { description: 'Internal server error' }
      };

      if (jsdoc) {
        // Basic Metadata
        const summaryMatch = jsdoc.match(/@summary\s+(.*)/);
        if (summaryMatch) summary = summaryMatch[1].trim();
        
        const descMatch = jsdoc.match(/@description\s+(.*)/);
        if (descMatch) description = descMatch[1].trim();

        // Path Parameters
        const pathParamMatches = jsdoc.matchAll(/@pathParam\s+(?:{.*}\s+)?(\w+)\s+-\s+(.*)/g);
        for (const match of pathParamMatches) {
          parameters.push({
            name: match[1],
            in: 'path',
            required: true,
            description: match[2],
            schema: { type: 'string' }
          });
        }

        // Query Parameters
        const queryParamMatches = jsdoc.matchAll(/@queryParam\s+(?:{.*}\s+)?(\w+)\s+-\s+(.*)/g);
        for (const match of queryParamMatches) {
          parameters.push({
            name: match[1],
            in: 'query',
            required: false,
            description: match[2],
            schema: { type: 'string' }
          });
        }

        // Header Parameters
        const headerParams = [...jsdoc.matchAll(/@headerParam\s+{(.*)}\s+([^\s]+)\s+-\s+(.*)/g)];
        headerParams.forEach(p => {
          parameters.push({
            name: p[2],
            in: 'header',
            required: true,
            description: p[3],
            schema: mapType(p[1])
          });
        });

        // Body Parameters
        const bodyParams = [...jsdoc.matchAll(/@bodyParam\s+{(.*)}\s+(\w+)\s+-\s+(.*)/g)];
        if (bodyParams.length > 0) {
          const properties = {};
          const required = [];
          bodyParams.forEach(p => {
            properties[p[2]] = { ...mapType(p[1]), description: p[3] };
            if (!p[3].includes('(optional)')) required.push(p[2]);
          });
          requestBody = {
            content: {
              'application/json': {
                schema: { type: 'object', properties, required: required.length > 0 ? required : undefined }
              }
            }
          };
        }

        // Examples - match until next @ tag or end of JSDoc
        const exampleMatch = jsdoc.match(/@example\s+([\s\S]*?)(?=\n\s*\*?\s*@|$)/);
        if (exampleMatch && requestBody) {
          try {
            // Remove leading asterisks from JSDoc lines
            const cleaned = exampleMatch[1].replace(/^\s*\* ?/gm, '').trim();
            
            // Extract the first balanced { ... } block
            let firstBrace = cleaned.indexOf('{');
            if (firstBrace !== -1) {
              let count = 0;
              let end = -1;
              for (let i = firstBrace; i < cleaned.length; i++) {
                if (cleaned[i] === '{') count++;
                if (cleaned[i] === '}') count--;
                if (count === 0) {
                  end = i;
                  break;
                }
              }
              if (end !== -1) {
                const cleanJson = cleaned.substring(firstBrace, end + 1);
                requestBody.content['application/json'].example = JSON.parse(cleanJson);
              }
            }
          } catch (e) {
            console.warn(`⚠️ Failed to parse example for ${routePath}: ${e.message}`);
          }
        }

        // Custom Responses
        const responseMatch = jsdoc.match(/@responseBody\s+{(.*)}\s+-\s+(.*)/);
        if (responseMatch) {
          responses[200].description = responseMatch[2];
          responses[200].content['application/json'].schema = mapType(responseMatch[1]);
        }

        const securityMatch = jsdoc.match(/@security\s+(.*)/);
        if (securityMatch) {
          const securityName = securityMatch[1].trim();
          if (securityName.toLowerCase() === 'none') {
            responses[401] = undefined;
          }
        }
      }

      const securityMatch = jsdoc?.match(/@security\s+(.*)/);
      let security = [{ cookieAuth: [] }];
      if (securityMatch) {
        const securityName = securityMatch[1].trim();
        security =
          securityName.toLowerCase() === 'none'
            ? []
            : [{ [securityName]: [] }];
      }

      if (security.length === 0) {
        delete responses[401];
      }

    openapi.paths[routePath][method.toLowerCase()] = {
      summary,
      description,
      parameters: parameters.length > 0 ? parameters : undefined,
      requestBody,
      responses,
      security
    };
  });
}

function run() {
  console.log('🚀 Generating Comprehensive OpenAPI spec...');
  const files = getFiles(API_DIR).filter(f => f.endsWith('route.ts'));
  files.forEach(parseRouteFile);
  
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(openapi, null, 2));
  console.log(`✅ Doctor-Grade OpenAPI spec generated at ${OUTPUT_FILE}`);
}

run();
