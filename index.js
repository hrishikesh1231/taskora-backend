
require("dotenv").config();

// ================= IMPORTS =================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const axios = require("axios");
const nodemailer = require("nodemailer");
const Notification = require("./models/Notification");
const sendEmail = require("./utils/sendEmail");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const { deductTokens } = require("./utils/tokenManager");
const tokenRoutes = require("./routes/tokenRoutes");
const { createWelcomeBonus } = require("./controllers/tokenController");
const crypto = require("crypto");
const aiRoutes = require("./routes/aiChat");


const OpenAI = require("openai");

// ================= MODELS =================

// ✅ VERY IMPORTANT — register all models
require("./models");

const { Gig } = require("./models/Gigmodel");
const { Service } = require("./models/Servicemodel");
const { UserModel } = require("./models/UserModel");
const { Application } = require("./models/ApplicationModel");
// const { ServiceApplication } = require("./models/ServiceApplicationModel");
const ServiceApplication = require("./models/ServiceApplicationModel");
const TokenTransaction = require("./models/TokenTransaction");
const Contract = require("./models/ContractModel");

const Otp = require("./models/OtpModel");

// ================= UTILS =================
const WrapAsync = require("./utils/WrapAsync");
const { isLoggedIn } = require("./middlewares/middleware");
const { upload } = require("./utils/Cloudinary");

// ================= ROUTES =================
const locationRoutes = require("./routes/locationRoutes");
const contractRoutes = require("./routes/contractRoutes");
const ReviewModel = require("./models/ReviewModel");
const locationMap = require("./utils/locationMap");

const app = express();

// ================= ENV =================
const url = process.env.MONGO_URL;
const PORT = process.env.PORT || 3002;
const secret = process.env.SECRET;
const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   }),
// );

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://192.168.1.4:3000",
      "https://taskora-frontend-vadc.vercel.app/"
    ],
    credentials: true,
  })
);
app.set("trust proxy", 1);

// ================= SESSION =================
const store = MongoStore.create({
  mongoUrl: url,
  crypto: { secret },
  touchAfter: 24 * 3600,
});

app.use(
  session({
    store,
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: "lax",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// ================= PASSPORT =================
app.use(passport.initialize());
app.use(passport.session());

/// notification

app.use("/api", notificationRoutes);

//review
app.use("/api/reviews", reviewRoutes);

//aI

app.use("/api/ai", aiRoutes);

passport.use(new LocalStrategy(UserModel.authenticate()));
passport.serializeUser(UserModel.serializeUser());
passport.deserializeUser(UserModel.deserializeUser());

///   token
app.use("/api/tokens", tokenRoutes);
app.use("/api", contractRoutes);

// ================= EMAIL =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// ================= ADD GIG (BASELINE + AI) =================

app.use("/api/auth", require("./routes/authRoutes"));


// app.post("/addGig", isLoggedIn, async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       category,
//       state,
//       district,
//       location,
//       date,
//       contact,
//        latitude,
//   longitude
//     } = req.body;

//     /**
//      * 0️⃣ Hard backend validation
//      */
//     if (
//       !title ||
//       !description ||
//       !category ||
//       !state ||
//       !district ||
//       !date ||
//       !contact
//     ) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     /**
//      * 1️⃣ AI VALIDATION (OpenAI)
//      */

//     const prompt = `
// You are an AI safety reviewer for a local job marketplace called TaskOra.

// Your job is to determine whether a gig post is SAFE and RELEVANT for a local job platform.

// Think carefully about the INTENT and CONTEXT of the text before deciding.

// Important rules:

// 1. Do NOT reject content just because it contains sensitive words like "kill", "drug", "hack", etc.  
//    Evaluate whether the user is actually requesting illegal or harmful work.

// 2. If the text refers to a book title, movie title, news discussion, or other harmless reference, it should be allowed.

// 3. Reject only if the user is actually requesting:
//    - illegal activity
//    - violence
//    - sexual services
//    - scams or financial fraud
//    - hacking or cybercrime
//    - dangerous activities

// 4. Also reject if the text is clearly gibberish or meaningless.

// 5. The gig must also make sense as a real local job or task.

// Examples:

// Allowed:
// - "Need someone to deliver books"
// - "Looking for a helper to move furniture"
// - "Selling the book 'Kill the Police'"

// Rejected:
// - "Need someone to hack Instagram account"
// - "Looking for a girl for night service"
// - "Send money first then I give work"

// Gig to analyze:

// Title: ${title}

// Description: ${description}

// Respond ONLY in JSON format:

// {
//   "valid": true or false,
//   "reason": "short explanation"
// }
// `;

//     const aiResponse = await openai.chat.completions.create({
//       model: "gpt-4.1-mini",
//       messages: [
//         {
//           role: "system",
//           content: "You are a strict safety validator for job posts.",
//         },
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//       temperature: 0,
//     });

//     const aiResult = JSON.parse(aiResponse.choices[0].message.content);

//     if (!aiResult.valid) {
//       return res.status(400).json({
//         error: `Gig rejected: ${aiResult.reason}`,
//       });
//     }

//     /**
//      * 2️⃣ SAVE GIG (UNCHANGED)
//      */
//     const newGig = new Gig({
//       title,
//       description,
//       category,
//       state,
//       district,
//       location,
//       date,
//       contact,
//       postedBy: req.user._id,
//        coordinates: {
//     type: "Point",
//     coordinates: [Number(longitude), Number(latitude)]
//   }
//     });

//     await newGig.save();

//     /**
//      * 3️⃣ TOKEN DEDUCTION (UNCHANGED)
//      */
//     await deductTokens({
//       userId: req.user._id,
//       amount: 5,
//       reason: "Post Gig",
//       gig: newGig._id,
//     });

//     return res.status(201).json({
//       message: "Gig created successfully",
//       gig: newGig,
//     });

//   } catch (err) {
//     console.error("ADD GIG ERROR:", err);

//     return res.status(400).json({
//       error: "Gig rejected by AI or invalid data",
//     });
//   }
// });


app.post("/addGig", isLoggedIn, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      state,
      district,
      taluka,
      location,
      date,
      contact,
      latitude,
      longitude
    } = req.body;

    /**
     * 0️⃣ Hard backend validation
     */
    if (
      !title ||
      !description ||
      !category ||
      !state ||
      !district ||
      !taluka ||
      !location ||
      !date ||
      !contact
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    /**
     * 1️⃣ AI VALIDATION (OpenAI)
     */

    const prompt = `
You are an AI safety reviewer for a local job marketplace called TaskOra.

Your job is to determine whether a gig post is SAFE and RELEVANT for a local job platform.

Think carefully about the INTENT and CONTEXT of the text before deciding.

Important rules:

1. Do NOT reject content just because it contains sensitive words like "kill", "drug", "hack", etc.  
   Evaluate whether the user is actually requesting illegal or harmful work.

2. If the text refers to a book title, movie title, news discussion, or other harmless reference, it should be allowed.

3. Reject only if the user is actually requesting:
   - illegal activity
   - violence
   - sexual services
   - scams or financial fraud
   - hacking or cybercrime
   - dangerous activities

4. Also reject if the text is clearly gibberish or meaningless.

5. The gig must also make sense as a real local job or task.

Examples:

Allowed:
- "Need someone to deliver books"
- "Looking for a helper to move furniture"
- "Selling the book 'Kill the Police'"

Rejected:
- "Need someone to hack Instagram account"
- "Looking for a girl for night service"
- "Send money first then I give work"

Gig to analyze:

Title: ${title}

Description: ${description}

Respond ONLY in JSON format:

{
  "valid": true or false,
  "reason": "short explanation"
}
`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a strict safety validator for job posts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    });

    const aiResult = JSON.parse(aiResponse.choices[0].message.content);

    if (!aiResult.valid) {
      return res.status(400).json({
        error: `Gig rejected: ${aiResult.reason}`,
      });
    }

    /**
     * 2️⃣ SAVE GIG
     */

    const newGig = new Gig({
      title,
      description,
      category,
      state,
      district,
      taluka,
      location,
      date,
      contact,
      postedBy: req.user._id,
      coordinates: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)]
      }
    });

    await newGig.save();

    /**
     * 3️⃣ TOKEN DEDUCTION
     */

    await deductTokens({
      userId: req.user._id,
      amount: 5,
      reason: "Post Gig",
      gig: newGig._id,
    });

    return res.status(201).json({
      message: "Gig created successfully",
      gig: newGig,
    });

  } catch (err) {
    console.error("ADD GIG ERROR:", err);

    return res.status(400).json({
      error: "Gig rejected by AI or invalid data",
    });
  }
});





