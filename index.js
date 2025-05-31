import express from 'express';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import { trigger_order, query_cancel, get_holding_positions, get_account_info, limit_order } from './mexc.js';

const app = express();
const PORT = 7777; // Ensure you're using HTTP for testing or configure HTTPS properly

// Rate limiting: 1 request per 10 seconds
const limiter = rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 1, // limit each IP to 1 request per windowMs
    message: 'You can only request once every 10 seconds in demo test.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);
app.use(express.json()); // Ensure JSON body parsing
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
})

app.post('/trigger', trigger_order);

app.post('/cancel', query_cancel);

app.post('/limit', limit_order);

app.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});