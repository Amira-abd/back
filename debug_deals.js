import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Deal from './src/models/Deal.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const deals = await Deal.find().populate('buyer seller product');
  console.log("=== DEALS IN DB ===");
  console.log(JSON.stringify(deals, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);
