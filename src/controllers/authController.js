import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Verification from '../models/userVerification.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createEcoToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'EcoLinkBackEndSecretKey2026@#$!', 
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

export const signup = async (req, res) => {
  try {
    const { role, city, address, phone, password, token } = req.body;
    let full_name = req.body.full_name;
    let email = req.body.email ? req.body.email.toLowerCase() : null;
    let google_id = undefined;
    let hashedPassword = null; // تهيئة آمنة

    const files = req.files || {};
    const fileKeys = Object.keys(files).filter(key => files[key] && files[key].length > 0);

    const hasNationalId = files.nationalIdDoc || files.idFile;
    if (!hasNationalId) {
      return res.status(400).json({ success: false, message: "National ID image is required." });
    }

    const extraFileKeys = fileKeys.filter(key => key !== 'nationalIdDoc' && key !== 'idFile');
    if (extraFileKeys.length > 0 || (files.nationalIdDoc && files.nationalIdDoc.length > 1) || (files.idFile && files.idFile.length > 1)) {
      return res.status(400).json({ success: false, message: "Only one National ID image is allowed. Multiple uploads are rejected." });
    }

    const nationalIdDocPath = files.nationalIdDoc ? files.nationalIdDoc[0].path : files.idFile[0].path;
    const companyRegisterDocPath = null;
    const taxCertificateDocPath = null;
    const profileImagePath = null;

    if (role === 'Admin') {
      return res.status(403).json({ success: false, message: 'غير مسموح بإنشاء حسابات إدارة.' });
    }

    if (token) {
      const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      google_id = payload.sub;
      email = payload.email.toLowerCase();
      full_name = payload.name;
    } else {
      if (!email || !password || !full_name) {
        return res.status(400).json({ success: false, message: 'يرجى إكمال البيانات المطلوبة.' });
      }

      // شرط كلمة المرور: 8 خانات، تشمل حروفاً وأرقاماً
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
          success: false, 
          message: 'كلمة المرور ضعيفة. يجب أن تتكون من 8 خانات على الأقل وتتضمن حروفاً وأرقاماً.' 
        });
      }

      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'عذراً، هذا البريد الإلكتروني مسجل مسبقاً.' });
    }

    const newUser = new User({
      full_name,
      email,
      phone, 
      password_hash: hashedPassword, 
      google_id, 
      role,
      city,
      address,
      id_card_path: nationalIdDocPath,
      national_id_doc: nationalIdDocPath,
      company_register_doc: companyRegisterDocPath,
      tax_certificate_doc: taxCertificateDocPath,
      profile_image: profileImagePath,
      verification_status: 'pending',
      is_verified: false
    });

    await newUser.save();

    const newVerification = new Verification({
      user: newUser._id,
      nationalIdNumber: phone || 'N/A',
      idImage: nationalIdDocPath || 'N/A',
      companyRegisterDoc: companyRegisterDocPath,
      taxCertificateDoc: taxCertificateDocPath,
      profileImage: profileImagePath,
      reviewStatus: 'pending',
      submittedAt: new Date()
    });
    await newVerification.save();

    const ecoToken = createEcoToken(newUser);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      token: ecoToken,
      user: { 
        id: newUser._id, 
        full_name: newUser.full_name, 
        email: newUser.email, 
        role: newUser.role,
        is_verified: newUser.is_verified,
        verification_status: newUser.verification_status,
        id_card_path: newUser.id_card_path,
        national_id_doc: newUser.national_id_doc,
        company_register_doc: newUser.company_register_doc,
        tax_certificate_doc: newUser.tax_certificate_doc,
        profile_image: newUser.profile_image
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ أثناء التسجيل', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email: inputEmail, password, token } = req.body;
    let user = null;

    if (token) {
        // ... منطق جوجل
    } else {
        if (!inputEmail || !password) return res.status(400).json({ success: false, message: 'البيانات ناقصة' });
        user = await User.findOne({ email: inputEmail.toLowerCase() });
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ success: false, message: 'البريد أو كلمة المرور غير صحيحة' });
        }
    }

    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'الحساب محظور' });

    const ecoToken = createEcoToken(user);
    res.status(200).json({ success: true, token: ecoToken, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الدخول', error: error.message });
  }
};