// // ================= ADD SERVICE (BASELINE + AI) =================
// app.post("/addService", isLoggedIn, async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       salary,
//       state,
//       district,
//       location,
//       date,
//       contact,
//     } = req.body;

//     /**
//      * 0️⃣ Hard backend validation
//      */
//     if (
//       !title ||
//       !description ||
//       salary === undefined ||
//       !state ||
//       !district ||
//       !date ||
//       !contact
//     ) {
//       return res.status(400).json({
//         error: "Missing required fields",
//       });
//     }

//     /**
//      * 1️⃣ AI VALIDATION (OpenAI)
//      */

//     const prompt = `
// You are an AI safety reviewer for a local job marketplace called TaskOra.

// Determine whether the following SERVICE post is safe and valid.

// Think about CONTEXT and INTENT before deciding.

// Reject only if the post contains:
// - illegal activities
// - sexual services
// - scams or financial fraud
// - violent requests
// - hacking or cybercrime
// - clearly meaningless gibberish
// - unrealistic or suspicious job

// Do NOT reject just because of sensitive words if the context is harmless.

// The service must also make sense as a real job.

// Service details:

// Title: ${title}

// Description: ${description}

// Salary: ${salary}

// Respond ONLY in JSON:

// {
//  "valid": true/false,
//  "reason": "short explanation"
// }
// `;

//     const aiResponse = await openai.chat.completions.create({
//       model: "gpt-4.1-mini",
//       messages: [
//         {
//           role: "system",
//           content: "You are a strict safety validator for job marketplace posts.",
//         },
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//       temperature: 0,
//     });

//     const content = aiResponse.choices[0].message.content
//       .replace(/```json/g, "")
//       .replace(/```/g, "")
//       .trim();

//     const aiResult = JSON.parse(content);

//     if (!aiResult.valid) {
//       return res.status(400).json({
//         error: `Service rejected: ${aiResult.reason}`,
//       });
//     }

//     /**
//      * 2️⃣ SAVE SERVICE (Baseline logic unchanged)
//      */
//     const newService = new Service({
//       title,
//       description,
//       salary,
//       state,
//       district,
//       location,
//       date,
//       contact,
//       postedBy: req.user._id,
//     });

//     await newService.save();

//     /**
//      * 3️⃣ TOKEN DEDUCTION
//      */
//     await deductTokens({
//       userId: req.user._id,
//       amount: 3,
//       reason: "Post Service",
//     });

//     return res.status(201).json({
//       message: "Service created successfully",
//       service: newService,
//     });

//   } catch (err) {
//     console.error("🔥 ADD SERVICE ERROR:", err);

//     return res.status(500).json({
//       error: "Internal server error while creating service",
//     });
//   }
// });


// ================= ADD SERVICE (BASELINE + AI) =================
app.post("/addService", isLoggedIn, async (req, res) => {
  try {
    const {
      title,
      description,
      salary,
      state,
      district,
      taluka,   // ✅ added
      location,
      date,
      contact,
      lat,      // ✅ added
      lng       // ✅ added
    } = req.body;

    /**
     * 0️⃣ Hard backend validation
     */
    if (
      !title ||
      !description ||
      salary === undefined ||
      !state ||
      !district ||
      !taluka ||   // ✅ added
      !date ||
      !contact
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    /**
     * 1️⃣ AI VALIDATION (OpenAI)
     */

    const prompt = `
You are an AI safety reviewer for a local job marketplace called TaskOra.

Determine whether the following SERVICE post is safe and valid.

Think about CONTEXT and INTENT before deciding.

Reject only if the post contains:
- illegal activities
- sexual services
- scams or financial fraud
- violent requests
- hacking or cybercrime
- clearly meaningless gibberish
- unrealistic or suspicious job

Do NOT reject just because of sensitive words if the context is harmless.

The service must also make sense as a real job.

Service details:

Title: ${title}

Description: ${description}

Salary: ${salary}

Respond ONLY in JSON:

{
 "valid": true/false,
 "reason": "short explanation"
}
`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a strict safety validator for job marketplace posts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    });

    const content = aiResponse.choices[0].message.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const aiResult = JSON.parse(content);

    if (!aiResult.valid) {
      return res.status(400).json({
        error: `Service rejected: ${aiResult.reason}`,
      });
    }

    /**
     * 2️⃣ SAVE SERVICE (Baseline logic unchanged)
     */
    const newService = new Service({
      title,
      description,
      salary,
      state,
      district,
      taluka,     // ✅ added
      location,
      date,
      contact,
      postedBy: req.user._id,

      // ✅ coordinates (optional)
      geoLocation: lat && lng
        ? {
            type: "Point",
            coordinates: [lng, lat], // important order
          }
        : undefined,
    });

    await newService.save();

    /**
     * 3️⃣ TOKEN DEDUCTION
     */
    await deductTokens({
      userId: req.user._id,
      amount: 3,
      reason: "Post Service",
    });

    return res.status(201).json({
      message: "Service created successfully",
      service: newService,
    });

  } catch (err) {
    console.error("🔥 ADD SERVICE ERROR:", err);

    return res.status(500).json({
      error: "Internal server error while creating service",
    });
  }
});

