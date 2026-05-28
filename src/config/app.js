import express from 'express'
const app = express()

// Register all models so Mongoose knows about them for population
require('../models/User')
require('../models/Category')
require('../models/Order')
require('../models/Rfq')
require('../models/RfqAttachment')
require('../models/RfqOffer')
require('../models/Product')
require('../models/ProductImage')

const clientRoutes = require('../routes/clientRoutes')
const categoryRoutes = require('../routes/categoryRoutes')

app.use(express.json())
app.use(clientRoutes)
app.use(categoryRoutes)

module.exports = app