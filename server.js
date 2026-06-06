import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io'; // 1. تصحيح استيراد الـ Server
import connectDB from './src/config/db.js'; 
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
// import Message from './src/models/Message.js'; // 2. نقل استيراد الموديل هنا بدلاً من require

// فك التشفير عن المسارات لو قمت بإنشاء ملفاتها مستقبلاً
// import inventoryRoutes from './src/routes/inventoryRoutes.js';
// import dealRoutes from './src/routes/dealRoutes.js';

// CONFIG
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// CONNECT DATABASE
connectDB();

// APP
const app = express();

// MIDDLEWARES (يُفضل وضعها قبل الـ Routes دائماً)
app.use(cors());
app.use(express.json());

// CREATE SERVER
const server = http.createServer(app); // 3. الآن المتغير مفرداً ولا يتعارض مع شيء

// SOCKET IO
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// ROUTES
app.use("/api/auth", authRoutes); // 4. تفعيل مسار المصادقة
app.use("/api/admin", adminRoutes);

// 5. إذا كانت هذه الملفات غير موجودة بعد، اترك هذه الأسطر ممسوحة (Commented) لحين إنشائها:
// app.use("/api/admin/inventory", inventoryRoutes);
// app.use("/api/deals", dealRoutes);

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

      // POPULATE SENDER
      const populatedMessage = await Message.findById(newMessage._id).populate(
        "sender",
        "fullName"
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