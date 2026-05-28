const Product =
  require("../../models/Product");



// GET ALL INVENTORY
exports.getInventory =
  async (req, res) => {

    try {

      const products =
        await Product.find()
        .populate("seller");

      res.status(200).json(
        products
      );

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
};



// GET STATS
exports.getInventoryStats =
  async (req, res) => {

    try {

      const totalListings =
        await Product.countDocuments();

      const pending =
        await Product.countDocuments({
          complianceStatus:
            "pending",
        });

      const flagged =
        await Product.countDocuments({
          complianceStatus:
            "flagged",
        });

      const verified =
        await Product.countDocuments({
          complianceStatus:
            "verified",
        });

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
exports.flagProduct =
  async (req, res) => {

    try {

      await Product.findByIdAndUpdate(
        req.params.id,
        {
          complianceStatus:
            "flagged",
        }
      );

      res.status(200).json({
        message:
          "Product flagged",
      });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
};



// VERIFY PRODUCT
exports.verifyProduct =
  async (req, res) => {

    try {

      await Product.findByIdAndUpdate(
        req.params.id,
        {
          complianceStatus:
            "verified",
        }
      );

      res.status(200).json({
        message:
          "Product verified",
      });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }
};



// HIDE PRODUCT
exports.hideProduct =
async (req, res) => {

  try {

    await Product.findByIdAndUpdate(
      req.params.id,
      {
        isHidden: true,
      }
    );

    res.status(200).json({
      message:
      "Product hidden",
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};