import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Verification from '../models/userVerification.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { uploadBufferToCloudinary } from '../services/cloudinaryService.js';

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
      return res.status(400).json({ success: false, message: req.t ? req.t("auth.signup.idRequired") : "National ID image is required." });
    }

    const extraFileKeys = fileKeys.filter(key => key !== 'nationalIdDoc' && key !== 'idFile');
    if (extraFileKeys.length > 0 || (files.nationalIdDoc && files.nationalIdDoc.length > 1) || (files.idFile && files.idFile.length > 1)) {
      return res.status(400).json({ success: false, message: req.t ? req.t("auth.signup.onlyOneIdAllowed") : "Only one National ID image is allowed. Multiple uploads are rejected." });
    }

    const nationalIdFile = files.nationalIdDoc ? files.nationalIdDoc[0] : files.idFile[0];
    const uploadResult = await uploadBufferToCloudinary(nationalIdFile.buffer, 'ecolink/verifications');
    const nationalIdDocPath = uploadResult.secure_url;
    const companyRegisterDocPath = null;
    const taxCertificateDocPath = null;
    const profileImagePath = null;

    if (role === 'Admin') {
      return res.status(403).json({ success: false, message: req.t ? req.t("auth.signup.adminCreationDenied") : 'غير مسموح بإنشاء حسابات إدارة.' });
    }

    if (token) {
      const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      google_id = payload.sub;
      email = payload.email.toLowerCase();
      full_name = payload.name;
    } else {
      if (!email || !password || !full_name) {
        return res.status(400).json({ success: false, message: req.t ? req.t("auth.signup.missingFields") : 'يرجى إكمال البيانات المطلوبة.' });
      }

      // شرط كلمة المرور: 8 خانات، تشمل حروفاً وأرقاماً
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
          success: false, 
          message: req.t ? req.t("auth.signup.weakPassword") : 'كلمة المرور ضعيفة. يجب أن تتكون من 8 خانات على الأقل وتتضمن حروفاً وأرقاماً.' 
        });
      }

      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: req.t ? req.t("auth.signup.emailExists") : 'عذراً، هذا البريد الإلكتروني مسجل مسبقاً.' });
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
      message: req.t ? req.t("auth.signup.success") : 'تم إنشاء الحساب بنجاح',
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
    res.status(500).json({ success: false, message: req.t ? req.t("auth.signup.error") : 'خطأ أثناء التسجيل', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email: inputEmail, password, token } = req.body;
    let user = null;

    if (token) {
      try {
        const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const google_id = payload.sub;
        const email = payload.email.toLowerCase();

        user = await User.findOne({ $or: [{ google_id }, { email }] });
        if (!user) {
          user = new User({
            full_name: payload.name || 'Google User',
            email: email,
            google_id: google_id,
            role: 'Buyer',
            phone: 'N/A',
            city: 'N/A',
            address: 'N/A',
            is_verified: true,
            verification_status: 'approved'
          });
          await user.save();

          const newVerification = new Verification({
            user: user._id,
            nationalIdNumber: 'N/A',
            idImage: 'N/A',
            reviewStatus: 'approved',
            submittedAt: new Date()
          });
          await newVerification.save();
        } else if (!user.google_id) {
          user.google_id = google_id;
          await user.save();
        }
      } catch (err) {
        return res.status(401).json({ success: false, message: req.t ? req.t("auth.login.invalidGoogleToken") : 'رمز جوجل غير صالح', error: err.message });
      }
    } else {
        if (!inputEmail || !password) return res.status(400).json({ success: false, message: req.t ? req.t("login.errorRequiredFields") : 'البيانات ناقصة' });
        user = await User.findOne({ email: inputEmail.toLowerCase() });
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ success: false, message: req.t ? req.t("auth.login.invalidCredentials") : 'البريد أو كلمة المرور غير صحيحة' });
        }
    }

    if (user.status === 'suspended') return res.status(403).json({ success: false, message: req.t ? req.t("auth.login.suspended") : 'الحساب محظور' });

    const ecoToken = createEcoToken(user);
    res.status(200).json({ success: true, token: ecoToken, user });
  } catch (error) {
    res.status(500).json({ success: false, message: req.t ? req.t("auth.login.error") : 'خطأ في تسجيل الدخول', error: error.message });
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
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: req.t ? req.t("auth.forgot.emailRequired") : "Email is required" });
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: req.t ? req.t("user.notFound") : "User not found" });

    // Generate secure random 6-digit code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    
    // Hash the token using sha256 before saving to database
    const hashedToken = crypto.createHash('sha256').update(resetCode).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    await user.save();

    // Check if nodemailer settings are present
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "EcoLink Password Recovery Code",
        text: `Your password recovery verification code is: ${resetCode}\nThis code is valid for 10 minutes.`
      });
    } else {
      console.warn(`[Nodemailer Simulation] Password recovery requested for ${email}. Reset code is: ${resetCode}`);
    }

    res.status(200).json({ message: req.t ? req.t("auth.forgot.codeSent") : "Verification code sent to your email!" });
  } catch (error) {
    res.status(500).json({ message: req.t ? req.t("auth.forgot.error") : "Failed to process forgot password request", error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: req.t ? req.t("auth.reset.allFieldsRequired") : "All fields are required" });
    }

    // Hash the incoming code to look it up in DB
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const user = await User.findOne({ 
      email: email.toLowerCase(), 
      resetPasswordToken: hashedCode, 
      resetPasswordExpire: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ message: req.t ? req.t("auth.reset.invalidCode") : "Invalid code or code has expired" });

    // Password validation regex
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: req.t ? req.t("auth.reset.weakPassword") : 'Password must be at least 8 characters long and contain both letters and numbers.' 
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    
    // Invalidate token to prevent reuse
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: req.t ? req.t("auth.reset.success") : "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password", error: error.message });
  }
};

