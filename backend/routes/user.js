/**
 * YTECH - Routes Utilisateur
 * Gestion des routes utilisateur securisees
 */

const express = require('express');
const { authenticateRequest } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticateRequest, async (req, res) => {
  return res.json({
    success: true,
    user: req.user.details
  });
});

module.exports = router;
