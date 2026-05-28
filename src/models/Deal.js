const mongoose =require("mongoose");

const dealSchema =
new mongoose.Schema({

  buyer: {
    type:
    mongoose.Schema.Types.ObjectId,

    ref: "User",
  },

  seller: {
    type:
    mongoose.Schema.Types.ObjectId,

    ref: "User",
  },

  product: {
    type:
    mongoose.Schema.Types.ObjectId,

    ref: "Product",
  },

  offeredPrice: Number,

  quantity: Number,

  status: {
    type: String,

    enum: [
      "negotiating",
      "pending",
      "accepted",
      "completed",
    ],

    default:
    "negotiating",
  },

}, {
  timestamps: true,
});

module.exports =
mongoose.model(
  "Deal",
  dealSchema
);