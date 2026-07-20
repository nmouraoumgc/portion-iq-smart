import app from './app';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.listen(PORT, () => {
  console.log(`PortionIQ API running on http://localhost:${PORT}`);
});
