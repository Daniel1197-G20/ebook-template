const express = require('express');
const paymentService = require('../services/paymentService');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { z } = require('zod');

const router = express.Router();

const initializeSchema = z.object({
  body: z.object({
    bookIds: z.array(z.string().min(1, 'Book ID cannot be empty')).min(1, 'At least one book must be selected'),
  }),
});

router.post('/initialize', protect, validate(initializeSchema), asyncHandler(async (req, res) => {
  const result = await paymentService.initializePayment(req.user.id, req.body);
  success(res, result, 'Payment initialized');
}));

router.get('/verify/:reference', protect, asyncHandler(async (req, res) => {
  const requestingUserId = req.user.role === 'ADMIN' ? null : req.user.id;
  const result = await paymentService.confirmPayment(req.params.reference, requestingUserId);
  success(res, result, 'Payment verified');
}));

// Webhook — public entry, Paystack HMAC SHA512 signature verified
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  await paymentService.handleWebhook(req.body, signature, req.rawBody);
  res.status(200).send('OK');
}));

module.exports = router;
