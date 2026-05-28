const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const config = require('./src/config')
const User = require('./src/models/User')
const Category = require('./src/models/Category')
const Rfq = require('./src/models/Rfq')
const RfqAttachment = require('./src/models/RfqAttachment')
const RfqOffer = require('./src/models/RfqOffer')
const Product = require('./src/models/Product')
const ProductImage = require('./src/models/ProductImage')

async function seed() {
  await mongoose.connect(config.db.uri)
  console.log('Connected to MongoDB')

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Rfq.deleteMany({}),
    RfqAttachment.deleteMany({}),
    RfqOffer.deleteMany({}),
    Product.deleteMany({}),
    ProductImage.deleteMany({}),
  ])
  console.log('Cleared existing data')

  // Categories
  const categories = await Category.insertMany([
    { name: 'Raw Materials', description: 'Raw industrial materials and supplies' },
    { name: 'Packaging', description: 'Packaging materials and containers' },
    { name: 'Logistics', description: 'Transportation and logistics services' },
    { name: 'Electronics', description: 'Electronic components and devices' },
    { name: 'Chemicals', description: 'Industrial chemicals and compounds' },
  ])
  console.log(`Created ${categories.length} categories`)

  // Users
  const hashedPassword = await bcrypt.hash('password123', 10)

  const users = await User.insertMany([
    {
      full_name: 'Alice Buyer',
      email: 'alice@example.com',
      password: hashedPassword,
      role: 'buyer',
      city: 'New York',
      verification_status: 'approved',
    },
    {
      full_name: 'Bob Buyer',
      email: 'bob@example.com',
      password: hashedPassword,
      role: 'buyer',
      city: 'Los Angeles',
      verification_status: 'approved',
    },
    {
      full_name: 'Diana Seller',
      email: 'diana@example.com',
      password: hashedPassword,
      role: 'seller',
      city: 'Houston',
      verification_status: 'verified',
    },
    {
      full_name: 'Eve Seller (unverified)',
      email: 'eve@example.com',
      password: hashedPassword,
      role: 'seller',
      city: 'Miami',
      verification_status: 'pending',
    },
  ])
  console.log(`Created ${users.length} users`)

  const [alice, bob, charlie, diana] = users

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
  ])
  console.log(`Created ${rfqs.length} RFQs`)

  // Attachments for first RFQ
  const attachments = await RfqAttachment.insertMany([
    { rfq_id: rfqs[0]._id, file_url: 'https://example.com/uploads/spec-sheet.pdf' },
    { rfq_id: rfqs[0]._id, file_url: 'https://example.com/uploads/dimensions.pdf' },
  ])
  console.log(`Created ${attachments.length} attachments`)

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
  ])
  console.log(`Created ${offers.length} offers`)

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
  ])
  console.log(`Created ${products.length} products`)

  // Product images
  const productImages = await ProductImage.insertMany([
    { product_id: products[0]._id, image_url: 'https://picsum.photos/seed/alum1/400/400', sort_order: 0 },
    { product_id: products[0]._id, image_url: 'https://picsum.photos/seed/alum2/400/400', sort_order: 1 },
    { product_id: products[1]._id, image_url: 'https://picsum.photos/seed/box1/400/400', sort_order: 0 },
    { product_id: products[2]._id, image_url: 'https://picsum.photos/seed/arduino1/400/400', sort_order: 0 },
    { product_id: products[2]._id, image_url: 'https://picsum.photos/seed/arduino2/400/400', sort_order: 1 },
    { product_id: products[2]._id, image_url: 'https://picsum.photos/seed/arduino3/400/400', sort_order: 2 },
    { product_id: products[3]._id, image_url: 'https://picsum.photos/seed/rpi1/400/400', sort_order: 0 },
    { product_id: products[4]._id, image_url: 'https://picsum.photos/seed/acetone1/400/400', sort_order: 0 },
    { product_id: products[5]._id, image_url: 'https://picsum.photos/seed/steel1/400/400', sort_order: 0 },
  ])
  console.log(`Created ${productImages.length} product images`)

  console.log('\n--- Seed completed ---')
  console.log('Login credentials for all users: password123')
  console.log('Buyers: alice@example.com, bob@example.com')
  console.log('Sellers: charlie@example.com, diana@example.com, eve@example.com')

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
