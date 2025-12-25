import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";

const app = express();
const port = 5000;

// Serve static files (optional)
app.use(express.static(path.join(__dirname, "../public")));

// ---------- Types ----------
type WeatherResp = {
    coord: { lon: number; lat: number };
    main: { temp: number };
    weather: { description: string; icon: string }[];
};

type PollutionResp = {
    list: {
        main: { aqi: number };
        components: {
            pm2_5: number;
            pm10: number;
        };
    }[];
};

// ---------- API ----------
app.get("/api/weather", async (req: Request, res: Response) => {
    const city = (req.query.city as string) || "London";
    const appKey = process.env.OPENWEATHER_KEY;

    if (!appKey) {
        return res.status(500).json({
            message: "Missing OPENWEATHER_KEY",
        });
    }

    try {
        // 1) Weather API
        const weatherUrl =
            `https://api.openweathermap.org/data/2.5/weather` +
            `?q=${encodeURIComponent(city)}` +
            `&units=metric` +
            `&appid=${appKey}`;

        const weatherRes = await fetch(weatherUrl);
        if (!weatherRes.ok) {
            return res.status(404).json({ message: "City not found" });
        }

        const weatherData = (await weatherRes.json()) as WeatherResp;

        const temp = weatherData.main.temp;
        const desc = weatherData.weather[0].description;
        const iconCode = weatherData.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

        const lat = weatherData.coord.lat;
        const lon = weatherData.coord.lon;

        // 2) Air Pollution API
        const pollutionUrl =
            `https://api.openweathermap.org/data/2.5/air_pollution` +
            `?lat=${lat}&lon=${lon}` +
            `&appid=${appKey}`;

        const pollutionRes = await fetch(pollutionUrl);
        const pollutionData = (await pollutionRes.json()) as PollutionResp;

        const aqi = pollutionData.list[0].main.aqi;
        const pm25 = pollutionData.list[0].components.pm2_5;
        const pm10 = pollutionData.list[0].components.pm10;

        // 3) FINAL RESPONSE (exact format)
        return res.json({
            city,
            temp,
            desc,
            iconUrl,
            aqi,
            pm25,
            pm10,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: "Error fetching weather data",
        });
    }
});

// ---------- Start server ----------
app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});
