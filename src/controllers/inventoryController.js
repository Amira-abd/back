import Product from ".././models/Product.js";

// GET ALL INVENTORY
export const getInventory = async (req, res) => {
  try {
    const products = await Product.find().populate("seller");
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