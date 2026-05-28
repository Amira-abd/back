require("dotenv").config();

const mongoose =
require("mongoose");

const connectDB =
require("../config/db");

const User =
require("../../models/User");

const Product =
require("../../models/Product");

const Deal =
require("../../models/Deal");

const Message =
require("../../models/Message");



const seedDeals =
async () => {

  try {

    await connectDB();



    await Deal.deleteMany();

    await Message.deleteMany();



    const user =
    await User.findOne();

    const product =
    await Product.findOne();



    const deal =
    await Deal.create({

      buyer:
      user._id,

      seller:
      user._id,

      product:
      product._id,

      offeredPrice:
      2500,

      quantity:
      500,

    });



    await Message.create([

      {
        deal:
        deal._id,

        sender:
        user._id,

        text:
        "Hello, is this still available?",
      },

      {
        deal:
        deal._id,

        sender:
        user._id,

        text:
        "Yes, available.",
      },

    ]);



    console.log(
      "Deals Seeded"
    );

    process.exit();

  } catch (error) {

    console.log(error);

    process.exit(1);

  }
};

seedDeals();