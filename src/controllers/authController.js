import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// دالة مساعدة لإنشاء الـ Token لمنع تكرار الكود
const createEcoToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'EcoLinkBackEndSecretKey2026@#$!', 
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

export const signup = async (req, res) => {
  try {
    // 1. استقبال الحقول المشتركة بين الطريقتين من الـ req.body
    const { role, city, address, phone, password, token } = req.body;
    
    let full_name = req.body.full_name;
    let email = req.body.email;
    let google_id = undefined;
    let hashedPassword = undefined;

    //  [تعديل الأمان]: حماية الـ Admin ومنع أي مستخدم من تسجيل حساب آدمن جديد من الـ Form
    if (role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح بإنشاء حسابات إدارة جديدة من هنا نهائياً.'
      });
    }

    // 2. الفحص الذكي: هل التسجيل يتم عبر جوجل؟
    if (token) {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      google_id = payload.sub;
      email = payload.email;
      full_name = payload.name;

    } else {
      // 3. في حالة التسجيل بالفورم التقليدي
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
      if (token && existingUser.google_id === google_id) {
         // توليد توكن في حالة الدخول المكرر بجوجل
         const ecoToken = createEcoToken(existingUser);
         return res.status(200).json({
           success: true,
           message: 'هذا الحساب مسجل بجوجل بالفعل، تم تسجيل الدخول بنجاح.',
           token: ecoToken,
           user: existingUser
         });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'هذا البريد الإلكتروني مسجل بالفعل في النظام.' 
      });
    }

    // 5. إنشاء المستخدم الجديد
    const newUser = new User({
      full_name,
      email,
      phone, 
      password_hash: hashedPassword, 
      google_id, 
      role,
      city,
      address
    });

    await newUser.save();

    // 🔑 [تعديل ذكي]: توليد التوكن فوراً عشان يدخل علطول بدون ريكويست login منفصل
    const ecoToken = createEcoToken(newUser);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح ',
      token: ecoToken, //  التوكن هيطلع هنا علطول في الـ Register
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
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const google_id = payload.sub;

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

      user = await User.findOne({ email: inputEmail.toLowerCase() });
      if (!user) {
        return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      if (!user.password_hash) {
        return res.status(400).json({ 
          success: false, 
          message: 'هذا الحساب مسجل عبر جوجل، يرجى الضغط على زر الدخول بواسطة جوجل.' 
        });
      }

      const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordCorrect) {
        return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }
    }

    // 3. ميزة الأمان لتصميم EcoLink: فحص حالة الحساب (Status)
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'تم حظر هذا الحساب من قبل الإدارة.' });
    }
    
    // 4. إنشاء الـ JWT Token الخاص بـ EcoLink
    const ecoToken = createEcoToken(user);

    // 5. إرسال الاستجابة بنجاح
    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح ',
      token: ecoToken, 
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
    console.error("Login Error Details:", error); 
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء عملية تسجيل الدخول',
      error: error.message 
    });
  }
};

// التعديل في getProfile:
export const getProfile = async (req, res) => {
  try {
    // نستخدم -password_hash بدلاً من -password
    const user = await User.findById(req.user.id).select('-password_hash'); 
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    // نحدد فقط الحقول المسموح للمستخدم بتعديلها
    const { full_name, phone, city, address } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { full_name, phone, city, address } }, 
      { new: true }
    ).select('-password_hash');
    
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'خطأ في التعديل' });
  }
};