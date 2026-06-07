import Deal from ".././models/Deal.js";
import Message from ".././models/Message.js";

// GET ALL DEALS
export const getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate("buyer", "fullName email")
      .populate("seller", "fullName email")
      .populate("product", "title");

    res.status(200).json(deals);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET MESSAGES
export const getDealMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      deal: req.params.id,
    })
      .populate("sender", "fullName")
      .sort({
        createdAt: 1,
      });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ACCEPT DEAL
export const acceptDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      {
        status: "accepted",
      },
      {
        new: true,
      }
    );

    res.status(200).json(deal);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};