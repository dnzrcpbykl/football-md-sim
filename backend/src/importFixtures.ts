import axios from "axios";
import { pool } from "./db";
import dotenv from "dotenv";

dotenv.config();

// Bu işlev, veritabanı işlemlerini bir Transaction (işlem) içinde çalıştırır.
// Hata oluşursa, tüm değişiklikler geri alınır (Rollback).
async function importFixtures() {
    const API_KEY = process.env.API_FOOTBALL_KEY;

    if (!API_KEY) {
        console.error("API_FOOTBALL_KEY bulunamadı!");
        process.exit(1);
    }

    // API Parametreleri (Türkiye 1. Lig, 2023/2024 sezonu)
    const leagueId = 204;
    const season = 2023;

    let client; // Transaction için client tanımlama

    try {
        console.log(`API FOOTBALL'dan Lig ID ${leagueId} için ${season} sezonu fikstürler çekiliyor...`);

        // API'den veri çekme
        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`,
            {
                headers: {
                    "x-apisports-key": API_KEY,
                    "x-apisports-host": "v3.football.api-sports.io",
                },
            }
        );

        const fixtures = response.data.response;

        if (fixtures.length === 0) {
            console.log("UYARI: API'den hiç maç verisi gelmedi. Lig ID ve Sezon değerlerini kontrol edin.");
            return;
        }

        console.log(`Toplam ${fixtures.length} maç bulundu. Başlangıç zamanı: ${new Date().toISOString()}`);

        // Veritabanı işlemini başlatma
        client = await pool.connect();
        await client.query('BEGIN');

        for (const f of fixtures) {
            const fixId = f.fixture.id;
            const date = f.fixture.date;

            // Takım bilgileri
            const home = f.teams.home.name;
            const away = f.teams.away.name;
            const homeProviderId = f.teams.home.id;
            const awayProviderId = f.teams.away.id;
            
            // Fikstür bilgileri
            const venue = f.fixture.venue?.name || "Unknown";
            const referee = f.fixture.referee || "Unknown";
            const competitionName = f.league.name || 'Unknown Competition';
            const status = f.fixture.status.short;

            // 1) Takımları ekle (teams tablosu: 10 sütun)
            // Name UNIQUE olduğu için ON CONFLICT çalışacaktır.
            const homeRes = await client.query(
                `INSERT INTO teams (provider_id, name, created_at, updated_at) 
                 VALUES ($1, $2, NOW(), NOW()) 
                 ON CONFLICT (name) DO UPDATE SET provider_id = EXCLUDED.provider_id RETURNING id`,
                [homeProviderId, home]
            );
            const awayRes = await client.query(
                `INSERT INTO teams (provider_id, name, created_at, updated_at) 
                 VALUES ($1, $2, NOW(), NOW()) 
                 ON CONFLICT (name) DO UPDATE SET provider_id = EXCLUDED.provider_id RETURNING id`,
                [awayProviderId, away]
            );

            const homeTeamId = homeRes.rows[0].id;
            const awayTeamId = awayRes.rows[0].id;

            // 2) Fixture’ı ekle (fixtures tablosu: 13 sütun)
            // id PRIMARY KEY olduğu için ON CONFLICT çalışacaktır.
            // provider_id: API-Sports'un kendi ID'sini (fixture id) kullanıyoruz.
            
            await client.query(
                `INSERT INTO fixtures (id, provider_id, competition, season, stage, match_date, home_team_id, away_team_id, status, venue, referee, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) 
                 ON CONFLICT (id) DO UPDATE SET match_date = EXCLUDED.match_date, status = EXCLUDED.status, updated_at = NOW()`,
                [
                    fixId,                      // $1 (id)
                    fixId,                      // $2 (provider_id)
                    competitionName,            // $3 (competition)
                    season,                     // $4 (season)
                    f.league.round,             // $5 (stage)
                    date,                       // $6 (match_date)
                    homeTeamId,                 // $7 (home_team_id)
                    awayTeamId,                 // $8 (away_team_id)
                    status,                     // $9 (status)
                    venue,                      // $10 (venue)
                    referee                     // $11 (referee)
                    // created_at ve updated_at (NOW() ile SQL içinde dolduruluyor)
                ]
            );

            // 3) Matche bir satır oluştur (matches tablosu: 11 sütun)
            // fixture_id UNIQUE olduğu için ON CONFLICT çalışacaktır.
            await client.query(
                `INSERT INTO matches (fixture_id, home_score, away_score, ht_score, ft_score, events_summary, statistics, started_at, ended_at, attendance)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (fixture_id) DO NOTHING`,
                [
                    fixId,           // $1 (fixture_id)
                    0,               // $2 (home_score)
                    0,               // $3 (away_score)
                    '0-0',           // $4 (ht_score)
                    '0-0',           // $5 (ft_score)
                    '[]',            // $6 (events_summary)
                    '{}',            // $7 (statistics - JSON/TEXT varsayımı)
                    null,            // $8 (started_at)
                    null,            // $9 (ended_at)
                    null             // $10 (attendance)
                ]
            );

            // console.log(`Fixture ${fixId} (${home} vs ${away}) eklendi.`);
        }

        await client.query('COMMIT'); // Tüm işlemler başarılıysa değişiklikleri kaydet
        console.log("🏁 Import tamamlandı!");

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK'); // Hata oluşursa geri al
        }
        console.error("İçeri aktarma hatası:", err);
    } finally {
        if (client) {
            client.release(); // Client'ı havuza geri bırak
        }
    }
}

importFixtures();