import crypto from 'crypto';

const required = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "REDIS_URL"];
const optional = ["ADMIN_INGEST_TOKEN", "SUPER_ADMIN_EMAIL", "SUPER_ADMIN_USERNAME", "SUPER_ADMIN_PASSWORD", "APP_URL"];

const mask = (value) => (value.length <= 6 ? '***' : `${value.slice(0,3)}***${value.slice(-2)}`);

function checkUrl(name, value, protocols) {
  try {
    const parsed = new URL(value);
    if (!protocols.includes(parsed.protocol.replace(':', ''))) return `${name} must use one of: ${protocols.join(', ')}`;
    return null;
  } catch {
    return `${name} is not a valid URL`;
  }
}

const errors = [];

for (const key of required) {
  if (!process.env[key]?.trim()) errors.push(`Missing required env: ${key}`);
}

if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
  errors.push('NEXTAUTH_SECRET should be at least 32 chars for secure cookies/JWT');
}

if (process.env.DATABASE_URL) {
  const issue = checkUrl('DATABASE_URL', process.env.DATABASE_URL, ['postgres', 'postgresql']);
  if (issue) errors.push(issue);
}
if (process.env.REDIS_URL) {
  const issue = checkUrl('REDIS_URL', process.env.REDIS_URL, ['redis', 'rediss']);
  if (issue) errors.push(issue);
}
if (process.env.NEXTAUTH_URL) {
  const issue = checkUrl('NEXTAUTH_URL', process.env.NEXTAUTH_URL, ['http', 'https']);
  if (issue) errors.push(issue);
}
if (process.env.APP_URL && process.env.NEXTAUTH_URL && process.env.APP_URL !== process.env.NEXTAUTH_URL) {
  errors.push('APP_URL should match NEXTAUTH_URL to avoid callback/session issues');
}
if (!process.env.ADMIN_INGEST_TOKEN || process.env.ADMIN_INGEST_TOKEN.length < 16) {
  errors.push('ADMIN_INGEST_TOKEN should be set and at least 16 chars');
}

console.log('Required env:');
for (const key of required) console.log(`- ${key}: ${process.env[key] ? mask(process.env[key]) : '<missing>'}`);
console.log('Optional env:');
for (const key of optional) console.log(`- ${key}: ${process.env[key] ? mask(process.env[key]) : '<unset>'}`);

if (errors.length) {
  console.error('\nEnv check failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('\nEnv check passed.');
console.log(`Suggested strong secret: ${crypto.randomBytes(32).toString('hex')}`);