///////
console.log("🔥 REGISTERING GIG ROUTES");

// ================= GET GIG (EDIT LOAD) =================
app.get("/gig/:id", isLoggedIn, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({ error: "Gig not found" });
    }

    // 🔒 owner-only
    if (gig.postedBy.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: "Gig not found" });
    }

    res.json(gig);
  } catch (err) {
    console.error("❌ GET GIG ERROR:", err);
    res.status(500).json({ error: "Failed to fetch gig" });
  }
});

// ================= PUT GIG (EDIT + AI) =================
app.put("/gig/:id", isLoggedIn, async (req, res) => {
  try {

    const { title, description, location, category, date, contact } = req.body;

    // ===============================
    // AI PROMPT
    // ===============================

    const prompt = `
You are an AI safety reviewer for a local job marketplace called TaskOra.

Your job is to determine whether a gig post is SAFE and RELEVANT for a local job platform.

Think carefully about the INTENT and CONTEXT of the text before deciding.

Important rules:

1. Do NOT reject content just because it contains sensitive words like "kill", "drug", "hack".
2. Reject only if the user is requesting illegal activity, violence, sexual services, scams, hacking, or dangerous activities.
3. Reject if text is gibberish.
4. Gig must make sense as a real local job.

Gig to analyze:

Title: ${title}

Description: ${description}

Respond ONLY in JSON format:

{
  "valid": true or false,
  "reason": "short explanation"
}
`;

    // ===============================
    // OPENAI CALL
    // ===============================

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a strict safety validator for job posts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    });

    const aiResult = JSON.parse(aiResponse.choices[0].message.content);

    // ===============================
    // REJECT IF AI SAYS INVALID
    // ===============================

    if (!aiResult.valid) {
      return res.status(400).json({
        error: `Gig rejected: ${aiResult.reason}`,
      });
    }

    // ===============================
    // UPDATE GIG
    // ===============================

    const updatedGig = await Gig.findOneAndUpdate(
      { _id: req.params.id, postedBy: req.user._id },
      req.body,
      { new: true }
    );

    if (!updatedGig) {
      return res.status(404).json({
        error: "Gig not found or not authorized",
      });
    }

    res.json({
      message: "Gig updated successfully",
      gig: updatedGig,
    });

  } catch (err) {

    console.error("❌ UPDATE GIG ERROR:", err);

    res.status(500).json({
      error: "Failed to update gig",
    });

  }
});
///////
console.log("🔥 REGISTERING SERVICE ROUTES");

// ================= GET SERVICE (EDIT LOAD) =================
app.get("/service/:id", isLoggedIn, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // 🔒 owner-only
    if (service.postedBy.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.json(service);
  } catch (err) {
    console.error("❌ GET SERVICE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch service" });
  }
});

// ================= PUT SERVICE (EDIT + AI) =================
app.put("/service/:id", isLoggedIn, async (req, res) => {
  try {
    const { title, description, location, category, date, contact } = req.body;

    // ===============================
    // AI PROMPT
    // ===============================
    const prompt = `
You are an AI safety reviewer for a local service marketplace.

Your job is to determine whether a service post is SAFE and RELEVANT.

Important rules:

1. Do NOT reject content just because it contains sensitive words.
2. Reject only if the user is requesting illegal activity, violence, scams, sexual services, hacking, or dangerous activities.
3. Reject if text is gibberish.
4. Service must make sense as a real offering.

Service to analyze:

Title: ${title}

Description: ${description}

Respond ONLY in JSON format:

{
  "valid": true or false,
  "reason": "short explanation"
}
`;

    // ===============================
    // OPENAI CALL
    // ===============================
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a strict safety validator for service posts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    });

    const aiResult = JSON.parse(aiResponse.choices[0].message.content);

    // ===============================
    // REJECT IF INVALID
    // ===============================
    if (!aiResult.valid) {
      return res.status(400).json({
        error: `Service rejected: ${aiResult.reason}`,
      });
    }

    // ===============================
    // UPDATE SERVICE
    // ===============================
    const updatedService = await Service.findOneAndUpdate(
      { _id: req.params.id, postedBy: req.user._id },
      req.body,
      { new: true }
    );

    if (!updatedService) {
      return res.status(404).json({
        error: "Service not found or not authorized",
      });
    }

    res.json({
      message: "Service updated successfully",
      service: updatedService,
    });

  } catch (err) {
    console.error("❌ UPDATE SERVICE ERROR:", err);

    res.status(500).json({
      error: "Failed to update service",
    });
  }
});

////////////////   my service application histroy

app.get("/my-service-applications", isLoggedIn, async (req, res) => {
  try {
    const apps = await ServiceApplication.find({
      applicant: req.user._id,
    })
      .populate("service") // get service details
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    console.error("❌ ERROR FETCHING SERVICE APPLICATIONS:", err);
    res.status(500).json({
      error: "Failed to fetch service applications",
    });
  }
});

// app.get("/getGigs/:city", async (req, res) => {
//   const city = req.params.city;
//   console.log("🔍 Searching gigs for:", city);

//   const gigs = await Gig.find({
//     // isActive: true,
//     $or: [
//       { location: new RegExp(city, "i") },
//       { district: new RegExp(city, "i") },
//     ],
//   }).populate("postedBy", "username email");

//   console.log("📦 Found gigs:", gigs.length);

//   res.json(gigs);
// });



app.get("/getGigs/:city", async (req, res) => {
  try {

    const city = req.params.city.toLowerCase().trim();

    // 👉 get mapped values
    const searchTerms = locationMap[city] || [city];

    // 👉 convert to regex
    const regexArray = searchTerms.map(term => new RegExp(term, "i"));

    const gigs = await Gig.find({
      isActive: true,
      $or: [
        { location: { $in: regexArray } },
        { district: { $in: regexArray } },
        { taluka: { $in: regexArray } }
      ]
    }).populate("postedBy", "username email");

    res.json(gigs);

  } catch (err) {
    console.error("Gig Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch gigs" });
  }
});



