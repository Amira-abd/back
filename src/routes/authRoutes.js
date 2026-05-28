import express from 'express';
import { signup , login} from '../controllers/authController.js';

let router = express.Router();

router.post('/signup', signup);

router.post('/login', login);

// // Add User
// router.post("/addNewUser", addNewUser)

// // Get byID
// router.get("/getUserById/:id", getUserById)

// // Get byName
// router.get("/getUserByName", getUserByName)


export default router;