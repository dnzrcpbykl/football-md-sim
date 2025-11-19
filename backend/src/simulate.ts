import { pool } from "./db";

export async function simulateMatches() {
  try {
    // Sadece planlanmış / scheduled maçları al
    const fixturesRes = await pool.query(`
      SELECT m.id, m.home_score, m.away_score
      FROM matches m
      JOIN fixtures f ON m.fixture_id = f.id
      WHERE f.status = 'SCHEDULED'
    `);

    for (const match of fixturesRes.rows) {
      // Random skor üret
      const homeScore = Math.floor(Math.random() * 5);
      const awayScore = Math.floor(Math.random() * 5);

      // HT ve FT skorları
      const htScore = `${Math.floor(homeScore / 2)}-${Math.floor(awayScore / 2)}`;
      const ftScore = `${homeScore}-${awayScore}`;

      // Event örneği
      const events = [
        { minute: 23, team: "Home", player: "Player A", type: "goal" },
      ];

      // Güncelle
      await pool.query(`
        UPDATE matches
        SET home_score=$1, away_score=$2, ht_score=$3, ft_score=$4, events_summary=$5
        WHERE id=$6
      `, [homeScore, awayScore, htScore, ftScore, JSON.stringify(events), match.id]);

      console.log(`Match ${match.id} simüle edildi: ${homeScore}-${awayScore}`);
    }

  } catch (err) {
    console.error("Simülasyon hatası:", err);
  }
}
