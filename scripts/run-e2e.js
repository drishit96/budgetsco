import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import crypto from 'crypto';
import pg from 'pg';

// Replicate date utility logic to avoid importing TypeScript files
function getCurrentLocalDateInUTC(timezone) {
  const dateRegex = new RegExp(/(\d\d)\/(\d\d)\/(\d\d\d\d), (\d\d):(\d\d):(\d\d)/);
  const localeDate = new Date().toLocaleString("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const regexMatchResult = localeDate.match(dateRegex);
  if (!regexMatchResult) {
    return new Date();
  }
  const [_, day, month, year, hour, minute, second] = regexMatchResult;
  return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)));
}

function getFirstDateOfThisMonth(timezone) {
  const today = getCurrentLocalDateInUTC(timezone);
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
}

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

// Parse role and database name from connection string
function parseConnectionDetails(connectionString) {
  const dbUrlRegex = /postgres(?:ql)?:\/\/([^:]+)(?::([^@]+))?@([^/]+)\/([^?]+)/;
  const match = connectionString.match(dbUrlRegex);
  return {
    roleName: match ? match[1] : 'budgetsco',
    dbName: match ? match[4] : 'budgetsco'
  };
}

// Generic fetch wrapper with retries and exponential backoff to handle transient network errors
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status >= 400 && response.status < 500) {
        return response; // Client error, don't retry (e.g. 404, 401)
      }
      console.warn(`Warning: API request returned status ${response.status}. Retrying (${i + 1}/${retries})...`);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Warning: Network request failed: ${err.message}. Retrying (${i + 1}/${retries})...`);
    }
    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
  }
}

async function createBranch(apiKey, projectId, branchName) {
  const url = `https://console.neon.tech/api/v2/projects/${projectId}/branches`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      branch: {
        name: branchName,
        type: 'schema_only'
      },
      endpoints: [
        {
          type: 'read_write'
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Neon branch: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.branch.id;
}

async function waitForBranchReady(apiKey, projectId, branchId) {
  const url = `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`;
  const maxRetries = 30;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.branch.current_state === 'ready') {
          return true;
        }
      }
    } catch (err) {
      console.warn(`Warning: Transient network error while polling branch status (attempt ${i + 1}/${maxRetries}):`, err.message);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Neon branch ${branchId} did not become ready in time.`);
}

async function getConnectionUri(apiKey, projectId, branchId, roleName, databaseName) {
  const url = `https://console.neon.tech/api/v2/projects/${projectId}/connection_uri?branch_id=${branchId}&role_name=${roleName}&database_name=${databaseName}`;
  const response = await fetchWithRetry(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get connection URI: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Neon Connection URI API response:', JSON.stringify(data));
  return data.uri || data.connection_uri;
}

async function deleteBranch(apiKey, projectId, branchId) {
  const url = `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`;
  try {
    const response = await fetchWithRetry(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to delete Neon branch ${branchId}: ${response.statusText} - ${errorText}`);
    } else {
      console.log(`Successfully deleted Neon branch ${branchId}`);
    }
  } catch (err) {
    console.error(`Failed to delete Neon branch ${branchId} due to network error:`, err.message);
  }
}

async function seedDatabase(connectionUri) {
  const client = new pg.Client({ connectionString: connectionUri });
  await client.connect();
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

    console.log('Seeding MonthlyTarget...');
    const currentMonthDate = getFirstDateOfThisMonth(timezone);
    await client.query(
      `INSERT INTO "MonthlyTarget" ("userId", "date", "budget", "expense", "income", "incomeEarned", "investment", "investmentDone")
       VALUES ($1, $2, 9000.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000)
       ON CONFLICT ("userId", "date") DO UPDATE SET
         "budget" = EXCLUDED."budget"`,
      [userId, currentMonthDate]
    );

    console.log('Seeding CategoryAmount budgets...');
    const categories = [
      { name: 'Bills & Subscriptions', budget: 3000.0000 },
      { name: 'EMI', budget: 3000.0000 },
      { name: 'Grocery', budget: 3000.0000 },
      { name: 'Others', budget: 0.0000 }
    ];

    for (const cat of categories) {
      await client.query(
        `INSERT INTO "CategoryAmount" ("userId", "date", "category", "type", "amount", "budget")
         VALUES ($1, $2, $3, 'expense', 0.0000, $4)
         ON CONFLICT ("userId", "date", "type", "category") DO UPDATE SET
           "budget" = EXCLUDED."budget"`,
        [userId, currentMonthDate, cat.name, cat.budget]
      );
    }

    console.log('Seeding completed successfully!');
  } finally {
    await client.end();
  }
}

async function main() {
  loadEnv();

  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  const parentConnectionString = process.env.DATABASE_URL;

  if (!apiKey || !projectId || !parentConnectionString) {
    console.error('Error: NEON_API_KEY, NEON_PROJECT_ID, and DATABASE_URL must be set.');
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

  const { roleName, dbName } = parseConnectionDetails(parentConnectionString);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const branchName = `test-run-${Date.now()}-${randomSuffix}`;
  let createdBranchId = null;

  try {
    console.log(`Creating schema_only Neon branch "${branchName}"...`);
    createdBranchId = await createBranch(apiKey, projectId, branchName);

    console.log('Waiting for branch to be ready...');
    await waitForBranchReady(apiKey, projectId, createdBranchId);

    console.log(`Parsed parent DB connection details - role: "${roleName}", database: "${dbName}"`);

    console.log('Retrieving connection URI...');
    const newConnectionUri = await getConnectionUri(apiKey, projectId, createdBranchId, roleName, dbName);
    console.log('Connection URI retrieved:', newConnectionUri ? 'valid' : 'UNDEFINED/NULL');

    if (!newConnectionUri) {
      throw new Error(`Failed to retrieve a valid connection URI from Neon API. Received: ${newConnectionUri}`);
    }

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
    console.log('.env file temporarily updated with new branch DATABASE_URL.');

    console.log('Syncing database schema (prisma db push)...');
    execSync('pnpm prisma db push --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: newConnectionUri },
      stdio: 'inherit'
    });

    console.log('Seeding test data...');
    await seedDatabase(newConnectionUri);

    console.log('Running E2E tests...');
    // Execute playwright test forwarding any CLI arguments
    const args = ['playwright', 'test', ...process.argv.slice(2)];
    const testProcess = spawn('pnpm', args, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: newConnectionUri }
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

    // Delete Neon branch
    if (createdBranchId) {
      console.log(`Deleting Neon branch "${createdBranchId}"...`);
      await deleteBranch(apiKey, projectId, createdBranchId);
    }
  }
}

main();
