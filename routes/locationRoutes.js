// const express = require("express");
// require("dotenv").config();

// const router = express.Router();

// // GET /api/locations?query=mum
// router.get("/locations", async (req, res) => {
//   try {
//     const { query } = req.query;
//     if (!query) return res.json([]);

//     const response = await fetch(
//       `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${query}&countryIds=IN&limit=10`,
//       {
//         method: "GET",
//         headers: {
//           "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
//           "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
//         },
//       }
//     );

//     const data = await response.json();

//     // ✅ Only return unique city names
//     const cities = [...new Set(data.data.map((c) => c.city))];

//     res.json(cities);
//   } catch (err) {
//     console.error("❌ Error fetching cities:", err.message);
//     res.status(500).json({ error: "Failed to fetch cities" });
//   }
// });

// module.exports = router;


// const express = require("express");
// require("dotenv").config();

// const router = express.Router();

// router.get("/locations", async (req, res) => {
//   try {
//     const { query } = req.query;
//     if (!query) return res.json([]);

//     const response = await fetch(
//       `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${query}&countryIds=IN&limit=10`,
//       {
//         method: "GET",
//         headers: {
//           "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
//           "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
//         },
//       }
//     );

//     const data = await response.json();

//     // ✅ Guard against errors
//     if (!data || !Array.isArray(data.data)) {
//       console.warn("⚠️ API did not return cities. Raw response:", data);

//       // fallback: return empty instead of crashing
//       return res.json([]);
//     }

//     // ✅ Unique city names
//     const cities = [...new Set(data.data.map((c) => c.city))];
//     res.json(cities);
//   } catch (err) {
//     console.error("❌ Error fetching cities:", err.message);
//     res.status(500).json({ error: "Failed to fetch cities" });
//   }
// });

// module.exports = router;



const express = require("express");
require("dotenv").config();
const localCities = require("../Data/cities.json"); // ✅ fallback list

const router = express.Router();

router.get("/locations", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    let cities = [];

    // 🔹 Try RapidAPI first
    try {
      const response = await fetch(
        `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${query}&countryIds=IN&limit=10`,
        {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
            "X-RapidAPI-Host": "wft-geo-db.p.rapidapi.com",
          },
        }
      );

      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        cities = [...new Set(data.data.map((c) => c.city))];
      }
    } catch (apiErr) {
      console.warn("⚠️ RapidAPI error, falling back:", apiErr.message);
    }

    // 🔹 If no results from API → use local list
    if (cities.length === 0) {
      cities = localCities.filter((c) =>
        c.toLowerCase().startsWith(query.toLowerCase())
      );
    }

    res.json(cities);
  } catch (err) {
    console.error("❌ Error fetching cities:", err.message);
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

module.exports = router;