app.get("/getService/:city", async (req, res) => {
  try {

    const city = req.params.city.toLowerCase().trim();

    const searchTerms = locationMap[city] || [city];

    const regexArray = searchTerms.map(term => new RegExp(term, "i"));

    const services = await Service.find({
      isActive: true,
      $or: [
        { location: { $in: regexArray } },
        { district: { $in: regexArray } },
        { taluka: { $in: regexArray } }
      ]
    }).populate("postedBy", "username email");

    res.json(services);

  } catch (err) {
    console.error("Service Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});


app.get("/gigs-near-me", isLoggedIn, async (req, res) => {
  const gigs = await Gig.find({
    district: req.user.district,
    isActive: true, // ✅ ADD THIS
  }).populate("postedBy", "username email");

  res.json(gigs);
});

app.get("/services-near-me", isLoggedIn, async (req, res) => {
  const services = await Service.find({ district: req.user.district });
  res.json(services);
});



app.post(
  "/applyGig/:gigId",
  isLoggedIn,
  upload.array("pictures", 5),
  async (req, res) => {
    let application;

    try {
      // ================= FETCH GIG =================

      const gig = await Gig.findById(req.params.gigId);

      // if (!gig) {
      //   return res.status(404).json({ error: "Gig not found" });
      // }

      if (!gig) {
        return res.status(404).json({ error: "Gig not found" });
      }

      if (!gig.isActive) {
        return res.status(400).json({
          error: "This gig is no longer accepting applications",
        });
      }

      // ================= OWNER CANNOT APPLY =================

      if (gig.postedBy.toString() === req.user._id.toString()) {
        return res.status(400).json({
          error: "You cannot apply to your own gig",
        });
      }

      // ================= PREVENT DUPLICATE APPLY =================

      const existingApplication = await Application.findOne({
        gig: req.params.gigId,
        applicant: req.user._id,
      });

      if (existingApplication) {
        return res.status(400).json({
          error: "You have already applied to this gig",
        });
      }

      // ================= CREATE APPLICATION =================

      application = new Application({
        gig: req.params.gigId,
        applicant: req.user._id,
        ...req.body,
        pictures: (req.files || []).map((f) => f.path),
      });

      await application.save();

      // ================= STEP 3: TOKEN DEDUCTION =================
      await deductTokens({
        userId: req.user._id,
        amount: 2,
        reason: "Apply Gig",
        gig: req.params.gigId,
      });

      await TokenTransaction.findOneAndUpdate(
        {
          user: req.user._id,
          reason: "Apply Gig",
        },
        {
          $set: { gig: req.params.gigId },
        },
        { sort: { createdAt: -1 } },
      );

      // ================= SEND RESPONSE FAST =================
      res.json({ success: true });

      // ================= BACKGROUND NOTIFICATION + EMAIL =================
      (async () => {
        try {
          const owner = await UserModel.findById(gig.postedBy);

          if (owner) {
            await Notification.create({
              user: owner._id,
              title: "New Application",
              message: `${req.user.username} applied to your gig "${gig.title}"`,
              type: "APPLY",
              link: `/gig/${gig._id}/applicants`,
            });

            await sendEmail({
              to: owner.email,
              subject: "New Application Received",
              html: `
                <h2>New Application</h2>
                <p><b>${req.user.username}</b> has applied to your gig.</p>
              `,
            });
          }
        } catch (err) {
          console.error("Notification/Email error:", err.message);
        }
      })();
    } catch (err) {
      console.error("❌ APPLY GIG ERROR:", err.message);

      // 🧹 Rollback application if token deduction fails
      if (application && application._id) {
        await Application.findByIdAndDelete(application._id);
      }

      return res.status(400).json({
        error: err.message || "Insufficient tokens to apply",
      });
    }
  },
);


app.post(
  "/applyService/:serviceId",
  isLoggedIn,
  upload.array("pictures", 5),
  async (req, res) => {
    let application;

    try {
      console.log("🔥 APPLY SERVICE ROUTE HIT");

      // ================= FETCH SERVICE =================
      const service = await Service.findById(req.params.serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // ================= OWNER CANNOT APPLY =================
      if (service.postedBy.toString() === req.user._id.toString()) {
        return res.status(400).json({
          error: "You cannot apply to your own service",
        });
      }

      // ================= PREVENT DUPLICATE APPLY =================
      const existingApplication = await ServiceApplication.findOne({
        service: req.params.serviceId,
        applicant: req.user._id,
      });

      if (existingApplication) {
        return res.status(400).json({
          error: "You have already applied to this service",
        });
      }

      // ================= CREATE APPLICATION =================
      application = await ServiceApplication.create({
        service: req.params.serviceId,
        applicant: req.user._id,
        name: req.body.name,
        message: req.body.message,
        contact: req.body.contact,
        charges: req.body.charges,
        pictures: (req.files || []).map((f) => f.path),
      });

      console.log("✅ Service application saved");

      // ================= TOKEN DEDUCTION =================
      await deductTokens({
        userId: req.user._id,
        amount: 1,
        reason: "Apply Service",
      });

      // ================= SEND RESPONSE FAST =================
      res.json({ success: true });

      // ================= BACKGROUND WORK =================
      (async () => {
        try {
          const owner = await UserModel.findById(service.postedBy);
          if (!owner) return;

          await Notification.create({
            user: owner._id,
            title: "New Service Application",
            message: `${req.user.username} applied to your service`,
            type: "APPLY",
            link: `/service/${service._id}/applicants`,
          });

          console.log("🔔 Service notification created");

          await sendEmail({
            to: owner.email,
            subject: "New Service Application",
            html: `
              <h3>New Service Application</h3>
              <p><b>${req.user.username}</b> applied to your service.</p>
            `,
          });

          console.log("📧 Service email sent");
        } catch (err) {
          console.error("Background service error:", err.message);
        }
      })();
    } catch (err) {
      console.error("❌ APPLY SERVICE ERROR:", err.message);

      if (application && application._id) {
        await ServiceApplication.findByIdAndDelete(application._id);
      }

      return res.status(400).json({
        error: err.message || "Insufficient tokens to apply",
      });
    }
  },
);

// app.get("/my-applications", isLoggedIn, async (req, res) => {
//   const apps = await Application.find({
//     applicant: req.user._id,
//   }).populate("gig");
//   res.json(apps);
// });



// app.get("/count/gigs/:city", async (req, res) => {
//   try {
//     const city = req.params.city;

//     const count = await Gig.countDocuments({
//       $or: [
//         { location: { $regex: new RegExp(city, "i") } },
//         { district: { $regex: new RegExp(city, "i") } },
//       ],
//     });

//     res.json({ count });
//   } catch (err) {
//     console.error("Gig count error:", err);
//     res.status(500).json({ count: 0 });
//   }
// });

// // ================= GIG COUNT BY CITY =================
// app.get("/count/gigs/:city", async (req, res) => {
//   try {
//     const city = req.params.city?.trim();

//     console.log("🔍 Counting gigs for:", city);

//     if (!city) {
//       return res.json({ count: 0 });
//     }

//     const count = await Gig.countDocuments({
//       $or: [
//         { location: { $regex: new RegExp(city, "i") } },
//         { district: { $regex: new RegExp(city, "i") } },
//       ],

//       // 🔥 only add this if your search route also has it
//       // isClosed: false,
//     });

//     console.log("📦 Visible gigs count:", count);

//     res.json({ count });
//   } catch (err) {
//     console.error("Gig count error:", err);
//     res.status(500).json({ count: 0 });
//   }
// });

// ================= GIG COUNT BY CITY =================
app.get("/count/gigs/:city", async (req, res) => {
  try {
    const city = req.params.city?.trim();

    console.log("🔍 Counting gigs for:", city);

    if (!city) {
      return res.json({ count: 0 });
    }

    const count = await Gig.countDocuments({
      isActive: true, // ✅ MUST match search route
      $or: [
        { location: new RegExp(city, "i") },
        { district: new RegExp(city, "i") },
      ],
    });

    console.log("📦 Navbar gig count:", count);

    res.json({ count });
  } catch (err) {
    console.error("Gig count error:", err);
    res.status(500).json({ count: 0 });
  }
});



app.get("/count/services/:district", async (req, res) => {
  try {
    const district = req.params.district?.trim();

    console.log("🔍 Counting services for:", district);

    if (!district) {
      return res.json({ count: 0 });
    }

    const count = await Service.countDocuments({
      district: { $regex: `^${district}$`, $options: "i" }, // case-insensitive match
      isActive: true
    });

    console.log("📦 Navbar service count:", count);

    res.json({ count });
  } catch (err) {
    console.error("Service count error:", err);
    res.status(500).json({ count: 0 });
  }
});


// // ================= SERVICE COUNT BY DISTRICT =================
// app.get("/count/services/:district", async (req, res) => {
//   try {
//     const { district } = req.params;
//     const count = await Service.countDocuments({
//       district: { $regex: new RegExp(`^${district}$`, "i") },
//     });
//     res.json({ count });
//   } catch (err) {
//     res.status(500).json({ count: 0 });
//   }
// });
//

// ================= MY GIGS =================
app.get("/my-gigs", isLoggedIn, async (req, res) => {
  try {
    const gigs = await Gig.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean(); // ✅ faster, safer for read-only

    res.status(200).json(gigs);
  } catch (err) {
    console.error("❌ Error fetching user gigs:", err);
    res.status(500).json({
      error: "Failed to fetch your gigs",
    });
  }
});

1;

// ================= MY SERVICES =================
app.get("/my-services", isLoggedIn, async (req, res) => {
  try {
    const services = await Service.find({
      postedBy: req.user._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(services);
  } catch (err) {
    console.error("❌ Error fetching user services:", err);
    res.status(500).json({
      error: "Failed to fetch your services",
    });
  }
});

// ================= MY APPLICATIONS =================
app.get("/my-applications", isLoggedIn, async (req, res) => {
  try {

    const applications = await Application.find({
      applicant: req.user._id,
    })
      .populate({
        path: "gig",
        select:
          "title description location date category district state taluka coordinates contact",
      })
      .sort({ createdAt: -1 })
      .lean(); // faster, read-only

    res.status(200).json(applications);

  } catch (err) {

    console.error("❌ Error fetching applications:", err);

    res.status(500).json({
      error: "Failed to fetch applications",
    });

  }
});


app.delete("/application/:id", isLoggedIn, async (req, res) => {
  try {

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        error: "Application not found"
      });
    }

    // security check
    if (application.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    await Application.findByIdAndDelete(req.params.id);

    res.json({
      message: "Application deleted successfully"
    });

  } catch (err) {

    console.error("DELETE APPLICATION ERROR:", err);

    res.status(500).json({
      error: "Failed to delete application"
    });

  }
});



// deleete contract history

app.delete("/api/contracts/:id", isLoggedIn, async (req, res) => {
  try {

    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    if (
      contract.recruiter.toString() !== req.user._id.toString() &&
      contract.applicant.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Contract.findByIdAndDelete(req.params.id);

    res.json({ message: "Contract deleted successfully" });

  } catch (err) {

    console.error("DELETE CONTRACT ERROR:", err);

    res.status(500).json({ error: "Failed to delete contract" });

  }
});




// ================= DELETE GIG (OWNER ONLY) =================
app.delete("/gig/:id", isLoggedIn, async (req, res) => {
  try {
    const deletedGig = await Gig.findOneAndDelete({
      _id: req.params.id,
      postedBy: req.user._id, // 🔒 owner-only
    });

    if (!deletedGig) {
      return res.status(404).json({
        error: "Gig not found or not authorized ❌",
      });
    }

    res.status(200).json({
      message: "✅ Gig deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting gig:", err);
    res.status(500).json({
      error: "Server error while deleting gig",
    });
  }
});

// ================= DELETE SERVICE (OWNER ONLY) =================
app.delete("/service/:id", isLoggedIn, async (req, res) => {
  try {
    console.log("🔥 DELETE SERVICE HIT:", req.params.id);
    console.log("👤 USER:", req.user._id);

    const service = await Service.findById(req.params.id);

    // ❌ Not found
    if (!service) {
      return res.status(404).json({
        error: "Service not found ❌",
      });
    }

    // 🔒 Owner-only check
    if (service.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Not authorized to delete this service ❌",
      });
    }

    await service.deleteOne();

    res.status(200).json({
      message: "✅ Service deleted successfully",
    });
  } catch (err) {
    console.error("❌ Error deleting service:", err);
    res.status(500).json({
      error: "Server error while deleting service",
    });
  }
});

// app.get("/gig/:id/applicants", isLoggedIn, async (req, res) => {
//   try {
//     // 1️⃣ Verify gig exists
//     const gig = await Gig.findById(req.params.id);

//     if (!gig) {
//       return res.status(404).json({ error: "Gig not found" });
//     }

//     // 2️⃣ Owner-only access
//     if (gig.postedBy.toString() !== req.user._id.toString()) {
//       return res.status(403).json({
//         error: "Not authorized to view applicants",
//       });
//     }

//     // 🔥 CHECK IF SOMEONE IS SELECTED
//     const selectedApp = await Application.findOne({
//       gig: gig._id,
//       status: "selected",
//     });

//     let applications;

//     if (selectedApp) {
//       // ✅ If selected exists → return only that one
//       applications = await Application.find({
//         gig: gig._id,
//         status: "selected",
//       })
//         .populate("applicant", "username email state district")
//         .sort({ createdAt: -1 });
//     } else {
//       // ✅ Otherwise return all (your original logic)
//       applications = await Application.find({ gig: gig._id })
//         .populate("applicant", "username email state district")
//         .sort({ createdAt: -1 });
//     }

//     res.status(200).json({
//       count: applications.length,
//       applications,
//     });
//   } catch (err) {
//     console.error("❌ Error fetching applicants:", err);
//     res.status(500).json({
//       error: "Failed to fetch applicants",
//     });
//   }
// });



app.get("/gig/:id/applicants", isLoggedIn, async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      return res.status(404).json({ error: "Gig not found" });
    }

    if (gig.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Not authorized to view applicants",
      });
    }

    const activeContract = await Contract.findOne({
      gig: gig._id,
      status: {
        $in: ["recruiter_confirmed", "applicant_confirmed", "both_confirmed"],
      },
    });

    let applications = [];

    if (activeContract) {
      applications = await Application.find({
        gig: gig._id,
        applicant: activeContract.applicant,
      })
        .populate("applicant", "username email state district tokens")
        .sort({ createdAt: -1 });
    } else {
      applications = await Application.find({
        gig: gig._id,
        status: { $ne: "rejected" },
      })
        .populate("applicant", "username email state district tokens")
        .sort({ createdAt: -1 });
    }

    res.status(200).json({
      count: applications.length,
      applications,
      hasActiveContract: !!activeContract,
    });
  } catch (err) {
    console.error("❌ Error fetching applicants:", err);
    res.status(500).json({
      error: "Failed to fetch applicants",
    });
  }
});
///////////////////// email

