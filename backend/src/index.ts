import express, { Request, Response } from 'express';
import * as validate from 'express-validator';

import {
  policiesGet,
  policiesHistory,
  policiesUpdate,
} from './policies';

const app = express();
const port = process.env.BACKEND_PORT || 4000;

const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validate.validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  next();
};

app.use(express.json())

app.get(
  '/policies',
  validate.query('sortField').optional().isIn(['provider', 'insuranceType', 'status', 'startDate', 'endDate']),
  handleValidationErrors,
  policiesGet,
);

app.get(
  '/policies/:id/history',
  validate.param('id').isUUID(4),
  handleValidationErrors,
  policiesHistory,
);

app.put(
  '/policies/:id',
  validate.param('id').isUUID(4),
  validate.body('familyMembers.add').optional().isArray(),
  validate.body('familyMembers.add.*.firstName').isLength({ min: 1 }),
  validate.body('familyMembers.add.*.lastName').isLength({ min: 1 }),
  validate.body('familyMembers.add.*.dateOfBirth').isDate().toDate(),
  validate.body('familyMembers.remove').optional().isArray(),
  validate.body('familyMembers.remove.*.id').isUUID(4).withMessage('wtf'),
  handleValidationErrors,
  policiesUpdate,
);

app.get('/', (req, res) => {
  res.send('Server is up and running 🚀');
})

export const server = app.listen(port, () => {
  console.log(`🚀  Server ready at ${port}`);
});

export default app;
