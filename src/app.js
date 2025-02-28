const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
require('dotenv').config();
const app = express();
// Middlewares
app.use(cors());
app.use(express.json());
// Routes
app.use('/api', userRoutes);
module.exports = app;
