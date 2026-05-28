import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const signup = async (req, res) => {
  try {
    // 1. استقبال الحقول المشتركة بين الطريقتين من الـ req.body
    const { role, city, address, phone, password, token } = req.body;
    
    let full_name = req.body.full_name;
    let email = req.body.email;
    let google_id = undefined;
    let hashedPassword = undefined;

    // 2. الفحص الذكي: هل التسجيل يتم عبر جوجل؟
    if (token) {
      // التحقق من توكن جوجل وجلب البيانات من سيرفراتهم
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      // إعادة تعيين البيانات بناءً على حساب جوجل الموثق
      google_id = payload.sub;
      email = payload.email;
      full_name = payload.name; // بيجيب الاسم بالكامل من حساب جوجل تلقائياً

    } else {
      // 3. في حالة التسجيل بالفورم التقليدي
      // التأكد أولاً أن المستخدم أدخل إيميل وباسورد واسم بالكامل
      if (!email || !password || !full_name) {
        return res.status(400).json({ 
          success: false, 
          message: 'يرجى إدخال الاسم، البريد الإلكتروني، وكلمة المرور.' 
        });
      }

      // تشفير كلمة المرور
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // 4. التحقق من عدم تكرار الإيميل في قاعدة البيانات في الحالتين
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // لو مسجل بجوجل قبل كده وجاي يسجل تاني
      if (token && existingUser.google_id === google_id) {
         return res.status(200).json({
           success: true,
           message: 'هذا الحساب مسجل بجوجل بالفعل، تم تسجيل الدخول بنجاح.',
           user: existingUser
         });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'هذا البريد الإلكتروني مسجل بالفعل في النظام.' 
      });
    }

    // 5. إنشاء المستخدم الجديد وحفظ البيانات المشتركة والخاصة بكل طريقة
    const newUser = new User({
      full_name,
      email,
      phone, // بيكون إجباري في الفورم، وفي حالة جوجل بتبعتيه برضه من الفورم
      password_hash: hashedPassword, // هيكون null لو شغال بجوجل
      google_id, // هيكون undefined لو شغال بالفورم العادي
      role,
      city,
      address,
      // الحقول دي بتاخد الـ default بتاعها تلقائياً (pending, false, active)
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح، وهو بانتظار مراجعة الإدارة 🎉',
      user: {
        id: newUser._id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        verification_status: newUser.verification_status
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء عملية التسجيل',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email: inputEmail, password, token } = req.body;
    let user = null;

    // 1. الفحص الذكي: هل تسجيل الدخول بـ Google؟
    if (token) {
      // التحقق من توكن جوجل
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const google_id = payload.sub;

      // البحث عن اليوزر برقم تعريف جوجل
      user = await User.findOne({ google_id });
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'هذا الحساب غير مسجل لدينا بجوجل، يرجى إنشاء حساب أولاً.' 
        });
      }
    } else {
      // 2. تسجيل الدخول التقليدي بالفورم
      if (!inputEmail || !password) {
        return res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
      }

      // البحث عن اليوزر بالإيميل
      user = await User.findOne({ email: inputEmail.toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      // لو اليوزر ده مسجل أصلاً بجوجل وجاي يدخل بباسورد عادي وهو معندوش باسورد في السيستم
      if (!user.password_hash) {
        return res.status(400).json({ 
          success: false, 
          message: 'هذا الحساب مسجل عبر جوجل، يرجى الضغط على زر الدخول بواسطة جوجل.' 
        });
      }

      // مقارنة الباسورد المكتوب بالباسورد المشفر في الداتابيز
      const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordCorrect) {
        return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }
    }

    // 3. ميزة الأمان لتصميم EcoLink: فحص حالة الحساب (Status)
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'تم حظر هذا الحساب من قبل الإدارة.' });
    }
    
    // اختياري: لو حابة تمنعيهم يدخلوا إلا لما الأدمن يوافق (verification_status === 'approved') 
    // تقدري تضيفي الفحص ده هنا بناءً على رغبة التيم في الـ flow بتاع الأبليكيشن.

    // 4. إنشاء الـ JWT Token الخاص بـ EcoLink
    const ecoToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 5. إرسال الاستجابة بنجاح ومظهر الـ Token
    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح 🎉',
      token: ecoToken, // الـ Token ده الفرونت إند هيستخدمه في كل الطلبات الجاية
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        verification_status: user.verification_status
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء عملية تسجيل الدخول',
      error: error.message
    });
  }
};