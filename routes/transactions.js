const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

router.use(protect);

// @route   GET /api/transactions
// @desc    Get all transactions
router.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// @route   POST /api/transactions
// @desc    Add a transaction
router.post('/', async (req, res) => {
    try {
        const { text, amount, category } = req.body;
        req.body.user = req.user.id;
        const transaction = await Transaction.create(req.body);

        return res.status(201).json({
            success: true,
            data: transaction
        });
    } catch (err) {
        if(err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                error: messages
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Server Error'
            });
        }
    }
});

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
router.delete('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'No transaction found'
            });
        }

        // Make sure user owns transaction
        if (transaction.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized' });
        }

        await transaction.deleteOne();

        return res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// @route   PUT /api/transactions/:id
// @desc    Update transaction
router.put('/:id', async (req, res) => {
    try {
        let transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                error: 'No transaction found'
            });
        }

        // Make sure user owns transaction
        if (transaction.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ success: false, error: 'Not authorized' });
        }

        transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        return res.status(200).json({
            success: true,
            data: transaction
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
});

// @route   GET /api/transactions/summary
// @desc    Get monthly summary and predictions
router.get('/summary', async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: 1 });

        // Group by Month-Year
        const monthlyData = {};
        transactions.forEach(t => {
            const date = new Date(t.createdAt);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[key]) {
                monthlyData[key] = { income: 0, expense: 0, transactions: 0 };
            }
            
            if (t.amount > 0) {
                monthlyData[key].income += t.amount;
            } else {
                monthlyData[key].expense += Math.abs(t.amount);
            }
            monthlyData[key].transactions++;
        });

        // Prediction Logic
        const keys = Object.keys(monthlyData).sort();
        const last3Months = keys.slice(-3);
        
        let avgExpense = 0;
        let avgIncome = 0;
        let sumExpense = 0;
        let sumIncome = 0;
        
        if (last3Months.length > 0) {
            sumExpense = last3Months.reduce((acc, k) => acc + monthlyData[k].expense, 0);
            sumIncome = last3Months.reduce((acc, k) => acc + monthlyData[k].income, 0);
            avgExpense = sumExpense / last3Months.length;
            avgIncome = sumIncome / last3Months.length;
        }

        // 1. Current Month Projection
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        let currentMonthProjection = 0;
        if (monthlyData[currentKey] && monthlyData[currentKey].expense > 0) {
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const currentDay = now.getDate();
            const dailyRate = monthlyData[currentKey].expense / currentDay;
            currentMonthProjection = dailyRate * daysInMonth;
        } else {
            currentMonthProjection = avgExpense;
        }

        // 2. Upcoming 3 Months Predictions
        let trendFactor = 0;
        if (last3Months.length >= 2) {
            const lastMonthExp = monthlyData[last3Months[last3Months.length - 1]].expense;
            const prevMonthExp = monthlyData[last3Months[last3Months.length - 2]].expense;
            trendFactor = (lastMonthExp - prevMonthExp) * 0.1; // 10% weight to recent trend
        }

        const upcomingPredictions = [];
        for (let i = 1; i <= 3; i++) {
            const predDate = new Date(currentYear, currentMonth + i, 1);
            const predKey = `${predDate.getFullYear()}-${String(predDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Basic prediction: average + (trend * i)
            const predictedExpense = Math.max(0, avgExpense + (trendFactor * i));
            const predictedIncome = avgIncome; // Income is usually more stable

            upcomingPredictions.push({
                month: predKey,
                estimatedExpense: predictedExpense.toFixed(2),
                estimatedIncome: predictedIncome.toFixed(2),
                estimatedSavings: Math.max(0, predictedIncome - predictedExpense).toFixed(2)
            });
        }

        res.status(200).json({
            success: true,
            data: {
                monthlyData,
                prediction: {
                    currentMonthProjection: currentMonthProjection.toFixed(2),
                    upcoming: upcomingPredictions,
                    confidence: last3Months.length >= 3 ? 'High' : (last3Months.length > 0 ? 'Medium' : 'Low'),
                    analysis: {
                        averageExpense: avgExpense.toFixed(2),
                        trendFactor: trendFactor.toFixed(2),
                        lastMonthExpense: last3Months.length > 0 ? monthlyData[last3Months[last3Months.length-1]].expense.toFixed(2) : 0
                    }
                }
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;
