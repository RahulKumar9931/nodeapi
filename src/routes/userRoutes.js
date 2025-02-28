const express = require('express');
const authenticateToken = require('../middleware/authMiddleware'); // Ensure this path is correct
const {
    sendOTP,
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController'); // Ensure this path is correct

const router = express.Router();
router.post('/send_otp', sendOTP);
router.get('/', getAllUsers);
router.get('/:id', authenticateToken, getUserById);
router.post('/user_signup', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
