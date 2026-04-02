const Contract = require("../models/Contract");
const Gig = require("../models/Gig");
const Application = require("../models/Application");
const Notification = require("../models/Notification");

const checkGigContractExpiry = async (contract) => {
  if (!contract) return;

  // 🔥 Only gig contracts
  if (!contract.gig) return;

  if (contract.status !== "recruiter_confirmed") return;

  if (!contract.expiresAt) return;

  if (contract.expiresAt > new Date()) return;

  // ✅ Expire contract
  contract.status = "expired";
  await contract.save();

  // ✅ Reopen gig
  await Gig.findByIdAndUpdate(contract.gig, {
    isClosed: false,
  });

  // ✅ Reset application
  await Application.findOneAndUpdate(
    {
      gig: contract.gig,
      applicant: contract.applicant,
    },
    {
      status: "rejected",
    }
  );

  // ✅ Notify recruiter
  await Notification.create({
    user: contract.recruiter,
    title: "Contract Expired ⏳",
    message: "Applicant did not confirm within 12 hours.",
    type: "CONTRACT",
    link: `/gig/${contract.gig}/applicants`,
  });
};

module.exports = checkGigContractExpiry;