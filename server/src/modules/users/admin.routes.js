
const express = require('express');
const Joi = require('joi');

const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const service = require('./admin.service');

const router = express.Router();

const idParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// Approve a recruiter.
router.patch(
  '/admin/recruiters/:id/approve',
  authenticate,
  allow('ADMIN'),
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const recruiter = await service.approveRecruiter(
      req.user.id,
      req.params.id,
    );

    res.json({ user: recruiter });
  }),
);

// Deactivate a user.
router.patch(
  '/admin/users/:id/deactivate',
  authenticate,
  allow('ADMIN'),
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const user = await service.deactivateUser(req.user.id, req.params.id);

    res.json({ user });
  }),
);

// Download a student's current resume. Only admins can access this route.
router.get(
  '/admin/users/:id/resume',
  authenticate,
  allow('ADMIN'),
  validate(idParam, 'params'),
  wrap(async (req, res) => {
    const stream = await service.getStudentResume(req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="resume.pdf"',
    );

    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(404).json({
          error: {
            code: 'RESUME_NOT_FOUND',
            message: 'Resume file not found',
          },
        });
      } else {
        res.destroy(err);
      }
    });

    stream.pipe(res);
  }),
);

module.exports = router;
