import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
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

async function waitForDatabase(connectionUri, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const testClient = new pg.Client({
        connectionString: connectionUri,
        connectionTimeoutMillis: 3000
      });
      await testClient.connect();
      await testClient.query('SELECT 1');
      await testClient.end();
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  return false;
}

async function seedDatabase(connectionUri) {
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
    const userId = '1FgeDbZjUlTUveythpmCyd9q3Zn1';
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

  const DEFAULT_LOCAL_TEST_DB_URL =
    'postgresql://test_user:test_password@localhost:5432/budgetsco_test';

  let targetDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!targetDatabaseUrl) {
    if (process.env.CI) {
      targetDatabaseUrl =
        process.env.DATABASE_URL ||
        'postgresql://test_user:test_password@postgres:5432/budgetsco_test';
    } else {
      targetDatabaseUrl = DEFAULT_LOCAL_TEST_DB_URL;
    }
  }

  const envPath = path.resolve(process.cwd(), '.env');
  const envBackupPath = path.resolve(process.cwd(), '.env.backup');
  const originalEnvExists = fs.existsSync(envPath);

  // Backup existing .env file immediately at the start of main
  if (originalEnvExists) {
    fs.copyFileSync(envPath, envBackupPath);
    console.log('Original .env file backed up.');
  }

  try {
    console.log(`Connecting to test database: ${targetDatabaseUrl}...`);
    let isDbReady = await waitForDatabase(targetDatabaseUrl, 3000);

    if (!isDbReady && !process.env.CI) {
      console.log('Test database not responding. Starting test database via Docker Compose...');
      try {
        execSync('docker compose -f docker-compose.test.yml up -d', { stdio: 'inherit' });
      } catch (composeErr) {
        console.warn('docker compose failed, trying docker-compose...');
        execSync('docker-compose -f docker-compose.test.yml up -d', { stdio: 'inherit' });
      }
      isDbReady = await waitForDatabase(targetDatabaseUrl, 25000);
    }

    if (!isDbReady) {
      throw new Error(
        `Unable to connect to test database at ${targetDatabaseUrl}. Please ensure PostgreSQL is running.`
      );
    }
    console.log('Database endpoint is ready and accepting connections.');

    // Write test DATABASE_URL to .env
    let envContent = '';
    if (originalEnvExists) {
      const lines = fs.readFileSync(envBackupPath, 'utf-8').split('\n');
      const filteredLines = lines.filter(line => !line.trim().startsWith('DATABASE_URL='));
      envContent = filteredLines.join('\n') + `\nDATABASE_URL="${targetDatabaseUrl}"\n`;
    } else {
      envContent = `DATABASE_URL="${targetDatabaseUrl}"\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf-8');
    process.env.DATABASE_URL = targetDatabaseUrl;
    console.log('.env file temporarily updated with test DATABASE_URL.');

    // Ensure build artifacts exist locally before running testserver
    const buildPath = path.resolve(process.cwd(), 'build/server/index.js');
    if (!process.env.CI && !fs.existsSync(buildPath)) {
      console.log('Local build not found. Running pnpm run build...');
      execSync('pnpm run build', { stdio: 'inherit' });
    }

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
    pushEnv.DATABASE_URL = targetDatabaseUrl;

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
    await seedDatabase(targetDatabaseUrl);

    console.log('Running E2E tests...');
    const args = ['playwright', 'test', ...process.argv.slice(2)];
    const testProcess = spawn('pnpm', args, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: targetDatabaseUrl, PW_TEST_HTML_REPORT_OPEN: 'never' }
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
  }
}

main();
