import axios from "axios";
import { pool } from "./db";

export async function getMatchStats(matchId: number) {
  const API_KEY = process.env.API_FOOTBALL_KEY;

  if (!API_KEY) {
    throw new Error("API_FOOTBALL_KEY .env dosyasında bulunamadı");
  }

  // 1) Veritabanından gerçek API fixture id'sini al
  const fixtureRes = await pool.query(
    "SELECT fixture_id FROM matches WHERE id=$1",
    [matchId]
  );

  if (fixtureRes.rows.length === 0) {
    throw new Error("Maç bulunamadı");
  }

  const fixtureId = fixtureRes.rows[0].fixture_id;

  // 2) API FOOTBALL'dan gerçek istatistikleri çek
  const response = await axios.get(
    `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
    {
      headers: {
        "x-apisports-key": API_KEY,
        "x-apisports-host": "v3.football.api-sports.io",
      },
    }
  );

  const apiData = response.data.response;

  return apiData;
}
