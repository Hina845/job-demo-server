import express from 'express';
import bodyParser from 'body-parser';
import { trigger_order, query_cancel, get_holding_positions, get_account_info } from './mexc.js';

const app = express();
const PORT = 7777; // Ensure you're using HTTP for testing or configure HTTPS properly

app.use(express.json()); // Ensure JSON body parsing
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/check-status', (_, res) => {
    res.json({ status: true });
});

app.post('/trigger-order', trigger_order);

app.post('/query-cancel', query_cancel);

app.post('/get-holding-positions', get_holding_positions);

app.post('/get-account-info', get_account_info);

app.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
