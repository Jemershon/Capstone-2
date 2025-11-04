import mongoose from 'mongoose';
import Material from '../models/Material.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/classroom';

async function debugMaterials() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all materials
    const materials = await Material.find({}).limit(5);
    console.log(`📊 Found ${materials.length} materials (showing first 5):`);
    
    materials.forEach((material, index) => {
      console.log(`\n--- Material ${index + 1} ---`);
      console.log(`Title: ${material.title}`);
      console.log(`Type: ${material.type}`);
      console.log(`Content: ${material.content}`);
      console.log(`Class: ${material.class}`);
      console.log(`Teacher: ${material.teacher}`);
      console.log(`Created: ${material.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

debugMaterials();