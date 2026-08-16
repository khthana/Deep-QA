//route/user.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const multer = require('multer');
const path = require('path');
const { verifyToken } = require("../middleware/authMiddleware"); 
const uploads = require('../middleware/evidenceUpload');



router.post('/get-user-list', verifyToken, userController.getAllUsers);
router.post('/add_user', verifyToken, userController.addUser);
router.post('/update_user', verifyToken, userController.updateUser);
// router.post('/delete_user', verifyToken, userController.deleteUser);
router.post('/get-teacher-in-department', verifyToken, userController.getTeacherByDepartmentId);
router.post('/swap-status', verifyToken, userController.swapStatusController);
router.get('/log',verifyToken,userController.getUserLogs);


const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});


router.post('/import-users', verifyToken, upload.single('file'), userController.importUsers);
router.post('/change-password', verifyToken, userController.changePassword);
router.post(
  '/upload-profile-image',
  verifyToken,
  uploads.single('image'),
  userController.uploadProfileImage
);

router.get('/profile', verifyToken, userController.getProfile);
router.delete('/delete/:user_id', userController.deleteUser);

module.exports = router;

