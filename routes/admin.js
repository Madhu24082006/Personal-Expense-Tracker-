const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ role: 'user' });
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const transactions = await Transaction.find();
        
        const totalTransactions = transactions.length;
        
        let totalIncome = 0;
        let totalExpense = 0;
        
        transactions.forEach(t => {
            if (t.amount > 0) totalIncome += t.amount;
            else totalExpense += Math.abs(t.amount);
        });
        
        res.status(200).json({ 
            success: true, 
            data: { 
                totalUsers, 
                totalTransactions, 
                totalIncome, 
                totalExpense 
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        await user.deleteOne();
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   GET /api/admin/users/:id/transactions
router.get('/users/:id/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.params.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;