// ================= SELECT GIG APPLICANT =================
// app.post(
//   "/gig-application/:applicationId/select",
//   isLoggedIn,
//   async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.applicationId);

//       if (!application) {
//         return res.status(404).json({ error: "Application not found" });
//       }

//       // 🔒 Only gig owner can select
//       const gig = await Gig.findById(application.gig);
//       if (!gig || gig.postedBy.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: "Not authorized" });
//       }

//       // ✅ EXISTING LOGIC (status update)
//       application.status = "selected";
//       await application.save();

//       // ================= STEP 4: NOTIFICATION + EMAIL =================
//       try {
//         const applicant = await UserModel.findById(application.applicant);

//         if (applicant) {
//           // 🔔 Notification
//           await Notification.create({
//             user: applicant._id,
//             title: "Application Selected 🎉",
//             message: "You have been selected for a gig",
//             type: "CONFIRM",
//             link: "/my-applications",
//           });

//           // 📧 Email
//           await sendEmail({
//             to: applicant.email,
//             subject: "You have been selected 🎉",
//             html: `
//               <h2>Congratulations!</h2>
//               <p>You have been selected for the gig.</p>
//             `,
//           });
//         }
//       } catch (err) {
//         console.error("STEP 4 GIG notify error:", err.message);
//       }

