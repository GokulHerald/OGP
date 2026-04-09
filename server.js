require('dotenv').config();
const app = require('./api/index');

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
