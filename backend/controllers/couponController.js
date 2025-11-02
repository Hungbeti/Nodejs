// backend/controllers/couponController.js
const Coupon = require('../models/Coupon');

const validateCoupon = async (req, res) => {
  const { code } = req.params;
  try {
    const coupon = await Coupon.findOne({ code });
    if (coupon && coupon.uses < coupon.maxUses) {
      res.json({
        valid: true,
        discount: coupon.discount,
        usesLeft: coupon.maxUses - coupon.uses
      });
    } else {
      res.json({ valid: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const applyCoupon = async (req, res) => {
  const { code, total } = req.body;
  try {
    const coupon = await Coupon.findOne({ code });
    if (coupon && coupon.uses < coupon.maxUses) {
      res.json({
        applied: true,
        newTotal: total - coupon.discount,
        discount: coupon.discount
      });
    } else {
      res.json({ applied: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { validateCoupon, applyCoupon };