//       res.json({ success: true });
//     } catch (err) {
//       console.error("❌ SELECT GIG APPLICANT ERROR:", err);
//       res.status(500).json({ error: "Server error" });
//     }
//   },
// );

// app.post(
//   "/gig-application/:applicationId/select",
//   isLoggedIn,
//   async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.applicationId);

//       if (!application) {
//         return res.status(404).json({ error: "Application not found" });
//       }

//       const gig = await Gig.findById(application.gig);

//       if (!gig || gig.postedBy.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: "Not authorized" });
//       }

//       // 🔥 Prevent double selection if active contract exists
//       const activeContract = await Contract.findOne({
//         gig: gig._id,
//         status: {
//           $in: ["pending", "recruiter_confirmed", "applicant_confirmed"],
//         },
//       });

//       if (activeContract) {
//         return res.status(400).json({
//           error: "A contract is already active for this gig",
//         });
//       }

//       // ✅ Mark application selected
//       application.status = "selected";
//       await application.save();

//       // ✅ Close gig
//       gig.isClosed = true;
//       await gig.save();

//       // ✅ Create contract with 12 hour expiry (GIG ONLY)
//       const contract = await Contract.create({
//         gig: gig._id,
//         recruiter: gig.postedBy,
//         applicant: application.applicant,
//         status: "recruiter_confirmed",
//         expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 🔥 12 HOURS
//       });

//       // ================= NOTIFICATION + EMAIL =================
//       try {
//         const applicant = await UserModel.findById(application.applicant);

//         if (applicant) {
//           await Notification.create({
//             user: applicant._id,
//             title: "Application Selected 🎉",
//             message:
//               "You have been selected for a gig. Confirm within 12 hours.",
//             type: "CONFIRM",
//             link: "/my-contracts",
//           });

//           await sendEmail({
//             to: applicant.email,
//             subject: "You have been selected 🎉",
//             html: `
//               <h2>Congratulations!</h2>
//               <p>You have been selected for the gig.</p>
//               <p>Please confirm within 12 hours.</p>
//             `,
//           });
//         }
//       } catch (err) {
//         console.error("STEP 4 GIG notify error:", err.message);
//       }

//       res.json({ success: true });
//     } catch (err) {
//       console.error("❌ SELECT GIG APPLICANT ERROR:", err);
//       res.status(500).json({ error: "Server error" });
//     }
//   },
// );

