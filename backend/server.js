const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const app = express();
app.use(cors());
app.use(express.json());

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const db = DynamoDBDocumentClient.from(client);
const TABLE = 'todos';

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// GET all todos
app.get('/todos', async (req, res) => {
  const result = await db.send(new ScanCommand({ TableName: TABLE }));
  res.json(result.Items || []);
});

// POST create todo
app.post('/todos', async (req, res) => {
  const todo = { ...req.body, id: String(Date.now()) };
  await db.send(new PutCommand({ TableName: TABLE, Item: todo }));
  res.json(todo);
});

// PUT toggle complete or update text
app.put('/todos/:id', async (req, res) => {
  const { completed, text } = req.body;
  let UpdateExpression = [];
  let ExpressionAttributeValues = {};
  if (completed !== undefined) { UpdateExpression.push('completed = :c'); ExpressionAttributeValues[':c'] = completed; }
  if (text !== undefined) { UpdateExpression.push('#t = :t'); ExpressionAttributeValues[':t'] = text; }
  await db.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id: req.params.id },
    UpdateExpression: 'SET ' + UpdateExpression.join(', '),
    ExpressionAttributeNames: text !== undefined ? { '#t': 'text' } : undefined,
    ExpressionAttributeValues,
  }));
  res.json({ success: true });
});

// DELETE todo
app.delete('/todos/:id', async (req, res) => {
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { id: req.params.id } }));
  res.json({ success: true });
});

app.listen(5000, () => console.log('Backend running on port 5000'));
