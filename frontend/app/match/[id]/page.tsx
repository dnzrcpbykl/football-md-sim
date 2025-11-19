"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Event {
  minute: number;
  team: string;
  player: string;
  type: string;
}

interface MatchDetail {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  ht_score: string;
  ft_score: string;
  events_summary: Event[];
}

export default function MatchPage() {
  const params = useParams();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Tüm veriyi çeken fonksiyon
  const fetchAll = () => {
    if (!params.id) return;

    // Maç bilgisi
    fetch(`http://localhost:4000/api/match/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setMatch(data.match);
      });

    // Maç istatistikleri
    fetch(`http://localhost:4000/api/match/${params.id}/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setStats(data.stats);
      });
  };

  // İlk yükleme + 5 saniyede bir güncelleme
  useEffect(() => {
    fetchAll(); // İlk fetch
    const interval = setInterval(fetchAll, 5000); // 5 saniyede bir

    return () => clearInterval(interval); // cleanup
  }, [params.id]);

  if (!match) return <p>Yükleniyor...</p>;

  return (
    <main style={{ padding: 20 }}>
      <h1>{match.home_team} vs {match.away_team}</h1>
      <p>Skor: {match.home_score} - {match.away_score}</p>
      <p>HT: {match.ht_score} | FT: {match.ft_score}</p>

      <h2>Olaylar</h2>
      <ul>
        {match.events_summary.map((e, i) => (
          <li key={i}>
            {e.minute}' - {e.team} - {e.player} ({e.type})
          </li>
        ))}
      </ul>

      {stats && (
        <>
          <h2>Maç İstatistikleri</h2>
          <pre>{JSON.stringify(stats, null, 2)}</pre>
        </>
      )}
    </main>
  );
}
