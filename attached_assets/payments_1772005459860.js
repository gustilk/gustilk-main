const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

const PREMIUM_PRICE_USD = 999; // $9.99 in cents
const PREMIUM_PRICE_IQD = 13000; // ~$10 in Iraqi Dinar

// ── STRIPE (USD/EUR - Western users) ──────────────────────────────
router.post('/stripe/create-intent', authenticate, async (req, res) => {
  try {
    const { currency = 'usd' } = req.body;
    const user = (await db.collection('users').doc(req.user.uid).get()).data();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: PREMIUM_PRICE_USD,
      currency,
      metadata: { userId: req.user.uid, email: user.email, plan: 'premium_monthly' },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook - handle successful payments
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const { userId } = event.data.object.metadata;
    const premiumUntil = new Date();
    premiumUntil.setMonth(premiumUntil.getMonth() + 1);

    await db.collection('users').doc(userId).update({
      isPremium: true,
      premiumUntil: premiumUntil.toISOString(),
      premiumProvider: 'stripe',
    });

    await db.collection('payments').add({
      userId,
      provider: 'stripe',
      amount: PREMIUM_PRICE_USD,
      currency: 'usd',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });
  }

  res.json({ received: true });
});

// ── ZAINCASH (Iraq) ────────────────────────────────────────────────
router.post('/zaincash/initiate', authenticate, async (req, res) => {
  try {
    const user = (await db.collection('users').doc(req.user.uid).get()).data();

    const payload = {
      merchantId: process.env.ZAINCASH_MERCHANT_ID,
      amount: PREMIUM_PRICE_IQD,
      serviceType: 'YeziMatch Premium',
      msisdn: req.body.phoneNumber, // User's Iraqi phone number
      orderId: `YEZID_${req.user.uid}_${Date.now()}`,
      redirectUrl: `${process.env.CLIENT_URL}/payment/zaincash/callback`,
    };

    // ZainCash requires HMAC signature
    const crypto = require('crypto');
    const dataToSign = `${payload.merchantId}${payload.amount}${payload.orderId}${process.env.ZAINCASH_SECRET}`;
    payload.signature = crypto.createHash('sha256').update(dataToSign).digest('hex');

    const response = await axios.post(process.env.ZAINCASH_API_URL, payload);

    // Store pending payment
    await db.collection('payments').add({
      userId: req.user.uid,
      provider: 'zaincash',
      orderId: payload.orderId,
      amount: PREMIUM_PRICE_IQD,
      currency: 'iqd',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    res.json({ paymentUrl: response.data.paymentUrl, orderId: payload.orderId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ZainCash callback
router.post('/zaincash/callback', async (req, res) => {
  try {
    const { orderId, status, transactionId } = req.body;

    if (status === 'success') {
      // Find pending payment
      const paymentSnap = await db.collection('payments')
        .where('orderId', '==', orderId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (!paymentSnap.empty) {
        const payment = paymentSnap.docs[0];
        const userId = payment.data().userId;

        await payment.ref.update({ status: 'succeeded', transactionId });

        const premiumUntil = new Date();
        premiumUntil.setMonth(premiumUntil.getMonth() + 1);

        await db.collection('users').doc(userId).update({
          isPremium: true,
          premiumUntil: premiumUntil.toISOString(),
          premiumProvider: 'zaincash',
        });
      }
    }

    res.redirect(`${process.env.CLIENT_URL}/payment/${status}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── FASTPAY (Iraq) ─────────────────────────────────────────────────
router.post('/fastpay/initiate', authenticate, async (req, res) => {
  try {
    const orderId = `YEZID_FP_${req.user.uid}_${Date.now()}`;

    const payload = {
      api_key: process.env.FASTPAY_API_KEY,
      currency: 'IQD',
      amount: PREMIUM_PRICE_IQD,
      order_id: orderId,
      customer_name: req.body.name,
      customer_phone: req.body.phoneNumber,
      success_url: `${process.env.CLIENT_URL}/payment/success`,
      failure_url: `${process.env.CLIENT_URL}/payment/failed`,
      notification_url: `${process.env.CLIENT_URL?.replace('3000', '5000')}/api/payments/fastpay/webhook`,
    };

    const response = await axios.post(`${process.env.FASTPAY_API_URL}/charge`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    await db.collection('payments').add({
      userId: req.user.uid,
      provider: 'fastpay',
      orderId,
      amount: PREMIUM_PRICE_IQD,
      currency: 'iqd',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    res.json({ paymentUrl: response.data.payment_url, orderId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FastPay webhook
router.post('/fastpay/webhook', async (req, res) => {
  try {
    const { order_id, status } = req.body;

    if (status === 'SUCCESS') {
      const paymentSnap = await db.collection('payments')
        .where('orderId', '==', order_id)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (!paymentSnap.empty) {
        const payment = paymentSnap.docs[0];
        await payment.ref.update({ status: 'succeeded' });

        const premiumUntil = new Date();
        premiumUntil.setMonth(premiumUntil.getMonth() + 1);

        await db.collection('users').doc(payment.data().userId).update({
          isPremium: true,
          premiumUntil: premiumUntil.toISOString(),
          premiumProvider: 'fastpay',
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const snapshot = await db.collection('payments')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel premium / get subscription status
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = (await db.collection('users').doc(req.user.uid).get()).data();
    const isPremiumActive = user.isPremium && new Date(user.premiumUntil) > new Date();

    res.json({
      isPremium: isPremiumActive,
      premiumUntil: user.premiumUntil || null,
      premiumProvider: user.premiumProvider || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
