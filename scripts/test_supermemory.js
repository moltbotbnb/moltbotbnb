#!/usr/bin/env node
// Test SuperMemory API connection
import Supermemory from 'supermemory';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load key
const envContent = readFileSync('/home/ubuntu/clawd/.env.supermemory', 'utf8');
const apiKey = envContent.split('=')[1].trim();

const client = new Supermemory({ apiKey });

async function test() {
  try {
    // Add a test memory
    console.log('Adding test memory...');
    await client.add({ 
      content: "Moltbot is a lobster robot AI on BNB Chain. Rivals with Clawdbot. Always evolving.", 
      containerTags: ["moltbot"] 
    });
    console.log('✅ Memory added!');

    // Search for it
    console.log('\nSearching memories...');
    const results = await client.search.documents({
      q: "What is Moltbot?",
      containerTags: ["moltbot"]
    });
    console.log('✅ Search results:', JSON.stringify(results, null, 2));

    // Get profile
    console.log('\nGetting profile...');
    const profile = await client.profile({ containerTag: "moltbot" });
    console.log('✅ Profile:', JSON.stringify(profile, null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response) {
      console.error('Response:', err.response.data);
    }
  }
}

test();
