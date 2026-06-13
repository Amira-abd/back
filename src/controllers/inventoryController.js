import mongoose from "mongoose";
import Product from ".././models/Product.js";
import User from "../models/User.js";

// GET ALL INVENTORY
export const getInventory = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("seller_id", "full_name email")
      .populate("category_id", "name");
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET STATS
export const getInventoryStats = async (req, res) => {
  try {
    const [totalListings, pending, flagged, verified] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ complianceStatus: "pending" }),
      Product.countDocuments({ complianceStatus: "flagged" }),
      Product.countDocuments({ complianceStatus: "verified" }),
    ]);

    res.status(200).json({
      totalListings,
      pending,
      flagged,
      verified,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// FLAG PRODUCT
export const flagProduct = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, {
      complianceStatus: "flagged",
    });

    res.status(200).json({
      message: "Product flagged",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// VERIFY PRODUCT
export const verifyProduct = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, {
      complianceStatus: "verified",
    });

    res.status(200).json({
      message: "Product verified",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// HIDE PRODUCT
export const hideProduct = async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, {
      isHidden: true,
    });

    res.status(200).json({
      message: "Product hidden",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET DASHBOARD STATS
export const getInventoryDashboard = async (req, res) => {
  try {
    const [totalActiveListings, pendingCompliance, flaggedListings] = await Promise.all([
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ complianceStatus: "pending" }),
      Product.countDocuments({ complianceStatus: "flagged" }),
    ]);

    const volumeResult = await Product.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: null, totalVolume: { $sum: "$quantity" } } }
    ]);
    const totalVolume = volumeResult[0]?.totalVolume || 0;

    res.status(200).json({
      totalActiveListings,
      pendingCompliance,
      flaggedListings,
      totalVolume,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET PAGINATED LISTINGS WITH FILTERS
export const getInventoryListings = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, category } = req.query;

    const query = {};

    // Filter by compliance status
    if (status) {
      query.complianceStatus = status;
    }

    // Filter by category
    if (category) {
      query.category_id = category;
    }

    // Search query
    if (search) {
      const matchConditions = [];
      
      // If it looks like a valid Mongo ObjectId, search by ID
      if (mongoose.Types.ObjectId.isValid(search)) {
        matchConditions.push({ _id: search });
      }

      // Check if it matches search query in owner's full_name
      const users = await User.find({
        full_name: { $regex: search, $options: "i" }
      }).select("_id");
      const userIds = users.map((u) => u._id);

      matchConditions.push(
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { seller_id: { $in: userIds } }
      );
      
      query.$or = matchConditions;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Use lean() for speed and select fields for safety
    const [listings, total] = await Promise.all([
      Product.find(query)
        .populate("seller_id", "full_name email")
        .populate("category_id", "name")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      listings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};