const Product = require('../models/Product')
const ProductImage = require('../models/ProductImage')
const User = require('../models/User')

const getAllProducts = async (req, res) => {
  try {
    const { search, category_id, city, min_price, max_price, verified_only, condition, page = 1, limit = 20 } = req.query
    const filter = { status: 'active' }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }
    if (category_id) filter.category_id = category_id
    if (city) filter.city = { $regex: city, $options: 'i' }
    if (condition) filter.condition = condition
    if (min_price || max_price) {
      filter.price = {}
      if (min_price) filter.price.$gte = parseFloat(min_price)
      if (max_price) filter.price.$lte = parseFloat(max_price)
    }

    if (verified_only === 'true') {
      const verifiedSellers = await User.find({
        role: 'seller',
        verification_status: 'approved',
      }).distinct('_id')
      filter.seller_id = { $in: verifiedSellers }
    }

    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('seller_id', 'full_name city verification_status')
        .populate('category_id', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ])

    const productIds = products.map((p) => p._id)
    const images = await ProductImage.find({ product_id: { $in: productIds } })
      .sort({ sort_order: 1 })
      .lean()

    const imageMap = {}
    for (const img of images) {
      if (!imageMap[img.product_id.toString()]) {
        imageMap[img.product_id.toString()] = img
      }
    }

    const data = products.map((p) => ({
      ...p,
      category: p.category_id,
      seller: p.seller_id,
      thumbnail: imageMap[p._id.toString()] || null,
      category_id: undefined,
      seller_id: undefined,
    }))

    res.json({
      data,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller_id', 'full_name city verification_status phone')
      .populate('category_id', 'name')
      .lean()
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    const images = await ProductImage.find({ product_id: product._id })
      .sort({ sort_order: 1 })
      .lean()

    res.json({
      data: {
        ...product,
        category: product.category_id,
        seller: product.seller_id,
        images,
        category_id: undefined,
        seller_id: undefined,
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const createProduct = async (req, res) => {
  try {
    const { title, description, category_id, quantity, unit, condition, price, city, location, images } = req.body

    const product = await Product.create({
      seller_id: req.user._id,
      title,
      description,
      category_id,
      quantity,
      unit,
      condition,
      price,
      city,
      location,
    })

    if (images && Array.isArray(images) && images.length > 0) {
      const imageDocs = images.map((img, i) => ({
        product_id: product._id,
        image_url: img.image_url,
        sort_order: img.sort_order ?? i,
      }))
      await ProductImage.insertMany(imageDocs)
    }

    res.status(201).json({ message: 'Product created successfully', data: product })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    if (product.seller_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this product' })
    }

    const { title, description, quantity, unit, condition, price, city, location, category_id, status } = req.body
    if (title !== undefined) product.title = title
    if (description !== undefined) product.description = description
    if (quantity !== undefined) product.quantity = quantity
    if (unit !== undefined) product.unit = unit
    if (condition !== undefined) product.condition = condition
    if (price !== undefined) product.price = price
    if (city !== undefined) product.city = city
    if (location !== undefined) product.location = location
    if (category_id !== undefined) product.category_id = category_id
    if (status !== undefined) product.status = status

    await product.save()
    res.json({ message: 'Product updated successfully', data: product })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }
    if (product.seller_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this product' })
    }

    product.status = 'inactive'
    await product.save()
    res.json({ message: 'Product deactivated successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller_id: req.user._id })
      .populate('category_id', 'name')
      .sort({ created_at: -1 })
      .lean()

    const productIds = products.map((p) => p._id)
    const images = await ProductImage.find({ product_id: { $in: productIds } })
      .sort({ sort_order: 1 })
      .lean()

    const imageMap = {}
    for (const img of images) {
      if (!imageMap[img.product_id.toString()]) {
        imageMap[img.product_id.toString()] = []
      }
      imageMap[img.product_id.toString()].push(img)
    }

    const data = products.map((p) => ({
      ...p,
      category: p.category_id,
      images: imageMap[p._id.toString()] || [],
      category_id: undefined,
    }))

    res.json({ data })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getSellerProfile = async (req, res) => {
  try {
    const seller = await User.findById(req.params.sellerId)
      .select('full_name city verification_status created_at')
      .lean()
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' })
    }

    const products = await Product.find({ seller_id: seller._id, status: 'active' })
      .sort({ created_at: -1 })
      .lean()

    const productIds = products.map((p) => p._id)
    const images = await ProductImage.find({ product_id: { $in: productIds } })
      .sort({ sort_order: 1 })
      .lean()

    const imageMap = {}
    for (const img of images) {
      if (!imageMap[img.product_id.toString()]) {
        imageMap[img.product_id.toString()] = img
      }
    }

    const productsData = products.map((p) => ({
      ...p,
      thumbnail: imageMap[p._id.toString()] || null,
    }))

    res.json({ seller, products: productsData })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getSellerProfile,
}
