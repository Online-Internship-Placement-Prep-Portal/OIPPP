const express = require('express');
const Joi = require('joi');
const { authenticate, allow } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const AppError = require('../../utils/AppError');
const { TOPICS, DIFFICULTIES } = require('./schema.helpers');
const service = require('./aptitude.service');
const router = express.Router();
const objectId = Joi.string().hex().length(24).lowercase();
const idParam = Joi.object({ id: objectId.required() });
const version = Joi.number().integer().min(0);
const pageFields = { page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(50).default(20) };
const questionFields = { text: Joi.string().trim().max(4000), topic: Joi.string().valid(...TOPICS),
  difficulty: Joi.string().valid(...DIFFICULTIES), options: Joi.array().items(Joi.string().trim().max(1000)).min(2).max(6).unique(),
  answerIdx: Joi.number().integer().min(0).max(5) };
const testFields = { title: Joi.string().trim().max(200), durationMin: Joi.number().integer().min(10).max(120),
  questionIds: Joi.array().items(objectId.required()).min(5).max(60).unique() };
const requiredFields = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.required()]));
const wrap = (fn) => (req, res, next) => fn(req, res).catch((err) => {
  if (err.name === 'ValidationError') return next(new AppError(400, 'VALIDATION', err.message));
  if (err.name === 'VersionError') return next(new AppError(409, 'STALE_VERSION', 'Reload before retrying'));
  return next(err);
});
router.use(['/questions', '/tests', '/attempts'], authenticate);
router.post('/questions', allow('ADMIN'), validate(Joi.object(requiredFields(questionFields))),
  wrap(async (req, res) => res.status(201).json(await service.createQuestion(req.user.id, req.body))));
router.get('/questions', allow('ADMIN'), validate(Joi.object({ ...pageFields,
  topic: questionFields.topic, difficulty: questionFields.difficulty, archived: Joi.boolean().default(false) }), 'query'),
wrap(async (req, res) => res.json(await service.listQuestions(req.query))));
router.patch('/questions/:id', allow('ADMIN'), validate(idParam, 'params'),
  validate(Joi.object({ ...questionFields, archived: Joi.boolean(), version: version.required() }).min(2)),
  wrap(async (req, res) => res.json(await service.updateQuestion(req.params.id, req.body))));
router.post('/tests', allow('ADMIN'), validate(Joi.object(requiredFields(testFields))),
  wrap(async (req, res) => res.status(201).json(await service.createTest(req.user.id, req.body))));
router.get('/tests', allow('ADMIN', 'STUDENT'), validate(Joi.object({ ...pageFields,
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'ARCHIVED') }), 'query'),
wrap(async (req, res) => res.json(await service.listTests(req.user.role, req.query))));
router.get('/tests/:id', allow('ADMIN', 'STUDENT'), validate(idParam, 'params'),
  wrap(async (req, res) => res.json(await service.getTest(req.user.role, req.params.id))));
router.patch('/tests/:id', allow('ADMIN'), validate(idParam, 'params'),
  validate(Joi.object({ ...testFields, version: version.required(), status: Joi.string().valid('DRAFT', 'PUBLISHED', 'ARCHIVED') }).min(2)),
  wrap(async (req, res) => res.json(await service.updateTest(req.params.id, req.body))));
router.post('/tests/:id/attempts', allow('STUDENT'), validate(idParam, 'params'), validate(Joi.object({})),
  wrap(async (req, res) => {
    const { created, ...view } = await service.startAttempt(req.user.id, req.params.id);
    res.status(created ? 201 : 200).json(view);
  }));
router.get('/attempts/:id', allow('STUDENT'), validate(idParam, 'params'),
  wrap(async (req, res) => res.json(await service.getAttempt(req.user.id, req.params.id))));
router.patch('/attempts/:id/answers', allow('STUDENT'), validate(idParam, 'params'),
  validate(Joi.object({ questionId: objectId.required(), optionIdx: Joi.number().integer().min(0).max(5).required(), version })),
  wrap(async (req, res) => { await service.saveAnswer(req.user.id, req.params.id, req.body); res.sendStatus(204); }));
router.post('/attempts/:id/submit', allow('STUDENT'), validate(idParam, 'params'), validate(Joi.object({})),
  wrap(async (req, res) => res.json(service.publicResult(await service.finalize(req.user.id, req.params.id)))));
router.get('/attempts/:id/result', allow('STUDENT'), validate(idParam, 'params'),
  wrap(async (req, res) => res.json(service.publicResult(await service.getResult(req.user.id, req.params.id)))));
module.exports = router;
