"use client"; // fetch client-side

import { useEffect, useState } from "react";

interface Team {
  id: number;
  provider_id: string;
  name: string;
  short_name?: string;
  stadium?: string;
  founded?: number;
}

interface Fixture {
  id: number;
  competition: string;
  season: string;
  stage: string;
  match_date: string;
  status: string;
  home_team: string;
  away_team: string;
  venue: string;
  referee: string;
}

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [stats, setStats] = useState<any[]>([]);

  // Simülasyon fonksiyonu
  const simulateMatches = () => {
    setSimulating(true);

    fetch("http://localhost:4000/api/simulate", { method: "POST" })
      .then(res => res.json())
      .then(data => console.log(data.message))
      .then(() =>
        fetch("http://localhost:4000/api/fixtures")
          .then(res => res.json())
          .then(data => {
            if (data.ok) setFixtures(data.fixtures);
          })
      )
      .finally(() => setSimulating(false));
  };

  // Takımları Çek
  useEffect(() => {
    fetch("http://localhost:4000/api/db-test")
      .then(res => res.json())
      .then(data => {
        if (data.ok) setTeams(data.teams);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fikstürü Çek
  useEffect(() => {
    fetch("http://localhost:4000/api/fixtures")
      .then(res => res.json())
      .then(data => {
        if (data.ok) setFixtures(data.fixtures);
      });
  }, []);

  // İstatistikleri çek (örnek olarak ilk maç için)
  useEffect(() => {
    if (fixtures.length === 0) return;

    const fixtureId = fixtures[0].id; // örnek: ilk maç
    fetch(`http://localhost:4000/api/match/${fixtureId}/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setStats(data.stats);
      });
  }, [fixtures]);

  return (
    <main style={{ padding: 20 }}>
      {/* Simülasyon Butonu */}
      <button
        onClick={simulateMatches}
        style={{ margin: 10, padding: 10, backgroundColor: "green", color: "white" }}
        disabled={simulating}
      >
        {simulating ? "Simüle Ediliyor..." : "Maçları Simüle Et"}
      </button>

      {simulating && (
        <div style={{ margin: "10px 0", padding: "10px", backgroundColor: "#eee", borderRadius: "5px" }}>
          Simülasyon çalışıyor...
        </div>
      )}

      <section style={{ marginBottom: "40px" }}>
        <h1>Süper Lig Takımları</h1>
        {loading ? (
          <p>Yükleniyor...</p>
        ) : (
          <ul>
            {teams.map(team => (
              <li key={team.id}>
                {team.name} ({team.short_name}) - {team.stadium} - Kuruluş: {team.founded}
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr />

      <section>
        <h1>Maç Fikstürleri</h1>
        <ul>
          {fixtures.map(f => (
            <li key={f.id}>
              {f.match_date} | {f.home_team} vs {f.away_team} | {f.status} | {f.venue} | Hakem: {f.referee}
            </li>
          ))}
        </ul>
      </section>

      {/* İstatistikler */}
      {stats && stats.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2>Maç İstatistikleri</h2>
          <ul>
            {stats.map((teamStat: any) => (
              <li key={teamStat.team.id} style={{ marginBottom: 10 }}>
                <strong>{teamStat.team.name}</strong>
                <ul>
                  {teamStat.statistics.map((s: any, i: number) => (
                    <li key={i}>{s.type}: {s.value}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
