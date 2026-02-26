const express = require('express');
const WalletService = require('../services/walletService');
const UserService = require('../services/userService');
const { authMiddleware } = require('./auth');

const router = express.Router();

// GET /wallet
router.get('/', authMiddleware, async (req, res) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    try {
        console.log(`💰 [${requestId}] Wallet fetch request:`, {
            userId: req.userId,
            timestamp: new Date().toISOString()
        });

        const user = await UserService.getUserById(req.userId);
        if (!user) {
            console.error(`❌ [${requestId}] Wallet fetch: User not found for userId:`, req.userId);
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        }

        console.log(`👤 [${requestId}] User found:`, {
            userId: user._id.toString(),
            telegramId: user.telegramId
        });

        const wallet = await WalletService.getWallet(user._id);
        if (!wallet) {
            console.error(`❌ [${requestId}] Wallet fetch: Wallet not found for userId:`, user._id);
            return res.status(404).json({ error: 'WALLET_NOT_FOUND' });
        }

        // Debug logging to verify wallet data
        console.log(`✅ [${requestId}] Wallet fetch success:`, {
            userId: user._id.toString(),
            telegramId: user.telegramId,
            walletMain: wallet.main,
            walletPlay: wallet.play,
            walletBalance: wallet.balance,
            walletRaw: {
                main: wallet.main,
                play: wallet.play,
                balance: wallet.balance
            }
        });

        // Unified wallet response with main/play structure
        // Use actual wallet values - if main/play are null/undefined, fall back to balance
        // But prioritize the actual field values if they exist (even if 0)
        const mainValue = (wallet.main !== null && wallet.main !== undefined) ? wallet.main : (wallet.balance ?? 0);
        const playValue = (wallet.play !== null && wallet.play !== undefined) ? wallet.play : 0;

        const response = {
            balance: wallet.balance ?? 0,
            main: mainValue,
            play: playValue,
            gamesWon: wallet.gamesWon ?? 0
        };

        console.log(`📤 [${requestId}] Sending wallet response:`, {
            main: response.main,
            play: response.play,
            balance: response.balance
        });

        res.json(response);
    } catch (error) {
        console.error(`❌ [${requestId}] Wallet fetch error:`, error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// POST /wallet/transfer
router.post('/transfer', authMiddleware, async (req, res) => {
    try {
        const { amount, direction } = req.body;
        const dbUserId = req.userId;

        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            return res.status(400).json({ error: 'INVALID_AMOUNT' });
        }

        if (!direction || !['main-to-play', 'play-to-main'].includes(direction)) {
            return res.status(400).json({ error: 'INVALID_DIRECTION' });
        }

        const user = await UserService.getUserById(dbUserId);
        if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

        const result = await WalletService.transferFunds(user._id, Number(amount), direction);
        return res.json({ wallet: result.wallet });
    } catch (error) {
        console.error('Transfer error:', error);
        if (error.message === 'Insufficient funds') {
            res.status(400).json({ error: 'INSUFFICIENT_FUNDS' });
        } else {
            res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
        }
    }
});

// GET /wallet/deposit-history
router.get('/deposit-history', authMiddleware, async (req, res) => {
    try {
        const dbUserId = req.userId;
        const user = await UserService.getUserById(dbUserId);
        if (!user) {
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        }
        const transactions = await WalletService.getTransactionHistory(user._id, 'deposit');
        res.json({ transactions });
    } catch (error) {
        console.error('Deposit history error:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// POST /wallet/withdraw
router.post('/withdraw', authMiddleware, async (req, res) => {
    try {
        const { amount, destination } = req.body;
        const dbUserId = req.userId;

        if (!amount || isNaN(amount) || amount < 50 || amount > 10000) {
            return res.status(400).json({ error: 'INVALID_AMOUNT' });
        }

        if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
            return res.status(400).json({ error: 'DESTINATION_REQUIRED' });
        }

        const user = await UserService.getUserById(dbUserId);
        if (!user) {
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        }

        const result = await WalletService.processWithdrawal(user._id, parseFloat(amount), destination.trim());
        if (!result.success) {
            return res.status(400).json({ 
                error: result.error,
                message: result.message || null
            });
        }

        res.json({
            success: true,
            transactionId: result.transactionId,
            message: 'Withdrawal request submitted for admin approval'
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

module.exports = router;
