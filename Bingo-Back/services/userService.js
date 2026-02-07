const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const WalletService = require('./walletService');
const mongoose = require('mongoose');

// Helper to ensure MongoDB connection is ready
async function ensureConnection(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        if (mongoose.connection.readyState === 1) {
            return true; // Connected
        }
        if (i < retries - 1) {
            console.log(`⏳ MongoDB not ready, waiting ${delay}ms before retry ${i + 1}/${retries}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
    throw new Error('MongoDB connection not ready after retries');
}

// Helper to retry database operations
async function retryOperation(operation, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            await ensureConnection();
            return await operation();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.log(`⚠️ Database operation failed, retrying ${i + 1}/${retries}...`, error.message);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
}

class UserService {
    // Create or update user from Telegram data
    static async createOrUpdateUser(telegramUser, phone = null) {
        try {
            const existingUser = await retryOperation(async () => {
                return await User.findOne({ telegramId: String(telegramUser.id) });
            });

            if (existingUser) {
                // Update existing user
                existingUser.firstName = telegramUser.first_name || existingUser.firstName;
                existingUser.lastName = telegramUser.last_name || existingUser.lastName;
                existingUser.username = telegramUser.username || existingUser.username;
                existingUser.lastActive = new Date();

                if (phone && !existingUser.phone) {
                    existingUser.phone = phone;
                    existingUser.isRegistered = true;
                }

                await retryOperation(async () => {
                    return await existingUser.save();
                });
                return existingUser;
            } else {
                // Create new user
                const newUser = new User({
                    telegramId: String(telegramUser.id),
                    firstName: telegramUser.first_name || 'User',
                    lastName: telegramUser.last_name || '',
                    username: telegramUser.username || '',
                    phone: phone,
                    isRegistered: !!phone,
                    registrationDate: new Date(),
                    lastActive: new Date()
                });

                await retryOperation(async () => {
                    return await newUser.save();
                });

                console.log('User saved successfully:', {
                    telegramId: newUser.telegramId,
                    userId: newUser._id.toString(),
                    hasObjectId: !!newUser._id
                });

                // Create wallet for new user
                await this.createWallet(newUser._id);

                return newUser;
            }
        } catch (error) {
            console.error('Error creating/updating user:', error);
            throw error;
        }
    }

    // Create wallet for user
    static async createWallet(userId) {
        try {
            const existingWallet = await Wallet.findOne({ userId });
            if (existingWallet) {
                return existingWallet;
            }

            const newWallet = new Wallet({
                userId,
                balance: 0,
                coins: 0,
                gamesWon: 0
            });

            await newWallet.save();
            return newWallet;
        } catch (error) {
            console.error('Error creating wallet:', error);
            throw error;
        }
    }

    // Get user by Telegram ID
    static async getUserByTelegramId(telegramId) {
        try {
            return await retryOperation(async () => {
                return await User.findOne({ telegramId: String(telegramId) });
            });
        } catch (error) {
            console.error('Error getting user by Telegram ID:', error);
            throw error;
        }
    }

    // Get user with wallet
    static async getUserWithWallet(telegramId) {
        try {
            const user = await User.findOne({ telegramId: String(telegramId) });
            if (!user) return null;

            const wallet = await Wallet.findOne({ userId: user._id });
            return { user, wallet };
        } catch (error) {
            console.error('Error getting user with wallet:', error);
            throw error;
        }
    }

    // Get user with wallet by database _id
    static async getUserWithWalletById(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) return null;

            const wallet = await Wallet.findOne({ userId: user._id });
            return { user, wallet };
        } catch (error) {
            console.error('Error getting user with wallet by id:', error);
            throw error;
        }
    }

    // Get user by database _id
    static async getUserById(userId) {
        try {
            return await User.findById(userId);
        } catch (error) {
            console.error('Error getting user by id:', error);
            throw error;
        }
    }

    // Update user phone number
    static async updateUserPhone(telegramId, phone) {
        try {
            const user = await User.findOne({ telegramId: String(telegramId) });
            if (!user) return null;

            const isFirstRegistration = !user.phone && !user.isRegistered;
            
            user.phone = phone;
            user.isRegistered = true;
            await user.save();

            // Award welcome / referral bonuses only on first successful registration (first contact share)
            let welcomeBonusAmount = 0;
            let inviterRewardAmount = 0;
            let inviterRewarded = false;
            let inviterId = null;

            if (isFirstRegistration) {
                // Ensure wallet exists
                await WalletService.getWallet(user._id);

                // 1) Welcome bonus: +10 ETB to Play Wallet
                welcomeBonusAmount = 10;
                const welcomeResult = await WalletService.updateBalance(user._id, { play: welcomeBonusAmount });

                const welcomeTx = new Transaction({
                    userId: user._id,
                    type: 'registration_bonus',
                    amount: welcomeBonusAmount,
                    description: `Welcome bonus: ETB ${welcomeBonusAmount} added to play wallet`,
                    balanceBefore: welcomeResult.balanceBefore,
                    balanceAfter: welcomeResult.balanceAfter
                });
                await welcomeTx.save();

                // 2) Referral bonus: +1 ETB to inviter's Play Wallet (only if this user was invited)
                if (user.invitedBy) {
                    inviterId = user.invitedBy;
                    const inviter = await User.findById(inviterId);
                    if (inviter) {
                        inviterRewardAmount = 1;

                        await WalletService.getWallet(inviter._id);
                        const inviterResult = await WalletService.updateBalance(inviter._id, { play: inviterRewardAmount });

                        const inviterTx = new Transaction({
                            userId: inviter._id,
                            type: 'invite_reward',
                            amount: inviterRewardAmount,
                            description: `Referral bonus: ETB ${inviterRewardAmount} (added to play wallet) for inviting ${user.firstName || 'a friend'}`,
                            balanceBefore: inviterResult.balanceBefore,
                            balanceAfter: inviterResult.balanceAfter
                        });
                        await inviterTx.save();

                        // Update inviter stats (used by invite-stats/admin dashboards)
                        inviter.inviteRewards = (inviter.inviteRewards || 0) + inviterRewardAmount;

                        // Mark invite history as rewarded (best-effort)
                        const invitedUserIdStr = String(user._id);
                        if (Array.isArray(inviter.inviteHistory)) {
                            const entry = inviter.inviteHistory.find(e => String(e.invitedUserId) === invitedUserIdStr);
                            if (entry) {
                                entry.status = 'rewarded';
                                entry.rewardEarned = inviterRewardAmount;
                            }
                        }

                        await inviter.save();
                        inviterRewarded = true;
                    }
                }
            }

            return {
                user,
                isNewRegistration: isFirstRegistration,
                welcomeBonusAmount,
                inviterRewardAmount,
                inviterRewarded,
                inviterId
            };
        } catch (error) {
            console.error('Error updating user phone:', error);
            throw error;
        }
    }

    // Get user statistics
    static async getUserStats(telegramId) {
        try {
            const user = await User.findOne({ telegramId: String(telegramId) });
            if (!user) return null;

            const wallet = await Wallet.findOne({ userId: user._id });
            const totalTransactions = await Transaction.countDocuments({ userId: user._id });
            const totalDeposits = await Transaction.aggregate([
                { $match: { userId: user._id, type: 'deposit', status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            return {
                user,
                wallet,
                totalTransactions,
                totalDeposits: totalDeposits[0]?.total || 0
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }
}

module.exports = UserService;
