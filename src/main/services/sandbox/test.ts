/**
 * Sandbox Test Script
 *
 * Run with: npx ts-node --esm src/main/services/sandbox/test.ts
 *
 * Prerequisites:
 * - Set E2B_API_KEY environment variable
 * - Set E2B_API_URL if using a custom endpoint
 */

import 'dotenv/config'
import { E2BSandboxClient } from './e2b.js'
import type { SandboxConfig } from './types.js'

async function main() {
  const apiKey = process.env.E2B_API_KEY
  const baseUrl = process.env.E2B_API_URL

  if (!apiKey) {
    console.error('Error: E2B_API_KEY environment variable is required')
    process.exit(1)
  }

  console.log('=== Sandbox Test ===')
  console.log('API Key:', apiKey ? `${apiKey.length} chars` : 'not set')
  console.log('Base URL:', baseUrl || 'default (e2b.dev)')

  const config: SandboxConfig = {
    apiKey,
    baseUrl,
    timeout: 60000
  }

  const client = new E2BSandboxClient(config)

  try {
    // Test 1: Create sandbox
    console.log('\n--- Test 1: Create Sandbox ---')
    const sandbox = await client.create('nodejs-20')
    console.log('Sandbox created:', sandbox)

    // Test 2: Write file
    console.log('\n--- Test 2: Write File ---')
    await client.writeFile(sandbox.id, '/hello.txt', 'Hello, World!')
    console.log('File written: /hello.txt')

    // Test 3: Read file
    console.log('\n--- Test 3: Read File ---')
    const content = await client.readFile(sandbox.id, '/hello.txt')
    console.log('File content:', content)

    // Test 4: List directory
    console.log('\n--- Test 4: List Directory ---')
    const files = await client.listDir(sandbox.id, '/')
    console.log('Files:', files)

    // Test 5: Execute command
    console.log('\n--- Test 5: Execute Command ---')
    for await (const event of client.execute(sandbox.id, 'echo "Hello from command"')) {
      console.log('Event:', event)
    }

    // Test 6: Cleanup
    console.log('\n--- Test 6: Cleanup ---')
    await client.destroy(sandbox.id)
    console.log('Sandbox destroyed')

    console.log('\n=== All Tests Passed ===')
  } catch (err) {
    console.error('\n=== Test Failed ===')
    console.error(err)
    process.exit(1)
  }
}

main()
