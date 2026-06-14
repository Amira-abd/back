import mongoose from "mongoose";

const dealSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
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
    default: "negotiating",
  },
  paymentStatus: {
    type: String,
    enum: [
      "pending",
      "processing",
      "paid",
      "failed",
      "cancelled",
      "refunded",
    ],
    default: "pending",
  },
  transactionId: {
    type: String,
  },
  escrowStatus: {
    type: String,
    enum: [
      "Pending",
      "Paid_to_Escrow",
      "Shipped",
      "Delivered_and_Verified",
      "Released_to_Supplier",
    ],
    default: "Pending",
  },
  contractUrl: {
    type: String,
  },
}, {
  timestamps: true,
});

const Deal = mongoose.model("Deal", dealSchema);

export default Deal;