app.post(
  "/gig-application/:applicationId/select",
  isLoggedIn,
  async (req, res) => {
    try {
      const application = await Application.findById(req.params.applicationId);

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const gig = await Gig.findById(application.gig);

      if (!gig || gig.postedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Prevent double selection if active contract exists
      const activeContract = await Contract.findOne({
        gig: gig._id,
        status: {
          $in: ["recruiter_confirmed", "applicant_confirmed", "both_confirmed"],
        },
      });

      if (activeContract) {
        return res.status(400).json({
          error: "A contract is already active for this gig",
        });
      }

      const recruiter = await UserModel.findById(req.user._id);
      const applicantUser = await UserModel.findById(application.applicant);

      if (!recruiter || !applicantUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (recruiter.tokens < 15 || applicantUser.tokens < 5) {
        return res.status(400).json({
          error: "Insufficient tokens for selection",
        });
      }

      // Mark only selected applicant
      application.status = "selected";
      await application.save();

      // Close gig using both flags
      gig.isClosed = true;
      gig.isActive = false;
      await gig.save();

      // Create contract with 12 hour expiry
      const contract = await Contract.create({
        gig: gig._id,
        recruiter: gig.postedBy,
        applicant: application.applicant,
        applicantContact: application.contact,
        recruiterConfirmed: true,
        applicantConfirmed: false,
        status: "recruiter_confirmed",
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

      // Notification + Email
      try {
        const applicant = await UserModel.findById(application.applicant);

        if (applicant) {
          await Notification.create({
            user: applicant._id,
            title: "Application Selected 🎉",
            message:
              "You have been selected for a gig. Confirm within 12 hours.",
            type: "CONFIRM",
            link: "/my-contracts",
          });

          await sendEmail({
            to: applicant.email,
            subject: "You have been selected 🎉",
            html: `
              <h2>Congratulations!</h2>
              <p>You have been selected for the gig.</p>
              <p>Please confirm within 12 hours.</p>
            `,
          });
        }
      } catch (err) {
        console.error("STEP 4 GIG notify error:", err.message);
      }

      res.json({ success: true, contract });
    } catch (err) {
      console.error("❌ SELECT GIG APPLICANT ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

app.get("/service/:id/applicants", isLoggedIn, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Not authorized to view applicants",
      });
    }

    const selectedApp = await ServiceApplication.findOne({
      service: service._id,
      status: "selected",
    });

    let applications;

    if (selectedApp) {
      applications = await ServiceApplication.find({
        service: service._id,
        status: "selected",
      })
        .populate("applicant", "username email state district tokens")
        .sort({ createdAt: -1 });
    } else {
      applications = await ServiceApplication.find({
        service: service._id,
      })
        .populate("applicant", "username email state district tokens")
        .sort({ createdAt: -1 });
    }

    res.status(200).json({
      count: applications.length,
      applications,
    });
  } catch (err) {
    console.error("❌ Error fetching service applicants:", err);
    res.status(500).json({
      error: "Failed to fetch applicants",
    });
  }
});




// app.post(
//   "/service-application/:applicationId/select",
//   isLoggedIn,
//   async (req, res) => {
//     try {
//       const application = await ServiceApplication.findById(
//         req.params.applicationId,
//       );

//       if (!application) {
//         return res.status(404).json({ error: "Application not found" });
//       }

//       const service = await Service.findById(application.service);

//       if (!service) {
//         return res.status(404).json({ error: "Service not found" });
//       }

//       // 🔒 Owner only
//       if (service.postedBy.toString() !== req.user._id.toString()) {
//         return res.status(403).json({ error: "Not authorized" });
//       }

//       // ❌ Prevent duplicate contract
//       const existingContract = await Contract.findOne({
//         service: service._id,
//       });

//       if (existingContract) {
//         return res.status(400).json({
//           error: "Service already assigned",
//         });
//       }

//       // ✅ Mark selected
//       application.status = "selected";
//       await application.save();

//       // ✅ Create contract (same structure as Gig)
//       const contract = new Contract({
//         service: service._id,
//         recruiter: req.user._id,
//         applicant: application.applicant,
//         status: "pending",
//       });

//       await contract.save();

//       // ✅ Close service
//       service.isActive = false; // (use isOpen if that's your field)
//       await service.save();

//       // 🔔 Notification + Email
//       const applicant = await UserModel.findById(application.applicant);

//       if (applicant) {
//         await Notification.create({
//           user: applicant._id,
//           title: "Service Application Selected 🎉",
//           message: "You have been selected for a service",
//           type: "CONFIRM",
//           link: "/my-contracts",
//         });

//         await sendEmail({
//           to: applicant.email,
//           subject: "You have been selected 🎉",
//           html: `
//             <h2>Congratulations!</h2>
//             <p>You have been selected for the service.</p>
//           `,
//         });
//       }

//       res.json({ success: true });
//     } catch (err) {
//       console.error("❌ SELECT SERVICE APPLICANT ERROR:", err);
//       res.status(500).json({ error: "Server error" });
//     }
//   },
// );


app.post(
  "/service-application/:applicationId/select",
  isLoggedIn,
  async (req, res) => {
    try {
      const application = await ServiceApplication.findById(
        req.params.applicationId
      );

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const service = await Service.findById(application.service);

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Owner only
      if (service.postedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Prevent duplicate ACTIVE contract only
      const existingContract = await Contract.findOne({
        service: service._id,
        status: {
          $in: ["recruiter_confirmed", "applicant_confirmed", "both_confirmed"],
        },
      });

      if (existingContract) {
        return res.status(400).json({
          error: "Service already assigned",
        });
      }

      const recruiter = await UserModel.findById(req.user._id);
      const applicantUser = await UserModel.findById(application.applicant);

      if (!recruiter || !applicantUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (recruiter.tokens < 15 || applicantUser.tokens < 5) {
        return res.status(400).json({
          error: "Insufficient tokens for selection",
        });
      }

      // Mark only selected applicant
      application.status = "selected";
      await application.save();

      // Close service with both flags
      service.isActive = false;
      service.isClosed = true;
      await service.save();

      // Create contract in same structure as gig flow
      const contract = new Contract({
        service: service._id,
        recruiter: req.user._id,
        applicant: application.applicant,
        applicantContact: application.contact,
        recruiterConfirmed: true,
        applicantConfirmed: false,
        status: "recruiter_confirmed",
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

      await contract.save();

      // Notification + Email
      const applicant = await UserModel.findById(application.applicant);

      if (applicant) {
        await Notification.create({
          user: applicant._id,
          title: "Service Application Selected 🎉",
          message: "You have been selected for a service. Confirm within 12 hours.",
          type: "CONFIRM",
          link: "/my-contracts",
        });

        await sendEmail({
          to: applicant.email,
          subject: "You have been selected 🎉",
          html: `
            <h2>Congratulations!</h2>
            <p>You have been selected for the service.</p>
            <p>Please confirm within 12 hours.</p>
          `,
        });
      }

      res.json({ success: true, contract });
    } catch (err) {
      console.error("❌ SELECT SERVICE APPLICANT ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);



// // ================= GET CURRENT USER =================
// app.get("/me", isLoggedIn, (req, res) => {
//   const user = req.user;

//   res.json({
//     _id: user._id,
//     username: user.username,
//     email: user.email,
//     phone: user.phone || "",
//     location: user.location || "",
//     categories: user.categories || "",
//     avatar: user.avatar || "",
//   });
// });

app.get("/me", isLoggedIn, (req, res) => {
  const user = req.user;

  res.json({
    _id: user._id,

    // ✅ IMPORTANT FIX
    name: user.name || user.username,  

    email: user.email,
    state: user.state || "",
    district: user.district || "",
    avatar: user.avatar || "",
  });
});

/////
app.post("/send-email-otp", isLoggedIn, async (req, res) => {
  try {
    const { email } = req.body;

    // ❌ prevent duplicate email
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // 🔢 generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // 💾 store in session
    req.session.emailOTP = otp;
    req.session.newEmail = email;

    console.log("OTP:", otp); // later send via email

    // TODO: send email using nodemailer

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post("/send-update-email-otp", isLoggedIn, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });

    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    console.log("UPDATE EMAIL OTP:", otp);

    await transporter.sendMail({
      from: `"TaskOra" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your new email",
      text: `Your OTP is ${otp}`,
    });

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post("/verify-update-email-otp", isLoggedIn, async (req, res) => {
  try {
    const { otp } = req.body;

    const record = await Otp.findOne({ email: req.session.newEmail });

    if (!record || record.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      { email: req.session.newEmail },
      { new: true }
    );

    await Otp.deleteOne({ email: req.session.newEmail });

    res.json({ success: true, user });

  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

app.post("/verify-email-otp", isLoggedIn, async (req, res) => {
  try {
    const { otp } = req.body;

    if (parseInt(otp) !== req.session.emailOTP) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // ✅ update email ONLY after verification
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { email: req.session.newEmail },
      { new: true }
    );

    // 🧹 clear session
    req.session.emailOTP = null;
    req.session.newEmail = null;

    res.json({
      success: true,
      message: "Email updated successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

app.put("/update-profile", isLoggedIn, async (req, res) => {
  try {
    const { username, state, district } = req.body;

    // 🔥 username duplicate check
    const existingUser = await UserModel.findOne({
      username,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const isUsernameChanged = username !== req.user.username;

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user._id,
      { username, state, district },
      { new: true }
    );

    // 🔐 logout if username changed
    if (isUsernameChanged) {
      req.logout(() => {});
      return res.json({ success: true, logout: true });
    }

    res.json({ success: true, user: updatedUser });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Profile update failed" });
  }
});

app.get("/current-user", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not logged in" });
  }

  res.json({
    user: req.user,
  });
});









// ================= EXTRA ROUTES =================
app.use("/api", locationRoutes);

app.get("/debug-users", async (req, res) => {
  try {
    const users = await UserModel.find({}).select(
      "username email state district tokens createdAt",
    );

    res.json({
      count: users.length,
      users,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/notifications", isLoggedIn, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

app.post("/notifications/mark-read", isLoggedIn, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } },
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark read" });
  }
});

app.get("/getGigsByCategory/:category", async (req, res) => {
  try {
    const { category } = req.params;

    console.log("Fetching category:", category);

    // const gigs = await Gig.find({
    //   category: new RegExp(`^${category}$`, "i"), // ✅ case-insensitive exact match
    // })
    const gigs = await Gig.find({
      category: new RegExp(`^${category}$`, "i"),
      isActive: true, // ✅ ADD THIS
    })
      .populate("postedBy", "username")
      .sort({ createdAt: -1 });

    res.json(gigs);
  } catch (err) {
    console.error("Category Fetch Error:", err);
    res.status(500).json({
      error: "Failed to fetch gigs by category",
    });
  }
});

app.get("/admin/reactivate-everything", async (req, res) => {
  try {
    const gigResult = await Gig.updateMany({}, { $set: { isActive: true } });

    const serviceResult = await Service.updateMany(
      {},
      { $set: { isActive: true } },
    );

    res.json({
      message: "All gigs & services activated",
      gigsModified: gigResult.modifiedCount,
      servicesModified: serviceResult.modifiedCount,
    });
  } catch (err) {
    console.error("Reactivate error:", err);
    res.status(500).json({ error: "Failed" });
  }
});

// ======================================
// 🔹 GET ALL USERS (TEMP DEBUG ROUTE)
// ======================================
app.get("/all-users", async (req, res) => {
  try {
    const users = await UserModel.find(
      {},
      "username email state district tokens",
    );

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("FETCH USERS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.post("/debug-auth", async (req, res) => {
  const { username, password } = req.body;

  const user = await UserModel.findOne({ username });

  if (!user) return res.json("User not found");

  const result = await user.authenticate(password);

  res.json(result);
});

//rating
app.get("/users/:id/profile", async (req, res) => {
  try {
    const userId = req.params.id;

    // 1️⃣ Get user basic info
    const user = await UserModel.findById(userId).select(
      "username email state district createdAt",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Get all reviews of this user
    const reviews = await ReviewModel.find({ reviewedUser: userId })
      .populate("reviewer", "username")
      .sort({ createdAt: -1 });

    // 3️⃣ Calculate average rating
    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? (
            reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews
          ).toFixed(1)
        : 0;

    res.json({
      user,
      avgRating,
      totalReviews,
      reviews,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


app.get("/api/gigs/nearby", async (req, res) => {
  try {

    const { lat, lng } = req.query;

    const gigs = await Gig.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          distanceField: "distance",
          maxDistance: 50000,
          spherical: true
        }
      },

      {
        $lookup: {
          from: "users",
          localField: "postedBy",
          foreignField: "_id",
          as: "postedBy"
        }
      },

      {
        $unwind: "$postedBy"
      }

    ]);

    res.json(gigs);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching nearby gigs" });
  }
});


// ================= DELETE SERVICE APPLICATION =================

app.delete("/service-application/:id", isLoggedIn, async (req, res) => {

  try {

    const applicationId = req.params.id;

    const application = await ServiceApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        error: "Application not found"
      });
    }

    // Ensure only the applicant can delete
    if (String(application.applicant) !== String(req.user._id)) {
      return res.status(403).json({
        error: "Not authorized to delete this application"
      });
    }

    await ServiceApplication.findByIdAndDelete(applicationId);

    res.json({
      message: "Service application deleted successfully"
    });

  } catch (err) {

    console.error("DELETE SERVICE APPLICATION ERROR:", err);

    res.status(500).json({
      error: "Internal server error"
    });

  }

});

app.get("/", (req, res) => {
  res.send("TaskOra Backend Live 🚀");
});






require("./utils/gigCleanup");
// ================= START =================
app.listen(PORT, async () => {
  await mongoose.connect(url);
  console.log("🚀 Server running & DB connected");
});