export const getProfile = async (req, res) => {
    const user = await User.findById(req.user.id).select('-password_hash');
    res.status(200).json(user);
};

export const updateProfile = async (req, res) => {
    const { full_name, phone, city, address } = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.user.id, { $set: { full_name, phone, city, address } }, { new: true }).select('-password_hash');
    res.status(200).json(updatedUser);
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

  // إنشاء كود عشوائي
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // حفظ الكود في قاعدة البيانات مع وقت انتهاء (10 دقائق)
  user.resetPasswordToken = resetCode;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  // إرسال الإيميل
  const transporter = nodemailer.createTransport({
    service: 'gmail', // أو استخدمي خدمة SMTP الخاصة بكِ
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "كود إعادة تعيين كلمة المرور",
    text: `كود التحقق الخاص بك هو: ${resetCode}`
  });

  res.status(200).json({ message: "تم إرسال الكود إلى بريدك الإلكتروني" });
};

// 2. إعادة تعيين كلمة المرور
export const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = await User.findOne({ 
    email, 
    resetPasswordToken: code, 
    resetPasswordExpire: { $gt: Date.now() } 
  });

  if (!user) return res.status(400).json({ message: "الكود غير صحيح أو انتهت صلاحيته" });

  const salt = await bcrypt.genSalt(10);
  user.password_hash = await bcrypt.hash(newPassword, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({ message: "تم تغيير كلمة المرور بنجاح" });
};

export const submitVerification = async (req, res) => {
  try {
    const files = req.files || {};
    const fileKeys = Object.keys(files).filter(key => files[key] && files[key].length > 0);

    const hasNationalId = files.nationalIdDoc || files.idFile;
    if (!hasNationalId) {
      return res.status(400).json({ success: false, message: "National ID image is required." });
    }

    const allowedKeys = ['nationalIdDoc', 'idFile', 'companyRegisterDoc', 'taxCertificateDoc', 'profileImage'];
    const extraFileKeys = fileKeys.filter(key => !allowedKeys.includes(key));
    if (extraFileKeys.length > 0 || (files.nationalIdDoc && files.nationalIdDoc.length > 1) || (files.idFile && files.idFile.length > 1)) {
      return res.status(400).json({ success: false, message: "Only one National ID image is allowed. Multiple uploads are rejected." });
    }

    const nationalIdDocPath = files.nationalIdDoc ? files.nationalIdDoc[0].path : files.idFile[0].path;
    const companyRegisterDocPath = null;
    const taxCertificateDocPath = null;
    const profileImagePath = null;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "المستخدم غير موجود." });
    }

    if (nationalIdDocPath) {
      user.id_card_path = nationalIdDocPath;
      user.national_id_doc = nationalIdDocPath;
    }
    if (companyRegisterDocPath) {
      user.company_register_doc = companyRegisterDocPath;
    }
    if (taxCertificateDocPath) {
      user.tax_certificate_doc = taxCertificateDocPath;
    }
    if (profileImagePath) {
      user.profile_image = profileImagePath;
    }

    user.verification_status = 'pending';
    user.is_verified = false;
    await user.save();

    let verification = await Verification.findOne({ user: user._id, reviewStatus: 'pending' });
    if (!verification) {
      verification = new Verification({
        user: user._id,
        reviewStatus: 'pending',
        submittedAt: new Date()
      });
    }

    if (nationalIdDocPath) verification.idImage = nationalIdDocPath;
    if (companyRegisterDocPath) verification.companyRegisterDoc = companyRegisterDocPath;
    if (taxCertificateDocPath) verification.taxCertificateDoc = taxCertificateDocPath;
    if (profileImagePath) verification.profileImage = profileImagePath;
    verification.nationalIdNumber = user.phone || 'N/A';
    
    await verification.save();

    res.status(200).json({
      success: true,
      message: "تم تقديم طلب التحقق بنجاح.",
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};