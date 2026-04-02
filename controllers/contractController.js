
// const Contract = require("../models/ContractModel");
// const { Gig } = require("../models/Gigmodel");
// const { UserModel } = require("../models/UserModel");
// const Notification = require("../models/Notification");
// const sendEmail = require("../utils/sendEmail");

// /**
//  * =========================================================
//  * SELECT APPLICANT (OWNER ACTION)
//  * =========================================================
//  */
// exports.selectApplicant = async (req, res) => {
//   try {
//     console.log("BACKEND SELECT BODY:", req.body);

//     // 🔥 ACCEPT BOTH PAYLOAD TYPES (FINAL FIX)
//     let { gigId, applicantId, applicationId } = req.body;

//     // backward compatibility (if some route sends applicationId)
//     if ((!gigId || !applicantId) && applicationId) {
//       return res.status(400).json({
//         error: "applicationId based selection is not supported anymore",
//       });
//     }

//     if (!gigId || !applicantId) {
//       return res.status(400).json({
//         error: "Missing data",
//         received: req.body,
//       });
//     }

//     const gig = await Gig.findById(gigId);
//     if (!gig) {
//       return res.status(404).json({ error: "Gig not found" });
//     }

//     if (gig.postedBy.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ error: "You are not owner of this gig" });
//     }

//     const already = await Contract.findOne({
//       gig: gigId,
//       applicant: applicantId,
//     });

//     if (already) {
//       return res.status(400).json({ error: "Already selected" });
//     }

//     const contract = await Contract.create({
//       gig: gigId,
//       recruiter: req.user._id,
//       applicant: applicantId,
//     });

//     // ================= NOTIFICATION + EMAIL =================
//     try {
//       const applicantUser = await UserModel.findById(applicantId);

//       if (applicantUser) {
//         await Notification.create({
//           user: applicantUser._id,
//           title: "You are selected 🎉",
//           message: "You have been selected for a gig",
//           type: "CONFIRM",
//           link: "/my-contracts",
//         });

//         await sendEmail({
//           to: applicantUser.email,
//           subject: "You are selected 🎉",
//           html: `
//             <h2>Congratulations!</h2>
//             <p>You have been selected for a gig.</p>
//             <p>Please login and confirm the contract.</p>
//           `,
//         });
//       }
//     } catch (err) {
//       console.error("Notify/email error:", err.message);
//     }

//     res.json(contract);

//   } catch (err) {
//     console.error("SELECT ERROR:", err);
//     res.status(500).json({ error: "Select applicant failed" });
//   }
// };



const Contract = require("../models/ContractModel");
const { Gig } = require("../models/Gigmodel");
const { UserModel } = require("../models/UserModel");
const Notification = require("../models/Notification");
const sendEmail = require("../utils/sendEmail");

/**
 * =========================================================
 * SELECT APPLICANT (OWNER ACTION)
 * =========================================================
 */
exports.selectApplicant = async (req, res) => {
  try {
    console.log("BACKEND SELECT BODY:", req.body);

    // 🔥 ACCEPT BOTH PAYLOAD TYPES (FINAL FIX)
    let { gigId, applicantId, applicationId } = req.body;

    // backward compatibility (if some route sends applicationId)
    if ((!gigId || !applicantId) && applicationId) {
      return res.status(400).json({
        error: "applicationId based selection is not supported anymore",
      });
    }

    if (!gigId || !applicantId) {
      return res.status(400).json({
        error: "Missing data",
        received: req.body,
      });
    }

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ error: "Gig not found" });
    }

    if (gig.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You are not owner of this gig" });
    }

    const already = await Contract.findOne({
      gig: gigId,
      applicant: applicantId,
    });

    if (already) {
      return res.status(400).json({ error: "Already selected" });
    }

    const contract = await Contract.create({
      gig: gigId,
      recruiter: req.user._id,
      applicant: applicantId,
    });

    // ================= NOTIFICATION + EMAIL =================
    try {
      const applicantUser = await UserModel.findById(applicantId);

      if (applicantUser) {
        await Notification.create({
          user: applicantUser._id,
          title: "You are selected 🎉",
          message: "You have been selected for a gig",
          type: "CONFIRM",
          link: "/my-contracts",
        });

        await sendEmail({
          to: applicantUser.email,
          subject: "You are selected 🎉",
          html: `
            <h2>Congratulations!</h2>
            <p>You have been selected for a gig.</p>
            <p>Please login and confirm the contract.</p>
          `,
        });
      }
    } catch (err) {
      console.error("Notify/email error:", err.message);
    }

    res.json(contract);

  } catch (err) {
    console.error("SELECT ERROR:", err);
    res.status(500).json({ error: "Select applicant failed" });
  }
};