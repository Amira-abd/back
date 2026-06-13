import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import User from './src/models/User.js';
import Category from './src/models/Category.js';
import Rfq from './src/models/Rfq.js';
import RfqAttachment from './src/models/RfqAttachment.js';
import RfqOffer from './src/models/RfqOffer.js';
import Product from './src/models/Product.js';
import ProductImage from './src/models/ProductImage.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in the environment variables');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Rfq.deleteMany({}),
    RfqAttachment.deleteMany({}),
    RfqOffer.deleteMany({}),
    Product.deleteMany({}),
    ProductImage.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // Categories
  const categories = await Category.insertMany([
    { name: 'Raw Materials', description: 'Raw industrial materials and supplies' },
    { name: 'Packaging', description: 'Packaging materials and containers' },
    { name: 'Logistics', description: 'Transportation and logistics services' },
    { name: 'Electronics', description: 'Electronic components and devices' },
    { name: 'Chemicals', description: 'Industrial chemicals and compounds' },
  ]);
  console.log(`Created ${categories.length} categories`);

  // Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await User.insertMany([
    {
      full_name: 'Alice Buyer',
      email: 'alice@example.com',
      password_hash: hashedPassword,
      phone: '+1 555-0101',
      role: 'Buyer',
      city: 'New York',
      address: '123 Buyer St, New York NY',
      verification_status: 'approved',
      is_verified: true,
    },
    {
      full_name: 'Bob Buyer',
      email: 'bob@example.com',
      password_hash: hashedPassword,
      phone: '+1 555-0102',
      role: 'Buyer',
      city: 'Los Angeles',
      address: '456 Buyer Rd, Los Angeles CA',
      verification_status: 'approved',
      is_verified: true,
    },
    {
      full_name: 'Charlie Seller',
      email: 'charlie@example.com',
      password_hash: hashedPassword,
      phone: '+1 555-0103',
      role: 'Seller',
      city: 'Chicago',
      address: '789 Seller Way, Chicago IL',
      verification_status: 'approved',
      is_verified: true,
    },
    {
      full_name: 'Diana Seller',
      email: 'diana@example.com',
      password_hash: hashedPassword,
      phone: '+1 555-0104',
      role: 'Seller',
      city: 'Houston',
      address: '321 Seller Blvd, Houston TX',
      verification_status: 'approved',
      is_verified: true,
    },
    {
      full_name: 'Eve Seller (unverified)',
      email: 'eve@example.com',
      password_hash: hashedPassword,
      phone: '+1 555-0105',
      role: 'Seller',
      city: 'Miami',
      address: '654 Seller Ln, Miami FL',
      verification_status: 'pending',
      is_verified: false,
    },
  ]);
  console.log(`Created ${users.length} users`);

  const [alice, bob, charlie, diana, eve] = users;

  // RFQs
  const rfqs = await Rfq.insertMany([
    {
      buyer_id: alice._id,
      category_id: categories[0]._id,
      title: 'Need 500kg of aluminum sheets',
      description: 'Looking for 500kg of aluminum sheets, 2mm thickness, grade 6061.',
      quantity: 500,
      unit: 'kg',
      location: 'New York',
      status: 'open',
    },
    {
      buyer_id: alice._id,
      category_id: categories[1]._id,
      title: 'Custom cardboard boxes',
      description: 'Need 10,000 custom-printed cardboard boxes for product packaging.',
      quantity: 10000,
      unit: 'pcs',
      location: 'New York',
      status: 'open',
    },
    {
      buyer_id: bob._id,
      category_id: categories[3]._id,
      title: '100 units of microcontrollers',
      description: 'Need 100 Arduino-compatible microcontrollers for a project.',
      quantity: 100,
      unit: 'units',
      location: 'Los Angeles',
      status: 'open',
    },
    {
      buyer_id: bob._id,
      category_id: categories[4]._id,
      title: 'Industrial cleaning solvent',
      description: 'Need 200L of industrial-grade cleaning solvent.',
      quantity: 200,
      unit: 'liters',
      location: 'Los Angeles',
      status: 'closed',
    },
  ]);
  console.log(`Created ${rfqs.length} RFQs`);

  // Attachments for first RFQ
  const attachments = await RfqAttachment.insertMany([
    { rfq_id: rfqs[0]._id, file_url: 'https://example.com/uploads/spec-sheet.pdf' },
    { rfq_id: rfqs[0]._id, file_url: 'https://example.com/uploads/dimensions.pdf' },
  ]);
  console.log(`Created ${attachments.length} attachments`);

  // Offers
  const offers = await RfqOffer.insertMany([
    {
      rfq_id: rfqs[0]._id,
      seller_id: charlie._id,
      price: 4500,
      delivery_time: '14 days',
      message: 'We can supply high-quality aluminum sheets at competitive pricing.',
      status: 'pending',
    },
    {
      rfq_id: rfqs[0]._id,
      seller_id: diana._id,
      price: 4800,
      delivery_time: '10 days',
      message: 'Premium grade 6061 aluminum, fast delivery.',
      status: 'pending',
    },
    {
      rfq_id: rfqs[1]._id,
      seller_id: charlie._id,
      price: 2500,
      delivery_time: '7 days',
      message: 'Custom printing available, eco-friendly materials.',
      status: 'pending',
    },
    {
      rfq_id: rfqs[2]._id,
      seller_id: diana._id,
      price: 850,
      delivery_time: '5 days',
      message: 'In stock, ready to ship immediately.',
      status: 'pending',
    },
  ]);
  console.log(`Created ${offers.length} offers`);

  // Products
  const products = await Product.insertMany([
    {
      seller_id: charlie._id,
      category_id: categories[0]._id,
      title: 'Aluminum Sheets 6061 - 2mm',
      description: 'High-quality aluminum sheets, grade 6061, 2mm thickness. Suitable for industrial and commercial use.',
      quantity: 2000,
      unit: 'kg',
      condition: 'new',
      price: 8.50,
      city: 'Chicago',
      location: 'Warehouse A, Chicago IL',
      status: 'active',
    },
    {
      seller_id: charlie._id,
      category_id: categories[1]._id,
      title: 'Custom Corrugated Boxes',
      description: 'Eco-friendly corrugated cardboard boxes available in custom sizes with printing.',
      quantity: 50000,
      unit: 'pcs',
      condition: 'new',
      price: 0.75,
      city: 'Chicago',
      location: 'Chicago IL',
      status: 'active',
    },
    {
      seller_id: diana._id,
      category_id: categories[3]._id,
      title: 'Arduino Mega 2560',
      description: 'Brand new Arduino Mega 2560 microcontroller boards. Bulk pricing available.',
      quantity: 500,
      unit: 'units',
      condition: 'new',
      price: 38.00,
      city: 'Houston',
      location: 'Houston TX',
      status: 'active',
    },
    {
      seller_id: diana._id,
      category_id: categories[3]._id,
      title: 'Raspberry Pi 4 - Used',
      description: 'Used Raspberry Pi 4 Model B (4GB) in excellent condition. Tested and working.',
      quantity: 25,
      unit: 'units',
      condition: 'used',
      price: 25.00,
      city: 'Houston',
      location: 'Houston TX',
      status: 'active',
    },
    {
      seller_id: charlie._id,
      category_id: categories[4]._id,
      title: 'Industrial Grade Acetone',
      description: 'Industrial grade acetone (99.8% purity). 20L containers.',
      quantity: 500,
      unit: 'liters',
      condition: 'new',
      price: 4.20,
      city: 'Chicago',
      location: 'Chicago IL',
      status: 'active',
    },
    {
      seller_id: diana._id,
      category_id: categories[0]._id,
      title: 'Stainless Steel Rods 304',
      description: 'Refurbished stainless steel rods, grade 304. Various diameters available.',
      quantity: 300,
      unit: 'kg',
      condition: 'refurbished',
      price: 5.80,
      city: 'Houston',
      location: 'Houston TX',
      status: 'active',
    },
  ]);
  console.log(`Created ${products.length} products`);

  // Product images
  await ProductImage.insertMany([
    { product_id: products[0]._id, image_url: 'https://picsum.photos/seed/alum1/400/400', sort_order: 0 },
    { product_id: products[0]._id, image_url: 'https://picsum.photos/seed/alum2/400/400', sort_order: 1 },
    { product_id: products[1]._id, image_url: 'https://picsum.photos/seed/box1/400/400', sort_order: 0 },
    { product_id: products[2]._id, image_url: 'https://picsum.photos/seed/arduino1/400/400', sort_order: 0 },
    { product_id: products[2]._id, image_url: 'https://picsum.photos/seed/arduino2/400/400', sort_order: 1 },
    { product_id: products[2]._id, image_url: 'https://picsum.photos/seed/arduino3/400/400', sort_order: 2 },
    { product_id: products[3]._id, image_url: 'https://picsum.photos/seed/rpi1/400/400', sort_order: 0 },
    { product_id: products[4]._id, image_url: 'https://picsum.photos/seed/acetone1/400/400', sort_order: 0 },
    { product_id: products[5]._id, image_url: 'https://picsum.photos/seed/steel1/400/400', sort_order: 0 },
  ]);
  console.log('Created product images');

  console.log('\n--- Seed completed ---');
  console.log('Login credentials for all users: password123');
  console.log('Buyers: alice@example.com, bob@example.com');
  console.log('Sellers: charlie@example.com, diana@example.com, eve@example.com');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
