import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/.env` });

console.log('MONGO_URI exists:', !!process.env.MONGO_URI);

const classSchema = new mongoose.Schema({
  name: String,
  section: String,
  course: String,
  year: String,
  schedule: String,
  code: { type: String, unique: true },
  teacher: String,
  students: [{ type: String }],
  bg: { type: String, default: "#FFF0D8" },
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
});

const Class = mongoose.model("Class", classSchema);

async function checkClass() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const networkSecClass = await Class.findOne({ name: 'network sec' });
    console.log('\nClass "network sec" details:');
    console.log(JSON.stringify(networkSecClass, null, 2));
    
    console.log('\nAll classes:');
    const allClasses = await Class.find({}).select('name section year');
    allClasses.forEach(c => {
      console.log(`- ${c.name}: section="${c.section}", year="${c.year}"`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkClass();
