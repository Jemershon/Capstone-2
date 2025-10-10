#!/usr/bin/env node
// One-time maintenance script to fix the users.email unique index.
// It will:
// 1) Unset any documents where email === null
// 2) Drop the existing email_1 index (if present)
// 3) Create a partial unique index on { email: 1 } where email exists and is not null
// Usage (PowerShell):
// $env:MONGODB_URI="<your mongo uri>"; node .\scripts\fix_email_index.js

import mongoose from 'mongoose';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Set environment variable and rerun.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
    const db = mongoose.connection.db;
    const users = db.collection('users');

    console.log('1) Unsetting documents with email: null');
    const upd = await users.updateMany({ email: null }, { $unset: { email: '' } });
    console.log(`Updated ${upd.modifiedCount} documents.`);

    // Drop existing index if present
    try {
      console.log('2) Attempting to drop index "email_1" (if exists)');
      await users.dropIndex('email_1');
      console.log('Dropped index email_1');
    } catch (err) {
      console.log('dropIndex email_1:', err.message);
    }

    // Create partial unique index
    console.log('3) Creating partial unique index on email (only when email exists and is not null)');
    await users.createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } }
    );

    console.log('Partial unique index created successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(2);
  }
}

run();
