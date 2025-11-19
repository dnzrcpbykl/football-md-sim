import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool, testConnection } from "./db";
import { simulateMatches } from "./simulate";
import { getMatchStats } from "./stats";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// -------------------- PING --------------------
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, message: "Backend çalışıyor!", now: new Date().toISOString() });
});

// -------------------- FIXTURES --------------------
app.get("/api/fixtures", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.competition, f.season, f.stage, f.match_date, f.status,
             ht.name AS home_team, at.name AS away_team, f.venue, f.referee
      FROM fixtures f
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      ORDER BY f.match_date ASC
    `);
    res.json({ ok: true, fixtures: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err });
  }
});

// -------------------- MATCH DETAIL --------------------
app.get("/api/match/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid match id" });
  }

  try {
    const result = await pool.query(
      `SELECT m.*, f.home_team_id, f.away_team_id,
              ht.name AS home_team, at.name AS away_team
       FROM matches m
       JOIN fixtures f ON m.fixture_id = f.id
       JOIN teams ht ON f.home_team_id = ht.id
       JOIN teams at ON f.away_team_id = at.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Maç bulunamadı" });
    }

    res.json({ ok: true, match: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err });
  }
});

// -------------------- MATCH STATS (API-FOOTBALL) --------------------
app.get("/api/match/:id/stats", async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ ok: false, error: "Invalid match id" });
  }

  try {
    const stats = await getMatchStats(id);
    res.json({ ok: true, stats });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// -------------------- SIMULATION --------------------
app.post("/api/simulate", async (_req, res) => {
  try {
    await simulateMatches();
    res.json({ ok: true, message: "Maçlar simüle edildi" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// -------------------- SERVER --------------------
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log("Backend listening on port", port);
  testConnection();
});
