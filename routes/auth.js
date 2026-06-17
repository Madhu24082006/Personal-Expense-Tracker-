const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'user'
        });

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide an email and password' });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
});

// @route   PUT /api/auth/budget
router.put('/budget', protect, async (req, res) => {
    try {
        const { budget, month } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user.monthlyBudgets) user.monthlyBudgets = new Map();
        
        // Update both the specific month budget and the global default
        user.monthlyBudgets.set(month, budget);
        user.monthlyBudget = budget; 
        
        await user.save();
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// @route   PUT /api/auth/category-budget
// @desc    Update category-specific budget
router.put('/category-budget', protect, async (req, res) => {
    try {
        const { category, budget } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user.categoryBudgets) user.categoryBudgets = new Map();
        
        user.categoryBudgets.set(category, budget);
        await user.save();
        
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Helper to send JWT response
const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });

    res.status(statusCode).json({ success: true, token, role: user.role });
};

module.exports = router;
