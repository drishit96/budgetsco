import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import crypto from 'crypto';
import pg from 'pg';

// Simple .env parser to load existing environment variables
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

async function seedDatabase(connectionUri, schemaName) {
  let client;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      client = new pg.Client({ connectionString: connectionUri });
      await client.connect();
      break;
    } catch (err) {
      if (attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  try {
    if (schemaName) {
      await client.query(`SET search_path TO "${schemaName}";`);
    }

    const userId = 'Oq6BtFruTrTKncFtTsVPNiwE7ki2';
    const emailId = 'budgetsco@gmail.com';
    const timezone = 'Asia/Calcutta';

    console.log('Seeding User...');
    await client.query(
      `INSERT INTO "User" ("id", "createdAt", "emailId")
       VALUES ($1, NOW(), $2)
       ON CONFLICT ("id") DO NOTHING`,
      [userId, emailId]
    );

    console.log('Seeding UserPreference...');
    const lastModified = Date.now();
    await client.query(
      `INSERT INTO "UserPreference" ("userId", "currency", "timezone", "locale", "isActiveSubscription", "isMFAOn", "isPasskeyPresent", "lastModified")
       VALUES ($1, 'INR', $2, 'en-US', false, false, false, $3)
       ON CONFLICT ("userId") DO UPDATE SET
         "currency" = EXCLUDED."currency",
         "timezone" = EXCLUDED."timezone",
         "locale" = EXCLUDED."locale"`,
      [userId, timezone, lastModified]
    );

    console.log('Seeding completed successfully!');
  } finally {
    await client.end();
  }
}

async function main() {
  process.env.E2E = 'true';
  loadEnv();

  const parentConnectionString = process.env.DATABASE_URL;

  if (!parentConnectionString) {
    console.error('Error: DATABASE_URL must be set.');
    process.exit(1);
  }

  const envPath = path.resolve(process.cwd(), '.env');
  const envBackupPath = path.resolve(process.cwd(), '.env.backup');
  const originalEnvExists = fs.existsSync(envPath);

  // Backup existing .env file immediately at the start of main
  if (originalEnvExists) {
    fs.copyFileSync(envPath, envBackupPath);
    console.log('Original .env file backed up.');
  }

  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const isolatedSchemaName = `test_e2e_${Date.now()}_${randomSuffix}`;
  let newConnectionUri = null;
  // Use port 5432 for schema DDL/admin tasks if pooler port 6543 is configured
  const schemaAdminUrl = parentConnectionString.replace(':6543/', ':5432/');

  try {
    console.log(`Using PostgreSQL schema isolation: "${isolatedSchemaName}"...`);
    const adminClient = new pg.Client({ connectionString: schemaAdminUrl });
    await adminClient.connect();
    await adminClient.query(`CREATE SCHEMA "${isolatedSchemaName}";`);
    await adminClient.end();
    console.log(`Created isolated schema "${isolatedSchemaName}".`);

    const urlObj = new URL(schemaAdminUrl);
    urlObj.searchParams.set('schema', isolatedSchemaName);
    const existingOptions = urlObj.searchParams.get('options');
    const searchPathOption = `-csearch_path=${isolatedSchemaName}`;
    urlObj.searchParams.set(
      'options',
      existingOptions ? `${existingOptions} ${searchPathOption}` : searchPathOption
    );
    newConnectionUri = urlObj.toString();

    console.log('Waiting for the database endpoint to accept connections...');
    let connected = false;
    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        const testClient = new pg.Client({ connectionString: newConnectionUri, connectionTimeoutMillis: 5000 });
        await testClient.connect();
        await testClient.query('SELECT 1');
        await testClient.end();
        connected = true;
        console.log('Database endpoint is ready and accepting connections.');
        break;
      } catch (err) {
        console.log(`Waiting for database endpoint to become ready (attempt ${attempt}/15)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    if (!connected) {
      throw new Error('Database endpoint failed to accept connections after 30 seconds.');
    }
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Write new DATABASE_URL to .env
    let envContent = '';
    if (originalEnvExists) {
      const lines = fs.readFileSync(envBackupPath, 'utf-8').split('\n');
      const filteredLines = lines.filter(line => !line.trim().startsWith('DATABASE_URL='));
      envContent = filteredLines.join('\n') + `\nDATABASE_URL="${newConnectionUri}"\n`;
    } else {
      envContent = `DATABASE_URL="${newConnectionUri}"\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf-8');
    console.log('.env file temporarily updated with new test DATABASE_URL.');

    console.log('Syncing database schema (prisma db push)...');
    const aiAgentPrefixes = [
      'COPILOT',
      'GITHUB_COPILOT',
      'CURSOR',
      'CLAUDE',
      'ANTIGRAVITY',
      'WINDSURF',
      'DEVIN',
      'AIDER',
      'CONTINUE',
      'CODY',
      'REPLIT',
      'AGENT',
      'AI_AGENT',
      'AI_TOOL'
    ];
    const pushEnv = Object.fromEntries(
      Object.entries(process.env).filter(
        ([k]) => !aiAgentPrefixes.some(prefix => k.toUpperCase().startsWith(prefix))
      )
    );
    pushEnv.DATABASE_URL = newConnectionUri;

    let pushSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        execSync('pnpm prisma db push --accept-data-loss', {
          env: pushEnv,
          stdio: 'inherit'
        });
        pushSuccess = true;
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        console.log(`Prisma db push attempt ${attempt} failed, retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('Seeding test data...');
    await seedDatabase(newConnectionUri, isolatedSchemaName);

    console.log('Running E2E tests...');
    // Execute playwright test forwarding any CLI arguments
    const args = ['playwright', 'test', ...process.argv.slice(2)];
    const testProcess = spawn('pnpm', args, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: newConnectionUri, PW_TEST_HTML_REPORT_OPEN: 'never' }
    });

    const exitCode = await new Promise((resolve) => {
      testProcess.on('exit', (code) => resolve(code));
    });

    process.exitCode = exitCode || 0;
  } catch (error) {
    console.error('An error occurred during test execution orchestration:', error);
    process.exitCode = 1;
  } finally {
    // Restore original .env
    if (originalEnvExists) {
      if (fs.existsSync(envBackupPath)) {
        fs.copyFileSync(envBackupPath, envPath);
        fs.unlinkSync(envBackupPath);
        console.log('.env file restored from backup.');
      }
    } else {
      if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
        console.log('Temporary .env file cleaned up.');
      }
    }

    // Clean up isolated schema if created
    if (isolatedSchemaName) {
      try {
        console.log(`Dropping isolated schema "${isolatedSchemaName}"...`);
        const cleanupClient = new pg.Client({ connectionString: schemaAdminUrl });
        await cleanupClient.connect();
        await cleanupClient.query(`DROP SCHEMA IF EXISTS "${isolatedSchemaName}" CASCADE;`);
        await cleanupClient.end();
        console.log(`Cleaned up schema "${isolatedSchemaName}".`);
      } catch (err) {
        console.error(`Failed to drop isolated schema ${isolatedSchemaName}:`, err.message);
      }
    }
  }
}

main();
