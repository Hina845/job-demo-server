import express from 'express';
import bodyParser from 'body-parser';
import { trigger_order, query_cancel, get_holding_positions, get_account_info, limit_order } from './mexc.js';

const app = express();
const PORT = 7777; // Ensure you're using HTTP for testing or configure HTTPS properly

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