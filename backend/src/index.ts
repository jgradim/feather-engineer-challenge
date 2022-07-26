import express from 'express';

import {
  policiesGet,
} from './policies';

const app = express();
const port = process.env.BACKEND_PORT || 4000;

app.use(express.json())

app.get('/policies', policiesGet);

app.get('/', (req, res) => {
  res.send('Server is up and running 🚀');
})

export const server = app.listen(port, () => {
  console.log(`🚀  Server ready at ${port}`);
});

export default app;
