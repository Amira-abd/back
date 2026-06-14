import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io'; // 1. تصحيح استيراد الـ Server
import connectDB from './src/config/db.js'; 
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import categoryRoutes from './src/routes/categoryRoutes.js';
import clientRoutes from './src/routes/clientRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import Message from './src/models/Message.js';
import Deal from './src/models/Deal.js';
import Notification from './src/models/Notification.js';
import { initNotificationService, createNotification } from './src/services/notificationService.js';

// فك التشفير عن المسارات لو قمت بإنشاء ملفاتها مستقبلاً
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import dealRoutes from './src/routes/dealRoutes.js';
import pricingRoutes from './src/routes/pricingRoutes.js';
import logisticsRoutes from './src/routes/logisticsRoutes.js';

// CONFIG
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import paymentRoutes from './src/routes/paymentRoutes.js';
import userRoutes from './src/routes/userRoutes.js';

// CONNECT DATABASE
connectDB().then(async () => {
  try {
    const Product = (await import('./src/models/Product.js')).default;
    const RfqOffer = (await import('./src/models/RfqOffer.js')).default;
    const Deal = (await import('./src/models/Deal.js')).default;
    const Order = (await import('./src/models/Order.js')).default;
    const User = (await import('./src/models/User.js')).default;
    const Verification = (await import('./src/models/userVerification.js')).default;

    const productUpdate = await Product.updateMany({ price: { $lte: 0 } }, { price: 1.00 });
    const rfqUpdate = await RfqOffer.updateMany({ price: { $lte: 0 } }, { price: 1.00 });
    const dealUpdate = await Deal.updateMany({ offeredPrice: { $lte: 0 } }, { offeredPrice: 1.00 });
    const orderUpdate = await Order.updateMany({ total_price: { $lte: 0 } }, { total_price: 1.00 });

    if (productUpdate.modifiedCount > 0 || rfqUpdate.modifiedCount > 0 || dealUpdate.modifiedCount > 0 || orderUpdate.modifiedCount > 0) {
      console.log('✅ Audited and corrected records with zero/negative pricing in DB:', {
        products: productUpdate.modifiedCount,
        rfqOffers: rfqUpdate.modifiedCount,
        deals: dealUpdate.modifiedCount,
        orders: orderUpdate.modifiedCount
      });
    }

    // Audit and migrate local/localhost user verification image paths
    const localOrLocalhostUsers = await User.find({
      $or: [
        { id_card_path: { $regex: /^(uploads|http:\/\/localhost)/i } },
        { national_id_doc: { $regex: /^(uploads|http:\/\/localhost)/i } }
      ]
    });

    if (localOrLocalhostUsers.length > 0) {
      console.log(`🔍 Found ${localOrLocalhostUsers.length} users with local/localhost ID image paths. Migrating to public fallbacks...`);
      for (const u of localOrLocalhostUsers) {
        const secureFallback = "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=1000&auto=format&fit=crop";
        u.id_card_path = secureFallback;
        u.national_id_doc = secureFallback;
        if (u.profile_image && (u.profile_image.startsWith('uploads') || u.profile_image.includes('localhost'))) {
          u.profile_image = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&auto=format&fit=crop";
        }
        await u.save();
      }
      console.log('✅ User document paths updated in DB.');
    }

    // Audit and migrate verification document details
    const localOrLocalhostVerifications = await Verification.find({
      idImage: { $regex: /^(uploads|http:\/\/localhost|N\/A)/i }
    });

    if (localOrLocalhostVerifications.length > 0) {
      console.log(`🔍 Found ${localOrLocalhostVerifications.length} verifications with local/localhost/invalid image paths. Migrating to public fallbacks...`);
      for (const v of localOrLocalhostVerifications) {
        v.idImage = "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=1000&auto=format&fit=crop";
        await v.save();
      }
      console.log('✅ Verification document paths updated in DB.');
    }

  } catch (err) {
    console.error('⚠️ Database audit/migration warning:', err.message);
  }
});

// APP
const app = express();

// MIDDLEWARES (يُفضل وضعها قبل الـ Routes دائماً)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// CREATE SERVER
const server = http.createServer(app); // 3. الآن المتغير مفرداً ولا يتعارض مع شيء

// SOCKET IO
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.set('io', io);
initNotificationService(io);

// ROUTES
app.use("/api/auth", authRoutes); // 4. تفعيل مسار المصادقة
app.use("/api/admin", adminRoutes);
app.use("/api", categoryRoutes); 
app.use("/api", clientRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/users", userRoutes);

// 5. إذا كانت هذه الملفات غير موجودة بعد، اترك هذه الأسطر ممسوحة (Commented) لحين إنشائها:
app.use("/api/admin/inventory", inventoryRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/logistics", logisticsRoutes);

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("API Running");
});

// SOCKET EVENTS
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN DEAL ROOM
  socket.on("joinDeal", (dealId) => {
    socket.join(dealId);
    console.log(`Joined room ${dealId}`);
  });

  // JOIN USER ROOM
  socket.on("joinUserRoom", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User joined room user_${userId}`);
  });

  // SEND MESSAGE
  socket.on("sendMessage", async (data) => {
    try {
      // 6. تم إلغاء الـ require القديمة واستخدام الـ Import المتواجد في أول الملف بالأسفل

      // SAVE MESSAGE
      const newMessage = await Message.create({
        deal: data.dealId,
        sender: data.senderId,
        text: data.text,
      });

      const deal = await Deal.findById(data.dealId);
      if (deal) {
        const receiverId = deal.buyer.toString() === data.senderId ? deal.seller : deal.buyer;
        
        // Use unified notification service
        await createNotification({
          recipient: receiverId,
          sender: data.senderId,
          type: 'message',
          title: 'New Chat Message',
          description: data.text || 'You have received a new message.',
          entityType: 'Deal',
          entityId: deal._id,
          actionUrl: `/dashboard/chat?dealId=${deal._id}`,
          priority: 'medium'
        });
      }

      // POPULATE SENDER
      const populatedMessage = await Message.findById(newMessage._id).populate(
        "sender",
        "full_name"
      );

      // SEND TO ROOM
      io.to(data.dealId).emit("receiveMessage", populatedMessage);
    } catch (error) {
      console.error("Socket Message Error:", error);
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// PORT
const PORT = process.env.PORT || 5000;

// START SERVER
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});