export const submitVerification = async (req, res) => {
  try {
    const files = req.files || {};
    const fileKeys = Object.keys(files).filter(key => files[key] && files[key].length > 0);

    const hasNationalId = files.nationalIdDoc || files.idFile;
    if (!hasNationalId) {
      return res.status(400).json({ success: false, message: req.t ? req.t("auth.signup.idRequired") : "National ID image is required." });
    }

    const allowedKeys = ['nationalIdDoc', 'idFile', 'companyRegisterDoc', 'taxCertificateDoc', 'profileImage'];
    const extraFileKeys = fileKeys.filter(key => !allowedKeys.includes(key));
    if (extraFileKeys.length > 0 || (files.nationalIdDoc && files.nationalIdDoc.length > 1) || (files.idFile && files.idFile.length > 1)) {
      return res.status(400).json({ success: false, message: req.t ? req.t("auth.signup.onlyOneIdAllowed") : "Only one National ID image is allowed. Multiple uploads are rejected." });
    }

    const nationalIdFile = files.nationalIdDoc ? files.nationalIdDoc[0] : files.idFile[0];
    const nationalIdUpload = await uploadBufferToCloudinary(nationalIdFile.buffer, 'ecolink/verifications');
    const nationalIdDocPath = nationalIdUpload.secure_url;

    let companyRegisterDocPath = null;
    if (files.companyRegisterDoc && files.companyRegisterDoc.length > 0) {
      const result = await uploadBufferToCloudinary(files.companyRegisterDoc[0].buffer, 'ecolink/verifications');
      companyRegisterDocPath = result.secure_url;
    }

    let taxCertificateDocPath = null;
    if (files.taxCertificateDoc && files.taxCertificateDoc.length > 0) {
      const result = await uploadBufferToCloudinary(files.taxCertificateDoc[0].buffer, 'ecolink/verifications');
      taxCertificateDocPath = result.secure_url;
    }

    let profileImagePath = null;
    if (files.profileImage && files.profileImage.length > 0) {
      const result = await uploadBufferToCloudinary(files.profileImage[0].buffer, 'ecolink/avatars');
      profileImagePath = result.secure_url;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: req.t ? req.t("user.notFound") : "المستخدم غير موجود." });
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
      message: req.t ? req.t("auth.verification.submitted") : "تم تقديم طلب التحقق بنجاح.",
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};